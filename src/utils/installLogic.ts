export type HostingPlatformId =
  | 'hostinger'
  | 'railway'
  | 'render'
  | 'digitalocean'
  | 'coolify'
  | 'cloudrun'
  | 'flyio';

export interface HostingPlatformGuide {
  id: HostingPlatformId;
  name: string;
  tierLabel: string;
  summary: string;
  nodeVersion: string;
  buildCommand: string;
  startCommand: string;
  envLocation: string;
  steps: string[];
  deployNote: string;
}

export interface SupabaseTableRequirement {
  table: string;
  label: string;
  purpose: string;
  realtime: boolean;
  requiredColumns?: string[];
}

export interface InstallStatusResponse {
  installed: boolean;
  installedAt: string | null;
  installedPlatform: string | null;
  currentOrigin: string;
  supabaseHost: string | null;
  supabaseConnected: boolean;
  env: {
    hasSupabaseUrl: boolean;
    hasSupabasePublishableKey: boolean;
    hasSupabaseServiceRoleKey: boolean;
    hasAppUrl: boolean;
    hasAdminEnv: boolean;
    hasStoredAdmin: boolean;
  };
  settings: {
    siteName: string;
    siteTagline: string;
    supportEmail: string;
    vipCouponCode: string;
    vipCouponText: string;
  };
}

export interface SupabaseTableCheckResult {
  table: string;
  label: string;
  purpose: string;
  ok: boolean;
  detail: string;
}

export interface SupabaseConnectionTestResponse {
  ok: boolean;
  connected: boolean;
  latencyMs: number;
  summary: string;
  readyCount: number;
  totalCount: number;
  tables: SupabaseTableCheckResult[];
  storageBucketOk: boolean;
  storageDetail: string;
  missingEnvVars: string[];
}

export interface ProjectFeatureGuideItem {
  id: string;
  title: string;
  area: string;
  summary: string;
  howItWorks: string[];
}

export const HOSTING_PLATFORMS: HostingPlatformGuide[] = [
  {
    id: 'hostinger',
    name: 'Hostinger',
    tierLabel: 'Node.js Web App & KVM VPS',
    summary:
      'Ideal for Hostinger Business / Cloud Node.js Web Apps or KVM VPS running Node.js 20+ with PM2 and Nginx reverse proxy.',
    nodeVersion: 'Node.js 20 LTS or 22 LTS',
    buildCommand: 'npm install && npm run build',
    startCommand: 'NODE_ENV=production npx tsx server.ts',
    envLocation:
      'hPanel -> Websites -> Manage -> Node.js / Environment Variables (or edit .env in your VPS project folder and restart PM2)',
    steps: [
      'Upload or connect your Git repository inside Hostinger hPanel (Node.js Web App) or clone it on your KVM VPS.',
      'Open Environment Variables in hPanel (or create a .env file in the project root on VPS) and paste the required Supabase keys shown below.',
      'Set Build Command to "npm install && npm run build" and Start Command to "NODE_ENV=production npx tsx server.ts" (port from PORT env or 3000).',
      'Click Rebuild & Restart (or run "npm run build && pm2 restart toolbazaar") so both the server and client bundle load your Supabase URL.',
      'Return to this page and click "Re-check Environment" below to verify all indicators turn green.',
    ],
    deployNote:
      'Because ToolBazaar includes an Express backend (server.ts) for Admin APIs, uploads, and secure order fulfillment, deploy it as a Node.js app or VPS service rather than static-only HTML hosting.',
  },
  {
    id: 'railway',
    name: 'Railway',
    tierLabel: 'Zero-Config Node.js PaaS',
    summary:
      'Fastest one-click Git deployment with built-in HTTPS domain, automatic port binding, and instant variable redeploys.',
    nodeVersion: 'Node.js 20+ (Auto-detected)',
    buildCommand: 'npm install && npm run build',
    startCommand: 'NODE_ENV=production npx tsx server.ts',
    envLocation: 'Railway Project -> Service -> Variables -> Raw Editor',
    steps: [
      'In Railway Dashboard, select your deployed ToolBazaar service and open the Variables tab.',
      'Click "Raw Editor", paste the environment variables block below, and replace the placeholder values with your Supabase keys.',
      'Under Settings -> Deploy, confirm Build Command is "npm run build" and Start Command is "NODE_ENV=production npx tsx server.ts".',
      'Save Variables to trigger an automatic rebuild and redeploy so the frontend picks up your public Supabase URL.',
      'Open your Railway public domain (Settings -> Networking -> Generate Domain) and click "Re-check Environment" below.',
    ],
    deployNote:
      'Railway automatically injects the PORT variable and provisions SSL. Paste your generated https://*.up.railway.app or custom domain into APP_URL.',
  },
  {
    id: 'render',
    name: 'Render',
    tierLabel: 'Managed Web Service',
    summary:
      'Reliable managed Node.js Web Service with automatic SSL, Git push deploys, and a clean Environment Variables panel.',
    nodeVersion: 'Node.js 20+',
    buildCommand: 'npm install && npm run build',
    startCommand: 'NODE_ENV=production npx tsx server.ts',
    envLocation: 'Render Dashboard -> Your Web Service -> Environment -> Add from .env',
    steps: [
      'Ensure your project is deployed as a Render "Web Service" (Runtime: Node), not a Static Site.',
      'Open your Web Service -> Environment tab -> click "Add from .env" and paste your configured variables.',
      'Set Build Command to "npm install && npm run build" and Start Command to "NODE_ENV=production npx tsx server.ts".',
      'Click "Save, rebuild, and deploy" (Manual Deploy -> Clear build cache & deploy if updating public Supabase vars).',
      'Once the deploy status shows Live, click "Re-check Environment" below.',
    ],
    deployNote:
      'Render free instances spin down when idle; use a Starter plan or higher for instant always-on checkout and real-time webhook/admin speed.',
  },
  {
    id: 'digitalocean',
    name: 'DigitalOcean',
    tierLabel: 'App Platform & Droplets',
    summary:
      'Production-grade Node.js hosting on DigitalOcean App Platform or Ubuntu Droplets with predictable pricing.',
    nodeVersion: 'Node.js 20 LTS',
    buildCommand: 'npm install && npm run build',
    startCommand: 'NODE_ENV=production npx tsx server.ts',
    envLocation: 'App Platform -> Your App -> Settings -> App-Level Environment Variables -> Edit',
    steps: [
      'Open your ToolBazaar app in DigitalOcean App Platform and go to Settings -> Environment Variables.',
      'Add each variable below (mark SUPABASE_SERVICE_ROLE_KEY and ADMIN_PASSWORD as Encrypted).',
      'Confirm HTTP Port is set to 3000 (or leave dynamic PORT) with Run Command "NODE_ENV=production npx tsx server.ts".',
      'Save changes to trigger a fresh build so Vite injects NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
      'Click "Re-check Environment" below once deployment finishes.',
    ],
    deployNote:
      'Keep "Encrypt" enabled for SUPABASE_SERVICE_ROLE_KEY and ADMIN_PASSWORD, and leave NEXT_PUBLIC_* available at both Build Time and Run Time.',
  },
  {
    id: 'coolify',
    name: 'Coolify / VPS',
    tierLabel: 'Self-Hosted Docker & Ubuntu',
    summary:
      'Full control on any Ubuntu / Debian VPS (Hetzner, Contabo, Vultr, AWS EC2) using Coolify, Dokploy, or PM2 + Nginx.',
    nodeVersion: 'Node.js 20+ or 22+',
    buildCommand: 'npm install && npm run build',
    startCommand: 'NODE_ENV=production npx tsx server.ts',
    envLocation: 'Coolify -> Application -> Environment Variables (or /var/www/toolbazaar/.env on VPS)',
    steps: [
      'In Coolify, open Environment Variables -> Developer View and paste your values (enable "Build Variable" for NEXT_PUBLIC_* keys).',
      'On a raw VPS, create a .env file inside your project folder with chmod 600 .env so only the server user can read it.',
      'Run "npm install && npm run build" to compile the production frontend with your Supabase public keys.',
      'Start the server with PM2 ("pm2 start npx --name toolbazaar -- tsx server.ts") and point Nginx + Certbot SSL to port 3000.',
      'Reload this installer on your HTTPS domain and click "Re-check Environment".',
    ],
    deployNote:
      'Always enable HTTPS (Let\'s Encrypt / Cloudflare SSL) before configuring Google OAuth so sign-in popups and redirects succeed.',
  },
  {
    id: 'cloudrun',
    name: 'Google Cloud Run',
    tierLabel: 'Serverless Containers',
    summary:
      'Auto-scaling containerized Node.js runtime with native HTTPS URLs and Secret Manager integration.',
    nodeVersion: 'Node.js 20 / 22 Container',
    buildCommand: 'npm install && npm run build',
    startCommand: 'NODE_ENV=production npx tsx server.ts',
    envLocation: 'Cloud Run -> Service -> Edit & Deploy New Revision -> Variables & Secrets',
    steps: [
      'Provide NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as build args when building your container image.',
      'In Cloud Run -> Edit & Deploy New Revision -> Variables & Secrets, add SUPABASE_SERVICE_ROLE_KEY, APP_URL, and optional ADMIN_* secrets.',
      'Set Container Port to 3000 (or bind process.env.PORT, which server.ts supports automatically).',
      'Deploy the new revision and route 100% traffic to it.',
      'Click "Re-check Environment" below to confirm your service detects all variables.',
    ],
    deployNote:
      'Cloud Run assigns a clean https://*.run.app URL automatically. Add that exact URL (or your mapped custom domain) to APP_URL and Google OAuth.',
  },
  {
    id: 'flyio',
    name: 'Fly.io',
    tierLabel: 'Global Edge Node.js',
    summary:
      'Low-latency global edge app deployment via flyctl CLI with encrypted secrets management.',
    nodeVersion: 'Node.js 20+',
    buildCommand: 'npm install && npm run build',
    startCommand: 'NODE_ENV=production npx tsx server.ts',
    envLocation: 'CLI: fly secrets set KEY=value ... (and build args for NEXT_PUBLIC_* keys)',
    steps: [
      'Run "fly secrets set SUPABASE_SERVICE_ROLE_KEY=... APP_URL=https://your-app.fly.dev" in your terminal.',
      'Pass NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY via fly.toml [build.args] or --build-arg during deploy.',
      'Run "fly deploy" so both the Vite client bundle and Express server start with your live Supabase configuration.',
      'Verify internal_port = 3000 in fly.toml and confirm HTTPS is enabled.',
      'Click "Re-check Environment" below to verify live detection.',
    ],
    deployNote:
      'Because Fly.io uses container builds, any change to NEXT_PUBLIC_* keys requires running "fly deploy" with the updated build args.',
  },
];

export const REQUIRED_SUPABASE_TABLES: SupabaseTableRequirement[] = [
  {
    table: 'site_settings',
    label: 'Site Settings & Installer Lock',
    purpose: 'Store name, tagline, support email, VIP coupon, and one-time installation lock.',
    realtime: true,
    requiredColumns: [
      'id',
      'site_name',
      'site_tagline',
      'support_email',
      'vip_coupon_code',
      'vip_coupon_text',
      'installation_completed',
    ],
  },
  {
    table: 'admin_accounts',
    label: 'Admin Credentials',
    purpose: 'Server-only hashed admin login accounts (zero public client access).',
    realtime: false,
    requiredColumns: ['id', 'username', 'password_hash'],
  },
  {
    table: 'categories',
    label: 'Product Categories',
    purpose: 'Storefront category strip and browse filters (AI, Video, Design, Productivity, More).',
    realtime: true,
    requiredColumns: ['id', 'label', 'description', 'sort_order', 'is_active'],
  },
  {
    table: 'banners',
    label: 'Hero Carousel Banners',
    purpose: 'Promotional home page hero banners managed from Admin Panel.',
    realtime: true,
    requiredColumns: ['id', 'title', 'image_url', 'target_category', 'sort_order', 'is_active'],
  },
  {
    table: 'tools',
    label: 'Products & Plans Catalog',
    purpose: 'Digital tools, custom logos, pricing, stock counters, and multi-duration plans.',
    realtime: true,
    requiredColumns: [
      'id',
      'name',
      'category_id',
      'logo_url',
      'original_price',
      'price',
      'available',
      'sold',
      'plans',
    ],
  },
  {
    table: 'profiles',
    label: 'Customer Profiles & Wallet',
    purpose: 'Auto-created Google user profiles and live ToolBazaar Credits (My Balance).',
    realtime: true,
    requiredColumns: ['id', 'email', 'full_name', 'avatar_url', 'wallet_credits'],
  },
  {
    table: 'orders',
    label: 'Orders, Delivery & Payments',
    purpose: 'Order records, automatic/manual account delivery payloads, and gateway verification.',
    realtime: true,
    requiredColumns: [
      'id',
      'user_id',
      'order_code',
      'status',
      'delivery_mode',
      'delivery_content',
      'delivery_filename',
      'delivery_fields',
      'payment_method',
      'payment_status',
      'payment_gateway_id',
      'payment_trx_id',
      'payment_proof_url',
    ],
  },
  {
    table: 'product_accounts',
    label: 'Automatic .txt Account Pool',
    purpose: 'Pre-uploaded credentials & .txt files assigned automatically on paid orders.',
    realtime: false,
    requiredColumns: [
      'id',
      'tool_id',
      'plan_id',
      'file_name',
      'account_content',
      'account_fields',
      'status',
    ],
  },
  {
    table: 'payment_gateways',
    label: 'Payment Gateways',
    purpose: 'Admin-managed EasyPaisa, JazzCash, USDT TRC20, UPI accounts & QR codes.',
    realtime: true,
    requiredColumns: [
      'id',
      'name',
      'account_title',
      'account_number',
      'currency',
      'qr_code_url',
      'is_active',
    ],
  },
  {
    table: 'notifications',
    label: 'Real-Time Notifications',
    purpose: 'Global storefront announcements and per-user order/payment approval alerts.',
    realtime: true,
    requiredColumns: ['id', 'user_id', 'title', 'message', 'time_label', 'read', 'accent'],
  },
  {
    table: 'product_reviews',
    label: 'Verified Reviews & Ratings',
    purpose: 'Customer product reviews with screenshots, ratings, and Admin moderation queue.',
    realtime: true,
    requiredColumns: [
      'id',
      'tool_id',
      'author_name',
      'rating',
      'comment',
      'review_date',
      'status',
      'source',
    ],
  },
];

export const PROJECT_FEATURES_GUIDE: ProjectFeatureGuideItem[] = [
  {
    id: 'catalog-accounts',
    title: 'Products, Plans & Automatic .txt Delivery',
    area: 'Admin -> Tools -> Plans & Accounts',
    summary:
      'Create unlimited digital products with custom logos, multi-duration plans (1 Month, 3 Months, 1 Year), and either Automatic or Manual delivery modes.',
    howItWorks: [
      'Upload .txt credential files or enter key-value account details inside any product under Plans & Accounts.',
      'When a customer pays via My Balance (or when Admin approves a gateway payment), the server automatically assigns the next available account from product_accounts.',
      'Customers immediately see their credentials and download the .txt file inside My Orders in real time.',
    ],
  },
  {
    id: 'payments-wallet',
    title: 'Manual Payment Gateways & Wallet Credits',
    area: 'Admin -> Payments & Users',
    summary:
      'Accept payments via EasyPaisa, JazzCash, USDT (TRC20), UPI, or custom gateways alongside instant ToolBazaar Credits (My Balance).',
    howItWorks: [
      'Edit account numbers, instructions, currencies (USD / PKR / INR), and upload QR codes inside Admin -> Payments.',
      'Customers submit a Transaction ID or receipt screenshot at checkout; orders appear in Admin -> Payment Approvals.',
      'Clicking Approve automatically verifies the payment and triggers instant .txt account delivery if stock is available in the pool.',
    ],
  },
  {
    id: 'google-auth-currency',
    title: 'Real-Time Google Sign-In & Auto Geo-Currency',
    area: 'Storefront Top Bar & Profile',
    summary:
      'One-click Google Sign-In creates a synced profile in public.profiles with live wallet balance updates, while pricing adapts automatically to visitor country.',
    howItWorks: [
      'Visitors from Pakistan automatically see PKR, India sees INR, and international visitors see USD (with manual override in the top bar).',
      'Once signed in with Google, customers view real-time order statuses, notifications, and wallet credit changes without refreshing.',
    ],
  },
  {
    id: 'reviews-realtime',
    title: 'Verified Reviews, Banners & Instant Sync',
    area: 'Admin -> Reviews, Banners & Settings',
    summary:
      'Every update to tools, prices, stock, banners, payment gateways, orders, and reviews streams live to all open browsers through Supabase Realtime.',
    howItWorks: [
      'Verified buyers with Delivered/Active orders can submit star ratings, comments, and proof screenshots directly from My Orders or product modals.',
      'Admins can approve/reject customer reviews or publish verified reviews with custom dates under Admin -> Reviews.',
    ],
  },
];

export function sanitizeOrigin(rawProto: string | undefined, rawHost: string | undefined): string {
  const proto = (rawProto || '').split(',')[0].trim().toLowerCase();
  const safeProto = proto === 'http' || proto === 'https' ? proto : 'https';
  const host = (rawHost || '').split(',')[0].trim();

  // Allow standard hostnames, localhost, IPv4, and optional port only
  if (/^[a-z0-9.-]+(?::\d{1,5})?$/i.test(host) && !host.startsWith('.') && !host.includes('..')) {
    const resolvedProto =
      host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : safeProto;
    return `${resolvedProto}://${host}`;
  }
  return 'http://localhost:3000';
}

export function deriveSupabaseCallbackUrl(supabaseUrl?: string | null): string {
  const trimmed = (supabaseUrl || '').trim().replace(/\/+$/, '');
  if (/^https:\/\/[a-z0-9.-]+\.supabase\.co$/i.test(trimmed)) {
    return `${trimmed}/auth/v1/callback`;
  }
  return 'https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback';
}

export function buildEnvTemplate(origin: string, platformId: HostingPlatformId): string {
  const cleanOrigin = origin.replace(/\/+$/, '') || 'https://your-domain.com';
  const headerComment =
    platformId === 'hostinger'
      ? '# ToolBazaar Environment Variables — Hostinger (Node.js / VPS .env)'
      : platformId === 'railway'
        ? '# ToolBazaar Environment Variables — Railway Variables (Raw Editor)'
        : platformId === 'render'
          ? '# ToolBazaar Environment Variables — Render Web Service (.env)'
          : '# ToolBazaar Production Environment Variables';

  return [
    headerComment,
    `APP_URL="${cleanOrigin}"`,
    '',
    '# 1. Supabase Public Keys (Supabase Dashboard -> Project Settings -> API)',
    'NEXT_PUBLIC_SUPABASE_URL="https://YOUR-PROJECT-REF.supabase.co"',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY"',
    '',
    '# 2. Supabase Server-Only Secret Key (NEVER share or expose in browser)',
    'SUPABASE_SERVICE_ROLE_KEY="YOUR_SUPABASE_SERVICE_ROLE_SECRET_KEY"',
    '',
    '# 3. Optional: Strong random signing secret for Admin sessions',
    'ADMIN_SESSION_SECRET="replace-with-a-long-random-secret-string"',
    '',
    '# 4. Optional: Fixed Admin Credentials (or leave blank to create in Step 4)',
    'ADMIN_USERNAME=""',
    'ADMIN_PASSWORD=""',
  ].join('\n');
}

export function buildSimpleEnvTemplate(): string {
  return [
    'NEXT_PUBLIC_SUPABASE_URL="https://YOUR-PROJECT-REF.supabase.co"',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY"',
    'SUPABASE_SERVICE_ROLE_KEY="YOUR_SUPABASE_SERVICE_ROLE_SECRET_KEY"',
  ].join('\n');
}

export interface InstallCompleteValidationInput {
  siteName?: unknown;
  siteTagline?: unknown;
  supportEmail?: unknown;
  vipCouponCode?: unknown;
  vipCouponText?: unknown;
  platformId?: unknown;
  requireAdminAccount: boolean;
  adminUsername?: unknown;
  adminPassword?: unknown;
}

export function validateInstallCompletionInput(
  input: InstallCompleteValidationInput
):
  | {
      ok: true;
      siteName: string;
      siteTagline: string;
      supportEmail: string;
      vipCouponCode: string;
      vipCouponText: string;
      platformId: string;
      adminUsername?: string;
      adminPassword?: string;
    }
  | { ok: false; error: string } {
  const siteName =
    typeof input.siteName === 'string' ? input.siteName.trim().slice(0, 60) : '';
  if (siteName.length < 2) {
    return { ok: false, error: 'Store name must be at least 2 characters.' };
  }

  const siteTagline =
    typeof input.siteTagline === 'string' && input.siteTagline.trim()
      ? input.siteTagline.trim().slice(0, 120)
      : 'Premium Tools & Digital Products';

  const supportEmail =
    typeof input.supportEmail === 'string' ? input.supportEmail.trim().slice(0, 120) : '';
  if (!supportEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) {
    return { ok: false, error: 'Please enter a valid support email address.' };
  }

  const vipCouponCode =
    typeof input.vipCouponCode === 'string' && input.vipCouponCode.trim()
      ? input.vipCouponCode
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9_-]/g, '')
          .slice(0, 24) || 'BAZAAR20'
      : 'BAZAAR20';

  const vipCouponText =
    typeof input.vipCouponText === 'string' && input.vipCouponText.trim()
      ? input.vipCouponText.trim().slice(0, 200)
      : `Apply ${vipCouponCode} at checkout for 20% extra discount on all tools.`;

  const rawPlatform =
    typeof input.platformId === 'string'
      ? input.platformId
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9_-]/g, '')
          .slice(0, 32)
      : '';
  const platformId = rawPlatform || 'web';

  if (input.requireAdminAccount) {
    const adminUsername =
      typeof input.adminUsername === 'string' ? input.adminUsername.trim() : '';
    const adminPassword = typeof input.adminPassword === 'string' ? input.adminPassword : '';

    if (adminUsername.length < 3 || adminUsername.length > 48) {
      return {
        ok: false,
        error: 'Admin username must be between 3 and 48 characters.',
      };
    }
    if (!/^[a-zA-Z0-9._@-]+$/.test(adminUsername)) {
      return {
        ok: false,
        error: 'Admin username may only contain letters, numbers, and . _ @ - characters.',
      };
    }
    if (adminPassword.length < 8 || adminPassword.length > 128) {
      return {
        ok: false,
        error: 'Admin password must be at least 8 characters long.',
      };
    }

    return {
      ok: true,
      siteName,
      siteTagline,
      supportEmail,
      vipCouponCode,
      vipCouponText,
      platformId,
      adminUsername,
      adminPassword,
    };
  }

  return {
    ok: true,
    siteName,
    siteTagline,
    supportEmail,
    vipCouponCode,
    vipCouponText,
    platformId,
  };
}

export function computeInstallReadiness(
  status: InstallStatusResponse | null,
  dbTest: SupabaseConnectionTestResponse | null
): {
  envReady: boolean;
  dbReady: boolean;
  oauthReady: boolean;
  adminReady: boolean;
  completedChecks: number;
  totalChecks: number;
} {
  const envReady = Boolean(
    status?.env.hasSupabaseUrl &&
      status?.env.hasSupabasePublishableKey &&
      status?.env.hasSupabaseServiceRoleKey
  );
  const dbReady = Boolean(dbTest?.ok && dbTest.readyCount === dbTest.totalCount);
  const oauthReady = Boolean(status?.env.hasSupabaseUrl && status?.env.hasSupabasePublishableKey);
  const adminReady = Boolean(status?.env.hasAdminEnv || status?.env.hasStoredAdmin);

  const checks = [envReady, dbReady, oauthReady, adminReady];
  return {
    envReady,
    dbReady,
    oauthReady,
    adminReady,
    completedChecks: checks.filter(Boolean).length,
    totalChecks: checks.length,
  };
}

export const UPGRADE_SUPABASE_SQL = `-- ============================================================================
-- ToolBazaar — Safe Upgrade Migration SQL (For Existing Supabase Databases)
-- Safe to run multiple times — preserves all existing products, users & orders
-- ============================================================================

-- 1. Installation lock columns on site_settings
alter table public.site_settings add column if not exists installation_completed boolean not null default false;
alter table public.site_settings add column if not exists installed_at timestamptz;
alter table public.site_settings add column if not exists installed_platform text;
alter table public.site_settings add column if not exists active_theme text not null default 'classic';
alter table public.site_settings add column if not exists theme_config jsonb not null default '{}'::jsonb;

-- 2. Custom logo URL column on tools
alter table public.tools add column if not exists logo_url text;

-- 3. Orders delivery & payment verification columns
alter table public.orders add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.orders add column if not exists delivery_mode text not null default 'automatic';
alter table public.orders add column if not exists delivery_content text;
alter table public.orders add column if not exists delivery_filename text;
alter table public.orders add column if not exists delivery_fields jsonb not null default '[]'::jsonb;
alter table public.orders add column if not exists payment_method text not null default 'balance';
alter table public.orders add column if not exists payment_status text not null default 'paid';
alter table public.orders add column if not exists payment_gateway_id text;
alter table public.orders add column if not exists payment_gateway_name text;
alter table public.orders add column if not exists payment_currency text;
alter table public.orders add column if not exists payment_trx_id text;
alter table public.orders add column if not exists payment_proof_url text;
alter table public.orders add column if not exists payment_note text;
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('Pending', 'Processing', 'Active', 'Delivered', 'Rejected'));

-- 4. Automatic .txt Product Accounts Pool table
create table if not exists public.product_accounts (
  id uuid primary key default gen_random_uuid(),
  tool_id text not null references public.tools(id) on delete cascade,
  plan_id text not null default '1m',
  file_name text not null default 'account.txt',
  account_content text not null,
  account_fields jsonb not null default '[]'::jsonb,
  status text not null default 'available' check (status in ('available', 'assigned')),
  assigned_order_id uuid references public.orders(id) on delete set null,
  assigned_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  assigned_at timestamptz
);

create index if not exists idx_product_accounts_pool
  on public.product_accounts (tool_id, plan_id, status, created_at);

alter table public.product_accounts enable row level security;
revoke all on public.product_accounts from anon, authenticated;

-- 5. Payment Gateways table
create table if not exists public.payment_gateways (
  id text primary key,
  name text not null,
  account_title text not null default '',
  account_number text not null,
  currency text not null default 'USD' check (currency in ('USD', 'PKR', 'INR')),
  instructions text not null default '',
  qr_code_url text,
  logo_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payment_gateways add column if not exists logo_url text;

create index if not exists idx_payment_gateways_active
  on public.payment_gateways (is_active, sort_order);

alter table public.payment_gateways enable row level security;
drop policy if exists "Public read active payment gateways" on public.payment_gateways;
create policy "Public read active payment gateways"
  on public.payment_gateways for select using (is_active = true);

-- 6. Product Reviews & Ratings table
create table if not exists public.product_reviews (
  id text primary key,
  tool_id text not null,
  order_id text,
  user_id uuid references auth.users(id) on delete set null,
  author_name text not null,
  author_email text,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text not null,
  screenshot_url text,
  review_date date not null default current_date,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  source text not null default 'user' check (source in ('user', 'admin')),
  verified boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_product_reviews_tool_status
  on public.product_reviews (tool_id, status, review_date desc);
create index if not exists idx_product_reviews_user_id
  on public.product_reviews (user_id);

alter table public.product_reviews enable row level security;

drop policy if exists "Read approved or own pending reviews" on public.product_reviews;
create policy "Read approved or own pending reviews"
  on public.product_reviews for select
  using (
    status = 'approved'
    or (auth.uid() is not null and user_id = auth.uid() and status = 'pending')
  );

drop policy if exists "Authenticated users insert own pending review" on public.product_reviews;
create policy "Authenticated users insert own pending review"
  on public.product_reviews for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending' and source = 'user');

-- 7. Notifications per-user column
alter table public.notifications add column if not exists user_id uuid references auth.users(id) on delete cascade;
drop policy if exists "Public read notifications" on public.notifications;
create policy "Public read notifications"
  on public.notifications for select using (user_id is null or auth.uid() = user_id);

-- 8. Enable Supabase Realtime across all live tables
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'site_settings') then
    alter publication supabase_realtime add table public.site_settings;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'categories') then
    alter publication supabase_realtime add table public.categories;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'banners') then
    alter publication supabase_realtime add table public.banners;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tools') then
    alter publication supabase_realtime add table public.tools;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles') then
    alter publication supabase_realtime add table public.profiles;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders') then
    alter publication supabase_realtime add table public.orders;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'payment_gateways') then
    alter publication supabase_realtime add table public.payment_gateways;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'product_reviews') then
    alter publication supabase_realtime add table public.product_reviews;
  end if;
end $$;
`;

export const COMPLETE_SUPABASE_SQL = `-- ============================================================================
-- ToolBazaar — Complete All-in-One Supabase Realtime Database Schema & Seed
-- Paste this entire script once in Supabase Dashboard -> SQL Editor -> Run
-- Includes all 11 tables, RLS policies, Google profile trigger, Checkout RPC,
-- Realtime publication, and starter categories/banners/tools/gateways.
-- ============================================================================

-- 1. SITE SETTINGS TABLE (Branding + One-Time Installation Lock)
create table if not exists public.site_settings (
  id text primary key default 'main',
  site_name text not null default 'ToolBazaar',
  site_tagline text not null default 'Premium Tools & Digital Products',
  support_email text not null default 'support@toolbazaar.in',
  vip_coupon_code text not null default 'BAZAAR20',
  vip_coupon_text text not null default 'Apply BAZAAR20 at checkout for 20% extra discount on all tools.',
  installation_completed boolean not null default false,
  installed_at timestamptz,
  installed_platform text,
  active_theme text not null default 'classic',
  theme_config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_settings add column if not exists installation_completed boolean not null default false;
alter table public.site_settings add column if not exists installed_at timestamptz;
alter table public.site_settings add column if not exists installed_platform text;
alter table public.site_settings add column if not exists active_theme text not null default 'classic';
alter table public.site_settings add column if not exists theme_config jsonb not null default '{}'::jsonb;

-- 2. ADMIN ACCOUNTS TABLE (Server-side service_role ONLY — zero public access)
create table if not exists public.admin_accounts (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. CATEGORIES TABLE
create table if not exists public.categories (
  id text primary key,
  label text not null,
  description text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. BANNERS TABLE
create table if not exists public.banners (
  id text primary key,
  title text not null,
  image_url text not null,
  target_category text not null default 'all' references public.categories(id) on update cascade,
  border_glow text not null default 'rgba(139, 92, 246, 0.45)',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. TOOLS (PRODUCTS & PLANS) TABLE
create table if not exists public.tools (
  id text primary key,
  name text not null,
  badge_text text not null default 'Premium',
  subtitle text not null default '',
  description text not null default '',
  category_id text not null references public.categories(id) on update cascade,
  brand_key text not null default 'chatgpt',
  logo_url text,
  original_price integer not null check (original_price >= 0),
  price integer not null check (price >= 0),
  discount_percent integer not null default 0 check (discount_percent between 0 and 100),
  available integer not null default 0 check (available >= 0),
  sold integer not null default 0 check (sold >= 0),
  trending boolean not null default false,
  delivery_type text not null default 'Instant Delivery',
  features jsonb not null default '[]'::jsonb,
  plans jsonb not null default '[]'::jsonb,
  theme jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tools add column if not exists logo_url text;

-- 6. USER PROFILES TABLE (Auto-created on Google Sign-In)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  full_name text not null default '',
  avatar_url text,
  wallet_credits integer not null default 0 check (wallet_credits >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 7. ORDERS TABLE (Linked to Google user + Delivery & Payment columns)
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  order_code text unique not null,
  customer_email text not null,
  items jsonb not null default '[]'::jsonb,
  subtotal integer not null check (subtotal >= 0),
  discount integer not null default 0 check (discount >= 0),
  total integer not null check (total >= 0),
  promo_code text,
  status text not null default 'Delivered' check (status in ('Pending', 'Processing', 'Active', 'Delivered', 'Rejected')),
  access_key text not null,
  delivery_mode text not null default 'automatic' check (delivery_mode in ('automatic', 'manual')),
  delivery_content text,
  delivery_filename text,
  delivery_fields jsonb not null default '[]'::jsonb,
  payment_method text not null default 'balance' check (payment_method in ('balance', 'gateway')),
  payment_status text not null default 'paid' check (payment_status in ('paid', 'pending_verification', 'approved', 'rejected')),
  payment_gateway_id text,
  payment_gateway_name text,
  payment_currency text check (payment_currency in ('USD', 'PKR', 'INR')),
  payment_trx_id text,
  payment_proof_url text,
  payment_note text,
  created_at timestamptz not null default now()
);

alter table public.orders add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.orders add column if not exists delivery_mode text not null default 'automatic';
alter table public.orders add column if not exists delivery_content text;
alter table public.orders add column if not exists delivery_filename text;
alter table public.orders add column if not exists delivery_fields jsonb not null default '[]'::jsonb;
alter table public.orders add column if not exists payment_method text not null default 'balance';
alter table public.orders add column if not exists payment_status text not null default 'paid';
alter table public.orders add column if not exists payment_gateway_id text;
alter table public.orders add column if not exists payment_gateway_name text;
alter table public.orders add column if not exists payment_currency text;
alter table public.orders add column if not exists payment_trx_id text;
alter table public.orders add column if not exists payment_proof_url text;
alter table public.orders add column if not exists payment_note text;
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check (status in ('Pending', 'Processing', 'Active', 'Delivered', 'Rejected'));

-- 8. PRODUCT ACCOUNTS POOL TABLE (Automatic .txt delivery — server ONLY)
create table if not exists public.product_accounts (
  id uuid primary key default gen_random_uuid(),
  tool_id text not null references public.tools(id) on delete cascade,
  plan_id text not null default '1m',
  file_name text not null default 'account.txt',
  account_content text not null,
  account_fields jsonb not null default '[]'::jsonb,
  status text not null default 'available' check (status in ('available', 'assigned')),
  assigned_order_id uuid references public.orders(id) on delete set null,
  assigned_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  assigned_at timestamptz
);

create index if not exists idx_product_accounts_pool
  on public.product_accounts (tool_id, plan_id, status, created_at);

-- 9. PAYMENT GATEWAYS TABLE
create table if not exists public.payment_gateways (
  id text primary key,
  name text not null,
  account_title text not null default '',
  account_number text not null,
  currency text not null default 'USD' check (currency in ('USD', 'PKR', 'INR')),
  instructions text not null default '',
  qr_code_url text,
  logo_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payment_gateways add column if not exists logo_url text;

create index if not exists idx_payment_gateways_active
  on public.payment_gateways (is_active, sort_order);

-- 10. NOTIFICATIONS TABLE
create table if not exists public.notifications (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  time_label text not null default 'Just now',
  read boolean not null default false,
  accent text not null default 'purple' check (accent in ('purple', 'green', 'amber')),
  created_at timestamptz not null default now()
);

alter table public.notifications add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- 11. PRODUCT REVIEWS & RATINGS TABLE
create table if not exists public.product_reviews (
  id text primary key,
  tool_id text not null,
  order_id text,
  user_id uuid references auth.users(id) on delete set null,
  author_name text not null,
  author_email text,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text not null,
  screenshot_url text,
  review_date date not null default current_date,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  source text not null default 'user' check (source in ('user', 'admin')),
  verified boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_product_reviews_tool_status
  on public.product_reviews (tool_id, status, review_date desc);
create index if not exists idx_product_reviews_user_id
  on public.product_reviews (user_id);

-- Auto-create profile row in public.profiles on Google Sign-In
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Performance indexes
create index if not exists idx_categories_sort on public.categories (is_active, sort_order);
create index if not exists idx_banners_sort on public.banners (is_active, sort_order);
create index if not exists idx_tools_category_sort on public.tools (is_active, category_id, sort_order);
create index if not exists idx_orders_user_created on public.orders (user_id, created_at desc);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
alter table public.site_settings enable row level security;
alter table public.admin_accounts enable row level security;
alter table public.categories enable row level security;
alter table public.banners enable row level security;
alter table public.tools enable row level security;
alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.product_accounts enable row level security;
alter table public.payment_gateways enable row level security;
alter table public.notifications enable row level security;
alter table public.product_reviews enable row level security;

revoke all on public.admin_accounts from anon, authenticated;
revoke all on public.product_accounts from anon, authenticated;

drop policy if exists "Public read site settings" on public.site_settings;
create policy "Public read site settings" on public.site_settings for select using (true);

drop policy if exists "Public read active payment gateways" on public.payment_gateways;
create policy "Public read active payment gateways" on public.payment_gateways for select using (is_active = true);

drop policy if exists "Public read categories" on public.categories;
create policy "Public read categories" on public.categories for select using (is_active = true);

drop policy if exists "Public read banners" on public.banners;
create policy "Public read banners" on public.banners for select using (is_active = true);

drop policy if exists "Public read tools" on public.tools;
create policy "Public read tools" on public.tools for select using (is_active = true);

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles for select using (auth.uid() = id);

drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (id, email, full_name, avatar_url) on public.profiles to authenticated;
grant update (full_name, avatar_url, updated_at) on public.profiles to authenticated;

drop policy if exists "Public read orders" on public.orders;
drop policy if exists "Users read own orders" on public.orders;
create policy "Users read own orders" on public.orders for select using (auth.uid() = user_id);

drop policy if exists "Public read notifications" on public.notifications;
create policy "Public read notifications" on public.notifications for select using (user_id is null or auth.uid() = user_id);

drop policy if exists "Read approved or own pending reviews" on public.product_reviews;
create policy "Read approved or own pending reviews" on public.product_reviews for select
  using (status = 'approved' or (auth.uid() is not null and user_id = auth.uid() and status = 'pending'));

drop policy if exists "Authenticated users insert own pending review" on public.product_reviews;
create policy "Authenticated users insert own pending review" on public.product_reviews for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending' and source = 'user');

-- ============================================================================
-- ENABLE SUPABASE REALTIME FOR ALL STOREFRONT TABLES
-- ============================================================================
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'site_settings') then
    alter publication supabase_realtime add table public.site_settings;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'categories') then
    alter publication supabase_realtime add table public.categories;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'banners') then
    alter publication supabase_realtime add table public.banners;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tools') then
    alter publication supabase_realtime add table public.tools;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles') then
    alter publication supabase_realtime add table public.profiles;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders') then
    alter publication supabase_realtime add table public.orders;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'payment_gateways') then
    alter publication supabase_realtime add table public.payment_gateways;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'product_reviews') then
    alter publication supabase_realtime add table public.product_reviews;
  end if;
end $$;

-- ============================================================================
-- STARTER SEED DATA (Safe on conflict — editable anytime from Admin Panel)
-- ============================================================================
insert into public.site_settings (
  id, site_name, site_tagline, support_email, vip_coupon_code, vip_coupon_text
) values (
  'main', 'ToolBazaar', 'Premium Tools & Digital Products', 'support@toolbazaar.in',
  'BAZAAR20', 'Apply BAZAAR20 at checkout for 20% extra discount on all tools.'
) on conflict (id) do nothing;

insert into public.categories (id, label, description, sort_order, is_active) values
  ('all', 'All', 'Browse every verified premium tool & digital subscription.', 1, true),
  ('ai', 'AI Tools', 'ChatGPT Plus, Claude Pro, Midjourney & Perplexity AI.', 2, true),
  ('video', 'Video Tools', 'CapCut Pro, Premiere Pro & creator editing suites.', 3, true),
  ('design', 'Design Tools', 'Canva Pro, Adobe CC, Figma Pro & creative assets.', 4, true),
  ('productivity', 'Productivity', 'Notion Plus + AI, Grammarly Pro & workflow boosters.', 5, true),
  ('more', 'More', 'Stock templates, asset libraries & creator bundles.', 6, true)
on conflict (id) do nothing;

insert into public.banners (id, title, image_url, target_category, border_glow, sort_order, is_active) values
  ('banner-welcome-home', 'ToolBazaar Welcome Home — Premium Digital Tools', '/assets/aistudio/image_69901163.png', 'all', 'rgba(139, 92, 246, 0.45)', 1, true),
  ('banner-exclusive-deals', 'Premium Digital Tools Exclusive Deals — Save More Today', '/assets/aistudio/image_e6944b96.png', 'ai', 'rgba(168, 85, 247, 0.48)', 2, true),
  ('banner-limited-discount', 'Limited Time Discount — Up to 50% Off', '/assets/aistudio/image_b36b8b33.png', 'design', 'rgba(99, 102, 241, 0.48)', 3, true)
on conflict (id) do nothing;

insert into public.payment_gateways (
  id, name, account_title, account_number, currency, instructions, qr_code_url, is_active, sort_order
) values
  ('easypaisa', 'EasyPaisa', 'ToolBazaar Official', '0300-0000000', 'PKR', 'Send the exact PKR amount to our EasyPaisa account, then submit your Transaction ID or payment screenshot.', null, true, 1),
  ('jazzcash', 'JazzCash', 'ToolBazaar Official', '0301-0000000', 'PKR', 'Transfer the exact PKR total to our JazzCash number and upload your payment receipt or TRX ID.', null, true, 2),
  ('usdt-trc20', 'USDT (TRC20 Crypto)', 'ToolBazaar Crypto Treasury', 'TExampleTRC20WalletAddressUpdateInAdmin', 'USD', 'Send exact USDT via TRON (TRC20) network only. Paste your TXID hash or upload transfer screenshot.', null, true, 3),
  ('upi-india', 'UPI / PhonePe / GPay', 'ToolBazaar India', 'toolbazaar@upi', 'INR', 'Pay via any UPI app using the UPI ID or QR code above, then enter your 12-digit UTR number or upload screenshot.', null, true, 4)
on conflict (id) do nothing;

insert into public.tools (
  id, name, badge_text, subtitle, description, category_id, brand_key, logo_url,
  original_price, price, discount_percent, available, sold, trending, delivery_type,
  features, plans, theme, sort_order, is_active
) values
(
  'chatgpt-plus', 'ChatGPT Plus', 'Premium', 'Official GPT-4o Access',
  'Experience full ChatGPT Plus with GPT-4o, DALL-E image creation, deep web browsing, file uploads, and priority response speeds.',
  'ai', 'chatgpt', null, 1999, 1449, 27, 42, 158, true, 'Instant Delivery',
  '["Official GPT-4o & o1 reasoning access","DALL-E image generation & vision tools","Fast priority speed during peak hours","Full replacement warranty for plan duration"]'::jsonb,
  '[{"id":"1m","label":"1 Month","months":1,"price":1449,"originalPrice":1999,"deliveryMode":"automatic"},{"id":"3m","label":"3 Months","months":3,"price":3999,"originalPrice":5997,"deliveryMode":"automatic"},{"id":"12m","label":"1 Year","months":12,"price":13999,"originalPrice":23988,"deliveryMode":"manual"}]'::jsonb,
  '{"cardBg":"linear-gradient(145deg, rgba(16, 163, 127, 0.24) 0%, rgba(18, 22, 36, 0.94) 55%, rgba(16, 14, 30, 0.98) 100%)","cardBorder":"rgba(20, 184, 140, 0.42)","glowColor":"rgba(16, 163, 127, 0.26)"}'::jsonb,
  1, true
),
(
  'capcut-pro', 'CapCut Pro', 'Premium', 'Pro Video Editing Features',
  'Unlock every CapCut Pro transition, auto-caption style, 4K 60fps watermark-free export, cloud sync, and AI background removal.',
  'video', 'capcut', null, 999, 599, 40, 87, 413, true, 'Instant Delivery',
  '["All Pro effects, LUTs & trending templates","Auto captions & AI voiceover studio","Works on Mobile, Windows & macOS","Zero watermark 4K Ultra HD exports"]'::jsonb,
  '[{"id":"1m","label":"1 Month","months":1,"price":599,"originalPrice":999,"deliveryMode":"automatic"},{"id":"3m","label":"3 Months","months":3,"price":1599,"originalPrice":2997,"deliveryMode":"automatic"}]'::jsonb,
  '{"cardBg":"linear-gradient(145deg, rgba(168, 174, 210, 0.2) 0%, rgba(22, 20, 36, 0.95) 55%, rgba(16, 14, 30, 0.98) 100%)","cardBorder":"rgba(196, 202, 232, 0.34)","glowColor":"rgba(226, 232, 240, 0.16)"}'::jsonb,
  2, true
),
(
  'canva-pro', 'Canva Pro', 'Premium', 'All Pro Features Unlocked',
  'Direct activation on your own email. Unlock Magic Studio AI, 100M+ stock photos, Brand Kits, one-click Background Remover & Resize.',
  'design', 'canva', null, 1999, 1299, 35, 56, 276, true, 'Instant Delivery',
  '["Activated directly on your personal email","100M+ premium templates, fonts & graphics","Magic Eraser, Expand & Background Remover","1TB cloud storage & Brand Kit access"]'::jsonb,
  '[{"id":"1m","label":"1 Month","months":1,"price":1299,"originalPrice":1999,"deliveryMode":"automatic"},{"id":"6m","label":"6 Months","months":6,"price":3499,"originalPrice":5999,"deliveryMode":"manual"}]'::jsonb,
  '{"cardBg":"linear-gradient(145deg, rgba(37, 99, 235, 0.28) 0%, rgba(19, 21, 44, 0.94) 55%, rgba(16, 14, 30, 0.98) 100%)","cardBorder":"rgba(59, 130, 246, 0.48)","glowColor":"rgba(59, 130, 246, 0.28)"}'::jsonb,
  3, true
),
(
  'adobe-cc', 'Adobe CC', 'Premium', 'Ps, Pr, Ae & More (Full Apps)',
  'Complete Adobe Creative Cloud All Apps plan with Photoshop, Premiere Pro, After Effects, Illustrator, Firefly Generative AI & 100GB cloud.',
  'design', 'adobe', null, 4999, 2499, 50, 23, 119, true, 'Instant Delivery',
  '["20+ Official Adobe Desktop & Mobile Apps","Photoshop Generative Fill & Firefly AI credits","100GB Creative Cloud storage included","Activated on your Adobe ID (2 devices)"]'::jsonb,
  '[{"id":"1m","label":"1 Month","months":1,"price":2499,"originalPrice":4999,"deliveryMode":"manual"},{"id":"3m","label":"3 Months","months":3,"price":6999,"originalPrice":14997,"deliveryMode":"manual"}]'::jsonb,
  '{"cardBg":"linear-gradient(145deg, rgba(225, 29, 72, 0.30) 0%, rgba(30, 17, 36, 0.94) 55%, rgba(17, 13, 28, 0.98) 100%)","cardBorder":"rgba(244, 63, 94, 0.48)","glowColor":"rgba(225, 29, 72, 0.28)"}'::jsonb,
  4, true
)
on conflict (id) do nothing;

insert into public.notifications (id, title, message, time_label, read, accent) values
  ('notif-1', 'Flash Offer: Extra 20% Off!', 'Apply code BAZAAR20 at checkout for 20% off any AI or Creator tool.', '5m ago', false, 'purple')
on conflict (id) do nothing;
`;

export const FRESH_SUPABASE_SQL = (() => {
  const seedMarker = '-- ============================================================================\n-- STARTER SEED DATA';
  const idx = COMPLETE_SUPABASE_SQL.indexOf(seedMarker);
  const bodyStart = COMPLETE_SUPABASE_SQL.indexOf('-- 1. SITE SETTINGS TABLE');
  const schemaCore =
    idx > 0 && bodyStart >= 0
      ? COMPLETE_SUPABASE_SQL.slice(bodyStart, idx).trimEnd()
      : COMPLETE_SUPABASE_SQL;
  return `-- ============================================================================
-- ToolBazaar — Fresh Clean Database Schema (Zero Old/Demo Data)
-- Run once in a brand-new Supabase project: SQL Editor -> New Query -> Run
-- Creates all 11 tables, RLS policies, Google Auth trigger & Realtime sync.
-- ============================================================================

${schemaCore}

-- ============================================================================
-- FRESH CLEAN BASE ROWS ONLY (Zero demo products, banners, orders, or users)
-- ============================================================================
insert into public.site_settings (
  id, site_name, site_tagline, support_email, vip_coupon_code, vip_coupon_text, installation_completed
) values (
  'main', 'ToolBazaar', 'Premium Tools & Digital Products', 'support@yourdomain.com',
  'WELCOME20', 'Apply WELCOME20 at checkout for 20% extra discount.', false
) on conflict (id) do nothing;

insert into public.categories (id, label, description, sort_order, is_active) values
  ('all', 'All', 'Browse all products.', 1, true),
  ('ai', 'AI Tools', 'AI & automation subscriptions.', 2, true),
  ('video', 'Video Tools', 'Video editing & creator tools.', 3, true),
  ('design', 'Design Tools', 'Graphic & UI design tools.', 4, true),
  ('productivity', 'Productivity', 'Writing & workflow tools.', 5, true),
  ('more', 'More', 'Other digital products.', 6, true)
on conflict (id) do nothing;
`;
})();
