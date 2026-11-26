-- ============================================================================
-- ToolBazaar — Complete Supabase Realtime Database Schema & Seed Data
-- Run this entire script once in Supabase Dashboard -> SQL Editor -> New Query
-- ============================================================================

-- 0. SITE SETTINGS TABLE (Editable from Admin Panel, public read for storefront)
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

-- 0b. ADMIN ACCOUNTS TABLE (Server-side service_role only — zero public access)
create table if not exists public.admin_accounts (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 1. CATEGORIES TABLE
create table if not exists public.categories (
  id text primary key,
  label text not null,
  description text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. BANNERS TABLE
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

-- 3. TOOLS (PRODUCTS) TABLE
create table if not exists public.tools (
  id text primary key,
  name text not null,
  badge_text text not null default 'Premium',
  subtitle text not null default '',
  description text not null default '',
  category_id text not null references public.categories(id) on update cascade,
  brand_key text not null default 'chatgpt',
  logo_url text, -- Optional custom HTTPS or relative image URL; null uses built-in vector icon
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

-- 4. USER PROFILES TABLE (Auto-created on Google Sign-In)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  full_name text not null default '',
  avatar_url text,
  wallet_credits integer not null default 0 check (wallet_credits >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. ORDERS TABLE (Linked to authenticated Google user)
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

-- 5b. PRODUCT ACCOUNTS POOL TABLE (Automatic .txt account delivery — server/RPC ONLY, zero client access)
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

-- 5c. PAYMENT GATEWAYS TABLE (Admin-managed manual gateways: EasyPaisa, JazzCash, Crypto, UPI, etc.)
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

-- 6. NOTIFICATIONS TABLE
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

-- 6b. PRODUCT REVIEWS & RATINGS TABLE
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

-- Auto-create profile row in public.profiles whenever a new Google user signs up
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

-- Indexes for fast sorted queries
create index if not exists idx_categories_sort on public.categories (is_active, sort_order);
create index if not exists idx_banners_sort on public.banners (is_active, sort_order);
create index if not exists idx_tools_category_sort on public.tools (is_active, category_id, sort_order);
create index if not exists idx_orders_user_created on public.orders (user_id, created_at desc);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Storefront catalog is public read; profiles & orders are strictly user-scoped.
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

drop policy if exists "Public read site settings" on public.site_settings;
create policy "Public read site settings" on public.site_settings
  for select using (true);

revoke all on public.admin_accounts from anon, authenticated;
revoke all on public.product_accounts from anon, authenticated;

drop policy if exists "Public read active payment gateways" on public.payment_gateways;
create policy "Public read active payment gateways" on public.payment_gateways
  for select using (is_active = true);

drop policy if exists "Public read categories" on public.categories;
create policy "Public read categories" on public.categories
  for select using (is_active = true);

drop policy if exists "Public read banners" on public.banners;
create policy "Public read banners" on public.banners
  for select using (is_active = true);

drop policy if exists "Public read tools" on public.tools;
create policy "Public read tools" on public.tools
  for select using (is_active = true);

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (id, email, full_name, avatar_url) on public.profiles to authenticated;
grant update (full_name, avatar_url, updated_at) on public.profiles to authenticated;

drop policy if exists "Public read orders" on public.orders;
drop policy if exists "Users read own orders" on public.orders;
create policy "Users read own orders" on public.orders
  for select using (auth.uid() = user_id);

drop policy if exists "Public read notifications" on public.notifications;
create policy "Public read notifications" on public.notifications
  for select using (user_id is null or auth.uid() = user_id);

drop policy if exists "Read approved or own pending reviews" on public.product_reviews;
create policy "Read approved or own pending reviews" on public.product_reviews
  for select using (
    status = 'approved'
    or (auth.uid() is not null and user_id = auth.uid() and status = 'pending')
  );

drop policy if exists "Authenticated users insert own pending review" on public.product_reviews;
create policy "Authenticated users insert own pending review" on public.product_reviews
  for insert to authenticated with check (
    user_id = auth.uid()
    and status = 'pending'
    and source = 'user'
  );

-- ============================================================================
-- ATOMIC ORDER CHECKOUT RPC (My Balance OR Payment Gateway + Auto .txt / Pending)
-- ============================================================================
drop function if exists public.place_tool_order(text, jsonb, text);
create or replace function public.place_tool_order(
  p_customer_email text,
  p_items jsonb,
  p_promo_code text default null,
  p_payment_method text default 'balance',
  p_payment_gateway_id text default null,
  p_payment_trx_id text default null,
  p_payment_proof_url text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_tool public.tools%rowtype;
  v_plan jsonb;
  v_plan_id text;
  v_plan_mode text;
  v_qty integer;
  v_unit_price integer;
  v_unit_orig integer;
  v_plan_label text;
  v_subtotal integer := 0;
  v_discount_pct integer := 0;
  v_discount integer := 0;
  v_total integer := 0;
  v_clean_promo text;
  v_order_items jsonb := '[]'::jsonb;
  v_order_code text;
  v_access_key text;
  v_created public.orders%rowtype;
  v_user_id uuid := auth.uid();
  v_email text;
  v_acc record;
  v_assigned_ids uuid[] := '{}'::uuid[];
  v_assigned_for_item integer := 0;
  v_all_auto_fulfilled boolean := true;
  v_combined_content text := '';
  v_first_filename text := null;
  v_combined_fields jsonb := '[]'::jsonb;
  v_final_status text := 'Delivered';
  v_final_mode text := 'automatic';
  v_pay_method text := lower(coalesce(nullif(trim(p_payment_method), ''), 'balance'));
  v_pay_status text := 'paid';
  v_gateway public.payment_gateways%rowtype;
  v_gateway_name text := null;
  v_gateway_currency text := null;
  v_clean_trx text := nullif(trim(coalesce(p_payment_trx_id, '')), '');
  v_clean_proof text := nullif(trim(coalesce(p_payment_proof_url, '')), '');
  v_wallet integer := 0;
begin
  if v_user_id is null then
    raise exception 'Authentication required: please continue with Google';
  end if;

  if v_pay_method not in ('balance', 'gateway') then
    raise exception 'Invalid payment method';
  end if;

  v_email := nullif(trim(coalesce(p_customer_email, '')), '');
  if v_email is null or position('@' in v_email) < 2 then
    select email into v_email from auth.users where id = v_user_id;
  end if;
  if v_email is null or position('@' in v_email) < 2 then
    raise exception 'Valid customer email is required';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Order must contain at least one item';
  end if;

  if v_pay_method = 'gateway' then
    if p_payment_gateway_id is null or trim(p_payment_gateway_id) = '' then
      raise exception 'Please select a payment gateway';
    end if;
    select * into v_gateway
    from public.payment_gateways
    where id = trim(p_payment_gateway_id) and is_active = true;
    if not found then
      raise exception 'Selected payment gateway is not available';
    end if;
    if v_clean_trx is null and v_clean_proof is null then
      raise exception 'Please provide a Transaction ID or payment proof screenshot';
    end if;
    v_gateway_name := v_gateway.name;
    v_gateway_currency := v_gateway.currency;
    v_pay_status := 'pending_verification';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := greatest(1, coalesce((v_item->>'quantity')::integer, 1));
    v_plan_id := coalesce(nullif(trim(v_item->>'plan_id'), ''), '1m');

    select * into v_tool
    from public.tools
    where id = (v_item->>'tool_id') and is_active = true
    for update;

    if not found then
      raise exception 'Tool % not found', (v_item->>'tool_id');
    end if;

    if v_tool.available < v_qty then
      raise exception 'Out of stock for %', v_tool.name;
    end if;

    select elem into v_plan
    from jsonb_array_elements(v_tool.plans) elem
    where elem->>'id' = v_plan_id
    limit 1;

    if v_plan is not null then
      v_unit_price := coalesce((v_plan->>'price')::integer, v_tool.price);
      v_unit_orig := coalesce((v_plan->>'originalPrice')::integer, v_tool.original_price);
      v_plan_label := coalesce(v_plan->>'label', '1 Month');
      v_plan_mode := lower(coalesce(v_plan->>'deliveryMode', v_plan->>'delivery_mode', 'automatic'));
    else
      v_unit_price := v_tool.price;
      v_unit_orig := v_tool.original_price;
      v_plan_label := '1 Month';
      v_plan_mode := 'automatic';
    end if;

    v_subtotal := v_subtotal + (v_unit_price * v_qty);

    update public.tools
    set available = available - v_qty,
        sold = sold + v_qty,
        updated_at = now()
    where id = v_tool.id;

    -- Only pull automatic .txt credentials immediately when paid via My Balance
    if v_pay_method = 'gateway' or v_plan_mode = 'manual' then
      v_all_auto_fulfilled := false;
    else
      v_assigned_for_item := 0;
      for v_acc in
        select id, file_name, account_content, account_fields
        from public.product_accounts
        where tool_id = v_tool.id
          and plan_id = v_plan_id
          and status = 'available'
        order by created_at asc
        limit v_qty
        for update skip locked
      loop
        v_assigned_ids := array_append(v_assigned_ids, v_acc.id);
        v_assigned_for_item := v_assigned_for_item + 1;
        if v_first_filename is null then
          v_first_filename := v_acc.file_name;
        end if;
        if v_combined_content <> '' then
          v_combined_content := v_combined_content || E'\n\n---\n\n';
        end if;
        v_combined_content := v_combined_content || v_acc.account_content;
        if jsonb_typeof(v_acc.account_fields) = 'array' then
          v_combined_fields := v_combined_fields || v_acc.account_fields;
        end if;
      end loop;

      if v_assigned_for_item < v_qty then
        v_all_auto_fulfilled := false;
      end if;
    end if;

    v_order_items := v_order_items || jsonb_build_object(
      'toolId', v_tool.id,
      'planId', v_plan_id,
      'planLabel', v_plan_label,
      'name', v_tool.name,
      'brand', v_tool.brand_key,
      'unitPrice', v_unit_price,
      'unitOriginalPrice', v_unit_orig,
      'quantity', v_qty
    );
  end loop;

  v_clean_promo := nullif(upper(trim(coalesce(p_promo_code, ''))), '');
  if v_clean_promo = 'SAVE10' then
    v_discount_pct := 10;
  elsif v_clean_promo = 'TOOLS15' then
    v_discount_pct := 15;
  elsif v_clean_promo = 'BAZAAR20' then
    v_discount_pct := 20;
  else
    v_clean_promo := null;
  end if;

  v_discount := round((v_subtotal * v_discount_pct) / 100.0);
  v_total := greatest(0, v_subtotal - v_discount);

  -- Atomic wallet balance check & deduction when paying with My Balance
  if v_pay_method = 'balance' then
    select wallet_credits into v_wallet
    from public.profiles
    where id = v_user_id
    for update;

    if not found or coalesce(v_wallet, 0) < v_total then
      raise exception 'Insufficient wallet balance. Please use a Payment Gateway.';
    end if;

    update public.profiles
    set wallet_credits = wallet_credits - v_total,
        updated_at = now()
    where id = v_user_id;
  end if;

  if v_pay_method = 'balance' and v_all_auto_fulfilled and coalesce(array_length(v_assigned_ids, 1), 0) > 0 then
    v_final_status := 'Delivered';
    v_final_mode := 'automatic';
  else
    v_final_status := 'Pending';
    v_final_mode := 'manual';
    v_assigned_ids := '{}'::uuid[];
    v_combined_content := null;
    v_first_filename := null;
    v_combined_fields := '[]'::jsonb;
  end if;

  v_order_code := 'ORD-' || (1050 + (select count(*) from public.orders) + 1)::text;
  v_access_key := 'TB-'
    || upper(substr(md5(gen_random_uuid()::text), 1, 4)) || '-'
    || upper(substr(md5(gen_random_uuid()::text), 5, 4)) || '-'
    || upper(substr(md5(gen_random_uuid()::text), 9, 4));

  insert into public.orders (
    user_id, order_code, customer_email, items, subtotal, discount, total, promo_code,
    status, access_key, delivery_mode, delivery_content, delivery_filename, delivery_fields,
    payment_method, payment_status, payment_gateway_id, payment_gateway_name,
    payment_currency, payment_trx_id, payment_proof_url
  ) values (
    v_user_id, v_order_code, v_email, v_order_items, v_subtotal, v_discount, v_total, v_clean_promo,
    v_final_status, v_access_key, v_final_mode, v_combined_content, v_first_filename, v_combined_fields,
    v_pay_method, v_pay_status,
    case when v_pay_method = 'gateway' then v_gateway.id else null end,
    v_gateway_name, v_gateway_currency, v_clean_trx, v_clean_proof
  )
  returning * into v_created;

  if coalesce(array_length(v_assigned_ids, 1), 0) > 0 then
    update public.product_accounts
    set status = 'assigned',
        assigned_order_id = v_created.id,
        assigned_user_id = v_user_id,
        assigned_at = now()
    where id = any(v_assigned_ids);
  end if;

  insert into public.notifications (id, user_id, title, message, time_label, read, accent)
  values (
    'notif-' || v_order_code,
    v_user_id,
    case
      when v_pay_method = 'gateway' then 'Order #' || v_order_code || ' Payment Verification Pending'
      when v_final_status = 'Delivered' then 'Order #' || v_order_code || ' Delivered'
      else 'Order #' || v_order_code || ' Pending Approval'
    end,
    case
      when v_pay_method = 'gateway' then 'We received your ' || coalesce(v_gateway_name, 'payment') || ' submission. Admin will verify & approve shortly.'
      when v_final_status = 'Delivered' then 'Your account details are ready inside My Orders.'
      else 'Your order is confirmed! Admin is preparing your account details.'
    end,
    'Just now',
    false,
    case when v_final_status = 'Delivered' then 'green' else 'amber' end
  )
  on conflict (id) do nothing;

  return v_created;
end;
$$;

revoke execute on function public.place_tool_order(text, jsonb, text, text, text, text, text) from anon;
grant execute on function public.place_tool_order(text, jsonb, text, text, text, text, text) to authenticated;

-- ============================================================================
-- ENABLE SUPABASE REALTIME FOR ALL TABLES
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
-- SEED DATA: DEFAULT PAYMENT GATEWAYS (Editable anytime in Admin -> Payments)
-- ============================================================================
insert into public.payment_gateways (
  id, name, account_title, account_number, currency, instructions, qr_code_url, is_active, sort_order
) values
  ('easypaisa', 'EasyPaisa', 'ToolBazaar Official', '0300-0000000', 'PKR', 'Send the exact PKR amount to our EasyPaisa account, then submit your Transaction ID or payment screenshot.', null, true, 1),
  ('jazzcash', 'JazzCash', 'ToolBazaar Official', '0301-0000000', 'PKR', 'Transfer the exact PKR total to our JazzCash number and upload your payment receipt or TRX ID.', null, true, 2),
  ('usdt-trc20', 'USDT (TRC20 Crypto)', 'ToolBazaar Crypto Treasury', 'TExampleTRC20WalletAddressUpdateInAdmin', 'USD', 'Send exact USDT via TRON (TRC20) network only. Paste your TXID hash or upload transfer screenshot.', null, true, 3),
  ('upi-india', 'UPI / PhonePe / GPay', 'ToolBazaar India', 'toolbazaar@upi', 'INR', 'Pay via any UPI app using the UPI ID or QR code above, then enter your 12-digit UTR number or upload screenshot.', null, true, 4)
on conflict (id) do nothing;

-- ============================================================================
-- SEED DATA: SITE SETTINGS
-- ============================================================================
insert into public.site_settings (
  id, site_name, site_tagline, support_email, vip_coupon_code, vip_coupon_text
) values (
  'main',
  'ToolBazaar',
  'Premium Tools & Digital Products',
  'support@toolbazaar.in',
  'BAZAAR20',
  'Apply BAZAAR20 at checkout for 20% extra discount on all tools.'
)
on conflict (id) do nothing;

-- ============================================================================
-- SEED DATA: 6 CATEGORIES
-- ============================================================================
insert into public.categories (id, label, description, sort_order, is_active) values
  ('all', 'All', 'Browse every verified premium tool & digital subscription.', 1, true),
  ('ai', 'AI Tools', 'ChatGPT Plus, Claude Pro, Midjourney & Perplexity AI.', 2, true),
  ('video', 'Video Tools', 'CapCut Pro, Premiere Pro & creator editing suites.', 3, true),
  ('design', 'Design Tools', 'Canva Pro, Adobe CC, Figma Pro & creative assets.', 4, true),
  ('productivity', 'Productivity', 'Notion Plus + AI, Grammarly Pro & workflow boosters.', 5, true),
  ('more', 'More', 'Stock templates, asset libraries & creator bundles.', 6, true)
on conflict (id) do update set
  label = excluded.label,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

-- ============================================================================
-- SEED DATA: 3 BANNERS (Change image_url anytime in Supabase for live updates)
-- ============================================================================
insert into public.banners (id, title, image_url, target_category, border_glow, sort_order, is_active) values
  ('banner-welcome-home', 'ToolBazaar Welcome Home — Premium Digital Tools', '/assets/aistudio/image_69901163.png', 'all', 'rgba(139, 92, 246, 0.45)', 1, true),
  ('banner-exclusive-deals', 'Premium Digital Tools Exclusive Deals — Save More Today', '/assets/aistudio/image_e6944b96.png', 'ai', 'rgba(168, 85, 247, 0.48)', 2, true),
  ('banner-limited-discount', 'Limited Time Discount — Up to 50% Off', '/assets/aistudio/image_b36b8b33.png', 'design', 'rgba(99, 102, 241, 0.48)', 3, true)
on conflict (id) do update set
  title = excluded.title,
  image_url = excluded.image_url,
  target_category = excluded.target_category,
  border_glow = excluded.border_glow,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

-- ============================================================================
-- SEED DATA: 12 PREMIUM TOOLS
-- ============================================================================
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
  '[{"id":"1m","label":"1 Month","months":1,"price":1449,"originalPrice":1999},{"id":"3m","label":"3 Months","months":3,"price":3999,"originalPrice":5997},{"id":"12m","label":"1 Year","months":12,"price":13999,"originalPrice":23988}]'::jsonb,
  '{"cardBg":"linear-gradient(145deg, rgba(16, 163, 127, 0.24) 0%, rgba(18, 22, 36, 0.94) 55%, rgba(16, 14, 30, 0.98) 100%)","cardBorder":"rgba(20, 184, 140, 0.42)","glowColor":"rgba(16, 163, 127, 0.26)"}'::jsonb,
  1, true
),
(
  'capcut-pro', 'CapCut Pro', 'Premium', 'Pro Video Editing Features',
  'Unlock every CapCut Pro transition, auto-caption style, 4K 60fps watermark-free export, cloud sync, and AI background removal.',
  'video', 'capcut', null, 999, 599, 40, 87, 413, true, 'Instant Delivery',
  '["All Pro effects, LUTs & trending templates","Auto captions & AI voiceover studio","Works on Mobile, Windows & macOS","Zero watermark 4K Ultra HD exports"]'::jsonb,
  '[{"id":"1m","label":"1 Month","months":1,"price":599,"originalPrice":999},{"id":"3m","label":"3 Months","months":3,"price":1599,"originalPrice":2997},{"id":"12m","label":"1 Year","months":12,"price":4999,"originalPrice":11988}]'::jsonb,
  '{"cardBg":"linear-gradient(145deg, rgba(168, 174, 210, 0.2) 0%, rgba(22, 20, 36, 0.95) 55%, rgba(16, 14, 30, 0.98) 100%)","cardBorder":"rgba(196, 202, 232, 0.34)","glowColor":"rgba(226, 232, 240, 0.16)"}'::jsonb,
  2, true
),
(
  'canva-pro', 'Canva Pro', 'Premium', 'All Pro Features Unlocked',
  'Direct activation on your own email. Unlock Magic Studio AI, 100M+ stock photos, Brand Kits, one-click Background Remover & Resize.',
  'design', 'canva', null, 1999, 1299, 35, 56, 276, true, 'Instant Delivery',
  '["Activated directly on your personal email","100M+ premium templates, fonts & graphics","Magic Eraser, Expand & Background Remover","1TB cloud storage & Brand Kit access"]'::jsonb,
  '[{"id":"1m","label":"1 Month","months":1,"price":1299,"originalPrice":1999},{"id":"6m","label":"6 Months","months":6,"price":3499,"originalPrice":5999},{"id":"12m","label":"1 Year","months":12,"price":5499,"originalPrice":11999}]'::jsonb,
  '{"cardBg":"linear-gradient(145deg, rgba(37, 99, 235, 0.28) 0%, rgba(19, 21, 44, 0.94) 55%, rgba(16, 14, 30, 0.98) 100%)","cardBorder":"rgba(59, 130, 246, 0.48)","glowColor":"rgba(59, 130, 246, 0.28)"}'::jsonb,
  3, true
),
(
  'adobe-cc', 'Adobe CC', 'Premium', 'Ps, Pr, Ae & More (Full Apps)',
  'Complete Adobe Creative Cloud All Apps plan with Photoshop, Premiere Pro, After Effects, Illustrator, Firefly Generative AI & 100GB cloud.',
  'design', 'adobe', null, 4999, 2499, 50, 23, 119, true, 'Instant Delivery',
  '["20+ Official Adobe Desktop & Mobile Apps","Photoshop Generative Fill & Firefly AI credits","100GB Creative Cloud storage included","Activated on your Adobe ID (2 devices)"]'::jsonb,
  '[{"id":"1m","label":"1 Month","months":1,"price":2499,"originalPrice":4999},{"id":"3m","label":"3 Months","months":3,"price":6999,"originalPrice":14997},{"id":"12m","label":"1 Year","months":12,"price":21999,"originalPrice":59988}]'::jsonb,
  '{"cardBg":"linear-gradient(145deg, rgba(225, 29, 72, 0.30) 0%, rgba(30, 17, 36, 0.94) 55%, rgba(17, 13, 28, 0.98) 100%)","cardBorder":"rgba(244, 63, 94, 0.48)","glowColor":"rgba(225, 29, 72, 0.28)"}'::jsonb,
  4, true
),
(
  'midjourney-pro', 'Midjourney Pro', 'Premium', 'Fast GPU & Stealth Mode',
  'Create hyper-realistic AI art and commercial visuals with Midjourney v6.1, 30 Fast GPU hours, Relax mode, and private Stealth generations.',
  'ai', 'midjourney', null, 2499, 1199, 52, 31, 204, true, 'Instant Delivery',
  '["Midjourney v6.1 & Niji 6 web + Discord access","Fast GPU queue + Unlimited Relax renders","Commercial usage rights & HD upscaling","Instant guided onboarding after checkout"]'::jsonb,
  '[{"id":"1m","label":"1 Month","months":1,"price":1199,"originalPrice":2499},{"id":"3m","label":"3 Months","months":3,"price":3299,"originalPrice":7497}]'::jsonb,
  '{"cardBg":"linear-gradient(145deg, rgba(99, 102, 241, 0.28) 0%, rgba(19, 20, 42, 0.94) 55%, rgba(16, 14, 30, 0.98) 100%)","cardBorder":"rgba(129, 140, 248, 0.44)","glowColor":"rgba(99, 102, 241, 0.26)"}'::jsonb,
  5, true
),
(
  'claude-pro', 'Claude Pro', 'Premium', 'Sonnet & Opus Coding AI',
  'Official Claude Pro workspace with 5x higher usage limits, Artifacts preview, Projects knowledge base, and top-tier coding & writing output.',
  'ai', 'claude', null, 1999, 1299, 35, 19, 162, true, 'Instant Delivery',
  '["Claude Sonnet & Opus priority access","Interactive Artifacts & 200K context window","Projects workspace for PDFs & codebases","100% safe official subscription"]'::jsonb,
  '[{"id":"1m","label":"1 Month","months":1,"price":1299,"originalPrice":1999},{"id":"3m","label":"3 Months","months":3,"price":3599,"originalPrice":5997}]'::jsonb,
  '{"cardBg":"linear-gradient(145deg, rgba(217, 119, 87, 0.26) 0%, rgba(28, 19, 34, 0.94) 55%, rgba(16, 14, 30, 0.98) 100%)","cardBorder":"rgba(234, 138, 104, 0.44)","glowColor":"rgba(217, 119, 87, 0.24)"}'::jsonb,
  6, true
),
(
  'premiere-pro', 'Premiere Pro', 'Premium', '4K Cinema Editing Suite',
  'Industry-standard timeline video editing with AI Text-Based Editing, Auto Reframe, Lumetri Color grading, and Motion Graphics templates.',
  'video', 'premiere', null, 2999, 1499, 50, 44, 189, false, 'Instant Delivery',
  '["Official Adobe Premiere Pro license","AI Enhance Speech & Text-Based Editing","Supports Windows & Apple Silicon Macs","100GB Creative Cloud project sync"]'::jsonb,
  '[{"id":"1m","label":"1 Month","months":1,"price":1499,"originalPrice":2999},{"id":"6m","label":"6 Months","months":6,"price":7999,"originalPrice":17994}]'::jsonb,
  '{"cardBg":"linear-gradient(145deg, rgba(139, 92, 246, 0.28) 0%, rgba(23, 18, 44, 0.94) 55%, rgba(16, 14, 30, 0.98) 100%)","cardBorder":"rgba(167, 139, 250, 0.45)","glowColor":"rgba(139, 92, 246, 0.26)"}'::jsonb,
  7, true
),
(
  'figma-pro', 'Figma Pro', 'Premium', 'Unlimited Files & Dev Mode',
  'Full Figma Professional seat with unlimited design files, shared component libraries, variables, Dev Mode inspection, and FigJam boards.',
  'design', 'figma', null, 1499, 699, 53, 64, 245, false, 'Instant Delivery',
  '["Unlimited Figma & FigJam projects","Team libraries, variables & Dev Mode","Activated directly on your Figma email","Seamless handoff & prototyping flows"]'::jsonb,
  '[{"id":"1m","label":"1 Month","months":1,"price":699,"originalPrice":1499},{"id":"12m","label":"1 Year","months":12,"price":5999,"originalPrice":17988}]'::jsonb,
  '{"cardBg":"linear-gradient(145deg, rgba(162, 89, 255, 0.24) 0%, rgba(22, 18, 42, 0.94) 55%, rgba(16, 14, 30, 0.98) 100%)","cardBorder":"rgba(162, 89, 255, 0.44)","glowColor":"rgba(162, 89, 255, 0.24)"}'::jsonb,
  8, true
),
(
  'notion-ai', 'Notion Plus + AI', 'Premium', 'Workspace + Unlimited AI',
  'Supercharge notes, wikis, and projects with Notion Plus and built-in Notion AI writer, Q&A across docs, and unlimited file uploads.',
  'productivity', 'notion', null, 1299, 549, 58, 72, 318, false, 'Instant Delivery',
  '["Unlimited blocks & file uploads","Built-in Notion AI writer & Q&A","Custom domains & 30-day page history","Up to 100 guest collaborators"]'::jsonb,
  '[{"id":"1m","label":"1 Month","months":1,"price":549,"originalPrice":1299},{"id":"12m","label":"1 Year","months":12,"price":4799,"originalPrice":15588}]'::jsonb,
  '{"cardBg":"linear-gradient(145deg, rgba(148, 163, 184, 0.20) 0%, rgba(20, 20, 34, 0.95) 55%, rgba(15, 14, 28, 0.98) 100%)","cardBorder":"rgba(148, 163, 184, 0.36)","glowColor":"rgba(148, 163, 184, 0.16)"}'::jsonb,
  9, true
),
(
  'grammarly-pro', 'Grammarly Pro', 'Premium', 'AI Rewrite & Plagiarism',
  'Write flawlessly across browser, Docs, and email with full-sentence clarity rewrites, tone detection, and instant plagiarism checks.',
  'productivity', 'grammarly', null, 1499, 499, 67, 95, 512, false, 'Instant Delivery',
  '["Full-sentence clarity & tone rewrites","Built-in plagiarism & citation checker","2,000 monthly generative AI prompts","Chrome, Edge, Word & macOS support"]'::jsonb,
  '[{"id":"1m","label":"1 Month","months":1,"price":499,"originalPrice":1499},{"id":"6m","label":"6 Months","months":6,"price":2199,"originalPrice":8994}]'::jsonb,
  '{"cardBg":"linear-gradient(145deg, rgba(21, 195, 154, 0.24) 0%, rgba(16, 24, 34, 0.94) 55%, rgba(15, 14, 28, 0.98) 100%)","cardBorder":"rgba(21, 195, 154, 0.44)","glowColor":"rgba(21, 195, 154, 0.24)"}'::jsonb,
  10, true
),
(
  'perplexity-pro', 'Perplexity Pro', 'Premium', 'Deep AI Search & Citations',
  'Run 300+ daily Pro Searches powered by top frontier models with live citations, Deep Research reports, and PDF file analysis.',
  'ai', 'perplexity', null, 1999, 899, 55, 38, 147, false, 'Instant Delivery',
  '["300+ daily Pro Search & Deep Research runs","Switch between top frontier AI models","Unlimited PDF & document analysis","Direct official voucher activation"]'::jsonb,
  '[{"id":"1m","label":"1 Month","months":1,"price":899,"originalPrice":1999},{"id":"12m","label":"1 Year","months":12,"price":6999,"originalPrice":23988}]'::jsonb,
  '{"cardBg":"linear-gradient(145deg, rgba(32, 184, 205, 0.26) 0%, rgba(16, 24, 38, 0.94) 55%, rgba(15, 14, 28, 0.98) 100%)","cardBorder":"rgba(32, 184, 205, 0.44)","glowColor":"rgba(32, 184, 205, 0.24)"}'::jsonb,
  11, true
),
(
  'envato-elements', 'Envato Elements', 'Premium', 'Unlimited Assets & Videos',
  'Download unlimited stock videos, Premiere & After Effects templates, royalty-free music, fonts, and WordPress themes with commercial license.',
  'more', 'envato', null, 2499, 799, 68, 51, 284, false, 'Instant Delivery',
  '["18M+ creative assets, LUTs & motion graphics","Commercial license certificate per download","WordPress themes, UI kits & 3D renders","Instant account delivery via email"]'::jsonb,
  '[{"id":"1m","label":"1 Month","months":1,"price":799,"originalPrice":2499},{"id":"3m","label":"3 Months","months":3,"price":2099,"originalPrice":7497}]'::jsonb,
  '{"cardBg":"linear-gradient(145deg, rgba(129, 180, 65, 0.24) 0%, rgba(20, 25, 32, 0.94) 55%, rgba(15, 14, 28, 0.98) 100%)","cardBorder":"rgba(132, 204, 22, 0.42)","glowColor":"rgba(132, 204, 22, 0.22)"}'::jsonb,
  12, true
)
on conflict (id) do update set
  name = excluded.name,
  subtitle = excluded.subtitle,
  original_price = excluded.original_price,
  price = excluded.price,
  discount_percent = excluded.discount_percent,
  available = excluded.available,
  sold = excluded.sold,
  sort_order = excluded.sort_order;

-- ============================================================================
-- SEED DATA: INITIAL NOTIFICATIONS & SAMPLE ORDERS
-- ============================================================================
insert into public.notifications (id, title, message, time_label, read, accent) values
  ('notif-1', 'Flash Offer: Extra 20% Off!', 'Apply code BAZAAR20 at checkout for 20% off any AI or Creator tool.', '5m ago', false, 'purple'),
  ('notif-2', 'Order #ORD-1047 Delivered', 'Your Canva Pro activation link & key are ready inside Orders.', '2h ago', false, 'green'),
  ('notif-3', 'Adobe CC Restocked', '23 fresh official Creative Cloud All Apps slots are now live at 50% OFF.', '1d ago', true, 'amber')
on conflict (id) do nothing;

insert into public.orders (
  order_code, customer_email, items, subtotal, discount, total, promo_code, status, access_key
) values
(
  'ORD-1047', 'arjun.creator@toolbazaar.in',
  '[{"toolId":"canva-pro","planId":"1m","planLabel":"1 Month","name":"Canva Pro","brand":"canva","unitPrice":1299,"unitOriginalPrice":1999,"quantity":1}]'::jsonb,
  1299, 0, 1299, null, 'Delivered', 'TB-CNVA-84K2-P9LM'
),
(
  'ORD-1046', 'arjun.creator@toolbazaar.in',
  '[{"toolId":"capcut-pro","planId":"1m","planLabel":"1 Month","name":"CapCut Pro","brand":"capcut","unitPrice":599,"unitOriginalPrice":999,"quantity":1}]'::jsonb,
  599, 60, 539, 'SAVE10', 'Active', 'TB-CPCT-39V7-W2QZ'
)
on conflict (order_code) do nothing;
