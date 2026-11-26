import { supabase } from '../lib/supabase';
import type {
  CartItem,
  CategoryItem,
  HeroBannerData,
  NotificationItem,
  OrderRecord,
  PaymentGateway,
  PaymentMethod,
  ProductReview,
  SiteSettings,
  ToolProduct,
  UserProfile,
} from '../types/store';
import {
  mapBannerRow,
  mapCategoryRow,
  mapNotificationRow,
  mapOrderRow,
  mapPaymentGatewayRow,
  mapReviewRow,
  mapSiteSettingsRow,
  mapToolRow,
  type DbBannerRow,
  type DbCategoryRow,
  type DbNotificationRow,
  type DbOrderRow,
  type DbPaymentGatewayRow,
  type DbReviewRow,
  type DbSiteSettingsRow,
  type DbToolRow,
} from '../utils/supabaseMappers';

export interface StoreSnapshot {
  settings: SiteSettings | null;
  categories: CategoryItem[] | null;
  banners: HeroBannerData[] | null;
  tools: ToolProduct[] | null;
  orders: OrderRecord[] | null;
  notifications: NotificationItem[] | null;
  paymentGateways: PaymentGateway[] | null;
}

export async function fetchSiteSettingsFromDb(): Promise<SiteSettings | null> {
  try {
    const res = await fetch('/api/site-settings', { cache: 'no-store' });
    if (res.ok) {
      const json = (await res.json()) as { settings?: SiteSettings };
      if (json.settings) return json.settings;
    }
  } catch {
    // Fallback to direct Supabase query
  }

  if (!supabase) return null;
  const full = await supabase
    .from('site_settings')
    .select(
      'id, site_name, site_tagline, support_email, vip_coupon_code, vip_coupon_text, active_theme, theme_config, updated_at'
    )
    .eq('id', 'main')
    .maybeSingle();

  if (!full.error && full.data) {
    return mapSiteSettingsRow(full.data as DbSiteSettingsRow);
  }

  const fallback = await supabase
    .from('site_settings')
    .select(
      'id, site_name, site_tagline, support_email, vip_coupon_code, vip_coupon_text, updated_at'
    )
    .eq('id', 'main')
    .maybeSingle();

  if (fallback.error || !fallback.data) return null;
  return mapSiteSettingsRow(fallback.data as DbSiteSettingsRow);
}

export async function fetchCategoriesFromDb(): Promise<CategoryItem[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('categories')
    .select('id, label, description, sort_order, is_active')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error || !data || data.length === 0) return null;
  const mapped = (data as DbCategoryRow[])
    .map(mapCategoryRow)
    .filter((c): c is CategoryItem => c !== null);
  return mapped.length > 0 ? mapped : null;
}

export async function fetchBannersFromDb(): Promise<HeroBannerData[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('banners')
    .select(
      'id, title, image_url, target_category, border_glow, sort_order, is_active'
    )
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error || !data || data.length === 0) return null;
  const mapped = (data as DbBannerRow[])
    .map(mapBannerRow)
    .filter((b): b is HeroBannerData => b !== null);
  return mapped.length > 0 ? mapped : null;
}

export async function fetchToolsFromDb(): Promise<ToolProduct[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('tools')
    .select(
      'id, name, badge_text, subtitle, description, category_id, brand_key, logo_url, original_price, price, discount_percent, available, sold, trending, delivery_type, features, plans, theme, sort_order, is_active'
    )
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error || !data || data.length === 0) return null;
  return (data as DbToolRow[]).map(mapToolRow);
}

export async function fetchPaymentGatewaysFromDb(): Promise<PaymentGateway[] | null> {
  try {
    const res = await fetch('/api/payment-gateways', { cache: 'no-store' });
    if (res.ok) {
      const json = (await res.json()) as { gateways?: PaymentGateway[] };
      if (Array.isArray(json.gateways)) return json.gateways;
    }
  } catch {
    // Fallback to direct Supabase query if backend endpoint is unreachable
  }

  if (supabase) {
    const full = await supabase
      .from('payment_gateways')
      .select(
        'id, name, account_title, account_number, currency, instructions, logo_url, qr_code_url, is_active, sort_order'
      )
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (!full.error && full.data) {
      return (full.data as DbPaymentGatewayRow[]).map(mapPaymentGatewayRow);
    }

    const fallback = await supabase
      .from('payment_gateways')
      .select(
        'id, name, account_title, account_number, currency, instructions, qr_code_url, is_active, sort_order'
      )
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (!fallback.error && fallback.data) {
      return (fallback.data as DbPaymentGatewayRow[]).map(mapPaymentGatewayRow);
    }
  }
  return null;
}

export async function fetchOrdersFromDb(
  userId?: string,
  previewUser?: Pick<UserProfile, 'id' | 'email' | 'fullName'> | null
): Promise<OrderRecord[] | null> {
  if (!userId && !previewUser?.id) return null;

  // Prefer server-authoritative /api/me/orders so RLS or unmigrated columns never hide orders
  try {
    const headers = await buildUserAuthHeaders(
      previewUser || (userId ? { id: userId, email: '', fullName: '' } : null)
    );
    if (headers.Authorization || headers['x-preview-user-id']) {
      const res = await fetch('/api/me/orders', {
        method: 'GET',
        headers,
        cache: 'no-store',
      });
      if (res.ok) {
        const json = (await res.json()) as { orders?: OrderRecord[] };
        if (Array.isArray(json.orders)) {
          return json.orders;
        }
      }
    }
  } catch {
    // Fallback to direct Supabase client query below if backend is unreachable
  }

  if (!supabase || !userId) return null;
  const full = await supabase
    .from('orders')
    .select(
      'id, order_code, created_at, status, items, subtotal, discount, total, promo_code, customer_email, access_key, delivery_mode, delivery_content, delivery_filename, delivery_fields, payment_method, payment_status, payment_gateway_id, payment_gateway_name, payment_currency, payment_trx_id, payment_proof_url, payment_note'
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (!full.error && full.data) {
    return (full.data as DbOrderRow[]).map(mapOrderRow);
  }

  // Backward-compatible fallback before payment columns are migrated
  const mid = await supabase
    .from('orders')
    .select(
      'id, order_code, created_at, status, items, subtotal, discount, total, promo_code, customer_email, access_key, delivery_mode, delivery_content, delivery_filename, delivery_fields'
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (!mid.error && mid.data) {
    return (mid.data as DbOrderRow[]).map(mapOrderRow);
  }

  const legacy = await supabase
    .from('orders')
    .select(
      'id, order_code, created_at, status, items, subtotal, discount, total, promo_code, customer_email, access_key'
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (legacy.error || !legacy.data) return null;
  return (legacy.data as DbOrderRow[]).map(mapOrderRow);
}

export async function fetchNotificationsFromDb(): Promise<NotificationItem[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('notifications')
    .select('id, title, message, time_label, read, accent, created_at')
    .order('created_at', { ascending: false })
    .limit(25);

  if (error || !data || data.length === 0) return null;
  return (data as DbNotificationRow[]).map(mapNotificationRow);
}

export async function fetchStoreSnapshot(): Promise<StoreSnapshot> {
  const [categories, banners, tools, orders, notifications, paymentGateways] =
    await Promise.all([
      fetchCategoriesFromDb(),
      fetchBannersFromDb(),
      fetchToolsFromDb(),
      fetchOrdersFromDb(),
      fetchNotificationsFromDb(),
      fetchPaymentGatewaysFromDb(),
    ]);
  return {
    settings: null,
    categories,
    banners,
    tools,
    orders,
    notifications,
    paymentGateways,
  };
}

export async function uploadPaymentProofApi(
  filename: string,
  dataBase64: string
): Promise<string> {
  let accessToken = '';
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    accessToken = data.session?.access_token || '';
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch('/api/orders/upload-proof', {
    method: 'POST',
    headers,
    body: JSON.stringify({ filename, dataBase64 }),
  });
  const payload = (await res.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
  };
  if (!res.ok || !payload.url) {
    throw new Error(payload.error || 'Could not upload payment proof screenshot.');
  }
  return payload.url;
}

async function buildUserAuthHeaders(
  previewUser?: Pick<UserProfile, 'id' | 'email' | 'fullName'> | null
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }
  if (previewUser?.id) {
    headers['x-preview-user-id'] = previewUser.id;
    if (previewUser.email) headers['x-preview-user-email'] = previewUser.email;
    if (previewUser.fullName) headers['x-preview-user-name'] = previewUser.fullName;
  }
  return headers;
}

export async function fetchReviewsFromDb(
  previewUser?: Pick<UserProfile, 'id' | 'email' | 'fullName'> | null
): Promise<ProductReview[] | null> {
  try {
    const headers = await buildUserAuthHeaders(previewUser);
    const res = await fetch('/api/reviews', { headers, cache: 'no-store' });
    if (res.ok) {
      const json = (await res.json()) as { reviews?: ProductReview[] };
      if (Array.isArray(json.reviews)) return json.reviews;
    }
  } catch {
    // Fallback to direct Supabase query below
  }

  if (supabase) {
    const { data, error } = await supabase
      .from('product_reviews')
      .select(
        'id, tool_id, order_id, user_id, author_name, author_email, rating, comment, screenshot_url, review_date, status, source, verified, created_at'
      )
      .order('review_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(300);

    if (!error && data) {
      return (data as DbReviewRow[]).map(mapReviewRow);
    }
  }

  return null;
}

export async function uploadReviewScreenshotApi(
  filename: string,
  dataBase64: string,
  previewUser?: Pick<UserProfile, 'id' | 'email' | 'fullName'> | null
): Promise<string> {
  const headers = await buildUserAuthHeaders(previewUser);
  headers['Content-Type'] = 'application/json';

  const res = await fetch('/api/reviews/upload-screenshot', {
    method: 'POST',
    headers,
    body: JSON.stringify({ filename, dataBase64 }),
  });
  const payload = (await res.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
  };
  if (!res.ok || !payload.url) {
    throw new Error(payload.error || 'Could not upload review screenshot.');
  }
  return payload.url;
}

export interface SubmitUserReviewInput {
  toolId: string;
  orderId?: string;
  rating: number;
  comment: string;
  screenshotUrl?: string;
}

export async function submitUserReviewApi(
  input: SubmitUserReviewInput,
  previewUser?: Pick<UserProfile, 'id' | 'email' | 'fullName'> | null
): Promise<{ review?: ProductReview; error?: string }> {
  const headers = await buildUserAuthHeaders(previewUser);
  headers['Content-Type'] = 'application/json';

  try {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers,
      body: JSON.stringify(input),
    });
    const payload = (await res.json().catch(() => ({}))) as {
      review?: ProductReview;
      error?: string;
    };
    if (!res.ok || !payload.review) {
      return { error: payload.error || 'Could not submit your review.' };
    }
    return { review: payload.review };
  } catch {
    return { error: 'Network error while submitting review. Please try again.' };
  }
}

export interface PlaceOrderPaymentInput {
  paymentMethod: PaymentMethod;
  paymentGatewayId?: string;
  paymentTrxId?: string;
  paymentProofUrl?: string;
}

export async function placeOrderViaServerApi(
  customerEmail: string,
  cart: CartItem[],
  promoCode?: string,
  payment?: PlaceOrderPaymentInput,
  previewUser?: Pick<UserProfile, 'id' | 'email' | 'fullName'> | null
): Promise<{ order?: OrderRecord; walletCredits?: number; error?: string }> {
  const headers = await buildUserAuthHeaders(previewUser);
  headers['Content-Type'] = 'application/json';

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        customerEmail: customerEmail.trim(),
        items: cart.map((item) => ({
          toolId: item.toolId,
          planId: item.planId,
          quantity: item.quantity,
        })),
        promoCode: promoCode ? promoCode.trim().toUpperCase() : undefined,
        paymentMethod: payment?.paymentMethod ?? 'balance',
        paymentGatewayId: payment?.paymentGatewayId,
        paymentTrxId: payment?.paymentTrxId?.trim() || undefined,
        paymentProofUrl: payment?.paymentProofUrl?.trim() || undefined,
      }),
    });

    const payload = (await res.json().catch(() => ({}))) as {
      order?: OrderRecord;
      walletCredits?: number;
      error?: string;
    };

    if (!res.ok || !payload.order) {
      return {
        error: payload.error || 'Could not complete checkout. Please try again.',
      };
    }

    return {
      order: payload.order,
      walletCredits:
        typeof payload.walletCredits === 'number' ? payload.walletCredits : undefined,
    };
  } catch {
    return {
      error: 'Network error while placing your order. Please try again.',
    };
  }
}

export async function placeOrderInSupabase(
  customerEmail: string,
  cart: CartItem[],
  promoCode?: string,
  payment?: PlaceOrderPaymentInput
): Promise<{ order: OrderRecord | null; error?: string }> {
  if (!supabase) return { order: null };

  const payloadItems = cart.map((item) => ({
    tool_id: item.toolId,
    plan_id: item.planId,
    quantity: item.quantity,
  }));

  const { data, error } = await supabase.rpc('place_tool_order', {
    p_customer_email: customerEmail.trim(),
    p_items: payloadItems,
    p_promo_code: promoCode ? promoCode.trim().toUpperCase() : null,
    p_payment_method: payment?.paymentMethod ?? 'balance',
    p_payment_gateway_id: payment?.paymentGatewayId ?? null,
    p_payment_trx_id: payment?.paymentTrxId?.trim() || null,
    p_payment_proof_url: payment?.paymentProofUrl?.trim() || null,
  });

  if (error) {
    // Detect business-logic rejections (e.g. Insufficient wallet balance, Out of stock)
    const msg = error.message || '';
    if (
      msg.toLowerCase().includes('insufficient') ||
      msg.toLowerCase().includes('out of stock') ||
      msg.toLowerCase().includes('transaction id') ||
      msg.toLowerCase().includes('payment gateway')
    ) {
      return { order: null, error: msg };
    }
    return { order: null };
  }

  if (!data) return { order: null };
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object') return { order: null };
  return { order: mapOrderRow(row as DbOrderRow) };
}

export interface RealtimeCallbacks {
  onSettingsChange?: () => void;
  onCategoriesChange: () => void;
  onBannersChange: () => void;
  onToolsChange: () => void;
  onOrdersChange: () => void;
  onNotificationsChange: () => void;
  onPaymentGatewaysChange?: () => void;
  onReviewsChange?: () => void;
}

export function subscribeToRealtimeStore(callbacks: RealtimeCallbacks): () => void {
  const client = supabase;
  if (!client) return () => {};

  const channel = client
    .channel('toolbazaar-realtime-sync')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'site_settings' },
      () => callbacks.onSettingsChange?.()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'categories' },
      () => callbacks.onCategoriesChange()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'banners' },
      () => callbacks.onBannersChange()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tools' },
      () => callbacks.onToolsChange()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders' },
      () => callbacks.onOrdersChange()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'payment_gateways' },
      () => callbacks.onPaymentGatewaysChange?.()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notifications' },
      () => callbacks.onNotificationsChange()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'product_reviews' },
      () => callbacks.onReviewsChange?.()
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
