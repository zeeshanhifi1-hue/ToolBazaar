-- ============================================================================
-- ToolBazaar — Fresh Clean Supabase Database Schema (Zero Old/Demo Data)
-- Run once in a brand-new Supabase project: SQL Editor -> New Query -> Run
-- Creates all 11 tables, RLS policies, Google Auth trigger, and Realtime sync.
-- ============================================================================

-- 1. SITE SETTINGS TABLE (Branding + One-Time Installation Lock)
create table if not exists public.site_settings (
  id text primary key default 'main',
  site_name text not null default 'ToolBazaar',
  site_tagline text not null default 'Premium Tools & Digital Products',
  support_email text not null default 'support@yourdomain.com',
  vip_coupon_code text not null default 'WELCOME20',
  vip_coupon_text text not null default 'Apply WELCOME20 at checkout for 20% extra discount.',
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
