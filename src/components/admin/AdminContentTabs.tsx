import React, { useEffect, useState } from 'react';
import {
  Bell,
  Box,
  Check,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Layers,
  Loader2,
  Package,
  Plus,
  Save,
  Search,
  Send,
  Settings,
  ShoppingBag,
  Trash2,
  TrendingUp,
  Upload,
  Users,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import type {
  CategoryId,
  CategoryItem,
  CurrencyCode,
  DeliveryField,
  HeroBannerData,
  NotificationItem,
  OrderRecord,
  SiteSettings,
  UserProfile,
} from '../../types/store';
import type { AdminOverviewData } from '../../services/adminApi';
import { formatCurrency } from '../../utils/storeLogic';
import { sanitizeSafeMediaUrl } from '../../utils/supabaseMappers';

export type AdminTabId =
  | 'overview'
  | 'settings'
  | 'themes'
  | 'tools'
  | 'payments'
  | 'banners'
  | 'categories'
  | 'users'
  | 'orders'
  | 'reviews'
  | 'notifications';

// ============================================================================
// 1. OVERVIEW TAB
// ============================================================================
export function AdminOverviewTab({
  overview,
  currency,
  onNavigate,
}: {
  overview: AdminOverviewData;
  currency: CurrencyCode;
  onNavigate: (tab: AdminTabId) => void;
}) {
  const kpis = [
    {
      label: 'Total Revenue',
      value: formatCurrency(overview.stats.totalRevenue, currency),
      sub:
        overview.stats.pendingPaymentsCount > 0
          ? `${overview.stats.pendingPaymentsCount} payment${overview.stats.pendingPaymentsCount === 1 ? '' : 's'} pending review`
          : `${overview.stats.totalOrders} total orders`,
      icon: <TrendingUp className="w-5 h-5 text-emerald-400" />,
      tab: 'orders' as AdminTabId,
    },
    {
      label: 'Registered Users',
      value: String(overview.stats.totalUsers),
      sub: 'Google & member accounts',
      icon: <Users className="w-5 h-5 text-[#C084FC]" />,
      tab: 'users' as AdminTabId,
    },
    {
      label: 'Active Products',
      value: String(overview.stats.totalTools),
      sub:
        overview.stats.lowStockCount > 0
          ? `${overview.stats.lowStockCount} low stock`
          : 'Healthy inventory',
      icon: <Package className="w-5 h-5 text-sky-400" />,
      tab: 'tools' as AdminTabId,
    },
    {
      label: 'Live Banners',
      value: String(overview.banners.length),
      sub: `${overview.categories.length} categories active`,
      icon: <ImageIcon className="w-5 h-5 text-amber-400" />,
      tab: 'banners' as AdminTabId,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <button
            key={kpi.label}
            type="button"
            onClick={() => onNavigate(kpi.tab)}
            className="text-left rounded-2xl bg-[#141126] hover:bg-[#1B1633] border border-white/10 hover:border-[#A855F7]/45 p-4 transition-all"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-[#A39DC4]">{kpi.label}</span>
              <span className="w-9 h-9 rounded-xl bg-white/6 flex items-center justify-center">
                {kpi.icon}
              </span>
            </div>
            <div className="mt-3 font-display font-extrabold text-xl sm:text-2xl text-white tabular-nums">
              {kpi.value}
            </div>
            <div className="mt-1 text-[11px] text-[#9A93BA]">{kpi.sub}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-[#141126] border border-white/10 p-5">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#C084FC]" />
              Recent Orders
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('orders')}
              className="text-xs font-semibold text-[#C4B5FD] hover:text-white"
            >
              Manage all
            </button>
          </div>
          {overview.orders.length === 0 ? (
            <p className="text-xs text-[#9A93BA] py-4">No orders placed yet.</p>
          ) : (
            <div className="space-y-2.5">
              {overview.orders.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="rounded-xl bg-[#1B1732] border border-white/8 px-3.5 py-2.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">
                      {order.id} · {order.customerEmail}
                    </div>
                    <div className="text-[11px] text-[#9E97BE] truncate">
                      {order.items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-white tabular-nums">
                      {formatCurrency(order.total, currency)}
                    </div>
                    <span
                      className={`text-[10px] font-semibold ${
                        order.status === 'Pending'
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-[#141126] border border-white/10 p-5 space-y-3">
          <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#C084FC]" />
            Quick Management
          </h3>
          <div className="grid grid-cols-2 gap-2.5">
            {(
              [
                ['settings', 'Website Settings', Settings],
                ['tools', 'Manage Products', Package],
                ['payments', 'Payment Gateways', CreditCard],
                ['banners', 'Edit Banners', ImageIcon],
                ['categories', 'Categories', Layers],
                ['users', 'User Accounts', Users],
                ['orders', 'Orders & Proofs', ShoppingBag],
                ['notifications', 'Send Alert', Bell],
              ] as const
            ).map(([tab, label, Icon]) => (
              <button
                key={tab}
                type="button"
                onClick={() => onNavigate(tab)}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-[#1B1732] hover:bg-[#241E45] border border-white/8 text-xs font-semibold text-[#E2DCFF] transition-colors"
              >
                <Icon className="w-4 h-4 text-[#C084FC] shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 2. SITE SETTINGS TAB
// ============================================================================
export function AdminSettingsTab({
  settings,
  busy,
  onSaveSettings,
}: {
  settings: SiteSettings;
  busy: boolean;
  onSaveSettings: (next: Partial<SiteSettings>) => Promise<void>;
}) {
  const [siteName, setSiteName] = useState(settings.siteName);
  const [siteTagline, setSiteTagline] = useState(settings.siteTagline);
  const [supportEmail, setSupportEmail] = useState(settings.supportEmail);
  const [vipCouponCode, setVipCouponCode] = useState(settings.vipCouponCode);
  const [vipCouponText, setVipCouponText] = useState(settings.vipCouponText);

  useEffect(() => {
    setSiteName(settings.siteName);
    setSiteTagline(settings.siteTagline);
    setSupportEmail(settings.supportEmail);
    setVipCouponCode(settings.vipCouponCode);
    setVipCouponText(settings.vipCouponText);
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveSettings({
      siteName: siteName.trim(),
      siteTagline: siteTagline.trim(),
      supportEmail: supportEmail.trim(),
      vipCouponCode: vipCouponCode.trim().toUpperCase(),
      vipCouponText: vipCouponText.trim(),
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl rounded-2xl bg-[#141126] border border-white/10 p-5 sm:p-6 space-y-4"
    >
      <div>
        <h2 className="font-display font-bold text-base text-white">
          Website Basic Settings
        </h2>
        <p className="text-xs text-[#9E97BE] mt-0.5">
          Changes update the live storefront header, menu, and promo banner immediately.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="settings-site-name"
            className="block text-xs font-semibold text-[#CFC9EA] mb-1.5"
          >
            Website Name
          </label>
          <input
            id="settings-site-name"
            type="text"
            required
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl bg-[#1C1833] border border-white/12 text-sm text-white focus:outline-none focus:border-[#A855F7]"
          />
        </div>

        <div>
          <label
            htmlFor="settings-support-email"
            className="block text-xs font-semibold text-[#CFC9EA] mb-1.5"
          >
            Support Email
          </label>
          <input
            id="settings-support-email"
            type="email"
            required
            value={supportEmail}
            onChange={(e) => setSupportEmail(e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl bg-[#1C1833] border border-white/12 text-sm text-white focus:outline-none focus:border-[#A855F7]"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="settings-tagline"
          className="block text-xs font-semibold text-[#CFC9EA] mb-1.5"
        >
          Header Subtitle / Tagline
        </label>
        <input
          id="settings-tagline"
          type="text"
          required
          value={siteTagline}
          onChange={(e) => setSiteTagline(e.target.value)}
          className="w-full h-11 px-3.5 rounded-xl bg-[#1C1833] border border-white/12 text-sm text-white focus:outline-none focus:border-[#A855F7]"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label
            htmlFor="settings-coupon-code"
            className="block text-xs font-semibold text-[#CFC9EA] mb-1.5"
          >
            VIP Coupon Code
          </label>
          <input
            id="settings-coupon-code"
            type="text"
            value={vipCouponCode}
            onChange={(e) => setVipCouponCode(e.target.value.toUpperCase())}
            className="w-full h-11 px-3.5 rounded-xl bg-[#1C1833] border border-white/12 text-sm font-bold text-white uppercase focus:outline-none focus:border-[#A855F7]"
          />
        </div>
        <div className="sm:col-span-2">
          <label
            htmlFor="settings-coupon-text"
            className="block text-xs font-semibold text-[#CFC9EA] mb-1.5"
          >
            Side Menu Coupon Message
          </label>
          <input
            id="settings-coupon-text"
            type="text"
            value={vipCouponText}
            onChange={(e) => setVipCouponText(e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl bg-[#1C1833] border border-white/12 text-sm text-white focus:outline-none focus:border-[#A855F7]"
          />
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#7C3AED] hover:bg-[#8B5CF6] disabled:opacity-60 text-sm font-bold text-white shadow-[0_6px_20px_rgba(124,58,237,0.4)]"
        >
          <Save className="w-4 h-4" />
          {busy ? 'Saving Settings...' : 'Save Website Settings'}
        </button>
      </div>
    </form>
  );
}

// ============================================================================
// 3. BANNERS TAB
// ============================================================================
const CATEGORY_OPTIONS: CategoryId[] = [
  'all',
  'ai',
  'video',
  'design',
  'productivity',
  'more',
];

function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Could not read file.'));
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

export function AdminBannersTab({
  banners,
  busy,
  onCreateBanner,
  onUpdateBanner,
  onDeleteBanner,
  onUploadMedia,
}: {
  banners: HeroBannerData[];
  busy: boolean;
  onCreateBanner: (payload: Partial<HeroBannerData>) => Promise<void>;
  onUpdateBanner: (id: string, payload: Partial<HeroBannerData>) => Promise<void>;
  onDeleteBanner: (id: string) => Promise<void>;
  onUploadMedia: (payload: {
    folder: 'logos' | 'banners';
    filename: string;
    dataBase64: string;
  }) => Promise<string>;
}) {
  const [newAlt, setNewAlt] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newCat, setNewCat] = useState<CategoryId>('all');
  const [drafts, setDrafts] = useState<Record<string, HeroBannerData>>({});
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    const next: Record<string, HeroBannerData> = {};
    for (const b of banners) {
      next[b.id] = { ...b };
    }
    setDrafts(next);
  }, [banners]);

  const handleBannerUpload = async (
    file: File | undefined,
    targetKey: 'new' | string
  ) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Banner image must be 5 MB or smaller (PNG, JPG, WebP, GIF).');
      return;
    }
    setUploadError(null);
    setUploadingKey(targetKey);
    try {
      const dataBase64 = await readImageAsDataUrl(file);
      const url = await onUploadMedia({
        folder: 'banners',
        filename: file.name,
        dataBase64,
      });
      if (targetKey === 'new') {
        setNewUrl(url);
      } else {
        setDrafts((prev) => {
          const existing = prev[targetKey] || banners.find((b) => b.id === targetKey);
          if (!existing) return prev;
          return {
            ...prev,
            [targetKey]: { ...existing, imageSrc: url },
          };
        });
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Banner upload failed.');
    } finally {
      setUploadingKey(null);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;
    await onCreateBanner({
      alt: newAlt.trim() || 'Promotional Banner',
      imageSrc: newUrl.trim(),
      targetCategory: newCat,
    });
    setNewAlt('');
    setNewUrl('');
    setNewCat('all');
  };

  const newPreview = sanitizeSafeMediaUrl(newUrl);

  return (
    <div className="space-y-5">
      <form
        onSubmit={handleAdd}
        className="rounded-2xl bg-[#141126] border border-white/10 p-4 sm:p-5 space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#C084FC]" />
            Add New Hero Banner
          </h3>
          <label className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-[#7C3AED] hover:bg-[#8B5CF6] text-xs font-bold text-white cursor-pointer transition-colors">
            {uploadingKey === 'new' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            <span>
              {uploadingKey === 'new' ? 'Uploading...' : 'Upload Banner Image'}
            </span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              disabled={uploadingKey === 'new'}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                void handleBannerUpload(file, 'new');
              }}
            />
          </label>
        </div>

        {uploadError && (
          <div className="rounded-xl bg-rose-500/15 border border-rose-400/35 px-3 py-2 text-xs text-rose-200">
            {uploadError}
          </div>
        )}

        {newPreview && (
          <div className="w-full max-w-md aspect-[2/1] rounded-xl overflow-hidden bg-[#0D0A1B] border border-white/12">
            <img
              src={newPreview}
              alt={newAlt || 'New banner preview'}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Banner title / alt text"
            value={newAlt}
            onChange={(e) => setNewAlt(e.target.value)}
            className="h-10 px-3 rounded-xl bg-[#1C1833] border border-white/12 text-sm text-white focus:outline-none focus:border-[#A855F7]"
          />
          <input
            type="text"
            required
            placeholder="Uploaded URL or paste https://..."
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            className="h-10 px-3 rounded-xl bg-[#1C1833] border border-white/12 text-sm text-white focus:outline-none focus:border-[#A855F7]"
          />
          <div className="flex gap-2">
            <select
              value={newCat}
              onChange={(e) => setNewCat(e.target.value as CategoryId)}
              className="flex-1 h-10 px-3 rounded-xl bg-[#1C1833] border border-white/12 text-sm text-white focus:outline-none focus:border-[#A855F7]"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  Target: {c}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={busy || uploadingKey === 'new'}
              className="h-10 px-4 rounded-xl bg-[#7C3AED] hover:bg-[#8B5CF6] text-xs font-bold text-white shrink-0"
            >
              Add
            </button>
          </div>
        </div>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {banners.map((banner) => {
          const draft = drafts[banner.id] || banner;
          const safePreview = sanitizeSafeMediaUrl(draft.imageSrc);
          const isUploading = uploadingKey === banner.id;
          return (
            <div
              key={banner.id}
              className="rounded-2xl bg-[#141126] border border-white/10 p-4 space-y-3"
            >
              <div className="w-full aspect-[2/1] rounded-xl overflow-hidden bg-[#0D0A1B] border border-white/10">
                {safePreview ? (
                  <img
                    src={safePreview}
                    alt={draft.alt}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-[#9A93BA]">
                    Invalid image URL
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  value={draft.alt}
                  onChange={(e) =>
                    setDrafts({
                      ...drafts,
                      [banner.id]: { ...draft, alt: e.target.value },
                    })
                  }
                  className="w-full h-9 px-3 rounded-xl bg-[#1C1833] border border-white/12 text-xs text-white focus:outline-none focus:border-[#A855F7]"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={draft.imageSrc}
                    onChange={(e) =>
                      setDrafts({
                        ...drafts,
                        [banner.id]: { ...draft, imageSrc: e.target.value },
                      })
                    }
                    className="flex-1 h-9 px-3 rounded-xl bg-[#1C1833] border border-white/12 text-xs text-white focus:outline-none focus:border-[#A855F7]"
                  />
                  <label className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white/8 hover:bg-white/15 border border-white/12 text-xs font-semibold text-white cursor-pointer shrink-0">
                    {isUploading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>{isUploading ? '...' : 'Upload'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      disabled={isUploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        void handleBannerUpload(file, banner.id);
                      }}
                    />
                  </label>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <select
                    value={draft.targetCategory}
                    onChange={(e) =>
                      setDrafts({
                        ...drafts,
                        [banner.id]: {
                          ...draft,
                          targetCategory: e.target.value as CategoryId,
                        },
                      })
                    }
                    className="h-9 px-2.5 rounded-xl bg-[#1C1833] border border-white/12 text-xs text-white focus:outline-none focus:border-[#A855F7]"
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        Category: {c}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={busy || isUploading}
                      onClick={() => void onUpdateBanner(banner.id, draft)}
                      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-[#7C3AED] hover:bg-[#8B5CF6] text-xs font-bold text-white"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save
                    </button>
                    <button
                      type="button"
                      disabled={busy || banners.length <= 1}
                      onClick={() => void onDeleteBanner(banner.id)}
                      aria-label={`Delete banner ${banner.alt}`}
                      className="w-9 h-9 rounded-xl bg-white/6 hover:bg-rose-500/25 disabled:opacity-40 flex items-center justify-center text-[#CFC9EA] hover:text-rose-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// 4. CATEGORIES TAB
// ============================================================================
export function AdminCategoriesTab({
  categories,
  busy,
  onUpdateCategory,
}: {
  categories: CategoryItem[];
  busy: boolean;
  onUpdateCategory: (
    id: string,
    payload: { label: string; description: string }
  ) => Promise<void>;
}) {
  const [drafts, setDrafts] = useState<Record<string, { label: string; description: string }>>({});

  useEffect(() => {
    const next: Record<string, { label: string; description: string }> = {};
    for (const c of categories) {
      next[c.id] = { label: c.label, description: c.description };
    }
    setDrafts(next);
  }, [categories]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
      {categories.map((cat) => {
        const draft = drafts[cat.id] || { label: cat.label, description: cat.description };
        return (
          <div
            key={cat.id}
            className="rounded-2xl bg-[#141126] border border-white/10 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#C4B5FD]">
                ID: {cat.id}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => void onUpdateCategory(cat.id, draft)}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl bg-[#7C3AED] hover:bg-[#8B5CF6] text-xs font-bold text-white"
              >
                <Check className="w-3.5 h-3.5" />
                Save
              </button>
            </div>
            <input
              type="text"
              value={draft.label}
              onChange={(e) =>
                setDrafts({
                  ...drafts,
                  [cat.id]: { ...draft, label: e.target.value },
                })
              }
              className="w-full h-10 px-3 rounded-xl bg-[#1C1833] border border-white/12 text-sm font-semibold text-white focus:outline-none focus:border-[#A855F7]"
            />
            <input
              type="text"
              value={draft.description}
              onChange={(e) =>
                setDrafts({
                  ...drafts,
                  [cat.id]: { ...draft, description: e.target.value },
                })
              }
              className="w-full h-10 px-3 rounded-xl bg-[#1C1833] border border-white/12 text-xs text-[#D5CFF2] focus:outline-none focus:border-[#A855F7]"
            />
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// 5. USERS (PROFILES) TAB
// ============================================================================
export function AdminUsersTab({
  users,
  currency,
  busy,
  onUpdateUser,
}: {
  users: UserProfile[];
  currency: CurrencyCode;
  busy: boolean;
  onUpdateUser: (
    id: string,
    payload: { fullName: string; walletCredits: number }
  ) => Promise<void>;
}) {
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState<Record<string, { fullName: string; walletCredits: string }>>({});

  useEffect(() => {
    const next: Record<string, { fullName: string; walletCredits: string }> = {};
    for (const u of users) {
      next[u.id] = { fullName: u.fullName, walletCredits: String(u.walletCredits) };
    }
    setDrafts(next);
  }, [users]);

  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-[#9A93BA] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users by name or email..."
          className="w-full h-10 pl-10 pr-3.5 rounded-2xl bg-[#151228] border border-white/10 text-sm text-white placeholder:text-[#847DA6] focus:outline-none focus:border-[#A855F7]"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-[#141126] border border-white/10 p-8 text-center text-sm text-[#9E97BE]">
          No users found yet. Users appear automatically after signing in with Google.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((u) => {
            const draft = drafts[u.id] || {
              fullName: u.fullName,
              walletCredits: String(u.walletCredits),
            };
            return (
              <div
                key={u.id}
                className="rounded-2xl bg-[#141126] border border-white/10 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {u.avatarUrl ? (
                    <img
                      src={u.avatarUrl}
                      alt={u.fullName}
                      className="w-10 h-10 rounded-full object-cover border border-white/15 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#7C3AED]/30 border border-[#C084FC]/40 flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {u.initials}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate">
                      {u.fullName}
                    </div>
                    <div className="text-xs text-[#9E97BE] truncate">{u.email}</div>
                    <div className="text-[11px] text-[#847DA6]">
                      Wallet: {formatCurrency(u.walletCredits, currency)} · Joined{' '}
                      {new Date(u.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                  <input
                    type="text"
                    aria-label={`Full name for ${u.email}`}
                    value={draft.fullName}
                    onChange={(e) =>
                      setDrafts({
                        ...drafts,
                        [u.id]: { ...draft, fullName: e.target.value },
                      })
                    }
                    className="flex-1 sm:w-44 h-9 px-3 rounded-xl bg-[#1C1833] border border-white/12 text-xs text-white focus:outline-none focus:border-[#A855F7]"
                  />
                  <input
                    type="number"
                    min={0}
                    aria-label={`Wallet credits for ${u.email}`}
                    value={draft.walletCredits}
                    onChange={(e) =>
                      setDrafts({
                        ...drafts,
                        [u.id]: { ...draft, walletCredits: e.target.value },
                      })
                    }
                    className="w-28 h-9 px-3 rounded-xl bg-[#1C1833] border border-white/12 text-xs text-white tabular-nums focus:outline-none focus:border-[#A855F7]"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void onUpdateUser(u.id, {
                        fullName: draft.fullName.trim() || u.fullName,
                        walletCredits: Math.max(0, Math.round(Number(draft.walletCredits) || 0)),
                      })
                    }
                    className="h-9 px-3.5 rounded-xl bg-[#7C3AED] hover:bg-[#8B5CF6] text-xs font-bold text-white shrink-0"
                  >
                    Update
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 6. ORDERS TAB
// ============================================================================
export function AdminOrdersTab({
  orders,
  currency,
  busy,
  onUpdateOrderStatus,
  onFulfillOrder,
  onDecideOrderPayment,
}: {
  orders: OrderRecord[];
  currency: CurrencyCode;
  busy: boolean;
  onUpdateOrderStatus: (id: string, status: OrderRecord['status']) => Promise<void>;
  onFulfillOrder: (
    id: string,
    payload: {
      status?: OrderRecord['status'];
      deliveryContent?: string;
      deliveryFilename?: string;
      deliveryFields?: DeliveryField[];
    }
  ) => Promise<void>;
  onDecideOrderPayment: (
    id: string,
    payload: {
      decision: 'approve' | 'reject';
      note?: string;
    }
  ) => Promise<void>;
}) {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [deliveryText, setDeliveryText] = useState('');
  const [deliveryFilename, setDeliveryFilename] = useState('');
  const [deliveryFields, setDeliveryFields] = useState<DeliveryField[]>([
    { label: 'Email', value: '' },
    { label: 'Password', value: '' },
  ]);
  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [previewProofUrl, setPreviewProofUrl] = useState<string | null>(null);
  const [copiedTrxId, setCopiedTrxId] = useState<string | null>(null);

  const openDeliveryPanel = (order: OrderRecord) => {
    if (expandedOrderId === order.id) {
      setExpandedOrderId(null);
      return;
    }
    setExpandedOrderId(order.id);
    setDeliveryText(order.deliveryContent || '');
    setDeliveryFilename(order.deliveryFilename || `${order.id}-account.txt`);
    setDeliveryFields(
      order.deliveryFields && order.deliveryFields.length > 0
        ? order.deliveryFields.map((f) => ({ ...f }))
        : [
            { label: 'Email', value: '' },
            { label: 'Password', value: '' },
          ]
    );
  };

  const handleLoadTxtFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    setDeliveryFilename(file.name);
    setDeliveryText(text);
  };

  const handleCopyTrx = async (orderId: string, trx: string) => {
    try {
      await navigator.clipboard.writeText(trx);
    } catch {
      // ignore
    }
    setCopiedTrxId(orderId);
    window.setTimeout(() => setCopiedTrxId(null), 1600);
  };

  const handleSubmitFulfill = async (orderId: string) => {
    const cleanedFields = deliveryFields
      .map((f) => ({ label: f.label.trim(), value: f.value.trim() }))
      .filter((f) => f.label && f.value);
    const trimmedText = deliveryText.trim();

    await onFulfillOrder(orderId, {
      status: 'Delivered',
      deliveryContent: trimmedText || undefined,
      deliveryFilename: deliveryFilename.trim() || `${orderId}-account.txt`,
      deliveryFields: cleanedFields,
    });
    setExpandedOrderId(null);
  };

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl bg-[#141126] border border-white/10 p-8 text-center text-sm text-[#9E97BE]">
        No customer orders yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => {
        const isPending = order.status === 'Pending';
        const isRejected =
          order.status === 'Rejected' || order.paymentStatus === 'rejected';
        const isPendingVerification =
          order.paymentStatus === 'pending_verification';
        const isExpanded = expandedOrderId === order.id;
        const isRejecting = rejectingOrderId === order.id;
        const hasDelivery = Boolean(
          order.deliveryContent ||
            (order.deliveryFields && order.deliveryFields.length > 0)
        );
        const safeProofUrl = sanitizeSafeMediaUrl(order.paymentProofUrl);
        const isGatewayPayment = order.paymentMethod === 'gateway';

        return (
          <div
            key={order.id}
            className={`rounded-2xl bg-[#141126] border p-4 space-y-3 ${
              isPendingVerification || isPending
                ? 'border-amber-400/45'
                : isRejected
                  ? 'border-rose-400/40'
                  : 'border-white/10'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Box className="w-4 h-4 text-[#C084FC]" />
                  <span className="font-display font-bold text-sm text-white">
                    {order.id}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                      isRejected
                        ? 'bg-rose-500/15 border-rose-400/40 text-rose-300'
                        : isPending
                          ? 'bg-amber-500/15 border-amber-400/40 text-amber-300'
                          : 'bg-emerald-500/15 border-emerald-400/35 text-emerald-300'
                    }`}
                  >
                    {isRejected ? (
                      <XCircle className="w-3 h-3" />
                    ) : isPending ? (
                      <Clock className="w-3 h-3" />
                    ) : (
                      <Check className="w-3 h-3" />
                    )}
                    {order.status}
                  </span>

                  {/* Payment Method Badge */}
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-white/6 border border-white/12 text-[#DDD6FE]">
                    {isGatewayPayment ? (
                      <CreditCard className="w-3 h-3 text-[#C084FC]" />
                    ) : (
                      <Wallet className="w-3 h-3 text-emerald-400" />
                    )}
                    {isGatewayPayment
                      ? order.paymentGatewayName || 'Payment Gateway'
                      : 'My Balance'}
                  </span>

                  {/* Payment Verification Status */}
                  {isPendingVerification && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 border border-amber-400/45 text-amber-200">
                      Payment Pending Verification
                    </span>
                  )}
                  {order.paymentStatus === 'approved' && isGatewayPayment && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-emerald-500/15 border border-emerald-400/35 text-emerald-300">
                      Payment Approved
                    </span>
                  )}

                  {hasDelivery && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-[#7C3AED]/20 text-[#DDD6FE]">
                      <FileText className="w-3 h-3" />
                      {order.deliveryFilename || 'Account Attached'}
                    </span>
                  )}
                  <span className="text-xs text-[#9E97BE] truncate">
                    {order.customerEmail}
                  </span>
                </div>
                <p className="text-xs text-[#CFC9EA]">
                  {order.items
                    .map((it) => `${it.name} (${it.planLabel}) ×${it.quantity}`)
                    .join(' · ')}
                </p>
                <div className="text-[11px] text-[#9A93BA] flex items-center flex-wrap gap-3 tabular-nums">
                  <span>
                    Total: {formatCurrency(order.total, currency)}
                    {order.paymentCurrency && order.paymentCurrency !== currency
                      ? ` (${formatCurrency(order.total, order.paymentCurrency)})`
                      : ''}
                  </span>
                  <span>Key: {order.accessKey}</span>
                  <span>{new Date(order.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center flex-wrap gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => openDeliveryPanel(order)}
                  className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-bold transition-colors ${
                    isPending && !isPendingVerification
                      ? 'bg-amber-500 hover:bg-amber-400 text-[#1A1002]'
                      : 'bg-white/8 hover:bg-white/15 border border-white/12 text-white'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {isExpanded
                      ? 'Close'
                      : isPending
                        ? 'Deliver Account'
                        : 'Edit Delivery'}
                  </span>
                </button>

                <label htmlFor={`order-status-${order.id}`} className="sr-only">
                  Order status for {order.id}
                </label>
                <select
                  id={`order-status-${order.id}`}
                  disabled={busy}
                  value={order.status}
                  onChange={(e) =>
                    void onUpdateOrderStatus(
                      order.id,
                      e.target.value as OrderRecord['status']
                    )
                  }
                  className="h-9 px-3 rounded-xl bg-[#1C1833] border border-[#A855F7]/40 text-xs font-bold text-white focus:outline-none focus:border-[#C084FC]"
                >
                  <option value="Pending">Pending</option>
                  <option value="Processing">Processing</option>
                  <option value="Active">Active</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>

            {/* Payment Proof & Approval Bar for Gateway Payments */}
            {(isGatewayPayment || order.paymentTrxId || safeProofUrl) && (
              <div className="rounded-xl bg-[#0F0C1E] border border-white/10 p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  {safeProofUrl ? (
                    <button
                      type="button"
                      onClick={() => setPreviewProofUrl(safeProofUrl)}
                      className="relative w-14 h-14 rounded-xl overflow-hidden bg-[#1A1631] border border-[#A855F7]/40 shrink-0 group"
                      title="Click to enlarge payment proof"
                    >
                      <img
                        src={safeProofUrl}
                        alt={`Payment proof for ${order.id}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </button>
                  ) : null}

                  <div className="space-y-1 min-w-0">
                    <div className="text-xs font-bold text-white flex items-center gap-2 flex-wrap">
                      <span>
                        Paid via {order.paymentGatewayName || 'Gateway'} (
                        {formatCurrency(
                          order.total,
                          order.paymentCurrency || currency
                        )}
                        )
                      </span>
                      {safeProofUrl && (
                        <button
                          type="button"
                          onClick={() => setPreviewProofUrl(safeProofUrl)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#C4B5FD] hover:text-white"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View Screenshot
                        </button>
                      )}
                    </div>

                    {order.paymentTrxId && (
                      <div className="flex items-center gap-1.5 text-xs text-[#CFC9EA] flex-wrap">
                        <span className="text-[#9A93BA]">TRX ID:</span>
                        <code className="font-mono font-bold text-[#E9D5FF] bg-white/6 px-2 py-0.5 rounded-md break-all">
                          {order.paymentTrxId}
                        </code>
                        <button
                          type="button"
                          onClick={() =>
                            void handleCopyTrx(order.id, order.paymentTrxId!)
                          }
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/8 hover:bg-white/15 text-[10px] font-bold text-white"
                        >
                          {copiedTrxId === order.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {order.paymentNote && (
                      <p className="text-[11px] text-rose-300">
                        Note: {order.paymentNote}
                      </p>
                    )}
                  </div>
                </div>

                {isPendingVerification && (
                  <div className="flex items-center flex-wrap gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void onDecideOrderPayment(order.id, {
                          decision: 'approve',
                        })
                      }
                      className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-xs font-bold text-white"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve Payment
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setRejectingOrderId(isRejecting ? null : order.id);
                        setRejectReason('');
                      }}
                      className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 border border-rose-400/35 disabled:opacity-60 text-xs font-bold text-rose-200"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject Payment
                    </button>
                  </div>
                )}
              </div>
            )}

            {isRejecting && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-400/35 p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Optional rejection reason (e.g. Invalid TRX ID or amount mismatch)"
                  className="flex-1 h-9 px-3 rounded-lg bg-[#1A1224] border border-rose-400/30 text-xs text-white focus:outline-none focus:border-rose-400"
                />
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setRejectingOrderId(null)}
                    className="h-9 px-3 rounded-lg bg-white/8 text-xs font-semibold text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      await onDecideOrderPayment(order.id, {
                        decision: 'reject',
                        note:
                          rejectReason.trim() ||
                          'Payment could not be verified. Please contact support.',
                      });
                      setRejectingOrderId(null);
                      setRejectReason('');
                    }}
                    className="h-9 px-3.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white"
                  >
                    Confirm Reject
                  </button>
                </div>
              </div>
            )}

            {isExpanded && (
              <div className="rounded-xl bg-[#0F0C1E] border border-[#A855F7]/35 p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-white">
                      Deliver Account Details to {order.customerEmail}
                    </div>
                    <p className="text-[11px] text-[#9E97BE]">
                      Upload a .txt file, type instructions, or add Label/Value fields. User sees these live in My Orders.
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#7C3AED] hover:bg-[#8B5CF6] text-xs font-bold text-white cursor-pointer">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Load .txt File</span>
                    <input
                      type="file"
                      accept=".txt,text/plain"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        void handleLoadTxtFile(file);
                      }}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={deliveryFilename}
                    onChange={(e) => setDeliveryFilename(e.target.value)}
                    placeholder="Download filename (e.g. account.txt)"
                    className="h-9 px-3 rounded-lg bg-[#1A1631] border border-white/12 text-xs text-white focus:outline-none focus:border-[#A855F7]"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setDeliveryFields((prev) => [
                        ...prev,
                        { label: '', value: '' },
                      ])
                    }
                    className="h-9 px-3 rounded-lg bg-white/8 hover:bg-white/14 text-xs font-semibold text-[#DDD6FE]"
                  >
                    + Add Label / Value Field
                  </button>
                </div>

                <div className="space-y-1.5">
                  {deliveryFields.map((field, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) =>
                          setDeliveryFields((prev) =>
                            prev.map((f, i) =>
                              i === idx ? { ...f, label: e.target.value } : f
                            )
                          )
                        }
                        placeholder="Field Label (e.g. Email)"
                        className="w-1/3 h-8 px-2.5 rounded-lg bg-[#1A1631] border border-white/12 text-xs text-white focus:outline-none focus:border-[#A855F7]"
                      />
                      <input
                        type="text"
                        value={field.value}
                        onChange={(e) =>
                          setDeliveryFields((prev) =>
                            prev.map((f, i) =>
                              i === idx ? { ...f, value: e.target.value } : f
                            )
                          )
                        }
                        placeholder="Field Value"
                        className="flex-1 h-8 px-2.5 rounded-lg bg-[#1A1631] border border-white/12 text-xs text-white focus:outline-none focus:border-[#A855F7]"
                      />
                      {deliveryFields.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setDeliveryFields((prev) =>
                              prev.filter((_, i) => i !== idx)
                            )
                          }
                          aria-label="Remove delivery field"
                          className="w-8 h-8 rounded-lg bg-white/6 hover:bg-rose-500/20 flex items-center justify-center text-[#CFC9EA]"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <textarea
                  rows={3}
                  value={deliveryText}
                  onChange={(e) => setDeliveryText(e.target.value)}
                  placeholder="Account credentials, login steps, or custom message for the customer..."
                  className="w-full p-2.5 rounded-lg bg-[#1A1631] border border-white/12 text-xs text-white focus:outline-none focus:border-[#A855F7]"
                />

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setExpandedOrderId(null)}
                    className="h-9 px-3.5 rounded-xl bg-white/8 hover:bg-white/14 text-xs font-semibold text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleSubmitFulfill(order.id)}
                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-xs font-bold text-white"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Approve &amp; Send to User
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Fullscreen Payment Proof Lightbox */}
      {previewProofUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Payment proof screenshot"
          onClick={() => setPreviewProofUrl(null)}
        >
          <div
            className="relative max-w-2xl w-full rounded-2xl bg-[#141126] border border-white/15 p-3 space-y-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-white">
                Payment Proof Screenshot
              </span>
              <button
                type="button"
                onClick={() => setPreviewProofUrl(null)}
                aria-label="Close payment proof preview"
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={previewProofUrl}
              alt="Customer uploaded payment proof"
              className="w-full max-h-[75vh] object-contain rounded-xl bg-black"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 7. NOTIFICATIONS TAB
// ============================================================================
export function AdminNotificationsTab({
  notifications,
  busy,
  onCreateNotification,
  onDeleteNotification,
}: {
  notifications: NotificationItem[];
  busy: boolean;
  onCreateNotification: (payload: {
    title: string;
    message: string;
    accent: NotificationItem['accent'];
  }) => Promise<void>;
  onDeleteNotification: (id: string) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [accent, setAccent] = useState<NotificationItem['accent']>('purple');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    await onCreateNotification({
      title: title.trim(),
      message: message.trim(),
      accent,
    });
    setTitle('');
    setMessage('');
  };

  return (
    <div className="space-y-5">
      <form
        onSubmit={handleCreate}
        className="rounded-2xl bg-[#141126] border border-white/10 p-4 sm:p-5 space-y-3"
      >
        <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
          <Send className="w-4 h-4 text-[#C084FC]" />
          Send Storefront Notification
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            required
            placeholder="Alert title (e.g. Weekend Flash Sale)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="sm:col-span-2 h-10 px-3 rounded-xl bg-[#1C1833] border border-white/12 text-sm text-white focus:outline-none focus:border-[#A855F7]"
          />
          <select
            value={accent}
            onChange={(e) =>
              setAccent(e.target.value as NotificationItem['accent'])
            }
            className="h-10 px-3 rounded-xl bg-[#1C1833] border border-white/12 text-sm text-white focus:outline-none focus:border-[#A855F7]"
          >
            <option value="purple">Purple Accent</option>
            <option value="green">Green Accent</option>
            <option value="amber">Amber Accent</option>
          </select>
        </div>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            required
            placeholder="Message shown in user notification bell..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1 h-10 px-3 rounded-xl bg-[#1C1833] border border-white/12 text-sm text-white focus:outline-none focus:border-[#A855F7]"
          />
          <button
            type="submit"
            disabled={busy}
            className="h-10 px-4 rounded-xl bg-[#7C3AED] hover:bg-[#8B5CF6] text-xs font-bold text-white shrink-0"
          >
            Publish Alert
          </button>
        </div>
      </form>

      <div className="space-y-2.5">
        {notifications.map((n) => (
          <div
            key={n.id}
            className="rounded-2xl bg-[#141126] border border-white/10 p-4 flex items-start justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">{n.title}</span>
                <span className="text-[11px] text-[#9A93BA]">{n.time}</span>
              </div>
              <p className="text-xs text-[#C2BBE0] mt-1">{n.message}</p>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onDeleteNotification(n.id)}
              aria-label={`Delete notification ${n.title}`}
              className="w-9 h-9 rounded-xl bg-white/6 hover:bg-rose-500/25 flex items-center justify-center text-[#CFC9EA] hover:text-rose-300 shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
