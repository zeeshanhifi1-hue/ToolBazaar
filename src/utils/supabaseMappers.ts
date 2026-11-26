import type {
  BrandKey,
  CartItem,
  CategoryId,
  CategoryItem,
  CurrencyCode,
  DeliveryField,
  DeliveryMode,
  HeroBannerData,
  NeonCreatorThemeConfig,
  NotificationItem,
  OrderRecord,
  PaymentGateway,
  PaymentMethod,
  PaymentStatus,
  PlanOption,
  ProductAccountItem,
  ProductReview,
  ReviewSource,
  ReviewStatus,
  SiteSettings,
  StoreThemeId,
  ToolProduct,
} from '../types/store';
import { calculateDiscountPercent } from './storeLogic.ts';
import { normalizeReviewDate } from './reviewLogic.ts';

const VALID_CATEGORIES = new Set<CategoryId>([
  'all',
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

const DEFAULT_THEME = {
  cardBg:
    'linear-gradient(145deg, rgba(139, 92, 246, 0.24) 0%, rgba(20, 18, 38, 0.95) 55%, rgba(16, 14, 30, 0.98) 100%)',
  cardBorder: 'rgba(167, 139, 250, 0.42)',
  glowColor: 'rgba(139, 92, 246, 0.24)',
};

/**
 * Allows only relative root paths (/...) or https:// URLs for media assets.
 * Blocks javascript:, data:, vbscript:, and malformed URLs.
 */
export function sanitizeSafeMediaUrl(url: unknown): string | undefined {
  if (typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export interface DbCategoryRow {
  id: string;
  label: string;
  description?: string | null;
  sort_order?: number | null;
  is_active?: boolean | null;
}

export interface DbBannerRow {
  id: string;
  title?: string | null;
  image_url: string;
  target_category?: string | null;
  border_glow?: string | null;
  sort_order?: number | null;
  is_active?: boolean | null;
}

export interface DbToolRow {
  id: string;
  name: string;
  badge_text?: string | null;
  subtitle?: string | null;
  description?: string | null;
  category_id: string;
  brand_key?: string | null;
  logo_url?: string | null;
  original_price: number;
  price: number;
  discount_percent?: number | null;
  available: number;
  sold: number;
  trending?: boolean | null;
  delivery_type?: string | null;
  features?: unknown;
  plans?: unknown;
  theme?: unknown;
  sort_order?: number | null;
  is_active?: boolean | null;
}

export interface DbOrderRow {
  id: string;
  order_code?: string | null;
  created_at: string;
  status?: string | null;
  items?: unknown;
  subtotal: number;
  discount?: number | null;
  total: number;
  promo_code?: string | null;
  customer_email: string;
  access_key: string;
  delivery_mode?: string | null;
  delivery_content?: string | null;
  delivery_filename?: string | null;
  delivery_fields?: unknown;
  payment_method?: string | null;
  payment_status?: string | null;
  payment_gateway_id?: string | null;
  payment_gateway_name?: string | null;
  payment_currency?: string | null;
  payment_trx_id?: string | null;
  payment_proof_url?: string | null;
  payment_note?: string | null;
}

export interface DbPaymentGatewayRow {
  id: string;
  name: string;
  account_title?: string | null;
  account_number: string;
  currency?: string | null;
  instructions?: string | null;
  logo_url?: string | null;
  qr_code_url?: string | null;
  is_active?: boolean | null;
  sort_order?: number | null;
}

export interface DbProductAccountRow {
  id: string;
  tool_id: string;
  plan_id: string;
  file_name?: string | null;
  account_content: string;
  account_fields?: unknown;
  status?: string | null;
  assigned_order_id?: string | null;
  created_at?: string | null;
  assigned_at?: string | null;
}

export interface DbNotificationRow {
  id: string;
  title: string;
  message: string;
  time_label?: string | null;
  read?: boolean | null;
  accent?: string | null;
}

export function mapCategoryRow(row: DbCategoryRow): CategoryItem | null {
  const id = String(row.id || '').trim().toLowerCase() as CategoryId;
  if (!VALID_CATEGORIES.has(id)) return null;
  return {
    id,
    label: String(row.label || id).trim(),
    description: String(row.description || '').trim(),
  };
}

export function mapBannerRow(row: DbBannerRow): HeroBannerData | null {
  const safeSrc = sanitizeSafeMediaUrl(row.image_url);
  if (!safeSrc) return null;
  const rawCat = String(row.target_category || 'all').trim().toLowerCase() as CategoryId;
  return {
    id: String(row.id),
    imageSrc: safeSrc,
    alt: String(row.title || 'ToolBazaar promotional banner').trim(),
    targetCategory: VALID_CATEGORIES.has(rawCat) ? rawCat : 'all',
    borderGlow:
      typeof row.border_glow === 'string' && row.border_glow.trim()
        ? row.border_glow.trim()
        : 'rgba(139, 92, 246, 0.45)',
  };
}

export function mapToolRow(row: DbToolRow): ToolProduct {
  const rawCat = String(row.category_id || 'more').trim().toLowerCase() as CategoryId;
  const category: Exclude<CategoryId, 'all'> =
    rawCat !== 'all' && VALID_CATEGORIES.has(rawCat) ? rawCat : 'more';

  const rawBrand = String(row.brand_key || 'chatgpt').trim().toLowerCase() as BrandKey;
  const brand: BrandKey = VALID_BRANDS.has(rawBrand) ? rawBrand : 'chatgpt';

  const originalPrice = Math.max(0, Number(row.original_price) || 0);
  const price = Math.max(0, Number(row.price) || 0);
  const discountPercent =
    typeof row.discount_percent === 'number' && row.discount_percent >= 0
      ? Math.round(row.discount_percent)
      : calculateDiscountPercent(originalPrice, price);

  const features: string[] = Array.isArray(row.features)
    ? row.features.filter((f): f is string => typeof f === 'string')
    : [];

  const parsedPlans: PlanOption[] = Array.isArray(row.plans)
    ? row.plans
        .filter((p): p is Record<string, unknown> => Boolean(p && typeof p === 'object'))
        .map((p, idx) => {
          const rawMode = String(p.deliveryMode ?? p.delivery_mode ?? 'automatic').toLowerCase();
          const deliveryMode: DeliveryMode = rawMode === 'manual' ? 'manual' : 'automatic';
          return {
            id: String(p.id || `plan-${idx + 1}`),
            label: String(p.label || '1 Month'),
            months: Math.max(1, Number(p.months) || 1),
            price: Math.max(0, Number(p.price) || price),
            originalPrice: Math.max(
              0,
              Number(p.originalPrice ?? p.original_price) || originalPrice
            ),
            description:
              typeof p.description === 'string' && p.description.trim()
                ? p.description.trim()
                : undefined,
            deliveryMode,
          };
        })
    : [];

  const plans: PlanOption[] =
    parsedPlans.length > 0
      ? parsedPlans
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

  const rawTheme =
    row.theme && typeof row.theme === 'object'
      ? (row.theme as Record<string, unknown>)
      : {};

  return {
    id: String(row.id),
    name: String(row.name || 'Premium Tool').trim(),
    badgeText: String(row.badge_text || 'Premium').trim(),
    subtitle: String(row.subtitle || '').trim(),
    description: String(row.description || row.subtitle || '').trim(),
    category,
    brand,
    logoUrl: sanitizeSafeMediaUrl(row.logo_url),
    originalPrice,
    price,
    discountPercent,
    available: Math.max(0, Number(row.available) || 0),
    sold: Math.max(0, Number(row.sold) || 0),
    trending: Boolean(row.trending),
    deliveryType: String(row.delivery_type || 'Instant Delivery').trim(),
    features,
    plans,
    theme: {
      cardBg:
        typeof rawTheme.cardBg === 'string' && rawTheme.cardBg
          ? rawTheme.cardBg
          : DEFAULT_THEME.cardBg,
      cardBorder:
        typeof rawTheme.cardBorder === 'string' && rawTheme.cardBorder
          ? rawTheme.cardBorder
          : DEFAULT_THEME.cardBorder,
      glowColor:
        typeof rawTheme.glowColor === 'string' && rawTheme.glowColor
          ? rawTheme.glowColor
          : DEFAULT_THEME.glowColor,
    },
  };
}

function parseDeliveryFieldsJson(raw: unknown): DeliveryField[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const list = raw
    .filter((f): f is Record<string, unknown> => Boolean(f && typeof f === 'object'))
    .map((f) => ({
      label: String(f.label || '').trim(),
      value: String(f.value || '').trim(),
    }))
    .filter((f) => f.label && f.value);
  return list.length > 0 ? list : undefined;
}

export function mapOrderRow(row: DbOrderRow): OrderRecord {
  const statusRaw = String(row.status || 'Delivered');
  const status: OrderRecord['status'] =
    statusRaw === 'Pending' ||
    statusRaw === 'Active' ||
    statusRaw === 'Processing' ||
    statusRaw === 'Rejected'
      ? statusRaw
      : 'Delivered';

  const items: CartItem[] = Array.isArray(row.items)
    ? row.items
        .filter((it): it is Record<string, unknown> => Boolean(it && typeof it === 'object'))
        .map((it) => {
          const b = String(it.brand || 'chatgpt').toLowerCase() as BrandKey;
          return {
            toolId: String(it.toolId ?? it.tool_id ?? ''),
            planId: String(it.planId ?? it.plan_id ?? '1m'),
            planLabel: String(it.planLabel ?? it.plan_label ?? '1 Month'),
            name: String(it.name ?? 'Tool'),
            brand: VALID_BRANDS.has(b) ? b : 'chatgpt',
            unitPrice: Math.max(0, Number(it.unitPrice ?? it.unit_price) || 0),
            unitOriginalPrice: Math.max(
              0,
              Number(it.unitOriginalPrice ?? it.unit_original_price) || 0
            ),
            quantity: Math.max(1, Number(it.quantity) || 1),
          };
        })
    : [];

  const modeRaw = String(row.delivery_mode || '').toLowerCase();
  const deliveryMode: DeliveryMode | undefined =
    modeRaw === 'manual' ? 'manual' : modeRaw === 'automatic' ? 'automatic' : undefined;

  const pmRaw = String(row.payment_method || '').toLowerCase();
  const paymentMethod: PaymentMethod | undefined =
    pmRaw === 'gateway' ? 'gateway' : pmRaw === 'balance' ? 'balance' : undefined;

  const psRaw = String(row.payment_status || '').toLowerCase();
  const paymentStatus: PaymentStatus | undefined =
    psRaw === 'pending_verification' ||
    psRaw === 'approved' ||
    psRaw === 'rejected' ||
    psRaw === 'paid'
      ? psRaw
      : undefined;

  const pcRaw = String(row.payment_currency || '').toUpperCase();
  const paymentCurrency: CurrencyCode | undefined =
    pcRaw === 'USD' || pcRaw === 'PKR' || pcRaw === 'INR'
      ? (pcRaw as CurrencyCode)
      : undefined;

  return {
    id: String(row.order_code || row.id),
    createdAt: String(row.created_at || new Date().toISOString()),
    status,
    items,
    subtotal: Math.max(0, Number(row.subtotal) || 0),
    discount: Math.max(0, Number(row.discount) || 0),
    total: Math.max(0, Number(row.total) || 0),
    promoCode: row.promo_code ? String(row.promo_code) : undefined,
    customerEmail: String(row.customer_email || ''),
    accessKey: String(row.access_key || ''),
    deliveryMode,
    deliveryContent:
      typeof row.delivery_content === 'string' && row.delivery_content.trim()
        ? row.delivery_content
        : undefined,
    deliveryFilename:
      typeof row.delivery_filename === 'string' && row.delivery_filename.trim()
        ? row.delivery_filename
        : undefined,
    deliveryFields: parseDeliveryFieldsJson(row.delivery_fields),
    paymentMethod,
    paymentStatus,
    paymentGatewayId: row.payment_gateway_id ? String(row.payment_gateway_id) : undefined,
    paymentGatewayName: row.payment_gateway_name ? String(row.payment_gateway_name) : undefined,
    paymentCurrency,
    paymentTrxId:
      typeof row.payment_trx_id === 'string' && row.payment_trx_id.trim()
        ? row.payment_trx_id.trim()
        : undefined,
    paymentProofUrl: sanitizeSafeMediaUrl(row.payment_proof_url),
    paymentNote:
      typeof row.payment_note === 'string' && row.payment_note.trim()
        ? row.payment_note.trim()
        : undefined,
  };
}

export function mapPaymentGatewayRow(row: DbPaymentGatewayRow): PaymentGateway {
  const curRaw = String(row.currency || 'USD').trim().toUpperCase();
  const currency: CurrencyCode =
    curRaw === 'PKR' || curRaw === 'INR' || curRaw === 'USD'
      ? (curRaw as CurrencyCode)
      : 'USD';

  return {
    id: String(row.id),
    name: String(row.name || 'Payment Gateway').trim(),
    accountTitle: String(row.account_title || '').trim(),
    accountNumber: String(row.account_number || '').trim(),
    currency,
    instructions: String(row.instructions || '').trim(),
    logoUrl: sanitizeSafeMediaUrl(row.logo_url),
    qrCodeUrl: sanitizeSafeMediaUrl(row.qr_code_url),
    isActive: row.is_active !== false,
    sortOrder: Math.max(0, Number(row.sort_order) || 0),
  };
}

export function mapProductAccountRow(row: DbProductAccountRow): ProductAccountItem {
  return {
    id: String(row.id),
    toolId: String(row.tool_id),
    planId: String(row.plan_id || '1m'),
    fileName: String(row.file_name || 'account.txt'),
    accountContent: String(row.account_content || ''),
    accountFields: parseDeliveryFieldsJson(row.account_fields),
    status: row.status === 'assigned' ? 'assigned' : 'available',
    assignedOrderId: row.assigned_order_id ? String(row.assigned_order_id) : undefined,
    createdAt: String(row.created_at || new Date().toISOString()),
    assignedAt: row.assigned_at ? String(row.assigned_at) : undefined,
  };
}

export function mapNotificationRow(row: DbNotificationRow): NotificationItem {
  const accentRaw = String(row.accent || 'purple');
  const accent: NotificationItem['accent'] =
    accentRaw === 'green' || accentRaw === 'amber' ? accentRaw : 'purple';
  return {
    id: String(row.id),
    title: String(row.title || ''),
    message: String(row.message || ''),
    time: String(row.time_label || 'Just now'),
    read: Boolean(row.read),
    accent,
  };
}

export const DEFAULT_NEON_CREATOR_HERO_IMAGE =
  '/src/assets/images/neon_creator_hero_1795679515752.jpg';

export const DEFAULT_NEON_CREATOR_CONFIG: NeonCreatorThemeConfig = {
  heroBadge: 'DIGITAL TOOLS MARKETPLACE',
  heroTitle: 'Premium Digital Tools',
  heroTitleAccent: '& Subscriptions',
  heroSubtitle:
    'Get official access to top AI, editing, design and productivity tools at the best prices.',
  heroPrimaryCta: 'Browse Tools',
  heroSecondaryCta: 'Best Deals',
  heroImageUrl: DEFAULT_NEON_CREATOR_HERO_IMAGE,
  offerTitle: 'Special Offers',
  offerSubtitle: 'Limited time discounts on top tools!',
  offerButtonText: 'Explore Deals',
  couponDiscountPercent: 20,
};

export function normalizeThemeId(raw: unknown): StoreThemeId {
  return String(raw || '').trim().toLowerCase() === 'neon-creator'
    ? 'neon-creator'
    : 'classic';
}

export function normalizeThemeConfig(raw: unknown): NeonCreatorThemeConfig {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const cleanStr = (val: unknown, fallback: string, maxLen: number): string => {
    if (typeof val !== 'string') return fallback;
    const t = val.trim();
    return t ? t.slice(0, maxLen) : fallback;
  };
  const safeImg = sanitizeSafeMediaUrl(obj.heroImageUrl) || DEFAULT_NEON_CREATOR_HERO_IMAGE;
  const rawPct = Number(obj.couponDiscountPercent);
  const couponDiscountPercent = Number.isFinite(rawPct)
    ? Math.min(90, Math.max(5, Math.round(rawPct)))
    : DEFAULT_NEON_CREATOR_CONFIG.couponDiscountPercent;

  return {
    heroBadge: cleanStr(obj.heroBadge, DEFAULT_NEON_CREATOR_CONFIG.heroBadge, 60),
    heroTitle: cleanStr(obj.heroTitle, DEFAULT_NEON_CREATOR_CONFIG.heroTitle, 80),
    heroTitleAccent: cleanStr(
      obj.heroTitleAccent,
      DEFAULT_NEON_CREATOR_CONFIG.heroTitleAccent,
      80
    ),
    heroSubtitle: cleanStr(obj.heroSubtitle, DEFAULT_NEON_CREATOR_CONFIG.heroSubtitle, 220),
    heroPrimaryCta: cleanStr(obj.heroPrimaryCta, DEFAULT_NEON_CREATOR_CONFIG.heroPrimaryCta, 36),
    heroSecondaryCta: cleanStr(
      obj.heroSecondaryCta,
      DEFAULT_NEON_CREATOR_CONFIG.heroSecondaryCta,
      36
    ),
    heroImageUrl: safeImg,
    offerTitle: cleanStr(obj.offerTitle, DEFAULT_NEON_CREATOR_CONFIG.offerTitle, 60),
    offerSubtitle: cleanStr(obj.offerSubtitle, DEFAULT_NEON_CREATOR_CONFIG.offerSubtitle, 140),
    offerButtonText: cleanStr(
      obj.offerButtonText,
      DEFAULT_NEON_CREATOR_CONFIG.offerButtonText,
      36
    ),
    couponDiscountPercent,
  };
}

export interface DbSiteSettingsRow {
  id: string;
  site_name?: string | null;
  site_tagline?: string | null;
  support_email?: string | null;
  vip_coupon_code?: string | null;
  vip_coupon_text?: string | null;
  active_theme?: string | null;
  theme_config?: unknown;
  updated_at?: string | null;
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  id: 'main',
  siteName: 'ToolBazaar',
  siteTagline: 'Premium Tools & Digital Products',
  supportEmail: 'support@toolbazaar.in',
  vipCouponCode: 'BAZAAR20',
  vipCouponText: 'Apply BAZAAR20 at checkout for 20% extra discount on all tools.',
  activeTheme: 'classic',
  themeConfig: DEFAULT_NEON_CREATOR_CONFIG,
};

export function mapSiteSettingsRow(row: DbSiteSettingsRow): SiteSettings {
  return {
    id: String(row.id || 'main'),
    siteName: String(row.site_name || DEFAULT_SITE_SETTINGS.siteName).trim(),
    siteTagline: String(row.site_tagline || DEFAULT_SITE_SETTINGS.siteTagline).trim(),
    supportEmail: String(row.support_email || DEFAULT_SITE_SETTINGS.supportEmail).trim(),
    vipCouponCode: String(row.vip_coupon_code || DEFAULT_SITE_SETTINGS.vipCouponCode).trim(),
    vipCouponText: String(row.vip_coupon_text || DEFAULT_SITE_SETTINGS.vipCouponText).trim(),
    activeTheme: normalizeThemeId(row.active_theme),
    themeConfig: normalizeThemeConfig(row.theme_config),
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

export interface DbReviewRow {
  id: string;
  tool_id: string;
  order_id?: string | null;
  user_id?: string | null;
  author_name: string;
  author_email?: string | null;
  rating: number;
  comment: string;
  screenshot_url?: string | null;
  review_date?: string | null;
  status?: string | null;
  source?: string | null;
  verified?: boolean | null;
  created_at?: string | null;
}

export function mapReviewRow(row: DbReviewRow): ProductReview {
  const statusRaw = String(row.status || 'pending').toLowerCase();
  const status: ReviewStatus =
    statusRaw === 'approved' || statusRaw === 'rejected' ? statusRaw : 'pending';
  const source: ReviewSource =
    String(row.source || 'user').toLowerCase() === 'admin' ? 'admin' : 'user';
  const numRating = Math.round(Number(row.rating) || 5);
  const rating = Math.min(5, Math.max(1, numRating));

  return {
    id: String(row.id),
    toolId: String(row.tool_id),
    orderId: row.order_id ? String(row.order_id) : undefined,
    userId: row.user_id ? String(row.user_id) : undefined,
    authorName: String(row.author_name || 'Verified Buyer').trim(),
    authorEmail: row.author_email ? String(row.author_email).trim() : undefined,
    rating,
    comment: String(row.comment || '').trim(),
    screenshotUrl: sanitizeSafeMediaUrl(row.screenshot_url),
    reviewDate: normalizeReviewDate(row.review_date || row.created_at),
    status,
    source,
    verified: row.verified !== false,
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

