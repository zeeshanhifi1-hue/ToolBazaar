import crypto from 'node:crypto';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Load local .env safely if present without crashing in minimal/hosted environments
try {
  const loader = (process as NodeJS.Process & { loadEnvFile?: (path?: string) => void })
    .loadEnvFile;
  if (typeof loader === 'function' && fs.existsSync('.env')) {
    loader('.env');
  }
} catch {
  // Ignore missing or unreadable .env; runtime secrets come from process.env
}
import {
  countryFromAcceptLanguage,
  countryFromTimeZone,
  countryToCurrency,
  extractCountryFromHeaders,
  extractPublicClientIp,
  normalizeCountryCode,
} from './src/utils/geoCurrency.ts';
import {
  createAdminToken,
  hashPassword,
  safeEqualStrings,
  validateAdminCredentialsInput,
  verifyAdminToken,
  verifyPassword,
} from './src/utils/adminAuth.ts';
import {
  CATEGORIES,
  HERO_BANNERS,
  INITIAL_NOTIFICATIONS,
  INITIAL_ORDERS,
  INITIAL_TOOLS,
} from './src/data/mockData.ts';
import {
  DEFAULT_NEON_CREATOR_CONFIG,
  mapBannerRow,
  mapCategoryRow,
  mapNotificationRow,
  mapOrderRow,
  mapPaymentGatewayRow,
  mapProductAccountRow,
  mapReviewRow,
  mapToolRow,
  normalizeThemeConfig,
  normalizeThemeId,
  sanitizeSafeMediaUrl,
  type DbBannerRow,
  type DbCategoryRow,
  type DbNotificationRow,
  type DbOrderRow,
  type DbPaymentGatewayRow,
  type DbProductAccountRow,
  type DbReviewRow,
  type DbToolRow,
} from './src/utils/supabaseMappers.ts';
import {
  sanitizeDeliveryFields,
  sanitizeTextFileName,
  validateImageUploadPayload,
  validatePaymentGatewayPayload,
  type MediaFolder,
} from './src/utils/mediaValidation.ts';
import {
  getTodayDateString,
  normalizeReviewDate,
  VALID_REVIEW_STATUSES,
  validateReviewInput,
} from './src/utils/reviewLogic.ts';
import {
  buildAccessKeyFromHex,
  buildOrderCode,
  determineInitialOrderOutcome,
  resolveCheckoutItemsAndTotals,
  validateServerOrderPayment,
} from './src/utils/checkoutLogic.ts';
import { calculateDiscountPercent } from './src/utils/storeLogic.ts';
import {
  REQUIRED_SUPABASE_TABLES,
  sanitizeOrigin,
  validateInstallCompletionInput,
  type InstallStatusResponse,
  type SupabaseConnectionTestResponse,
  type SupabaseTableCheckResult,
} from './src/utils/installLogic.ts';
import type {
  BrandKey,
  CategoryId,
  CategoryItem,
  DeliveryMode,
  HeroBannerData,
  NotificationItem,
  OrderRecord,
  PaymentGateway,
  PlanOption,
  ProductAccountItem,
  ProductReview,
  ReviewStatus,
  SiteSettings,
  ToolProduct,
  UserProfile,
} from './src/types/store.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolvePort(): number {
  const portFlagIdx = process.argv.indexOf('--port');
  if (portFlagIdx !== -1 && process.argv[portFlagIdx + 1]) {
    const parsed = Number(process.argv[portFlagIdx + 1]);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return Number(process.env.PORT) || 3000;
}

const PORT = resolvePort();
const isProd = process.env.NODE_ENV === 'production';

const SUPABASE_URL = (
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  ''
).trim();

const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

// Deterministic cryptographic signing key across serverless cold starts (never hardcoded)
const SESSION_SEED =
  process.env.ADMIN_SESSION_SECRET?.trim() ||
  SUPABASE_SERVICE_ROLE_KEY ||
  process.env.ADMIN_PASSWORD?.trim() ||
  '';

const ADMIN_SESSION_SECRET: Buffer = SESSION_SEED
  ? crypto.createHash('sha256').update(`toolbazaar-admin-session:${SESSION_SEED}`).digest()
  : crypto.randomBytes(32);

const supabaseAdmin: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

const VALID_CATEGORY_IDS = new Set<CategoryId>([
  'all',
  'ai',
  'video',
  'design',
  'productivity',
  'more',
]);

const VALID_TOOL_CATEGORIES = new Set<Exclude<CategoryId, 'all'>>([
  'ai',
  'video',
  'design',
  'productivity',
  'more',
]);

const VALID_BRANDS = new Set<BrandKey>([
  'chatgpt',
  'capcut',
  'canva',
  'adobe',
  'midjourney',
  'claude',
  'premiere',
  'figma',
  'notion',
  'grammarly',
  'perplexity',
  'envato',
]);

const VALID_ORDER_STATUSES = new Set<OrderRecord['status']>([
  'Pending',
  'Processing',
  'Active',
  'Delivered',
  'Rejected',
]);

const VALID_ACCENTS = new Set<NotificationItem['accent']>(['purple', 'green', 'amber']);

const DEFAULT_SITE_SETTINGS: SiteSettings = {
  id: 'main',
  siteName: 'ToolBazaar',
  siteTagline: 'Premium Tools & Digital Products',
  supportEmail: 'support@toolbazaar.in',
  vipCouponCode: 'BAZAAR20',
  vipCouponText: 'Apply BAZAAR20 at checkout for 20% extra discount on all tools.',
  activeTheme: 'classic',
  themeConfig: { ...DEFAULT_NEON_CREATOR_CONFIG },
};

const DEFAULT_PAYMENT_GATEWAYS: PaymentGateway[] = [
  {
    id: 'easypaisa',
    name: 'EasyPaisa',
    accountTitle: 'ToolBazaar Official',
    accountNumber: '0300-0000000',
    currency: 'PKR',
    instructions:
      'Send the exact PKR amount to our EasyPaisa account, then submit your Transaction ID or payment screenshot.',
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'jazzcash',
    name: 'JazzCash',
    accountTitle: 'ToolBazaar Official',
    accountNumber: '0301-0000000',
    currency: 'PKR',
    instructions:
      'Transfer the exact PKR total to our JazzCash number and upload your payment receipt or TRX ID.',
    isActive: true,
    sortOrder: 2,
  },
  {
    id: 'usdt-trc20',
    name: 'USDT (TRC20 Crypto)',
    accountTitle: 'ToolBazaar Crypto Treasury',
    accountNumber: 'TExampleTRC20WalletAddressUpdateInAdmin',
    currency: 'USD',
    instructions:
      'Send exact USDT via TRON (TRC20) network only. Paste your TXID hash or upload transfer screenshot.',
    isActive: true,
    sortOrder: 3,
  },
  {
    id: 'upi-india',
    name: 'UPI / PhonePe / GPay',
    accountTitle: 'ToolBazaar India',
    accountNumber: 'toolbazaar@upi',
    currency: 'INR',
    instructions:
      'Pay via any UPI app using the UPI ID or QR code above, then enter your 12-digit UTR number or upload screenshot.',
    isActive: true,
    sortOrder: 4,
  },
];

// Server-side in-memory store used seamlessly when SUPABASE_SERVICE_ROLE_KEY is not configured yet
interface MemoryStoreState {
  mutated: boolean;
  installationCompleted: boolean;
  installedAt: string | null;
  installedPlatform: string | null;
  adminAccount: { username: string; passwordHash: string } | null;
  settings: SiteSettings;
  categories: CategoryItem[];
  banners: HeroBannerData[];
  tools: ToolProduct[];
  users: UserProfile[];
  orders: OrderRecord[];
  orderOwners: Record<string, string>;
  notifications: NotificationItem[];
  productAccounts: ProductAccountItem[];
  paymentGateways: PaymentGateway[];
  reviews: ProductReview[];
}

const DEFAULT_STARTER_REVIEWS: ProductReview[] = [
  {
    id: 'rev-seed-chatgpt-1',
    toolId: 'chatgpt-plus',
    authorName: 'Aarav M.',
    rating: 5,
    comment:
      'Got my ChatGPT Plus access within minutes. Everything works officially with full GPT-4o and priority speed unlocked.',
    reviewDate: '2026-11-22',
    status: 'approved',
    source: 'admin',
    verified: true,
    createdAt: '2026-11-22T10:15:00.000Z',
  },
  {
    id: 'rev-seed-chatgpt-2',
    toolId: 'chatgpt-plus',
    authorName: 'Bilal K.',
    rating: 5,
    comment:
      'Super smooth checkout and instant activation in My Orders. Saved more than half compared to retail pricing!',
    reviewDate: '2026-11-20',
    status: 'approved',
    source: 'admin',
    verified: true,
    createdAt: '2026-11-20T14:40:00.000Z',
  },
  {
    id: 'rev-seed-canva-1',
    toolId: 'canva-pro',
    authorName: 'Sarah T.',
    rating: 5,
    comment:
      'Canva Pro Brand Kit and Magic Studio activated right away. Best price and 24/7 support!',
    reviewDate: '2026-11-21',
    status: 'approved',
    source: 'admin',
    verified: true,
    createdAt: '2026-11-21T09:30:00.000Z',
  },
];

const memoryStore: MemoryStoreState = {
  mutated: false,
  installationCompleted: false,
  installedAt: null,
  installedPlatform: null,
  adminAccount: null,
  settings: { ...DEFAULT_SITE_SETTINGS },
  categories: CATEGORIES.map((c) => ({ ...c })),
  banners: HERO_BANNERS.map((b) => ({ ...b })),
  tools: INITIAL_TOOLS.map((t) => ({
    ...t,
    features: [...t.features],
    plans: t.plans.map((p) => ({ ...p })),
    theme: { ...t.theme },
  })),
  users: [
    {
      id: 'user-demo-1',
      email: 'arjun.creator@toolbazaar.in',
      fullName: 'Arjun Sharma',
      initials: 'AS',
      walletCredits: 250,
      createdAt: '2026-11-12T10:00:00.000Z',
    },
    {
      id: 'user-demo-2',
      email: 'zainab.studio@gmail.com',
      fullName: 'Zainab Khan',
      initials: 'ZK',
      walletCredits: 500,
      createdAt: '2026-11-19T14:30:00.000Z',
    },
  ],
  orders: INITIAL_ORDERS.map((o) => ({ ...o, items: o.items.map((i) => ({ ...i })) })),
  orderOwners: {},
  notifications: INITIAL_NOTIFICATIONS.map((n) => ({ ...n })),
  productAccounts: [],
  paymentGateways: DEFAULT_PAYMENT_GATEWAYS.map((g) => ({ ...g })),
  reviews: DEFAULT_STARTER_REVIEWS.map((r) => ({ ...r })),
};

// Lightweight in-memory TTL cache for IP-to-country lookups
const ipGeoCache = new Map<string, { country: string; expiresAt: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;

// Simple in-memory rate limit for admin login attempts
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const LOGIN_WINDOW_MS = 5 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 20;

function checkLoginRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || entry.resetAt <= now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_LOGIN_ATTEMPTS) return false;
  entry.count += 1;
  return true;
}

function getEnvAdminCredentials(): { username: string; password: string } | null {
  const username = (process.env.ADMIN_USERNAME || '').trim();
  const password = process.env.ADMIN_PASSWORD || '';
  if (username.length >= 3 && password.length >= 8) {
    return { username, password };
  }
  return null;
}

async function getStoredAdminAccount(): Promise<{
  username: string;
  passwordHash: string;
} | null> {
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from('admin_accounts')
      .select('username, password_hash')
      .order('created_at', { ascending: true })
      .limit(1);

    if (!error && data && data.length > 0) {
      const row = data[0] as { username: string; password_hash: string };
      return { username: row.username, passwordHash: row.password_hash };
    }
  }
  return memoryStore.adminAccount;
}

function getInitials(name: string, email: string): string {
  const parts = (name || email.split('@')[0] || 'TB')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (parts[0] || 'TB').slice(0, 2).toUpperCase();
}

function slugifyId(raw: string, fallbackPrefix: string): string {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return cleaned || `${fallbackPrefix}-${Date.now().toString(36)}`;
}

function mapDbSiteSettings(row: Record<string, unknown>): SiteSettings {
  return {
    id: String(row.id || 'main'),
    siteName: String(row.site_name || DEFAULT_SITE_SETTINGS.siteName).trim(),
    siteTagline: String(row.site_tagline || DEFAULT_SITE_SETTINGS.siteTagline).trim(),
    supportEmail: String(row.support_email || DEFAULT_SITE_SETTINGS.supportEmail).trim(),
    vipCouponCode: String(row.vip_coupon_code || DEFAULT_SITE_SETTINGS.vipCouponCode).trim(),
    vipCouponText: String(row.vip_coupon_text || DEFAULT_SITE_SETTINGS.vipCouponText).trim(),
    activeTheme: normalizeThemeId(row.active_theme),
    themeConfig: normalizeThemeConfig(row.theme_config),
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : undefined,
  };
}

function mapDbProfile(row: Record<string, unknown>): UserProfile {
  const email = String(row.email || '').trim();
  const fullName = String(row.full_name || email.split('@')[0] || 'Member').trim();
  return {
    id: String(row.id || ''),
    email,
    fullName,
    avatarUrl: sanitizeSafeMediaUrl(row.avatar_url),
    initials: getInitials(fullName, email),
    walletCredits: Math.max(0, Math.round(Number(row.wallet_credits) || 0)),
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

function clampInt(val: unknown, fallback: number, min = 0, max = 10_000_000): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function cleanText(val: unknown, fallback = '', maxLen = 280): string {
  if (typeof val !== 'string') return fallback;
  const trimmed = val.trim();
  return trimmed ? trimmed.slice(0, maxLen) : fallback;
}

interface AdminAuthedRequest extends Request {
  adminUsername?: string;
}

function requireAdminAuth(req: AdminAuthedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  const token = match ? match[1].trim() : '';
  const verified = verifyAdminToken(token, ADMIN_SESSION_SECRET);
  if (!verified) {
    res.status(401).json({ error: 'Admin authentication required.' });
    return;
  }
  req.adminUsername = verified.username;
  next();
}

async function fetchSiteSettingsAuthoritative(): Promise<SiteSettings> {
  if (supabaseAdmin) {
    const full = await supabaseAdmin
      .from('site_settings')
      .select(
        'id, site_name, site_tagline, support_email, vip_coupon_code, vip_coupon_text, active_theme, theme_config, updated_at'
      )
      .eq('id', 'main')
      .maybeSingle();

    if (!full.error && full.data) {
      return mapDbSiteSettings(full.data as Record<string, unknown>);
    }

    const legacy = await supabaseAdmin
      .from('site_settings')
      .select(
        'id, site_name, site_tagline, support_email, vip_coupon_code, vip_coupon_text, updated_at'
      )
      .eq('id', 'main')
      .maybeSingle();

    if (!legacy.error && legacy.data) {
      const mapped = mapDbSiteSettings(legacy.data as Record<string, unknown>);
      return {
        ...mapped,
        activeTheme: memoryStore.settings.activeTheme ?? mapped.activeTheme,
        themeConfig: memoryStore.settings.themeConfig ?? mapped.themeConfig,
      };
    }
  }
  return memoryStore.settings;
}

async function fetchPaymentGatewaysAuthoritative(onlyActive: boolean): Promise<PaymentGateway[]> {
  if (supabaseAdmin) {
    let fullQuery = supabaseAdmin
      .from('payment_gateways')
      .select(
        'id, name, account_title, account_number, currency, instructions, qr_code_url, logo_url, is_active, sort_order'
      )
      .order('sort_order', { ascending: true });
    if (onlyActive) fullQuery = fullQuery.eq('is_active', true);

    const full = await fullQuery;
    if (!full.error && full.data) {
      return (full.data as DbPaymentGatewayRow[]).map(mapPaymentGatewayRow);
    }

    let legacyQuery = supabaseAdmin
      .from('payment_gateways')
      .select(
        'id, name, account_title, account_number, currency, instructions, qr_code_url, is_active, sort_order'
      )
      .order('sort_order', { ascending: true });
    if (onlyActive) legacyQuery = legacyQuery.eq('is_active', true);

    const legacy = await legacyQuery;
    if (!legacy.error && legacy.data) {
      return (legacy.data as DbPaymentGatewayRow[]).map(mapPaymentGatewayRow);
    }
  }
  return onlyActive
    ? memoryStore.paymentGateways.filter((g) => g.isActive)
    : memoryStore.paymentGateways;
}

async function fetchAdminOverviewData() {
  if (supabaseAdmin) {
    const [
      settings,
      categoriesRes,
      bannersRes,
      toolsRes,
      usersRes,
      ordersRes,
      notifRes,
      paymentGateways,
      reviewsRes,
    ] = await Promise.all([
      fetchSiteSettingsAuthoritative(),
      supabaseAdmin
        .from('categories')
        .select('id, label, description, sort_order, is_active')
        .order('sort_order', { ascending: true }),
      supabaseAdmin
        .from('banners')
        .select('id, title, image_url, target_category, border_glow, sort_order, is_active')
        .order('sort_order', { ascending: true }),
      supabaseAdmin
        .from('tools')
        .select(
          'id, name, badge_text, subtitle, description, category_id, brand_key, logo_url, original_price, price, discount_percent, available, sold, trending, delivery_type, features, plans, theme, sort_order, is_active'
        )
        .order('sort_order', { ascending: true }),
      supabaseAdmin
        .from('profiles')
        .select('id, email, full_name, avatar_url, wallet_credits, created_at')
        .order('created_at', { ascending: false })
        .limit(200),
      supabaseAdmin
        .from('orders')
        .select(
          'id, order_code, created_at, status, items, subtotal, discount, total, promo_code, customer_email, access_key, delivery_mode, delivery_content, delivery_filename, delivery_fields, payment_method, payment_status, payment_gateway_id, payment_gateway_name, payment_currency, payment_trx_id, payment_proof_url, payment_note'
        )
        .order('created_at', { ascending: false })
        .limit(200),
      supabaseAdmin
        .from('notifications')
        .select('id, title, message, time_label, read, accent, created_at')
        .order('created_at', { ascending: false })
        .limit(100),
      fetchPaymentGatewaysAuthoritative(false),
      supabaseAdmin
        .from('product_reviews')
        .select(
          'id, tool_id, order_id, user_id, author_name, author_email, rating, comment, screenshot_url, review_date, status, source, verified, created_at'
        )
        .order('created_at', { ascending: false })
        .limit(300),
    ]);

    const categories =
      !categoriesRes.error && categoriesRes.data
        ? (categoriesRes.data as DbCategoryRow[])
            .map(mapCategoryRow)
            .filter((c): c is CategoryItem => c !== null)
        : memoryStore.categories;

    const banners =
      !bannersRes.error && bannersRes.data
        ? (bannersRes.data as DbBannerRow[])
            .map(mapBannerRow)
            .filter((b): b is HeroBannerData => b !== null)
        : memoryStore.banners;

    const tools =
      !toolsRes.error && toolsRes.data
        ? (toolsRes.data as DbToolRow[]).map(mapToolRow)
        : memoryStore.tools;

    const users =
      !usersRes.error && usersRes.data
        ? (usersRes.data as Record<string, unknown>[]).map(mapDbProfile)
        : [];

    let orders: OrderRecord[] = [];
    if (!ordersRes.error && ordersRes.data) {
      orders = (ordersRes.data as DbOrderRow[]).map(mapOrderRow);
    } else if (ordersRes.error) {
      // Backward-compatible fallback before new payment/delivery columns are migrated
      const midOrders = await supabaseAdmin
        .from('orders')
        .select(
          'id, order_code, created_at, status, items, subtotal, discount, total, promo_code, customer_email, access_key, delivery_mode, delivery_content, delivery_filename, delivery_fields'
        )
        .order('created_at', { ascending: false })
        .limit(200);
      if (!midOrders.error && midOrders.data) {
        orders = (midOrders.data as DbOrderRow[]).map(mapOrderRow);
      } else {
        const legacyOrders = await supabaseAdmin
          .from('orders')
          .select(
            'id, order_code, created_at, status, items, subtotal, discount, total, promo_code, customer_email, access_key'
          )
          .order('created_at', { ascending: false })
          .limit(200);
        if (!legacyOrders.error && legacyOrders.data) {
          orders = (legacyOrders.data as DbOrderRow[]).map(mapOrderRow);
        }
      }
    }

    const notifications =
      !notifRes.error && notifRes.data
        ? (notifRes.data as DbNotificationRow[]).map(mapNotificationRow)
        : memoryStore.notifications;

    const reviews =
      !reviewsRes.error && reviewsRes.data
        ? (reviewsRes.data as DbReviewRow[]).map(mapReviewRow)
        : memoryStore.reviews;

    return {
      supabaseAdminConnected: true,
      settings,
      categories,
      banners,
      tools,
      users,
      orders,
      notifications,
      paymentGateways,
      reviews,
      stats: {
        totalRevenue: orders
          .filter((o) => o.status !== 'Rejected')
          .reduce((sum, o) => sum + o.total, 0),
        totalOrders: orders.length,
        totalUsers: users.length,
        totalTools: tools.length,
        lowStockCount: tools.filter((t) => t.available <= 10).length,
        pendingPaymentsCount: orders.filter(
          (o) => o.paymentStatus === 'pending_verification'
        ).length,
        pendingReviewsCount: reviews.filter((r) => r.status === 'pending').length,
      },
    };
  }

  return {
    supabaseAdminConnected: false,
    settings: memoryStore.settings,
    categories: memoryStore.categories,
    banners: memoryStore.banners,
    tools: memoryStore.tools,
    users: memoryStore.users,
    orders: memoryStore.orders,
    notifications: memoryStore.notifications,
    paymentGateways: memoryStore.paymentGateways,
    reviews: memoryStore.reviews,
    stats: {
      totalRevenue: memoryStore.orders
        .filter((o) => o.status !== 'Rejected')
        .reduce((sum, o) => sum + o.total, 0),
      totalOrders: memoryStore.orders.length,
      totalUsers: memoryStore.users.length,
      totalTools: memoryStore.tools.length,
      lowStockCount: memoryStore.tools.filter((t) => t.available <= 10).length,
      pendingPaymentsCount: memoryStore.orders.filter(
        (o) => o.paymentStatus === 'pending_verification'
      ).length,
      pendingReviewsCount: memoryStore.reviews.filter((r) => r.status === 'pending').length,
    },
  };
}

async function lookupCountryByPublicIp(ip: string): Promise<string | null> {
  const now = Date.now();
  const cached = ipGeoCache.get(ip);
  if (cached && cached.expiresAt > now) {
    return cached.country;
  }

  try {
    const response = await fetch(`https://api.country.is/${encodeURIComponent(ip)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(2000),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { country?: unknown };
    const country = normalizeCountryCode(payload?.country);
    if (!country) return null;

    if (ipGeoCache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = ipGeoCache.keys().next().value;
      if (oldestKey) ipGeoCache.delete(oldestKey);
    }
    ipGeoCache.set(ip, { country, expiresAt: now + CACHE_TTL_MS });
    return country;
  } catch {
    return null;
  }
}

export function createApiApp(): express.Express {
  const app = express();
  app.set('trust proxy', true);
  app.use(express.json({ limit: '10mb' }));

  const uploadsRoot = path.resolve(__dirname, 'public', 'uploads');
  app.use('/uploads', express.static(uploadsRoot));

  app.get('/api/health', (_req, res) => {
    res.status(200).json({ ok: true });
  });

  // ==========================================================================
  // ONE-TIME INSTALLATION & DEPLOYMENT WIZARD ENDPOINTS
  // ==========================================================================
  async function getInstallationState(): Promise<{
    installed: boolean;
    installedAt: string | null;
    installedPlatform: string | null;
  }> {
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('site_settings')
        .select('installation_completed, installed_at, installed_platform')
        .eq('id', 'main')
        .maybeSingle();

      if (!error && data && typeof data.installation_completed === 'boolean') {
        return {
          installed: Boolean(data.installation_completed) || memoryStore.installationCompleted,
          installedAt:
            typeof data.installed_at === 'string'
              ? data.installed_at
              : memoryStore.installedAt,
          installedPlatform:
            typeof data.installed_platform === 'string'
              ? data.installed_platform
              : memoryStore.installedPlatform,
        };
      }
    }

    return {
      installed: memoryStore.installationCompleted,
      installedAt: memoryStore.installedAt,
      installedPlatform: memoryStore.installedPlatform,
    };
  }

  function getServerEnvFlags() {
    const supabasePubKey = (
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      ''
    ).trim();

    const appUrl = (process.env.APP_URL || '').trim();
    const safeSupabaseHost = /^https:\/\/[a-z0-9.-]+\.supabase\.co\/?$/i.test(SUPABASE_URL)
      ? SUPABASE_URL.replace(/\/+$/, '')
      : null;

    return {
      hasSupabaseUrl: Boolean(safeSupabaseHost),
      hasSupabasePublishableKey: supabasePubKey.length >= 20,
      hasSupabaseServiceRoleKey: SUPABASE_SERVICE_ROLE_KEY.length >= 20,
      hasAppUrl: /^https?:\/\/.+/i.test(appUrl) && !appUrl.includes('MY_APP_URL'),
      hasAdminEnv: Boolean(getEnvAdminCredentials()),
      safeSupabaseHost,
    };
  }

  app.get('/api/install/status', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const [installState, settings, storedAdmin] = await Promise.all([
        getInstallationState(),
        fetchSiteSettingsAuthoritative(),
        getStoredAdminAccount(),
      ]);
      const envFlags = getServerEnvFlags();
      const rawProto =
        typeof req.headers['x-forwarded-proto'] === 'string'
          ? req.headers['x-forwarded-proto']
          : req.protocol;
      const rawHost =
        typeof req.headers['x-forwarded-host'] === 'string'
          ? req.headers['x-forwarded-host']
          : req.headers.host;
      const currentOrigin = sanitizeOrigin(rawProto, rawHost);

      const payload: InstallStatusResponse = {
        installed: installState.installed,
        installedAt: installState.installedAt,
        installedPlatform: installState.installedPlatform,
        currentOrigin,
        supabaseHost: envFlags.safeSupabaseHost,
        supabaseConnected: Boolean(supabaseAdmin),
        env: {
          hasSupabaseUrl: envFlags.hasSupabaseUrl,
          hasSupabasePublishableKey: envFlags.hasSupabasePublishableKey,
          hasSupabaseServiceRoleKey: envFlags.hasSupabaseServiceRoleKey,
          hasAppUrl: envFlags.hasAppUrl,
          hasAdminEnv: envFlags.hasAdminEnv,
          hasStoredAdmin: Boolean(storedAdmin),
        },
        settings: {
          siteName: settings.siteName,
          siteTagline: settings.siteTagline,
          supportEmail: settings.supportEmail,
          vipCouponCode: settings.vipCouponCode,
          vipCouponText: settings.vipCouponText,
        },
      };
      res.json(payload);
    } catch {
      res.status(500).json({ error: 'Could not read server installation status.' });
    }
  });

  app.post('/api/install/test-supabase', async (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const installState = await getInstallationState();
    if (installState.installed) {
      res.status(403).json({
        error: 'Installation is already completed and locked.',
      });
      return;
    }

    const startedAt = Date.now();
    const envFlags = getServerEnvFlags();
    const missingEnvVars: string[] = [];
    if (!envFlags.hasSupabaseUrl) missingEnvVars.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!envFlags.hasSupabasePublishableKey) {
      missingEnvVars.push('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
    }
    if (!envFlags.hasSupabaseServiceRoleKey) {
      missingEnvVars.push('SUPABASE_SERVICE_ROLE_KEY');
    }

    if (!supabaseAdmin) {
      const result: SupabaseConnectionTestResponse = {
        ok: false,
        connected: false,
        latencyMs: Date.now() - startedAt,
        summary:
          'Server environment variables for Supabase are not set yet. Add them on your hosting platform (Step 1), rebuild & restart the server, then test again.',
        readyCount: 0,
        totalCount: REQUIRED_SUPABASE_TABLES.length,
        tables: REQUIRED_SUPABASE_TABLES.map((t) => ({
          table: t.table,
          label: t.label,
          purpose: t.purpose,
          ok: false,
          detail: 'Waiting for SUPABASE_SERVICE_ROLE_KEY & NEXT_PUBLIC_SUPABASE_URL on server',
        })),
        storageBucketOk: false,
        storageDetail: 'Supabase admin client is not configured yet.',
        missingEnvVars,
      };
      res.json(result);
      return;
    }

    const tableResults: SupabaseTableCheckResult[] = await Promise.all(
      REQUIRED_SUPABASE_TABLES.map(async (reqTable) => {
        const selectCols = (reqTable.requiredColumns || ['id']).join(', ');
        const check = await supabaseAdmin.from(reqTable.table).select(selectCols).limit(1);

        if (!check.error) {
          return {
            table: reqTable.table,
            label: reqTable.label,
            purpose: reqTable.purpose,
            ok: true,
            detail: reqTable.realtime ? 'Table & columns verified (Realtime table)' : 'Table & columns verified',
          };
        }

        // Check if table exists at all vs missing newer columns
        const fallback = await supabaseAdmin.from(reqTable.table).select('*').limit(1);
        if (!fallback.error) {
          return {
            table: reqTable.table,
            label: reqTable.label,
            purpose: reqTable.purpose,
            ok: false,
            detail: 'Table exists, but newer columns are missing. Run the Upgrade Migration SQL.',
          };
        }

        return {
          table: reqTable.table,
          label: reqTable.label,
          purpose: reqTable.purpose,
          ok: false,
          detail: 'Table not found in public schema. Run the Complete Supabase SQL script.',
        };
      })
    );

    let storageBucketOk = false;
    let storageDetail = 'Will auto-create bucket "toolbazaar-media" on first image upload.';
    try {
      const bucketsRes = await supabaseAdmin.storage.listBuckets();
      if (!bucketsRes.error && Array.isArray(bucketsRes.data)) {
        const hasBucket = bucketsRes.data.some((b) => b.name === 'toolbazaar-media');
        if (hasBucket) {
          storageBucketOk = true;
          storageDetail = 'Public storage bucket "toolbazaar-media" is active.';
        } else {
          const created = await supabaseAdmin.storage.createBucket('toolbazaar-media', {
            public: true,
            fileSizeLimit: 5 * 1024 * 1024,
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
          });
          if (!created.error) {
            storageBucketOk = true;
            storageDetail = 'Created public storage bucket "toolbazaar-media" automatically.';
          } else {
            storageDetail = 'Storage accessible (bucket will be provisioned on first upload).';
            storageBucketOk = true;
          }
        }
      }
    } catch {
      storageDetail = 'Could not inspect storage buckets; verify service role key permissions.';
    }

    const readyCount = tableResults.filter((r) => r.ok).length;
    const totalCount = tableResults.length;
    const allOk = readyCount === totalCount && missingEnvVars.length === 0;
    const latencyMs = Math.max(1, Date.now() - startedAt);

    const payload: SupabaseConnectionTestResponse = {
      ok: allOk,
      connected: true,
      latencyMs,
      summary: allOk
        ? `Connected to Supabase in ${latencyMs}ms — all ${totalCount}/${totalCount} tables and required columns are verified and ready!`
        : `Connected to Supabase (${readyCount}/${totalCount} tables ready). Run the SQL script above in Supabase SQL Editor and test again.`,
      readyCount,
      totalCount,
      tables: tableResults,
      storageBucketOk,
      storageDetail,
      missingEnvVars,
    };

    res.json(payload);
  });

  app.post('/api/install/complete', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const installState = await getInstallationState();
    if (installState.installed) {
      res.status(403).json({
        error: 'One-time installation is already completed and permanently locked.',
      });
      return;
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const envAdmin = getEnvAdminCredentials();
    const existingAdmin = await getStoredAdminAccount();
    const requireAdminAccount = !envAdmin && !existingAdmin;

    const parsed = validateInstallCompletionInput({
      siteName: body.siteName,
      siteTagline: body.siteTagline,
      supportEmail: body.supportEmail,
      vipCouponCode: body.vipCouponCode,
      vipCouponText: body.vipCouponText,
      platformId: body.platformId,
      requireAdminAccount,
      adminUsername: body.adminUsername,
      adminPassword: body.adminPassword,
    });

    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    const nowIso = new Date().toISOString();
    let adminCreated = false;

    if (requireAdminAccount && parsed.adminUsername && parsed.adminPassword) {
      const passwordHash = hashPassword(parsed.adminPassword);
      if (supabaseAdmin) {
        const { error: adminErr } = await supabaseAdmin.from('admin_accounts').insert({
          username: parsed.adminUsername,
          password_hash: passwordHash,
        });
        if (adminErr) {
          res.status(400).json({
            error:
              'Could not create Admin account in Supabase. Run the Complete Supabase SQL in Step 2 first.',
          });
          return;
        }
      }
      memoryStore.adminAccount = {
        username: parsed.adminUsername,
        passwordHash,
      };
      adminCreated = true;
    }

    const nextSettings: SiteSettings = {
      id: 'main',
      siteName: parsed.siteName,
      siteTagline: parsed.siteTagline,
      supportEmail: parsed.supportEmail,
      vipCouponCode: parsed.vipCouponCode,
      vipCouponText: parsed.vipCouponText,
      updatedAt: nowIso,
    };

    if (supabaseAdmin) {
      const fullUpsert = await supabaseAdmin.from('site_settings').upsert(
        {
          id: 'main',
          site_name: nextSettings.siteName,
          site_tagline: nextSettings.siteTagline,
          support_email: nextSettings.supportEmail,
          vip_coupon_code: nextSettings.vipCouponCode,
          vip_coupon_text: nextSettings.vipCouponText,
          installation_completed: true,
          installed_at: nowIso,
          installed_platform: parsed.platformId,
          updated_at: nowIso,
        },
        { onConflict: 'id' }
      );

      if (fullUpsert.error) {
        // Fallback if installation_completed column has not been added yet
        const legacyUpsert = await supabaseAdmin.from('site_settings').upsert(
          {
            id: 'main',
            site_name: nextSettings.siteName,
            site_tagline: nextSettings.siteTagline,
            support_email: nextSettings.supportEmail,
            vip_coupon_code: nextSettings.vipCouponCode,
            vip_coupon_text: nextSettings.vipCouponText,
            updated_at: nowIso,
          },
          { onConflict: 'id' }
        );
        if (legacyUpsert.error) {
          res.status(400).json({
            error:
              'Could not save site settings to Supabase. Please run the Complete Supabase SQL in Step 2 first.',
          });
          return;
        }
      }
    }

    memoryStore.settings = nextSettings;
    memoryStore.installationCompleted = true;
    memoryStore.installedAt = nowIso;
    memoryStore.installedPlatform = parsed.platformId;
    memoryStore.mutated = true;

    res.status(201).json({
      ok: true,
      installedAt: nowIso,
      settings: nextSettings,
      adminCreated,
      message: 'One-time installation completed and locked! Your ToolBazaar storefront is now live.',
    });
  });

  // ==========================================================================
  // PUBLIC ENDPOINTS
  // ==========================================================================

  // Backend Geo-Currency Endpoint: PK -> PKR, IN -> INR, all others -> USD
  app.get('/api/geo-currency', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');

    const headerCountry = extractCountryFromHeaders(req.headers);
    if (headerCountry) {
      res.json({
        country: headerCountry,
        currency: countryToCurrency(headerCountry),
        source: 'header',
      });
      return;
    }

    const publicIp = extractPublicClientIp(
      req.headers['x-forwarded-for'],
      req.socket.remoteAddress
    );
    if (publicIp) {
      const ipCountry = await lookupCountryByPublicIp(publicIp);
      if (ipCountry) {
        res.json({
          country: ipCountry,
          currency: countryToCurrency(ipCountry),
          source: 'ip',
        });
        return;
      }
    }

    const tzParam = typeof req.query.tz === 'string' ? req.query.tz : '';
    const tzCountry = countryFromTimeZone(tzParam);
    if (tzCountry) {
      res.json({
        country: tzCountry,
        currency: countryToCurrency(tzCountry),
        source: 'timezone',
      });
      return;
    }

    const langCountry = countryFromAcceptLanguage(req.headers['accept-language']);
    if (langCountry) {
      res.json({
        country: langCountry,
        currency: countryToCurrency(langCountry),
        source: 'language',
      });
      return;
    }

    res.json({
      country: 'US',
      currency: 'USD',
      source: 'default',
    });
  });

  // Public site settings endpoint (works with Supabase or server memory)
  app.get('/api/site-settings', async (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const settings = await fetchSiteSettingsAuthoritative();
      res.json({ settings });
    } catch {
      res.json({ settings: memoryStore.settings });
    }
  });

  // Public active payment gateways endpoint
  app.get('/api/payment-gateways', async (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const gateways = await fetchPaymentGatewaysAuthoritative(true);
      res.json({ gateways });
    } catch {
      res.json({
        gateways: memoryStore.paymentGateways.filter((g) => g.isActive),
      });
    }
  });

  // Helper to store validated images in Supabase Storage or confined public/uploads/<folder>
  async function persistValidatedImage(
    folder: MediaFolder,
    dataBase64: unknown
  ): Promise<{ ok: true; url: string } | { ok: false; status: number; error: string }> {
    const check = validateImageUploadPayload(dataBase64, folder);
    if (!check.ok) {
      return { ok: false, status: 400, error: check.error };
    }

    const safeFileName = `${crypto.randomUUID()}${check.file.extension}`;
    const objectPath = `${folder}/${safeFileName}`;

    if (supabaseAdmin) {
      try {
        const bucket = 'toolbazaar-media';
        await supabaseAdmin.storage.createBucket(bucket, {
          public: true,
          fileSizeLimit: 5 * 1024 * 1024,
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
        });

        const { error: uploadError } = await supabaseAdmin.storage
          .from(bucket)
          .upload(objectPath, check.file.buffer, {
            contentType: check.file.mimeType,
            upsert: false,
          });

        if (!uploadError) {
          const { data: pub } = supabaseAdmin.storage
            .from(bucket)
            .getPublicUrl(objectPath);
          if (pub?.publicUrl) {
            return { ok: true, url: pub.publicUrl };
          }
        }
      } catch {
        // Fall back to local confined storage below
      }
    }

    try {
      const targetDir = path.resolve(uploadsRoot, folder);
      if (!targetDir.startsWith(uploadsRoot + path.sep)) {
        return { ok: false, status: 400, error: 'Invalid upload destination.' };
      }
      fs.mkdirSync(targetDir, { recursive: true });
      const targetFile = path.resolve(targetDir, safeFileName);
      if (!targetFile.startsWith(targetDir + path.sep)) {
        return { ok: false, status: 400, error: 'Invalid upload filename.' };
      }
      fs.writeFileSync(targetFile, check.file.buffer);
      return { ok: true, url: `/uploads/${folder}/${safeFileName}` };
    } catch {
      return { ok: false, status: 500, error: 'Failed to store uploaded image.' };
    }
  }

  // Authenticated customer payment proof upload endpoint
  app.post('/api/orders/upload-proof', async (req, res) => {
    const authHeader = req.headers.authorization || '';
    const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
    const userToken = match ? match[1].trim() : '';

    if (supabaseAdmin) {
      if (!userToken) {
        res.status(401).json({ error: 'Please sign in with Google to upload payment proof.' });
        return;
      }
      const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(userToken);
      if (userErr || !userData?.user) {
        res.status(401).json({ error: 'Invalid or expired user session. Please sign in again.' });
        return;
      }
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const saved = await persistValidatedImage('proofs', body.dataBase64);
    if (!saved.ok) {
      res.status(saved.status).json({ error: saved.error });
      return;
    }
    res.status(201).json({ url: saved.url });
  });

  // Helper: verify caller user identity from Supabase Bearer token (or preview header when Supabase Admin is not configured)
  async function resolveVerifiedUserFromReq(
    req: Request
  ): Promise<{ id: string; email?: string; fullName?: string; avatarUrl?: string } | null> {
    const authHeader = req.headers.authorization || '';
    const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
    const userToken = match ? match[1].trim() : '';

    if (supabaseAdmin) {
      if (!userToken) return null;
      const { data, error } = await supabaseAdmin.auth.getUser(userToken);
      if (error || !data?.user) return null;
      const meta = (data.user.user_metadata || {}) as Record<string, unknown>;
      const fullName =
        (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
        (typeof meta.name === 'string' && meta.name.trim()) ||
        (data.user.email ? data.user.email.split('@')[0] : 'Verified Buyer');
      const avatarUrl =
        (typeof meta.avatar_url === 'string' && meta.avatar_url.trim()) ||
        (typeof meta.picture === 'string' && meta.picture.trim()) ||
        undefined;
      return {
        id: data.user.id,
        email: data.user.email || undefined,
        fullName,
        avatarUrl,
      };
    }

    const previewUid = cleanText(req.headers['x-preview-user-id'], '', 80);
    if (!previewUid) return null;
    const previewEmail = cleanText(req.headers['x-preview-user-email'], '', 120);
    const previewName = cleanText(req.headers['x-preview-user-name'], '', 80);
    return {
      id: previewUid,
      email: previewEmail || undefined,
      fullName: previewName || 'Verified Buyer',
    };
  }

  // Helper: fetch orders strictly scoped to a single verified user (resilient across schema migrations)
  async function fetchSupabaseOrdersForUser(userId: string): Promise<OrderRecord[] | null> {
    if (!supabaseAdmin) return null;

    const full = await supabaseAdmin
      .from('orders')
      .select(
        'id, order_code, created_at, status, items, subtotal, discount, total, promo_code, customer_email, access_key, delivery_mode, delivery_content, delivery_filename, delivery_fields, payment_method, payment_status, payment_gateway_id, payment_gateway_name, payment_currency, payment_trx_id, payment_proof_url, payment_note'
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!full.error && full.data) {
      return (full.data as DbOrderRow[]).map(mapOrderRow);
    }

    const mid = await supabaseAdmin
      .from('orders')
      .select(
        'id, order_code, created_at, status, items, subtotal, discount, total, promo_code, customer_email, access_key, delivery_mode, delivery_content, delivery_filename, delivery_fields'
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!mid.error && mid.data) {
      return (mid.data as DbOrderRow[]).map(mapOrderRow);
    }

    const legacy = await supabaseAdmin
      .from('orders')
      .select(
        'id, order_code, created_at, status, items, subtotal, discount, total, promo_code, customer_email, access_key'
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!legacy.error && legacy.data) {
      return (legacy.data as DbOrderRow[]).map(mapOrderRow);
    }

    return null;
  }

  // Helper: ensure and fetch authoritative profile row for the authenticated user
  async function ensureAndFetchUserProfile(verifiedUser: {
    id: string;
    email?: string;
    fullName?: string;
    avatarUrl?: string;
  }): Promise<UserProfile> {
    if (supabaseAdmin) {
      const { data: existing, error: selectErr } = await supabaseAdmin
        .from('profiles')
        .select('id, email, full_name, avatar_url, wallet_credits, created_at')
        .eq('id', verifiedUser.id)
        .maybeSingle();

      if (!selectErr && existing) {
        const row = existing as Record<string, unknown>;
        const existingEmail = String(row.email ?? '').trim();
        const existingAvatar = row.avatar_url ? String(row.avatar_url) : '';
        if (
          (!existingEmail && verifiedUser.email) ||
          (!existingAvatar && verifiedUser.avatarUrl)
        ) {
          const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
          if (!existingEmail && verifiedUser.email) patch.email = verifiedUser.email;
          if (!existingAvatar && verifiedUser.avatarUrl) {
            patch.avatar_url = verifiedUser.avatarUrl;
          }
          await supabaseAdmin.from('profiles').update(patch).eq('id', verifiedUser.id);
        }
        return mapDbProfile({
          ...row,
          email: existingEmail || verifiedUser.email || '',
          avatar_url: existingAvatar || verifiedUser.avatarUrl || null,
        });
      }

      // Create profile row if missing without clobbering existing credits on race
      const nowIso = new Date().toISOString();
      await supabaseAdmin.from('profiles').upsert(
        {
          id: verifiedUser.id,
          email: verifiedUser.email || '',
          full_name: verifiedUser.fullName || 'ToolBazaar Member',
          avatar_url: verifiedUser.avatarUrl || null,
          wallet_credits: 0,
          created_at: nowIso,
          updated_at: nowIso,
        },
        { onConflict: 'id', ignoreDuplicates: true }
      );

      const { data: created } = await supabaseAdmin
        .from('profiles')
        .select('id, email, full_name, avatar_url, wallet_credits, created_at')
        .eq('id', verifiedUser.id)
        .maybeSingle();

      if (created) {
        return mapDbProfile(created as Record<string, unknown>);
      }

      const fallbackName = verifiedUser.fullName || 'ToolBazaar Member';
      return {
        id: verifiedUser.id,
        email: verifiedUser.email || '',
        fullName: fallbackName,
        avatarUrl: verifiedUser.avatarUrl,
        initials: getInitials(fallbackName, verifiedUser.email || ''),
        walletCredits: 0,
        createdAt: nowIso,
      };
    }

    // Preview in-memory store fallback
    const existingMem = memoryStore.users.find(
      (u) =>
        u.id === verifiedUser.id ||
        (verifiedUser.email && u.email.toLowerCase() === verifiedUser.email.toLowerCase())
    );
    if (existingMem) {
      return existingMem;
    }

    const fullName = verifiedUser.fullName || 'ToolBazaar Member';
    const createdMem: UserProfile = {
      id: verifiedUser.id,
      email: verifiedUser.email || '',
      fullName,
      avatarUrl: verifiedUser.avatarUrl,
      initials: getInitials(fullName, verifiedUser.email || ''),
      walletCredits: 0,
      createdAt: new Date().toISOString(),
    };
    memoryStore.users = [createdMem, ...memoryStore.users];
    memoryStore.mutated = true;
    return createdMem;
  }

  // Authenticated customer profile & real-time ToolBazaar Credits balance
  app.get('/api/me/profile', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const verifiedUser = await resolveVerifiedUserFromReq(req);
    if (!verifiedUser) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    try {
      const profile = await ensureAndFetchUserProfile(verifiedUser);
      res.json({ profile });
    } catch {
      res.status(500).json({ error: 'Could not load user profile.' });
    }
  });

  // Authenticated customer real-time orders list
  app.get('/api/me/orders', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const verifiedUser = await resolveVerifiedUserFromReq(req);
    if (!verifiedUser) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (supabaseAdmin) {
      const orders = await fetchSupabaseOrdersForUser(verifiedUser.id);
      if (orders !== null) {
        res.json({ orders });
        return;
      }
      res.status(500).json({ error: 'Could not load your orders from database.' });
      return;
    }

    const emailLower = (verifiedUser.email || '').toLowerCase();
    const ownOrders = memoryStore.orders.filter((o) => {
      const ownerId = memoryStore.orderOwners[o.id];
      if (ownerId) return ownerId === verifiedUser.id;
      return Boolean(emailLower && o.customerEmail.toLowerCase() === emailLower);
    });
    res.json({ orders: ownOrders });
  });

  // Authenticated server-authoritative checkout endpoint (My Balance & Payment Gateways)
  app.post('/api/orders', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const verifiedUser = await resolveVerifiedUserFromReq(req);
    if (!verifiedUser) {
      res.status(401).json({ error: 'Please sign in with Google to complete checkout.' });
      return;
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const rawEmail = cleanText(body.customerEmail, verifiedUser.email || '', 160);
    if (!rawEmail || !rawEmail.includes('@') || !rawEmail.includes('.')) {
      res.status(400).json({ error: 'Enter a valid email address for license delivery.' });
      return;
    }

    // Load authoritative catalog, site settings & payment gateways
    let dbTools: ToolProduct[] = [];
    const dbToolIdSet = new Set<string>();
    const [authoritativeSettings, activeGateways] = await Promise.all([
      fetchSiteSettingsAuthoritative(),
      fetchPaymentGatewaysAuthoritative(true),
    ]);
    const vipCouponCode = authoritativeSettings.vipCouponCode;
    const vipCouponPercent =
      authoritativeSettings.themeConfig?.couponDiscountPercent ?? 20;

    if (supabaseAdmin) {
      const toolsRes = await supabaseAdmin
        .from('tools')
        .select(
          'id, name, badge_text, subtitle, description, category_id, brand_key, logo_url, original_price, price, discount_percent, available, sold, trending, delivery_type, features, plans, theme, sort_order, is_active'
        )
        .eq('is_active', true);

      if (!toolsRes.error && toolsRes.data) {
        dbTools = (toolsRes.data as DbToolRow[]).map(mapToolRow);
        for (const t of dbTools) dbToolIdSet.add(t.id);
      }
    }

    // Merge DB tools (priority) with starter/demo catalog so storefront demo products also purchase cleanly
    const mergedCatalog: ToolProduct[] = [
      ...dbTools,
      ...memoryStore.tools.filter((t) => !dbToolIdSet.has(t.id)),
    ];

    const checkout = resolveCheckoutItemsAndTotals({
      requestedItems: body.items,
      catalogTools: mergedCatalog,
      promoCode: body.promoCode,
      vipCouponCode,
      vipCouponPercent,
    });
    if (!checkout.ok) {
      res.status(400).json({ error: checkout.error });
      return;
    }

    const profile = await ensureAndFetchUserProfile(verifiedUser);
    const paymentCheck = validateServerOrderPayment({
      paymentMethod: body.paymentMethod,
      walletCredits: profile.walletCredits,
      total: checkout.total,
      paymentGatewayId: body.paymentGatewayId,
      activeGateways,
      paymentTrxId: body.paymentTrxId,
      paymentProofUrl: body.paymentProofUrl,
    });
    if (!paymentCheck.ok) {
      res.status(400).json({ error: paymentCheck.error });
      return;
    }

    const nowIso = new Date().toISOString();
    const orderCode = buildOrderCode(Date.now(), crypto.randomBytes(4).toString('hex'));
    const accessKey = buildAccessKeyFromHex(crypto.randomBytes(8).toString('hex'));

    if (supabaseAdmin) {
      let deductedBalance = false;
      let finalWalletCredits = profile.walletCredits;

      if (paymentCheck.paymentMethod === 'balance') {
        const nextCredits = Math.max(0, profile.walletCredits - checkout.total);
        const { data: deductedRow, error: deductErr } = await supabaseAdmin
          .from('profiles')
          .update({
            wallet_credits: nextCredits,
            updated_at: nowIso,
          })
          .eq('id', verifiedUser.id)
          .eq('wallet_credits', profile.walletCredits)
          .gte('wallet_credits', checkout.total)
          .select('wallet_credits')
          .maybeSingle();

        if (deductErr || !deductedRow) {
          res.status(409).json({
            error:
              'Your credit balance changed or is insufficient. Please refresh and try again.',
          });
          return;
        }
        deductedBalance = true;
        finalWalletCredits = Math.max(0, Math.round(Number(deductedRow.wallet_credits ?? nextCredits)));
      }

      // Try automatic .txt account assignment from product_accounts pool for paid automatic orders
      const assignedAccountIds: string[] = [];
      let combinedContent = '';
      let firstFilename: string | null = null;
      const combinedFields: { label: string; value: string }[] = [];

      if (paymentCheck.paymentMethod === 'balance' && !checkout.hasManualPlan) {
        let allPoolFound = checkout.items.length > 0;
        for (const item of checkout.items) {
          const { data: poolRows, error: poolErr } = await supabaseAdmin
            .from('product_accounts')
            .select('id, file_name, account_content, account_fields')
            .eq('tool_id', item.toolId)
            .eq('plan_id', item.planId)
            .eq('status', 'available')
            .order('created_at', { ascending: true })
            .limit(item.quantity);

          if (poolErr || !poolRows || poolRows.length < item.quantity) {
            allPoolFound = false;
            break;
          }

          for (const acc of poolRows) {
            assignedAccountIds.push(String(acc.id));
            if (!firstFilename) firstFilename = String(acc.file_name || 'account.txt');
            if (combinedContent) combinedContent += '\n\n---\n\n';
            combinedContent += String(acc.account_content || '');
            if (Array.isArray(acc.account_fields)) {
              for (const f of sanitizeDeliveryFields(acc.account_fields)) {
                combinedFields.push(f);
              }
            }
          }
        }
        if (!allPoolFound) {
          assignedAccountIds.length = 0;
          combinedContent = '';
          firstFilename = null;
          combinedFields.length = 0;
        }
      }

      const outcome = determineInitialOrderOutcome({
        paymentMethod: paymentCheck.paymentMethod,
        hasManualPlan: checkout.hasManualPlan,
        autoAssignedFromPool: assignedAccountIds.length > 0,
      });

      const baseInsertPayload = {
        user_id: verifiedUser.id,
        order_code: orderCode,
        customer_email: rawEmail,
        items: checkout.items,
        subtotal: checkout.subtotal,
        discount: checkout.discount,
        total: checkout.total,
        promo_code: checkout.appliedPromo,
        status: outcome.status,
        access_key: accessKey,
      };

      const deliveryPatch = {
        delivery_mode: outcome.deliveryMode,
        delivery_content: combinedContent || null,
        delivery_filename: firstFilename,
        delivery_fields: combinedFields,
      };

      const paymentPatch = {
        payment_method: paymentCheck.paymentMethod,
        payment_status: outcome.paymentStatus,
        payment_gateway_id: paymentCheck.gateway?.id ?? null,
        payment_gateway_name: paymentCheck.gateway?.name ?? null,
        payment_currency: paymentCheck.gateway?.currency ?? null,
        payment_trx_id: paymentCheck.paymentTrxId ?? null,
        payment_proof_url: paymentCheck.paymentProofUrl ?? null,
      };

      let insertedRow: (DbOrderRow & { id?: string }) | null = null;

      // Tier 1: Full schema (payment + delivery columns)
      const tier1 = await supabaseAdmin
        .from('orders')
        .insert({ ...baseInsertPayload, ...deliveryPatch, ...paymentPatch })
        .select(
          'id, order_code, created_at, status, items, subtotal, discount, total, promo_code, customer_email, access_key, delivery_mode, delivery_content, delivery_filename, delivery_fields, payment_method, payment_status, payment_gateway_id, payment_gateway_name, payment_currency, payment_trx_id, payment_proof_url, payment_note'
        )
        .single();

      if (!tier1.error && tier1.data) {
        insertedRow = tier1.data as DbOrderRow & { id?: string };
      } else {
        // Tier 2: Delivery columns without payment columns
        const tier2 = await supabaseAdmin
          .from('orders')
          .insert({ ...baseInsertPayload, ...deliveryPatch })
          .select(
            'id, order_code, created_at, status, items, subtotal, discount, total, promo_code, customer_email, access_key, delivery_mode, delivery_content, delivery_filename, delivery_fields'
          )
          .single();

        if (!tier2.error && tier2.data) {
          insertedRow = tier2.data as DbOrderRow & { id?: string };
        } else {
          // Tier 3: Legacy core orders schema
          const tier3 = await supabaseAdmin
            .from('orders')
            .insert(baseInsertPayload)
            .select(
              'id, order_code, created_at, status, items, subtotal, discount, total, promo_code, customer_email, access_key'
            )
            .single();

          if (!tier3.error && tier3.data) {
            insertedRow = tier3.data as DbOrderRow & { id?: string };
          }
        }
      }

      if (!insertedRow) {
        // Roll back balance deduction so user never loses credits on DB insert error
        if (deductedBalance) {
          await supabaseAdmin
            .from('profiles')
            .update({
              wallet_credits: profile.walletCredits,
              updated_at: new Date().toISOString(),
            })
            .eq('id', verifiedUser.id);
        }
        res.status(500).json({
          error: 'Could not save order in Supabase database. Please try again.',
        });
        return;
      }

      // Mark pool accounts as assigned if used
      if (assignedAccountIds.length > 0 && insertedRow.id) {
        await supabaseAdmin
          .from('product_accounts')
          .update({
            status: 'assigned',
            assigned_order_id: insertedRow.id,
            assigned_user_id: verifiedUser.id,
            assigned_at: nowIso,
          })
          .in('id', assignedAccountIds);
      }

      // Update inventory on DB tools (and mirror into memoryStore)
      for (const [toolId, qty] of Object.entries(checkout.qtyByToolId)) {
        if (dbToolIdSet.has(toolId)) {
          const matchedDbTool = dbTools.find((t) => t.id === toolId);
          if (matchedDbTool) {
            await supabaseAdmin
              .from('tools')
              .update({
                available: Math.max(0, matchedDbTool.available - qty),
                sold: matchedDbTool.sold + qty,
                updated_at: nowIso,
              })
              .eq('id', toolId);
          }
        }
        memoryStore.tools = memoryStore.tools.map((t) =>
          t.id === toolId
            ? { ...t, available: Math.max(0, t.available - qty), sold: t.sold + qty }
            : t
        );
      }

      // Best-effort customer notification
      try {
        await supabaseAdmin.from('notifications').upsert(
          {
            id: `notif-order-${orderCode}`,
            user_id: verifiedUser.id,
            title:
              paymentCheck.paymentMethod === 'gateway'
                ? `Order #${orderCode} Payment Submitted`
                : outcome.status === 'Pending'
                  ? `Order #${orderCode} Pending Admin Delivery`
                  : `Order #${orderCode} Delivered`,
            message:
              paymentCheck.paymentMethod === 'gateway'
                ? `Your ${paymentCheck.gateway?.name || 'gateway'} payment is pending admin verification.`
                : outcome.status === 'Pending'
                  ? 'Payment received via My Balance. Admin will deliver your account inside My Orders.'
                  : `Order confirmed! Access key ${accessKey} is ready inside My Orders.`,
            time_label: 'Just now',
            read: false,
            accent: paymentCheck.paymentMethod === 'gateway' ? 'amber' : 'green',
          },
          { onConflict: 'id' }
        );
      } catch {
        // Non-blocking notification failure
      }

      const mappedOrder: OrderRecord = {
        ...mapOrderRow(insertedRow),
        paymentMethod: paymentCheck.paymentMethod,
        paymentStatus: outcome.paymentStatus,
        paymentGatewayId: paymentCheck.gateway?.id,
        paymentGatewayName: paymentCheck.gateway?.name,
        paymentCurrency: paymentCheck.gateway?.currency,
        paymentTrxId: paymentCheck.paymentTrxId,
        paymentProofUrl: paymentCheck.paymentProofUrl,
      };

      res.status(201).json({
        order: mappedOrder,
        walletCredits: finalWalletCredits,
      });
      return;
    }

    // Preview in-memory fallback (works cleanly when Supabase Admin is not configured)
    const outcome = determineInitialOrderOutcome({
      paymentMethod: paymentCheck.paymentMethod,
      hasManualPlan: checkout.hasManualPlan,
      autoAssignedFromPool: false,
    });

    let finalWalletCredits = profile.walletCredits;
    if (paymentCheck.paymentMethod === 'balance') {
      finalWalletCredits = Math.max(0, profile.walletCredits - checkout.total);
      memoryStore.users = memoryStore.users.map((u) =>
        u.id === profile.id ? { ...u, walletCredits: finalWalletCredits } : u
      );
    }

    for (const [toolId, qty] of Object.entries(checkout.qtyByToolId)) {
      memoryStore.tools = memoryStore.tools.map((t) =>
        t.id === toolId
          ? { ...t, available: Math.max(0, t.available - qty), sold: t.sold + qty }
          : t
      );
    }

    const memOrder: OrderRecord = {
      id: orderCode,
      createdAt: nowIso,
      status: outcome.status,
      items: checkout.items,
      subtotal: checkout.subtotal,
      discount: checkout.discount,
      total: checkout.total,
      promoCode: checkout.appliedPromo ?? undefined,
      customerEmail: rawEmail,
      accessKey,
      deliveryMode: outcome.deliveryMode,
      paymentMethod: paymentCheck.paymentMethod,
      paymentStatus: outcome.paymentStatus,
      paymentGatewayId: paymentCheck.gateway?.id,
      paymentGatewayName: paymentCheck.gateway?.name,
      paymentCurrency: paymentCheck.gateway?.currency,
      paymentTrxId: paymentCheck.paymentTrxId,
      paymentProofUrl: paymentCheck.paymentProofUrl,
    };

    memoryStore.orders = [memOrder, ...memoryStore.orders];
    memoryStore.orderOwners[memOrder.id] = verifiedUser.id;
    memoryStore.notifications = [
      {
        id: `notif-order-${memOrder.id}`,
        title:
          paymentCheck.paymentMethod === 'gateway'
            ? `Order #${memOrder.id} Payment Submitted`
            : `Order #${memOrder.id} Delivered`,
        message:
          paymentCheck.paymentMethod === 'gateway'
            ? `Your ${paymentCheck.gateway?.name || 'gateway'} payment is pending admin verification.`
            : `Activation key ${memOrder.accessKey} is active in My Orders.`,
        time: 'Just now',
        read: false,
        accent: paymentCheck.paymentMethod === 'gateway' ? 'amber' : 'green',
      },
      ...memoryStore.notifications,
    ];
    memoryStore.mutated = true;

    res.status(201).json({
      order: memOrder,
      walletCredits: finalWalletCredits,
    });
  });

  // Public + author-scoped Product Reviews listing
  // Returns all 'approved' reviews PLUS caller's own 'pending' reviews only.
  app.get('/api/reviews', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const toolIdFilter =
      typeof req.query.toolId === 'string' ? req.query.toolId.trim() : '';
    const verifiedUser = await resolveVerifiedUserFromReq(req);

    let allRows: ProductReview[] = [];
    if (supabaseAdmin) {
      let query = supabaseAdmin
        .from('product_reviews')
        .select(
          'id, tool_id, order_id, user_id, author_name, author_email, rating, comment, screenshot_url, review_date, status, source, verified, created_at'
        )
        .order('review_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(400);

      if (toolIdFilter) {
        query = query.eq('tool_id', toolIdFilter);
      }

      const { data, error } = await query;
      if (!error && data) {
        allRows = (data as DbReviewRow[]).map(mapReviewRow);
      } else {
        allRows = memoryStore.reviews;
      }
    } else {
      allRows = memoryStore.reviews;
    }

    const visible = allRows.filter((rev) => {
      if (toolIdFilter && rev.toolId !== toolIdFilter) return false;
      if (rev.status === 'approved') return true;
      if (rev.status === 'pending' && verifiedUser && rev.userId === verifiedUser.id) {
        return true;
      }
      return false;
    });

    res.json({ reviews: visible });
  });

  // Authenticated customer review screenshot upload endpoint
  app.post('/api/reviews/upload-screenshot', async (req, res) => {
    const verifiedUser = await resolveVerifiedUserFromReq(req);
    if (supabaseAdmin && !verifiedUser) {
      res.status(401).json({ error: 'Please sign in to upload a review screenshot.' });
      return;
    }
    const body = (req.body || {}) as Record<string, unknown>;
    const saved = await persistValidatedImage('reviews', body.dataBase64);
    if (!saved.ok) {
      res.status(saved.status).json({ error: saved.error });
      return;
    }
    res.status(201).json({ url: saved.url });
  });

  // Verified buyer submits a product review (always stored with status='pending', source='user')
  app.post('/api/reviews', async (req, res) => {
    const verifiedUser = await resolveVerifiedUserFromReq(req);
    if (!verifiedUser) {
      res.status(401).json({ error: 'Please sign in to submit a product review.' });
      return;
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const check = validateReviewInput({
      toolId: body.toolId,
      authorName: verifiedUser.fullName || body.authorName,
      rating: body.rating,
      comment: body.comment,
      requireAuthorName: false,
    });
    if (!check.ok) {
      res.status(400).json({ error: check.error });
      return;
    }

    const orderId = cleanText(body.orderId, '', 80) || undefined;
    const rawScreenshot =
      typeof body.screenshotUrl === 'string' ? body.screenshotUrl.trim() : '';
    const screenshotUrl = rawScreenshot ? sanitizeSafeMediaUrl(rawScreenshot) : undefined;
    if (rawScreenshot && !screenshotUrl) {
      res.status(400).json({ error: 'Screenshot URL must start with https:// or /' });
      return;
    }

    if (supabaseAdmin) {
      // Verify the signed-in user genuinely has a Delivered/Active order containing this tool
      const { data: userOrders, error: orderErr } = await supabaseAdmin
        .from('orders')
        .select('id, order_code, status, items')
        .eq('user_id', verifiedUser.id)
        .in('status', ['Delivered', 'Active'])
        .limit(100);

      if (orderErr) {
        res.status(400).json({ error: 'Could not verify your purchase history.' });
        return;
      }

      const matchingOrder = (userOrders || []).find((ord) => {
        const items = Array.isArray(ord.items) ? ord.items : [];
        const hasTool = items.some((it) => {
          const obj = (it && typeof it === 'object' ? it : {}) as Record<string, unknown>;
          return String(obj.toolId ?? obj.tool_id ?? '') === check.toolId;
        });
        if (!hasTool) return false;
        if (orderId) {
          return String(ord.order_code || ord.id) === orderId || String(ord.id) === orderId;
        }
        return true;
      });

      if (!matchingOrder) {
        res.status(403).json({
          error: 'Only verified buyers who have received this product can leave a review.',
        });
        return;
      }

      const resolvedOrderCode = String(matchingOrder.order_code || matchingOrder.id);

      // Prevent duplicate reviews for the exact same order + product
      const { data: existingDup } = await supabaseAdmin
        .from('product_reviews')
        .select('id')
        .eq('user_id', verifiedUser.id)
        .eq('tool_id', check.toolId)
        .eq('order_id', resolvedOrderCode)
        .limit(1);

      if (existingDup && existingDup.length > 0) {
        res.status(409).json({
          error: 'You have already submitted a review for this order item.',
        });
        return;
      }

      const newReview: ProductReview = {
        id: `rev-${crypto.randomUUID()}`,
        toolId: check.toolId,
        orderId: resolvedOrderCode,
        userId: verifiedUser.id,
        authorName: verifiedUser.fullName || check.authorName,
        authorEmail: verifiedUser.email,
        rating: check.rating,
        comment: check.comment,
        screenshotUrl,
        reviewDate: getTodayDateString(),
        status: 'pending',
        source: 'user',
        verified: true,
        createdAt: new Date().toISOString(),
      };

      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from('product_reviews')
        .insert({
          id: newReview.id,
          tool_id: newReview.toolId,
          order_id: newReview.orderId,
          user_id: newReview.userId,
          author_name: newReview.authorName,
          author_email: newReview.authorEmail ?? null,
          rating: newReview.rating,
          comment: newReview.comment,
          screenshot_url: newReview.screenshotUrl ?? null,
          review_date: newReview.reviewDate,
          status: 'pending',
          source: 'user',
          verified: true,
        })
        .select(
          'id, tool_id, order_id, user_id, author_name, author_email, rating, comment, screenshot_url, review_date, status, source, verified, created_at'
        )
        .single();

      if (insertErr || !inserted) {
        res.status(400).json({
          error:
            'Could not save review to Supabase. Please run the product_reviews SQL table from Admin Panel -> Reviews.',
        });
        return;
      }

      res.status(201).json({ review: mapReviewRow(inserted as DbReviewRow) });
      return;
    }

    // Preview in-memory fallback (still forces status='pending', source='user')
    const dupMem = memoryStore.reviews.find(
      (r) =>
        r.userId === verifiedUser.id &&
        r.toolId === check.toolId &&
        orderId &&
        r.orderId === orderId
    );
    if (dupMem) {
      res.status(409).json({
        error: 'You have already submitted a review for this order item.',
      });
      return;
    }

    const review: ProductReview = {
      id: `rev-${crypto.randomUUID()}`,
      toolId: check.toolId,
      orderId,
      userId: verifiedUser.id,
      authorName: verifiedUser.fullName || check.authorName,
      authorEmail: verifiedUser.email,
      rating: check.rating,
      comment: check.comment,
      screenshotUrl,
      reviewDate: getTodayDateString(),
      status: 'pending',
      source: 'user',
      verified: true,
      createdAt: new Date().toISOString(),
    };

    memoryStore.reviews = [review, ...memoryStore.reviews];
    memoryStore.mutated = true;
    res.status(201).json({ review });
  });

  // Preview storefront fallback when admin edited in-memory data before service role key is set
  app.get('/api/storefront-overrides', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (supabaseAdmin || !memoryStore.mutated) {
      res.json({ active: false });
      return;
    }
    res.json({
      active: true,
      settings: memoryStore.settings,
      categories: memoryStore.categories,
      banners: memoryStore.banners,
      tools: memoryStore.tools,
      notifications: memoryStore.notifications,
      paymentGateways: memoryStore.paymentGateways.filter((g) => g.isActive),
    });
  });

  // ==========================================================================
  // ADMIN AUTHENTICATION ENDPOINTS
  // ==========================================================================

  app.get('/api/admin/status', async (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const envCreds = getEnvAdminCredentials();
    if (envCreds) {
      res.json({
        needsSetup: false,
        envConfigured: true,
        supabaseAdminConnected: Boolean(supabaseAdmin),
      });
      return;
    }
    const stored = await getStoredAdminAccount();
    res.json({
      needsSetup: !stored,
      envConfigured: false,
      supabaseAdminConnected: Boolean(supabaseAdmin),
    });
  });

  // One-time atomic first-run admin claim (locks itself immediately once claimed or env configured)
  app.post('/api/admin/setup', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (getEnvAdminCredentials()) {
      res.status(403).json({ error: 'Admin credentials are already configured.' });
      return;
    }

    const existing = await getStoredAdminAccount();
    if (existing) {
      res.status(403).json({ error: 'Admin account is already set up. Please sign in.' });
      return;
    }

    const check = validateAdminCredentialsInput(req.body?.username, req.body?.password);
    if (!check.ok) {
      res.status(400).json({ error: check.error });
      return;
    }

    const passwordHash = hashPassword(check.password);

    if (supabaseAdmin) {
      const { error } = await supabaseAdmin.from('admin_accounts').insert({
        username: check.username,
        password_hash: passwordHash,
      });
      if (error && error.code === '23505') {
        res.status(403).json({ error: 'Admin account already exists. Please sign in.' });
        return;
      }
    }

    memoryStore.adminAccount = {
      username: check.username,
      passwordHash,
    };

    const token = createAdminToken(check.username, ADMIN_SESSION_SECRET);
    res.status(201).json({
      token,
      username: check.username,
      supabaseAdminConnected: Boolean(supabaseAdmin),
    });
  });

  app.post('/api/admin/login', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (!checkLoginRateLimit(clientIp)) {
      res.status(429).json({ error: 'Too many login attempts. Please wait a few minutes.' });
      return;
    }

    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required.' });
      return;
    }

    const envCreds = getEnvAdminCredentials();
    if (envCreds) {
      const userOk = safeEqualStrings(username.toLowerCase(), envCreds.username.toLowerCase());
      const passOk = safeEqualStrings(password, envCreds.password);
      if (!userOk || !passOk) {
        res.status(401).json({ error: 'Invalid username or password.' });
        return;
      }
      const token = createAdminToken(envCreds.username, ADMIN_SESSION_SECRET);
      res.json({
        token,
        username: envCreds.username,
        supabaseAdminConnected: Boolean(supabaseAdmin),
      });
      return;
    }

    const stored = await getStoredAdminAccount();
    if (!stored) {
      res.status(409).json({ error: 'Admin setup is required before signing in.' });
      return;
    }

    const userOk = safeEqualStrings(username.toLowerCase(), stored.username.toLowerCase());
    const passOk = verifyPassword(password, stored.passwordHash);
    if (!userOk || !passOk) {
      res.status(401).json({ error: 'Invalid username or password.' });
      return;
    }

    const token = createAdminToken(stored.username, ADMIN_SESSION_SECRET);
    res.json({
      token,
      username: stored.username,
      supabaseAdminConnected: Boolean(supabaseAdmin),
    });
  });

  app.get('/api/admin/session', requireAdminAuth, (req: AdminAuthedRequest, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      ok: true,
      username: req.adminUsername,
      supabaseAdminConnected: Boolean(supabaseAdmin),
    });
  });

  // ==========================================================================
  // PROTECTED ADMIN CRUD ENDPOINTS
  // ==========================================================================

  app.get('/api/admin/overview', requireAdminAuth, async (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const data = await fetchAdminOverviewData();
      res.json(data);
    } catch {
      res.status(500).json({ error: 'Failed to load admin dashboard data.' });
    }
  });

  // 1. SITE SETTINGS (including Storefront Theme & Neon Creator Customizer)
  app.put('/api/admin/settings', requireAdminAuth, async (req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const current = await fetchSiteSettingsAuthoritative();
    const hasThemePayload =
      body.activeTheme !== undefined || body.themeConfig !== undefined;

    const nextSettings: SiteSettings = {
      id: 'main',
      siteName: cleanText(body.siteName, current.siteName || DEFAULT_SITE_SETTINGS.siteName, 60),
      siteTagline: cleanText(
        body.siteTagline,
        current.siteTagline || DEFAULT_SITE_SETTINGS.siteTagline,
        120
      ),
      supportEmail: cleanText(
        body.supportEmail,
        current.supportEmail || DEFAULT_SITE_SETTINGS.supportEmail,
        120
      ),
      vipCouponCode: cleanText(
        body.vipCouponCode,
        current.vipCouponCode || DEFAULT_SITE_SETTINGS.vipCouponCode,
        32
      ).toUpperCase(),
      vipCouponText: cleanText(
        body.vipCouponText,
        current.vipCouponText || DEFAULT_SITE_SETTINGS.vipCouponText,
        220
      ),
      activeTheme:
        body.activeTheme !== undefined
          ? normalizeThemeId(body.activeTheme)
          : current.activeTheme ?? 'classic',
      themeConfig:
        body.themeConfig !== undefined
          ? normalizeThemeConfig(body.themeConfig)
          : current.themeConfig ?? { ...DEFAULT_NEON_CREATOR_CONFIG },
      updatedAt: new Date().toISOString(),
    };

    if (supabaseAdmin) {
      const fullUpsert = await supabaseAdmin.from('site_settings').upsert(
        {
          id: 'main',
          site_name: nextSettings.siteName,
          site_tagline: nextSettings.siteTagline,
          support_email: nextSettings.supportEmail,
          vip_coupon_code: nextSettings.vipCouponCode,
          vip_coupon_text: nextSettings.vipCouponText,
          active_theme: nextSettings.activeTheme,
          theme_config: nextSettings.themeConfig,
          updated_at: nextSettings.updatedAt,
        },
        { onConflict: 'id' }
      );

      if (fullUpsert.error) {
        const errText = `${fullUpsert.error.message || ''} ${fullUpsert.error.details || ''}`.toLowerCase();
        const isMissingThemeCols =
          errText.includes('active_theme') ||
          errText.includes('theme_config') ||
          fullUpsert.error.code === '42703' ||
          fullUpsert.error.code === 'PGRST204';

        if (isMissingThemeCols && hasThemePayload) {
          res.status(400).json({
            error:
              'Please run the Supabase SQL update to add active_theme and theme_config columns to site_settings first.',
          });
          return;
        }

        if (isMissingThemeCols) {
          const legacyUpsert = await supabaseAdmin.from('site_settings').upsert(
            {
              id: 'main',
              site_name: nextSettings.siteName,
              site_tagline: nextSettings.siteTagline,
              support_email: nextSettings.supportEmail,
              vip_coupon_code: nextSettings.vipCouponCode,
              vip_coupon_text: nextSettings.vipCouponText,
              updated_at: nextSettings.updatedAt,
            },
            { onConflict: 'id' }
          );
          if (legacyUpsert.error) {
            res.status(400).json({ error: 'Could not save site settings to Supabase.' });
            return;
          }
        } else {
          res.status(400).json({ error: 'Could not save site settings to Supabase.' });
          return;
        }
      }
    }

    memoryStore.settings = nextSettings;
    memoryStore.mutated = true;
    res.json({ settings: nextSettings });
  });

  // 2. TOOLS (PRODUCTS) CRUD
  function parseToolPayload(body: Record<string, unknown>, existingId?: string) {
    const name = cleanText(body.name, '', 80);
    if (!name) return { error: 'Tool name is required.' as const };

    const rawCategory = cleanText(body.category, 'ai', 32).toLowerCase() as Exclude<CategoryId, 'all'>;
    const category: Exclude<CategoryId, 'all'> = VALID_TOOL_CATEGORIES.has(rawCategory)
      ? rawCategory
      : 'more';

    const rawBrand = cleanText(body.brand, 'chatgpt', 32).toLowerCase() as BrandKey;
    const brand: BrandKey = VALID_BRANDS.has(rawBrand) ? rawBrand : 'chatgpt';

    const originalPrice = clampInt(body.originalPrice, 999, 0, 1_000_000);
    const price = clampInt(body.price, 499, 0, 1_000_000);
    const discountPercent =
      body.discountPercent !== undefined && body.discountPercent !== ''
        ? clampInt(body.discountPercent, calculateDiscountPercent(originalPrice, price), 0, 100)
        : calculateDiscountPercent(originalPrice, price);

    const available = clampInt(body.available, 25, 0, 100_000);
    const sold = clampInt(body.sold, 0, 0, 1_000_000);

    const rawLogo = typeof body.logoUrl === 'string' ? body.logoUrl.trim() : '';
    const logoUrl = rawLogo ? sanitizeSafeMediaUrl(rawLogo) : undefined;
    if (rawLogo && !logoUrl) {
      return { error: 'Logo URL must start with https:// or /' as const };
    }

    const features: string[] = Array.isArray(body.features)
      ? body.features
          .map((f) => cleanText(f, '', 140))
          .filter(Boolean)
          .slice(0, 10)
      : ['Official verified activation', 'Instant delivery after checkout'];

    const plans: PlanOption[] =
      Array.isArray(body.plans) && body.plans.length > 0
        ? body.plans.slice(0, 10).map((p, idx) => {
            const obj = (p && typeof p === 'object' ? p : {}) as Record<string, unknown>;
            const rawMode = cleanText(obj.deliveryMode, 'automatic', 20).toLowerCase();
            const deliveryMode: DeliveryMode = rawMode === 'manual' ? 'manual' : 'automatic';
            const planDesc = cleanText(obj.description, '', 160);
            return {
              id: slugifyId(String(obj.id || obj.label || `plan-${idx + 1}`), 'plan'),
              label: cleanText(obj.label, idx === 0 ? '1 Month' : `${idx + 1} Months`, 48),
              months: clampInt(obj.months, 1, 1, 60),
              price: clampInt(obj.price, price, 0, 1_000_000),
              originalPrice: clampInt(obj.originalPrice, originalPrice, 0, 1_000_000),
              description: planDesc || undefined,
              deliveryMode,
            };
          })
        : [
            {
              id: '1m',
              label: '1 Month',
              months: 1,
              price,
              originalPrice,
              deliveryMode: 'automatic',
            },
          ];

    const id = existingId || slugifyId(cleanText(body.id, name, 64), 'tool');
    const existingTool = memoryStore.tools.find((t) => t.id === id);

    const tool: ToolProduct = {
      id,
      name,
      badgeText: cleanText(body.badgeText, 'Premium', 32),
      subtitle: cleanText(body.subtitle, 'Official Instant Access', 120),
      description: cleanText(body.description, 'Official verified digital tool subscription with instant activation.', 500),
      category,
      brand,
      logoUrl,
      originalPrice,
      price,
      discountPercent,
      available,
      sold,
      trending: Boolean(body.trending),
      deliveryType: cleanText(body.deliveryType, 'Instant Delivery', 48),
      features: features.length > 0 ? features : ['Official verified activation'],
      plans,
      theme: existingTool?.theme || {
        cardBg:
          'linear-gradient(145deg, rgba(139, 92, 246, 0.24) 0%, rgba(20, 18, 38, 0.95) 55%, rgba(16, 14, 30, 0.98) 100%)',
        cardBorder: 'rgba(167, 139, 250, 0.42)',
        glowColor: 'rgba(139, 92, 246, 0.24)',
      },
    };

    return { tool };
  }

  app.post('/api/admin/tools', requireAdminAuth, async (req, res) => {
    const parsed = parseToolPayload((req.body || {}) as Record<string, unknown>);
    if ('error' in parsed) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const { tool } = parsed;

    if (supabaseAdmin) {
      const { error } = await supabaseAdmin.from('tools').upsert(
        {
          id: tool.id,
          name: tool.name,
          badge_text: tool.badgeText,
          subtitle: tool.subtitle,
          description: tool.description,
          category_id: tool.category,
          brand_key: tool.brand,
          logo_url: tool.logoUrl ?? null,
          original_price: tool.originalPrice,
          price: tool.price,
          discount_percent: tool.discountPercent,
          available: tool.available,
          sold: tool.sold,
          trending: tool.trending,
          delivery_type: tool.deliveryType,
          features: tool.features,
          plans: tool.plans,
          theme: tool.theme,
          sort_order: memoryStore.tools.length + 1,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
      if (error) {
        res.status(400).json({ error: 'Could not create tool in Supabase.' });
        return;
      }
    }

    memoryStore.tools = [tool, ...memoryStore.tools.filter((t) => t.id !== tool.id)];
    memoryStore.mutated = true;
    res.status(201).json({ tool });
  });

  app.put('/api/admin/tools/:id', requireAdminAuth, async (req, res) => {
    const toolId = cleanText(req.params.id, '', 64);
    if (!toolId) {
      res.status(400).json({ error: 'Invalid tool ID.' });
      return;
    }
    const parsed = parseToolPayload((req.body || {}) as Record<string, unknown>, toolId);
    if ('error' in parsed) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const { tool } = parsed;

    if (supabaseAdmin) {
      const { error } = await supabaseAdmin
        .from('tools')
        .update({
          name: tool.name,
          badge_text: tool.badgeText,
          subtitle: tool.subtitle,
          description: tool.description,
          category_id: tool.category,
          brand_key: tool.brand,
          logo_url: tool.logoUrl ?? null,
          original_price: tool.originalPrice,
          price: tool.price,
          discount_percent: tool.discountPercent,
          available: tool.available,
          sold: tool.sold,
          trending: tool.trending,
          delivery_type: tool.deliveryType,
          features: tool.features,
          plans: tool.plans,
          updated_at: new Date().toISOString(),
        })
        .eq('id', toolId);

      if (error) {
        res.status(400).json({ error: 'Could not update tool in Supabase.' });
        return;
      }
    }

    const exists = memoryStore.tools.some((t) => t.id === toolId);
    memoryStore.tools = exists
      ? memoryStore.tools.map((t) => (t.id === toolId ? tool : t))
      : [tool, ...memoryStore.tools];
    memoryStore.mutated = true;
    res.json({ tool });
  });

  app.delete('/api/admin/tools/:id', requireAdminAuth, async (req, res) => {
    const toolId = cleanText(req.params.id, '', 64);
    if (!toolId) {
      res.status(400).json({ error: 'Invalid tool ID.' });
      return;
    }

    if (supabaseAdmin) {
      const { error } = await supabaseAdmin.from('tools').delete().eq('id', toolId);
      if (error) {
        res.status(400).json({ error: 'Could not delete tool from Supabase.' });
        return;
      }
    }

    memoryStore.tools = memoryStore.tools.filter((t) => t.id !== toolId);
    memoryStore.mutated = true;
    res.json({ ok: true, id: toolId });
  });

  // 3. CATEGORIES CRUD
  app.put('/api/admin/categories/:id', requireAdminAuth, async (req, res) => {
    const rawId = cleanText(req.params.id, '', 32).toLowerCase() as CategoryId;
    if (!VALID_CATEGORY_IDS.has(rawId)) {
      res.status(400).json({ error: 'Unsupported category ID.' });
      return;
    }
    const body = (req.body || {}) as Record<string, unknown>;
    const label = cleanText(body.label, '', 40);
    const description = cleanText(body.description, '', 180);
    if (!label) {
      res.status(400).json({ error: 'Category label is required.' });
      return;
    }

    const updated: CategoryItem = { id: rawId, label, description };

    if (supabaseAdmin) {
      const { error } = await supabaseAdmin
        .from('categories')
        .update({
          label: updated.label,
          description: updated.description,
          updated_at: new Date().toISOString(),
        })
        .eq('id', rawId);
      if (error) {
        res.status(400).json({ error: 'Could not update category in Supabase.' });
        return;
      }
    }

    memoryStore.categories = memoryStore.categories.map((c) =>
      c.id === rawId ? updated : c
    );
    memoryStore.mutated = true;
    res.json({ category: updated });
  });

  // 4. BANNERS CRUD
  app.post('/api/admin/banners', requireAdminAuth, async (req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const alt = cleanText(body.alt, 'ToolBazaar Promotional Banner', 140);
    const imageSrc = sanitizeSafeMediaUrl(body.imageSrc);
    if (!imageSrc) {
      res.status(400).json({ error: 'Banner image URL must start with https:// or /' });
      return;
    }
    const rawCat = cleanText(body.targetCategory, 'all', 32).toLowerCase() as CategoryId;
    const targetCategory: CategoryId = VALID_CATEGORY_IDS.has(rawCat) ? rawCat : 'all';
    const id = slugifyId(cleanText(body.id, alt, 48), 'banner');
    const borderGlow = cleanText(body.borderGlow, 'rgba(139, 92, 246, 0.45)', 64);

    const banner: HeroBannerData = { id, imageSrc, alt, targetCategory, borderGlow };

    if (supabaseAdmin) {
      const { error } = await supabaseAdmin.from('banners').upsert(
        {
          id,
          title: alt,
          image_url: imageSrc,
          target_category: targetCategory,
          border_glow: borderGlow,
          sort_order: memoryStore.banners.length + 1,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
      if (error) {
        res.status(400).json({ error: 'Could not save banner in Supabase.' });
        return;
      }
    }

    memoryStore.banners = [...memoryStore.banners.filter((b) => b.id !== id), banner];
    memoryStore.mutated = true;
    res.status(201).json({ banner });
  });

  app.put('/api/admin/banners/:id', requireAdminAuth, async (req, res) => {
    const bannerId = cleanText(req.params.id, '', 64);
    const body = (req.body || {}) as Record<string, unknown>;
    const alt = cleanText(body.alt, 'ToolBazaar Promotional Banner', 140);
    const imageSrc = sanitizeSafeMediaUrl(body.imageSrc);
    if (!bannerId || !imageSrc) {
      res.status(400).json({ error: 'Valid banner ID and https:// or / image URL required.' });
      return;
    }
    const rawCat = cleanText(body.targetCategory, 'all', 32).toLowerCase() as CategoryId;
    const targetCategory: CategoryId = VALID_CATEGORY_IDS.has(rawCat) ? rawCat : 'all';
    const borderGlow = cleanText(body.borderGlow, 'rgba(139, 92, 246, 0.45)', 64);

    const banner: HeroBannerData = { id: bannerId, imageSrc, alt, targetCategory, borderGlow };

    if (supabaseAdmin) {
      const { error } = await supabaseAdmin
        .from('banners')
        .update({
          title: alt,
          image_url: imageSrc,
          target_category: targetCategory,
          border_glow: borderGlow,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bannerId);
      if (error) {
        res.status(400).json({ error: 'Could not update banner in Supabase.' });
        return;
      }
    }

    memoryStore.banners = memoryStore.banners.map((b) => (b.id === bannerId ? banner : b));
    memoryStore.mutated = true;
    res.json({ banner });
  });

  app.delete('/api/admin/banners/:id', requireAdminAuth, async (req, res) => {
    const bannerId = cleanText(req.params.id, '', 64);
    if (!bannerId) {
      res.status(400).json({ error: 'Invalid banner ID.' });
      return;
    }
    if (supabaseAdmin) {
      const { error } = await supabaseAdmin.from('banners').delete().eq('id', bannerId);
      if (error) {
        res.status(400).json({ error: 'Could not delete banner from Supabase.' });
        return;
      }
    }
    memoryStore.banners = memoryStore.banners.filter((b) => b.id !== bannerId);
    memoryStore.mutated = true;
    res.json({ ok: true, id: bannerId });
  });

  // 5. USERS (PROFILES) MANAGEMENT
  app.put('/api/admin/users/:id', requireAdminAuth, async (req, res) => {
    const userId = cleanText(req.params.id, '', 80);
    const body = (req.body || {}) as Record<string, unknown>;
    const fullName = cleanText(body.fullName, '', 100);
    const walletCredits = clampInt(body.walletCredits, 0, 0, 10_000_000);

    if (!userId || !fullName) {
      res.status(400).json({ error: 'User ID and full name are required.' });
      return;
    }

    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .update({
          full_name: fullName,
          wallet_credits: walletCredits,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select('id, email, full_name, avatar_url, wallet_credits, created_at')
        .maybeSingle();

      if (error || !data) {
        res.status(400).json({ error: 'Could not update user profile in Supabase.' });
        return;
      }
      res.json({ user: mapDbProfile(data as Record<string, unknown>) });
      return;
    }

    let updatedUser: UserProfile | null = null;
    memoryStore.users = memoryStore.users.map((u) => {
      if (u.id !== userId) return u;
      updatedUser = {
        ...u,
        fullName,
        initials: getInitials(fullName, u.email),
        walletCredits,
      };
      return updatedUser;
    });
    if (!updatedUser) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    memoryStore.mutated = true;
    res.json({ user: updatedUser });
  });

  // 6. ORDERS STATUS & MANUAL FULFILLMENT MANAGEMENT
  app.put('/api/admin/orders/:id', requireAdminAuth, async (req, res) => {
    const orderKey = cleanText(req.params.id, '', 80);
    const rawStatus = cleanText((req.body || {}).status, '', 32) as OrderRecord['status'];
    if (!orderKey || !VALID_ORDER_STATUSES.has(rawStatus)) {
      res.status(400).json({
        error: 'Valid order ID and status (Pending, Processing, Active, Delivered) required.',
      });
      return;
    }

    if (supabaseAdmin) {
      const fullUpd = await supabaseAdmin
        .from('orders')
        .update({ status: rawStatus })
        .eq('order_code', orderKey)
        .select(
          'id, order_code, created_at, status, items, subtotal, discount, total, promo_code, customer_email, access_key, delivery_mode, delivery_content, delivery_filename, delivery_fields, payment_method, payment_status, payment_gateway_id, payment_gateway_name, payment_currency, payment_trx_id, payment_proof_url, payment_note'
        )
        .maybeSingle();

      if (!fullUpd.error && fullUpd.data) {
        res.json({ order: mapOrderRow(fullUpd.data as DbOrderRow) });
        return;
      }

      const legacyUpd = await supabaseAdmin
        .from('orders')
        .update({ status: rawStatus })
        .eq('order_code', orderKey)
        .select(
          'id, order_code, created_at, status, items, subtotal, discount, total, promo_code, customer_email, access_key'
        )
        .maybeSingle();

      if (legacyUpd.error || !legacyUpd.data) {
        res.status(400).json({ error: 'Could not update order status in Supabase.' });
        return;
      }
      res.json({ order: mapOrderRow(legacyUpd.data as DbOrderRow) });
      return;
    }

    let updatedOrder: OrderRecord | null = null;
    memoryStore.orders = memoryStore.orders.map((o) => {
      if (o.id !== orderKey) return o;
      updatedOrder = { ...o, status: rawStatus };
      return updatedOrder;
    });
    if (!updatedOrder) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    memoryStore.mutated = true;
    res.json({ order: updatedOrder });
  });

  app.post('/api/admin/orders/:id/fulfill', requireAdminAuth, async (req, res) => {
    const orderKey = cleanText(req.params.id, '', 80);
    const body = (req.body || {}) as Record<string, unknown>;
    const rawStatus = cleanText(body.status, 'Delivered', 32) as OrderRecord['status'];
    const status: OrderRecord['status'] = VALID_ORDER_STATUSES.has(rawStatus)
      ? rawStatus
      : 'Delivered';

    const deliveryContent =
      typeof body.deliveryContent === 'string'
        ? body.deliveryContent.trim().slice(0, 32_000)
        : '';
    const deliveryFields = sanitizeDeliveryFields(body.deliveryFields);
    const deliveryFilename = sanitizeTextFileName(
      body.deliveryFilename,
      `${orderKey.toLowerCase()}-account.txt`
    );

    if (!orderKey) {
      res.status(400).json({ error: 'Valid order ID is required.' });
      return;
    }
    if (!deliveryContent && deliveryFields.length === 0) {
      res.status(400).json({
        error: 'Upload a .txt file or enter account details/fields before approving.',
      });
      return;
    }

    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('orders')
        .update({
          status,
          delivery_mode: 'manual',
          delivery_content: deliveryContent || null,
          delivery_filename: deliveryFilename,
          delivery_fields: deliveryFields,
        })
        .eq('order_code', orderKey)
        .select(
          'id, user_id, order_code, created_at, status, items, subtotal, discount, total, promo_code, customer_email, access_key, delivery_mode, delivery_content, delivery_filename, delivery_fields'
        )
        .maybeSingle();

      if (error || !data) {
        res.status(400).json({
          error:
            'Could not save order delivery in Supabase. Make sure the latest SQL migration has been run.',
        });
        return;
      }

      const row = data as DbOrderRow & { user_id?: string | null };
      if (row.user_id) {
        await supabaseAdmin.from('notifications').upsert(
          {
            id: `notif-delivered-${orderKey}`,
            user_id: row.user_id,
            title: `Order #${orderKey} Approved & Delivered`,
            message: 'Your account file & details are now ready inside My Orders.',
            time_label: 'Just now',
            read: false,
            accent: 'green',
          },
          { onConflict: 'id' }
        );
      }

      res.json({ order: mapOrderRow(row) });
      return;
    }

    let updatedOrder: OrderRecord | null = null;
    memoryStore.orders = memoryStore.orders.map((o) => {
      if (o.id !== orderKey) return o;
      updatedOrder = {
        ...o,
        status,
        deliveryMode: 'manual',
        deliveryContent: deliveryContent || undefined,
        deliveryFilename,
        deliveryFields: deliveryFields.length > 0 ? deliveryFields : undefined,
      };
      return updatedOrder;
    });
    if (!updatedOrder) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    memoryStore.mutated = true;
    res.json({ order: updatedOrder });
  });

  // 6c. PAYMENT APPROVAL / REJECTION (Admin approves gateway payment -> auto-delivers .txt if available!)
  app.post('/api/admin/orders/:id/payment-decision', requireAdminAuth, async (req, res) => {
    const orderKey = cleanText(req.params.id, '', 64);
    const body = (req.body || {}) as Record<string, unknown>;
    const decision = body.decision === 'reject' ? 'reject' : 'approve';
    const note = cleanText(body.note, '', 300);

    if (!orderKey) {
      res.status(400).json({ error: 'Valid order ID is required.' });
      return;
    }

    if (supabaseAdmin) {
      const { data: orderData, error: fetchErr } = await supabaseAdmin
        .from('orders')
        .select(
          'id, user_id, order_code, created_at, status, items, subtotal, discount, total, promo_code, customer_email, access_key, delivery_mode, delivery_content, delivery_filename, delivery_fields, payment_method, payment_status, payment_gateway_id, payment_gateway_name, payment_currency, payment_trx_id, payment_proof_url, payment_note'
        )
        .eq('order_code', orderKey)
        .maybeSingle();

      if (fetchErr || !orderData) {
        res.status(404).json({
          error:
            'Order not found or latest payment columns not migrated yet in Supabase.',
        });
        return;
      }

      const row = orderData as DbOrderRow & { id: string; user_id?: string | null };

      if (decision === 'reject') {
        const { data: updated, error: updErr } = await supabaseAdmin
          .from('orders')
          .update({
            status: 'Rejected',
            payment_status: 'rejected',
            payment_note: note || 'Payment verification failed.',
          })
          .eq('order_code', orderKey)
          .select(
            'id, user_id, order_code, created_at, status, items, subtotal, discount, total, promo_code, customer_email, access_key, delivery_mode, delivery_content, delivery_filename, delivery_fields, payment_method, payment_status, payment_gateway_id, payment_gateway_name, payment_currency, payment_trx_id, payment_proof_url, payment_note'
          )
          .maybeSingle();

        if (updErr || !updated) {
          res.status(400).json({ error: 'Failed to reject payment.' });
          return;
        }

        // Restore tool stock on rejection if it was previously pending
        const parsedOrder = mapOrderRow(row);
        if (row.status !== 'Rejected') {
          for (const item of parsedOrder.items) {
            const { data: toolRow } = await supabaseAdmin
              .from('tools')
              .select('available, sold')
              .eq('id', item.toolId)
              .maybeSingle();
            if (toolRow) {
              await supabaseAdmin
                .from('tools')
                .update({
                  available: Math.max(0, Number(toolRow.available || 0)) + item.quantity,
                  sold: Math.max(0, Number(toolRow.sold || 0) - item.quantity),
                })
                .eq('id', item.toolId);
            }
          }
        }

        if (row.user_id) {
          await supabaseAdmin.from('notifications').upsert(
            {
              id: `notif-rejected-${orderKey}`,
              user_id: row.user_id,
              title: `Payment Rejected (#${orderKey})`,
              message:
                note ||
                'Your payment could not be verified. Please contact support or submit a valid receipt.',
              time_label: 'Just now',
              read: false,
              accent: 'amber',
            },
            { onConflict: 'id' }
          );
        }

        res.json({ order: mapOrderRow(updated as DbOrderRow), autoDelivered: false });
        return;
      }

      // APPROVE PAYMENT -> try automatic .txt assignment from product_accounts pool!
      const parsedOrder = mapOrderRow(row);
      const assignedIds: string[] = [];
      let combinedContent = '';
      let firstFilename: string | null = null;
      const combinedFields: { label: string; value: string }[] = [];
      let allAutoFulfilled = parsedOrder.items.length > 0;

      for (const item of parsedOrder.items) {
        const { data: toolRow } = await supabaseAdmin
          .from('tools')
          .select('plans')
          .eq('id', item.toolId)
          .maybeSingle();

        let isManualPlan = false;
        if (toolRow && Array.isArray(toolRow.plans)) {
          const matchedPlan = (toolRow.plans as Record<string, unknown>[]).find(
            (p) => String(p.id || '') === item.planId
          );
          if (
            matchedPlan &&
            String(matchedPlan.deliveryMode ?? matchedPlan.delivery_mode ?? 'automatic').toLowerCase() ===
              'manual'
          ) {
            isManualPlan = true;
          }
        }

        if (isManualPlan) {
          allAutoFulfilled = false;
          continue;
        }

        const { data: poolRows } = await supabaseAdmin
          .from('product_accounts')
          .select('id, file_name, account_content, account_fields')
          .eq('tool_id', item.toolId)
          .eq('plan_id', item.planId)
          .eq('status', 'available')
          .order('created_at', { ascending: true })
          .limit(item.quantity);

        if (!poolRows || poolRows.length < item.quantity) {
          allAutoFulfilled = false;
          continue;
        }

        for (const acc of poolRows) {
          assignedIds.push(String(acc.id));
          if (!firstFilename) firstFilename = String(acc.file_name || 'account.txt');
          if (combinedContent) combinedContent += '\n\n---\n\n';
          combinedContent += String(acc.account_content || '');
          if (Array.isArray(acc.account_fields)) {
            for (const f of sanitizeDeliveryFields(acc.account_fields)) {
              combinedFields.push(f);
            }
          }
        }
      }

      const autoDelivered = allAutoFulfilled && assignedIds.length > 0;
      const nextStatus: OrderRecord['status'] = autoDelivered ? 'Delivered' : 'Processing';

      const updatePatch: Record<string, unknown> = {
        status: nextStatus,
        payment_status: 'approved',
        payment_note: note || 'Payment verified & approved.',
      };
      if (autoDelivered) {
        updatePatch.delivery_mode = 'automatic';
        updatePatch.delivery_content = combinedContent;
        updatePatch.delivery_filename = firstFilename;
        updatePatch.delivery_fields = combinedFields;
      }

      const { data: updated, error: updErr } = await supabaseAdmin
        .from('orders')
        .update(updatePatch)
        .eq('order_code', orderKey)
        .select(
          'id, user_id, order_code, created_at, status, items, subtotal, discount, total, promo_code, customer_email, access_key, delivery_mode, delivery_content, delivery_filename, delivery_fields, payment_method, payment_status, payment_gateway_id, payment_gateway_name, payment_currency, payment_trx_id, payment_proof_url, payment_note'
        )
        .maybeSingle();

      if (updErr || !updated) {
        res.status(400).json({ error: 'Failed to approve payment.' });
        return;
      }

      if (autoDelivered && assignedIds.length > 0) {
        await supabaseAdmin
          .from('product_accounts')
          .update({
            status: 'assigned',
            assigned_order_id: row.id,
            assigned_user_id: row.user_id || null,
            assigned_at: new Date().toISOString(),
          })
          .in('id', assignedIds);
      }

      if (row.user_id) {
        await supabaseAdmin.from('notifications').upsert(
          {
            id: `notif-approved-${orderKey}`,
            user_id: row.user_id,
            title: autoDelivered
              ? `Payment Approved & Account Delivered (#${orderKey})`
              : `Payment Approved (#${orderKey})`,
            message: autoDelivered
              ? 'Your payment has been approved and your account details are ready in My Orders!'
              : 'Your payment has been verified! Admin is finalizing your account delivery.',
            time_label: 'Just now',
            read: false,
            accent: 'green',
          },
          { onConflict: 'id' }
        );
      }

      res.json({ order: mapOrderRow(updated as DbOrderRow), autoDelivered });
      return;
    }

    // In-memory fallback
    let updatedOrder: OrderRecord | null = null;
    memoryStore.orders = memoryStore.orders.map((o) => {
      if (o.id !== orderKey) return o;
      updatedOrder = {
        ...o,
        status: decision === 'reject' ? 'Rejected' : 'Delivered',
        paymentStatus: decision === 'reject' ? 'rejected' : 'approved',
        paymentNote:
          note ||
          (decision === 'reject'
            ? 'Payment verification failed.'
            : 'Payment verified & approved.'),
      };
      return updatedOrder;
    });
    if (!updatedOrder) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    memoryStore.mutated = true;
    res.json({ order: updatedOrder, autoDelivered: decision === 'approve' });
  });

  // 7. MEDIA UPLOAD (Logos, Banners, Payment QR Codes & Review Screenshots -> Supabase Storage or confined public/uploads)
  app.post('/api/admin/upload-media', requireAdminAuth, async (req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const folder: MediaFolder =
      body.folder === 'banners'
        ? 'banners'
        : body.folder === 'qr'
          ? 'qr'
          : body.folder === 'reviews'
            ? 'reviews'
            : 'logos';

    const saved = await persistValidatedImage(folder, body.dataBase64);
    if (!saved.ok) {
      res.status(saved.status).json({ error: saved.error });
      return;
    }
    res.status(201).json({ url: saved.url });
  });

  // 7b. PAYMENT GATEWAYS MANAGEMENT (Admin CRUD)
  app.post('/api/admin/payment-gateways', requireAdminAuth, async (req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const check = validatePaymentGatewayPayload(body);
    if (!check.ok) {
      res.status(400).json({ error: check.error });
      return;
    }

    const name = cleanText(body.name, '', 80);
    const id =
      cleanText(body.id, '', 64)
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-') ||
      `${name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 32)}-${Date.now().toString(36)}`;

    const gateway: PaymentGateway = {
      id,
      name,
      accountTitle: cleanText(body.accountTitle, '', 100),
      accountNumber: cleanText(body.accountNumber, '', 180),
      currency: check.currency,
      instructions: cleanText(body.instructions, '', 600),
      qrCodeUrl: sanitizeSafeMediaUrl(body.qrCodeUrl),
      logoUrl: sanitizeSafeMediaUrl(body.logoUrl),
      isActive: body.isActive !== false,
      sortOrder: clampInt(body.sortOrder, memoryStore.paymentGateways.length + 1, 0, 999),
    };

    if (supabaseAdmin) {
      const fullInsert = await supabaseAdmin.from('payment_gateways').insert({
        id: gateway.id,
        name: gateway.name,
        account_title: gateway.accountTitle,
        account_number: gateway.accountNumber,
        currency: gateway.currency,
        instructions: gateway.instructions,
        qr_code_url: gateway.qrCodeUrl || null,
        logo_url: gateway.logoUrl || null,
        is_active: gateway.isActive,
        sort_order: gateway.sortOrder,
        updated_at: new Date().toISOString(),
      });
      if (fullInsert.error) {
        const errText = `${fullInsert.error.message || ''} ${fullInsert.error.details || ''}`.toLowerCase();
        const isMissingLogoCol =
          errText.includes('logo_url') ||
          fullInsert.error.code === '42703' ||
          fullInsert.error.code === 'PGRST204';

        if (isMissingLogoCol && gateway.logoUrl) {
          res.status(400).json({
            error:
              'Please run the Supabase SQL update to add the logo_url column to payment_gateways first.',
          });
          return;
        }
        if (isMissingLogoCol) {
          const legacyInsert = await supabaseAdmin.from('payment_gateways').insert({
            id: gateway.id,
            name: gateway.name,
            account_title: gateway.accountTitle,
            account_number: gateway.accountNumber,
            currency: gateway.currency,
            instructions: gateway.instructions,
            qr_code_url: gateway.qrCodeUrl || null,
            is_active: gateway.isActive,
            sort_order: gateway.sortOrder,
            updated_at: new Date().toISOString(),
          });
          if (legacyInsert.error) {
            res.status(400).json({
              error:
                'Could not create payment gateway in Supabase. Please run the payment_gateways SQL migration first.',
            });
            return;
          }
        } else {
          res.status(400).json({
            error:
              'Could not create payment gateway in Supabase. Please run the payment_gateways SQL migration first.',
          });
          return;
        }
      }
    }

    memoryStore.paymentGateways.push(gateway);
    memoryStore.mutated = true;
    res.status(201).json({ gateway });
  });

  app.put('/api/admin/payment-gateways/:id', requireAdminAuth, async (req, res) => {
    const gwId = cleanText(req.params.id, '', 64);
    const body = (req.body || {}) as Record<string, unknown>;
    const check = validatePaymentGatewayPayload(body);
    if (!gwId || !check.ok) {
      res.status(400).json({ error: check.ok ? 'Invalid gateway ID.' : check.error });
      return;
    }

    const gateway: PaymentGateway = {
      id: gwId,
      name: cleanText(body.name, '', 80),
      accountTitle: cleanText(body.accountTitle, '', 100),
      accountNumber: cleanText(body.accountNumber, '', 180),
      currency: check.currency,
      instructions: cleanText(body.instructions, '', 600),
      qrCodeUrl: sanitizeSafeMediaUrl(body.qrCodeUrl),
      logoUrl: sanitizeSafeMediaUrl(body.logoUrl),
      isActive: body.isActive !== false,
      sortOrder: clampInt(body.sortOrder, 1, 0, 999),
    };

    if (supabaseAdmin) {
      const fullUpdate = await supabaseAdmin
        .from('payment_gateways')
        .update({
          name: gateway.name,
          account_title: gateway.accountTitle,
          account_number: gateway.accountNumber,
          currency: gateway.currency,
          instructions: gateway.instructions,
          qr_code_url: gateway.qrCodeUrl || null,
          logo_url: gateway.logoUrl || null,
          is_active: gateway.isActive,
          sort_order: gateway.sortOrder,
          updated_at: new Date().toISOString(),
        })
        .eq('id', gwId);

      if (fullUpdate.error) {
        const errText = `${fullUpdate.error.message || ''} ${fullUpdate.error.details || ''}`.toLowerCase();
        const isMissingLogoCol =
          errText.includes('logo_url') ||
          fullUpdate.error.code === '42703' ||
          fullUpdate.error.code === 'PGRST204';

        if (isMissingLogoCol && gateway.logoUrl) {
          res.status(400).json({
            error:
              'Please run the Supabase SQL update to add the logo_url column to payment_gateways first.',
          });
          return;
        }
        if (isMissingLogoCol) {
          const legacyUpdate = await supabaseAdmin
            .from('payment_gateways')
            .update({
              name: gateway.name,
              account_title: gateway.accountTitle,
              account_number: gateway.accountNumber,
              currency: gateway.currency,
              instructions: gateway.instructions,
              qr_code_url: gateway.qrCodeUrl || null,
              is_active: gateway.isActive,
              sort_order: gateway.sortOrder,
              updated_at: new Date().toISOString(),
            })
            .eq('id', gwId);
          if (legacyUpdate.error) {
            res.status(400).json({ error: 'Could not update payment gateway in Supabase.' });
            return;
          }
        } else {
          res.status(400).json({ error: 'Could not update payment gateway in Supabase.' });
          return;
        }
      }
    }

    memoryStore.paymentGateways = memoryStore.paymentGateways.map((g) =>
      g.id === gwId ? gateway : g
    );
    memoryStore.mutated = true;
    res.json({ gateway });
  });

  app.delete('/api/admin/payment-gateways/:id', requireAdminAuth, async (req, res) => {
    const gwId = cleanText(req.params.id, '', 64);
    if (!gwId) {
      res.status(400).json({ error: 'Invalid gateway ID.' });
      return;
    }
    if (supabaseAdmin) {
      const { error } = await supabaseAdmin
        .from('payment_gateways')
        .delete()
        .eq('id', gwId);
      if (error) {
        res.status(400).json({ error: 'Could not delete payment gateway from Supabase.' });
        return;
      }
    }
    memoryStore.paymentGateways = memoryStore.paymentGateways.filter((g) => g.id !== gwId);
    memoryStore.mutated = true;
    res.json({ ok: true, id: gwId });
  });

  // 8. PRODUCT ACCOUNTS POOL (.txt automatic delivery accounts per tool & plan)
  app.get('/api/admin/tools/:id/accounts', requireAdminAuth, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const toolId = cleanText(req.params.id, '', 64);
    if (!toolId) {
      res.status(400).json({ error: 'Invalid tool ID.' });
      return;
    }

    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('product_accounts')
        .select(
          'id, tool_id, plan_id, file_name, account_content, account_fields, status, assigned_order_id, created_at, assigned_at'
        )
        .eq('tool_id', toolId)
        .order('created_at', { ascending: false })
        .limit(300);

      if (!error && data) {
        res.json({
          accounts: (data as DbProductAccountRow[]).map(mapProductAccountRow),
        });
        return;
      }
    }

    res.json({
      accounts: memoryStore.productAccounts.filter((a) => a.toolId === toolId),
    });
  });

  app.post('/api/admin/tools/:id/accounts', requireAdminAuth, async (req, res) => {
    const toolId = cleanText(req.params.id, '', 64);
    const body = (req.body || {}) as Record<string, unknown>;
    const planId = cleanText(body.planId, '1m', 48);
    const rawList = Array.isArray(body.accounts) ? body.accounts.slice(0, 50) : [];

    if (!toolId || rawList.length === 0) {
      res.status(400).json({ error: 'At least one account entry or .txt file is required.' });
      return;
    }

    const prepared = rawList
      .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === 'object'))
      .map((entry, idx) => {
        const accountContent =
          typeof entry.accountContent === 'string'
            ? entry.accountContent.trim().slice(0, 32_000)
            : '';
        const accountFields = sanitizeDeliveryFields(entry.accountFields);
        const fileName = sanitizeTextFileName(
          entry.fileName,
          `${toolId}-${planId}-${idx + 1}.txt`
        );
        return { fileName, accountContent, accountFields };
      })
      .filter((entry) => entry.accountContent.length > 0 || entry.accountFields.length > 0);

    if (prepared.length === 0) {
      res.status(400).json({ error: 'Account files cannot be empty.' });
      return;
    }

    if (supabaseAdmin) {
      const rowsToInsert = prepared.map((entry) => ({
        tool_id: toolId,
        plan_id: planId,
        file_name: entry.fileName,
        account_content:
          entry.accountContent ||
          entry.accountFields.map((f) => `${f.label}: ${f.value}`).join('\n'),
        account_fields: entry.accountFields,
        status: 'available',
      }));

      const { data, error } = await supabaseAdmin
        .from('product_accounts')
        .insert(rowsToInsert)
        .select(
          'id, tool_id, plan_id, file_name, account_content, account_fields, status, assigned_order_id, created_at, assigned_at'
        );

      if (!error && data) {
        const mapped = (data as DbProductAccountRow[]).map(mapProductAccountRow);
        res.status(201).json({ accounts: mapped, addedCount: mapped.length });
        return;
      }

      if (error) {
        res.status(400).json({
          error:
            'Could not save accounts to Supabase. Please run the product_accounts SQL table first.',
        });
        return;
      }
    }

    const created: ProductAccountItem[] = prepared.map((entry) => ({
      id: `acc-${crypto.randomUUID()}`,
      toolId,
      planId,
      fileName: entry.fileName,
      accountContent:
        entry.accountContent ||
        entry.accountFields.map((f) => `${f.label}: ${f.value}`).join('\n'),
      accountFields: entry.accountFields.length > 0 ? entry.accountFields : undefined,
      status: 'available',
      createdAt: new Date().toISOString(),
    }));
    memoryStore.productAccounts = [...created, ...memoryStore.productAccounts];
    memoryStore.mutated = true;
    res.status(201).json({ accounts: created, addedCount: created.length });
  });

  app.delete('/api/admin/accounts/:accountId', requireAdminAuth, async (req, res) => {
    const accountId = cleanText(req.params.accountId, '', 80);
    if (!accountId) {
      res.status(400).json({ error: 'Invalid account ID.' });
      return;
    }

    if (supabaseAdmin) {
      const { error } = await supabaseAdmin
        .from('product_accounts')
        .delete()
        .eq('id', accountId);
      if (error) {
        res.status(400).json({ error: 'Could not delete account from Supabase.' });
        return;
      }
    }

    memoryStore.productAccounts = memoryStore.productAccounts.filter(
      (a) => a.id !== accountId
    );
    memoryStore.mutated = true;
    res.json({ ok: true, id: accountId });
  });

  // 9. NOTIFICATIONS BROADCAST MANAGEMENT
  app.post('/api/admin/notifications', requireAdminAuth, async (req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const title = cleanText(body.title, '', 100);
    const message = cleanText(body.message, '', 260);
    const rawAccent = cleanText(body.accent, 'purple', 20) as NotificationItem['accent'];
    const accent: NotificationItem['accent'] = VALID_ACCENTS.has(rawAccent) ? rawAccent : 'purple';

    if (!title || !message) {
      res.status(400).json({ error: 'Notification title and message are required.' });
      return;
    }

    const notification: NotificationItem = {
      id: `notif-${Date.now().toString(36)}`,
      title,
      message,
      time: 'Just now',
      read: false,
      accent,
    };

    if (supabaseAdmin) {
      const { error } = await supabaseAdmin.from('notifications').insert({
        id: notification.id,
        user_id: null,
        title: notification.title,
        message: notification.message,
        time_label: notification.time,
        read: false,
        accent: notification.accent,
      });
      if (error) {
        res.status(400).json({ error: 'Could not publish notification to Supabase.' });
        return;
      }
    }

    memoryStore.notifications = [notification, ...memoryStore.notifications];
    memoryStore.mutated = true;
    res.status(201).json({ notification });
  });

  app.delete('/api/admin/notifications/:id', requireAdminAuth, async (req, res) => {
    const notifId = cleanText(req.params.id, '', 80);
    if (!notifId) {
      res.status(400).json({ error: 'Invalid notification ID.' });
      return;
    }
    if (supabaseAdmin) {
      const { error } = await supabaseAdmin.from('notifications').delete().eq('id', notifId);
      if (error) {
        res.status(400).json({ error: 'Could not delete notification from Supabase.' });
        return;
      }
    }
    memoryStore.notifications = memoryStore.notifications.filter((n) => n.id !== notifId);
    memoryStore.mutated = true;
    res.json({ ok: true, id: notifId });
  });

  // 10. PRODUCT REVIEWS MODERATION & ADMIN-CREATED REVIEWS
  app.post('/api/admin/reviews', requireAdminAuth, async (req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const check = validateReviewInput({
      toolId: body.toolId,
      authorName: body.authorName,
      rating: body.rating,
      comment: body.comment,
      requireAuthorName: true,
    });
    if (!check.ok) {
      res.status(400).json({ error: check.error });
      return;
    }

    const rawScreenshot =
      typeof body.screenshotUrl === 'string' ? body.screenshotUrl.trim() : '';
    const screenshotUrl = rawScreenshot ? sanitizeSafeMediaUrl(rawScreenshot) : undefined;
    if (rawScreenshot && !screenshotUrl) {
      res.status(400).json({ error: 'Screenshot URL must start with https:// or /' });
      return;
    }

    const rawStatus = cleanText(body.status, 'approved', 20).toLowerCase() as ReviewStatus;
    const status: ReviewStatus = VALID_REVIEW_STATUSES.has(rawStatus)
      ? rawStatus
      : 'approved';
    const reviewDate = normalizeReviewDate(body.reviewDate);

    const review: ProductReview = {
      id: `rev-${crypto.randomUUID()}`,
      toolId: check.toolId,
      authorName: check.authorName,
      rating: check.rating,
      comment: check.comment,
      screenshotUrl,
      reviewDate,
      status,
      source: 'admin',
      verified: true,
      createdAt: new Date().toISOString(),
    };

    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('product_reviews')
        .insert({
          id: review.id,
          tool_id: review.toolId,
          order_id: null,
          user_id: null,
          author_name: review.authorName,
          author_email: null,
          rating: review.rating,
          comment: review.comment,
          screenshot_url: review.screenshotUrl ?? null,
          review_date: review.reviewDate,
          status: review.status,
          source: 'admin',
          verified: true,
        })
        .select(
          'id, tool_id, order_id, user_id, author_name, author_email, rating, comment, screenshot_url, review_date, status, source, verified, created_at'
        )
        .single();

      if (error || !data) {
        res.status(400).json({
          error:
            'Could not save review to Supabase. Please run the product_reviews SQL table shown below.',
        });
        return;
      }

      res.status(201).json({ review: mapReviewRow(data as DbReviewRow) });
      return;
    }

    memoryStore.reviews = [review, ...memoryStore.reviews];
    memoryStore.mutated = true;
    res.status(201).json({ review });
  });

  app.patch('/api/admin/reviews/:id', requireAdminAuth, async (req, res) => {
    const reviewId = cleanText(req.params.id, '', 80);
    if (!reviewId) {
      res.status(400).json({ error: 'Invalid review ID.' });
      return;
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const rawStatus = cleanText(body.status, '', 20).toLowerCase() as ReviewStatus;
    if (!VALID_REVIEW_STATUSES.has(rawStatus)) {
      res.status(400).json({ error: 'Status must be pending, approved, or rejected.' });
      return;
    }

    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('product_reviews')
        .update({ status: rawStatus })
        .eq('id', reviewId)
        .select(
          'id, tool_id, order_id, user_id, author_name, author_email, rating, comment, screenshot_url, review_date, status, source, verified, created_at'
        )
        .maybeSingle();

      if (error || !data) {
        res.status(404).json({ error: 'Review not found in Supabase.' });
        return;
      }

      res.json({ review: mapReviewRow(data as DbReviewRow) });
      return;
    }

    let updated: ProductReview | null = null;
    memoryStore.reviews = memoryStore.reviews.map((r) => {
      if (r.id !== reviewId) return r;
      updated = { ...r, status: rawStatus };
      return updated;
    });
    if (!updated) {
      res.status(404).json({ error: 'Review not found.' });
      return;
    }
    memoryStore.mutated = true;
    res.json({ review: updated });
  });

  app.delete('/api/admin/reviews/:id', requireAdminAuth, async (req, res) => {
    const reviewId = cleanText(req.params.id, '', 80);
    if (!reviewId) {
      res.status(400).json({ error: 'Invalid review ID.' });
      return;
    }

    if (supabaseAdmin) {
      const { error } = await supabaseAdmin
        .from('product_reviews')
        .delete()
        .eq('id', reviewId);
      if (error) {
        res.status(400).json({ error: 'Could not delete review from Supabase.' });
        return;
      }
    }

    memoryStore.reviews = memoryStore.reviews.filter((r) => r.id !== reviewId);
    memoryStore.mutated = true;
    res.json({ ok: true, id: reviewId });
  });

  return app;
}

export const app = createApiApp();
export default app;

async function startStandaloneServer() {
  // ==========================================================================
  // VITE / STATIC SPA MIDDLEWARE (Standalone Node.js Server Only)
  // ==========================================================================
  const distDir = path.resolve(__dirname, 'dist');
  const mountStaticDist = () => {
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  };

  if (!isProd) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: process.env.DISABLE_HMR !== 'true',
        },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (viteErr) {
      console.warn('Vite dev middleware unavailable, falling back to static dist:', viteErr);
      mountStaticDist();
    }
  } else {
    mountStaticDist();
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ToolBazaar server running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startStandaloneServer().catch((err) => {
    console.error('Fatal error starting ToolBazaar server:', err);
    process.exit(1);
  });
}
