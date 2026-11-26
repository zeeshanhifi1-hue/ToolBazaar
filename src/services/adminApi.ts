import type {
  CategoryItem,
  DeliveryField,
  HeroBannerData,
  NotificationItem,
  OrderRecord,
  PaymentGateway,
  ProductAccountItem,
  ProductReview,
  ReviewStatus,
  SiteSettings,
  ToolProduct,
  UserProfile,
} from '../types/store';

export interface AdminStatusResponse {
  needsSetup: boolean;
  envConfigured: boolean;
  supabaseAdminConnected: boolean;
}

export interface AdminAuthResponse {
  token: string;
  username: string;
  supabaseAdminConnected: boolean;
}

export interface AdminOverviewData {
  supabaseAdminConnected: boolean;
  settings: SiteSettings;
  categories: CategoryItem[];
  banners: HeroBannerData[];
  tools: ToolProduct[];
  users: UserProfile[];
  orders: OrderRecord[];
  notifications: NotificationItem[];
  paymentGateways: PaymentGateway[];
  reviews: ProductReview[];
  stats: {
    totalRevenue: number;
    totalOrders: number;
    totalUsers: number;
    totalTools: number;
    lowStockCount: number;
    pendingPaymentsCount: number;
    pendingReviewsCount: number;
  };
}

async function apiRequest<T>(
  url: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    token?: string | null;
    body?: unknown;
  } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    method: options.method ?? 'GET',
    headers,
    cache: 'no-store',
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg =
      typeof payload.error === 'string'
        ? payload.error
        : `Request failed with status ${res.status}`;
    const err = new Error(msg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  return payload as T;
}

export function fetchAdminStatus(): Promise<AdminStatusResponse> {
  return apiRequest<AdminStatusResponse>('/api/admin/status');
}

export function setupFirstAdmin(
  username: string,
  password: string
): Promise<AdminAuthResponse> {
  return apiRequest<AdminAuthResponse>('/api/admin/setup', {
    method: 'POST',
    body: { username, password },
  });
}

export function loginAdmin(
  username: string,
  password: string
): Promise<AdminAuthResponse> {
  return apiRequest<AdminAuthResponse>('/api/admin/login', {
    method: 'POST',
    body: { username, password },
  });
}

export function fetchAdminOverview(token: string): Promise<AdminOverviewData> {
  return apiRequest<AdminOverviewData>('/api/admin/overview', { token });
}

export function updateSiteSettingsApi(
  token: string,
  settings: Partial<SiteSettings>
): Promise<{ settings: SiteSettings }> {
  return apiRequest<{ settings: SiteSettings }>('/api/admin/settings', {
    method: 'PUT',
    token,
    body: settings,
  });
}

export function createToolApi(
  token: string,
  tool: Partial<ToolProduct>
): Promise<{ tool: ToolProduct }> {
  return apiRequest<{ tool: ToolProduct }>('/api/admin/tools', {
    method: 'POST',
    token,
    body: tool,
  });
}

export function updateToolApi(
  token: string,
  id: string,
  tool: Partial<ToolProduct>
): Promise<{ tool: ToolProduct }> {
  return apiRequest<{ tool: ToolProduct }>(`/api/admin/tools/${encodeURIComponent(id)}`, {
    method: 'PUT',
    token,
    body: tool,
  });
}

export function deleteToolApi(token: string, id: string): Promise<{ ok: boolean; id: string }> {
  return apiRequest<{ ok: boolean; id: string }>(
    `/api/admin/tools/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
      token,
    }
  );
}

export function updateCategoryApi(
  token: string,
  id: string,
  payload: { label: string; description: string }
): Promise<{ category: CategoryItem }> {
  return apiRequest<{ category: CategoryItem }>(
    `/api/admin/categories/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      token,
      body: payload,
    }
  );
}

export function createBannerApi(
  token: string,
  banner: Partial<HeroBannerData>
): Promise<{ banner: HeroBannerData }> {
  return apiRequest<{ banner: HeroBannerData }>('/api/admin/banners', {
    method: 'POST',
    token,
    body: banner,
  });
}

export function updateBannerApi(
  token: string,
  id: string,
  banner: Partial<HeroBannerData>
): Promise<{ banner: HeroBannerData }> {
  return apiRequest<{ banner: HeroBannerData }>(
    `/api/admin/banners/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      token,
      body: banner,
    }
  );
}

export function deleteBannerApi(
  token: string,
  id: string
): Promise<{ ok: boolean; id: string }> {
  return apiRequest<{ ok: boolean; id: string }>(
    `/api/admin/banners/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
      token,
    }
  );
}

export function updateUserApi(
  token: string,
  id: string,
  payload: { fullName: string; walletCredits: number }
): Promise<{ user: UserProfile }> {
  return apiRequest<{ user: UserProfile }>(
    `/api/admin/users/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      token,
      body: payload,
    }
  );
}

export function updateOrderStatusApi(
  token: string,
  id: string,
  status: OrderRecord['status']
): Promise<{ order: OrderRecord }> {
  return apiRequest<{ order: OrderRecord }>(
    `/api/admin/orders/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      token,
      body: { status },
    }
  );
}

export function createNotificationApi(
  token: string,
  payload: { title: string; message: string; accent: NotificationItem['accent'] }
): Promise<{ notification: NotificationItem }> {
  return apiRequest<{ notification: NotificationItem }>('/api/admin/notifications', {
    method: 'POST',
    token,
    body: payload,
  });
}

export function deleteNotificationApi(
  token: string,
  id: string
): Promise<{ ok: boolean; id: string }> {
  return apiRequest<{ ok: boolean; id: string }>(
    `/api/admin/notifications/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
      token,
    }
  );
}

export function uploadMediaApi(
  token: string,
  payload: {
    folder: 'logos' | 'banners' | 'qr' | 'reviews';
    filename: string;
    dataBase64: string;
  }
): Promise<{ url: string }> {
  return apiRequest<{ url: string }>('/api/admin/upload-media', {
    method: 'POST',
    token,
    body: payload,
  });
}

export function fetchProductAccountsApi(
  token: string,
  toolId: string
): Promise<{ accounts: ProductAccountItem[] }> {
  return apiRequest<{ accounts: ProductAccountItem[] }>(
    `/api/admin/tools/${encodeURIComponent(toolId)}/accounts`,
    { token }
  );
}

export function addProductAccountsApi(
  token: string,
  toolId: string,
  planId: string,
  accounts: {
    fileName: string;
    accountContent: string;
    accountFields?: DeliveryField[];
  }[]
): Promise<{ accounts: ProductAccountItem[]; addedCount: number }> {
  return apiRequest<{
    accounts: ProductAccountItem[];
    addedCount: number;
  }>(`/api/admin/tools/${encodeURIComponent(toolId)}/accounts`, {
    method: 'POST',
    token,
    body: { planId, accounts },
  });
}

export function deleteProductAccountApi(
  token: string,
  accountId: string
): Promise<{ ok: boolean; id: string }> {
  return apiRequest<{ ok: boolean; id: string }>(
    `/api/admin/accounts/${encodeURIComponent(accountId)}`,
    {
      method: 'DELETE',
      token,
    }
  );
}

export function fulfillOrderApi(
  token: string,
  orderId: string,
  payload: {
    status?: OrderRecord['status'];
    deliveryContent?: string;
    deliveryFilename?: string;
    deliveryFields?: DeliveryField[];
  }
): Promise<{ order: OrderRecord }> {
  return apiRequest<{ order: OrderRecord }>(
    `/api/admin/orders/${encodeURIComponent(orderId)}/fulfill`,
    {
      method: 'POST',
      token,
      body: payload,
    }
  );
}

export function createPaymentGatewayApi(
  token: string,
  payload: Partial<PaymentGateway>
): Promise<{ gateway: PaymentGateway }> {
  return apiRequest<{ gateway: PaymentGateway }>('/api/admin/payment-gateways', {
    method: 'POST',
    token,
    body: payload,
  });
}

export function updatePaymentGatewayApi(
  token: string,
  id: string,
  payload: Partial<PaymentGateway>
): Promise<{ gateway: PaymentGateway }> {
  return apiRequest<{ gateway: PaymentGateway }>(
    `/api/admin/payment-gateways/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      token,
      body: payload,
    }
  );
}

export function deletePaymentGatewayApi(
  token: string,
  id: string
): Promise<{ ok: boolean; id: string }> {
  return apiRequest<{ ok: boolean; id: string }>(
    `/api/admin/payment-gateways/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
      token,
    }
  );
}

export function decideOrderPaymentApi(
  token: string,
  orderId: string,
  payload: {
    decision: 'approve' | 'reject';
    note?: string;
  }
): Promise<{ order: OrderRecord; autoDelivered?: boolean }> {
  return apiRequest<{ order: OrderRecord; autoDelivered?: boolean }>(
    `/api/admin/orders/${encodeURIComponent(orderId)}/payment-decision`,
    {
      method: 'POST',
      token,
      body: payload,
    }
  );
}

export function createAdminReviewApi(
  token: string,
  payload: {
    toolId: string;
    authorName: string;
    rating: number;
    comment: string;
    screenshotUrl?: string;
    reviewDate: string;
    status?: ReviewStatus;
  }
): Promise<{ review: ProductReview }> {
  return apiRequest<{ review: ProductReview }>('/api/admin/reviews', {
    method: 'POST',
    token,
    body: payload,
  });
}

export function updateAdminReviewStatusApi(
  token: string,
  id: string,
  status: ReviewStatus
): Promise<{ review: ProductReview }> {
  return apiRequest<{ review: ProductReview }>(
    `/api/admin/reviews/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      token,
      body: { status },
    }
  );
}

export function deleteAdminReviewApi(
  token: string,
  id: string
): Promise<{ ok: boolean; id: string }> {
  return apiRequest<{ ok: boolean; id: string }>(
    `/api/admin/reviews/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
      token,
    }
  );
}



