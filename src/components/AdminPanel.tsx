import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  CreditCard,
  Image as ImageIcon,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Palette,
  RefreshCw,
  Settings,
  ShoppingBag,
  Star,
  Users,
  X,
} from 'lucide-react';
import type { CurrencyCode, SiteSettings, ToolProduct } from '../types/store';
import {
  addProductAccountsApi,
  createAdminReviewApi,
  createBannerApi,
  createNotificationApi,
  createPaymentGatewayApi,
  createToolApi,
  decideOrderPaymentApi,
  deleteAdminReviewApi,
  deleteBannerApi,
  deleteNotificationApi,
  deletePaymentGatewayApi,
  deleteProductAccountApi,
  deleteToolApi,
  fetchAdminOverview,
  fetchProductAccountsApi,
  fulfillOrderApi,
  updateAdminReviewStatusApi,
  updateBannerApi,
  updateCategoryApi,
  updateOrderStatusApi,
  updatePaymentGatewayApi,
  updateSiteSettingsApi,
  updateToolApi,
  updateUserApi,
  uploadMediaApi,
  type AdminAuthResponse,
  type AdminOverviewData,
} from '../services/adminApi';
import { ToolBazaarBolt } from './BrandIcons';
import { AdminAuthScreen } from './admin/AdminAuthScreen';
import { AdminToolsTab } from './admin/AdminToolsTab';
import { AdminPaymentsTab } from './admin/AdminPaymentsTab';
import { AdminReviewsTab } from './admin/AdminReviewsTab';
import { AdminThemesTab } from './admin/AdminThemesTab';
import {
  AdminBannersTab,
  AdminCategoriesTab,
  AdminNotificationsTab,
  AdminOrdersTab,
  AdminOverviewTab,
  AdminSettingsTab,
  AdminUsersTab,
  type AdminTabId,
} from './admin/AdminContentTabs';

interface AdminPanelProps {
  adminToken: string | null;
  adminUsername: string | null;
  currency: CurrencyCode;
  siteSettings: SiteSettings;
  onAuthenticated: (auth: AdminAuthResponse) => void;
  onLogout: () => void;
  onBackToStore: () => void;
  onStoreDataMutated: (overview: AdminOverviewData) => void;
}

const NAV_ITEMS: { id: AdminTabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'settings', label: 'Site Settings', icon: Settings },
  { id: 'themes', label: 'Themes', icon: Palette },
  { id: 'tools', label: 'Products', icon: Package },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'banners', label: 'Banners', icon: ImageIcon },
  { id: 'categories', label: 'Categories', icon: Layers },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'reviews', label: 'Reviews', icon: Star },
  { id: 'notifications', label: 'Alerts', icon: Bell },
];

export function AdminPanel({
  adminToken,
  adminUsername,
  currency,
  siteSettings,
  onAuthenticated,
  onLogout,
  onBackToStore,
  onStoreDataMutated,
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminTabId>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 2600);
  };

  const loadOverview = useCallback(
    async (silent = false) => {
      if (!adminToken) return;
      if (!silent) setLoading(true);
      setErrorMsg(null);
      try {
        const data = await fetchAdminOverview(adminToken);
        setOverview(data);
        onStoreDataMutated(data);
      } catch (err) {
        const status = (err as Error & { status?: number })?.status;
        if (status === 401) {
          onLogout();
          return;
        }
        setErrorMsg(err instanceof Error ? err.message : 'Failed to load dashboard.');
      } finally {
        setLoading(false);
      }
    },
    [adminToken, onLogout, onStoreDataMutated]
  );

  useEffect(() => {
    if (adminToken) {
      void loadOverview();
    } else {
      setOverview(null);
    }
  }, [adminToken, loadOverview]);

  useEffect(() => {
    if (!adminToken) return;
    void loadOverview(true);
  }, [activeTab, adminToken, loadOverview]);

  useEffect(() => {
    if (!adminToken) return;
    const onFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        void loadOverview(true);
      }
    };
    window.addEventListener('focus', onFocusOrVisible);
    document.addEventListener('visibilitychange', onFocusOrVisible);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadOverview(true);
      }
    }, 10000);
    return () => {
      window.removeEventListener('focus', onFocusOrVisible);
      document.removeEventListener('visibilitychange', onFocusOrVisible);
      window.clearInterval(timer);
    };
  }, [adminToken, loadOverview]);

  if (!adminToken) {
    return (
      <AdminAuthScreen
        siteName={siteSettings.siteName}
        onAuthenticated={onAuthenticated}
        onBackToStore={onBackToStore}
      />
    );
  }

  const runMutation = async (fn: () => Promise<void>, successMessage: string) => {
    setBusy(true);
    setErrorMsg(null);
    try {
      await fn();
      await loadOverview(true);
      showNotice(successMessage);
    } catch (err) {
      const status = (err as Error & { status?: number })?.status;
      if (status === 401) {
        onLogout();
        return;
      }
      setErrorMsg(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
  };

  const currentNav = NAV_ITEMS.find((n) => n.id === activeTab) || NAV_ITEMS[0];

  return (
    <div className="min-h-screen bg-[#090713] text-white flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:justify-between bg-[#100D1E] border-r border-white/10 p-5 sticky top-0 h-screen">
        <div className="space-y-6">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/20 border border-[#C084FC]/35 flex items-center justify-center shrink-0">
              <ToolBazaarBolt className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="font-display font-extrabold text-base text-white truncate">
                {overview?.settings.siteName || siteSettings.siteName}
              </div>
              <div className="text-[11px] text-[#9E97BE] truncate">
                Admin · {adminUsername || 'Owner'}
              </div>
            </div>
          </div>

          <nav aria-label="Admin sections" className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    active
                      ? 'bg-[#7C3AED] text-white shadow-[0_6px_18px_rgba(124,58,237,0.4)]'
                      : 'text-[#C5BFE4] hover:bg-white/6 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.id === 'orders' &&
                    (overview?.stats.pendingPaymentsCount ?? 0) > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-[#1A1002] text-[10px] font-extrabold tabular-nums">
                        {overview?.stats.pendingPaymentsCount}
                      </span>
                    )}
                  {item.id === 'reviews' &&
                    (overview?.stats.pendingReviewsCount ?? 0) > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-[#1A1002] text-[10px] font-extrabold tabular-nums">
                        {overview?.stats.pendingReviewsCount}
                      </span>
                    )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-2 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={onBackToStore}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-white/8 hover:bg-white/14 text-xs font-bold text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            View Live Store
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-rose-500/12 hover:bg-rose-500/22 border border-rose-400/25 text-xs font-bold text-rose-200 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Sticky Top Header */}
        <header className="sticky top-0 z-30 bg-[#0C091A]/95 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open admin side menu"
                aria-expanded={mobileMenuOpen}
                className="lg:hidden w-10 h-10 rounded-[13px] bg-[#1D192E] hover:bg-[#272240] border border-white/10 flex items-center justify-center text-white shrink-0 transition-all active:scale-95 focus-visible:outline-2 focus-visible:outline-[#A855F7]"
              >
                <Menu className="w-5 h-5 stroke-[2.2]" />
              </button>
              <div className="min-w-0">
                <h1 className="font-display font-extrabold text-base sm:text-lg text-white truncate">
                  {currentNav.label}
                </h1>
                <p className="text-[11px] text-[#9E97BE] truncate">
                  {overview?.settings.siteName || siteSettings.siteName} Admin Console
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => void loadOverview()}
                aria-label="Refresh admin data"
                className="w-9 h-9 rounded-xl bg-[#1A1530] hover:bg-[#251E44] border border-white/10 flex items-center justify-center text-[#DDD6FE]"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={onBackToStore}
                className="lg:hidden inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white/8 hover:bg-white/14 text-xs font-bold text-white"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Store
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Side Menu Drawer */}
        {mobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 z-50 flex bg-black/70 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation menu"
            onClick={() => setMobileMenuOpen(false)}
          >
            <aside
              className="w-[280px] max-w-[82vw] h-full bg-[#100D1E] border-r border-white/12 p-5 flex flex-col justify-between gap-4 overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#7C3AED]/20 border border-[#C084FC]/35 flex items-center justify-center shrink-0">
                      <ToolBazaarBolt className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-display font-extrabold text-sm text-white truncate">
                        {overview?.settings.siteName || siteSettings.siteName}
                      </div>
                      <div className="text-[11px] text-[#9E97BE] truncate">
                        Admin · {adminUsername || 'Owner'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    aria-label="Close admin side menu"
                    className="w-9 h-9 rounded-xl bg-white/8 hover:bg-white/15 flex items-center justify-center text-white shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <nav aria-label="Mobile admin side menu" className="space-y-1">
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const active = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActiveTab(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                          active
                            ? 'bg-[#7C3AED] text-white shadow-[0_6px_18px_rgba(124,58,237,0.4)]'
                            : 'text-[#C5BFE4] hover:bg-white/6 hover:text-white'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.id === 'orders' &&
                          (overview?.stats.pendingPaymentsCount ?? 0) > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-[#1A1002] text-[10px] font-extrabold tabular-nums">
                              {overview?.stats.pendingPaymentsCount}
                            </span>
                          )}
                        {item.id === 'reviews' &&
                          (overview?.stats.pendingReviewsCount ?? 0) > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-[#1A1002] text-[10px] font-extrabold tabular-nums">
                              {overview?.stats.pendingReviewsCount}
                            </span>
                          )}
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="space-y-2 pt-4 border-t border-white/10 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onBackToStore();
                  }}
                  className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-white/8 hover:bg-white/14 text-xs font-bold text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  View Live Store
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-rose-500/12 hover:bg-rose-500/22 border border-rose-400/25 text-xs font-bold text-rose-200 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Main Workspace */}
        <main className="flex-1 p-4 sm:p-6 max-w-6xl w-full mx-auto space-y-4">
          {errorMsg && (
            <div
              role="alert"
              className="rounded-2xl bg-rose-500/15 border border-rose-400/35 px-4 py-3 text-xs font-semibold text-rose-200"
            >
              {errorMsg}
            </div>
          )}

          {loading && !overview ? (
            <div className="rounded-2xl bg-[#141126] border border-white/10 p-10 text-center text-sm text-[#A39DC4]">
              Loading live store data...
            </div>
          ) : overview ? (
            <>
              {activeTab === 'overview' && (
                <AdminOverviewTab
                  overview={overview}
                  currency={currency}
                  onNavigate={setActiveTab}
                />
              )}

              {activeTab === 'settings' && (
                <AdminSettingsTab
                  settings={overview.settings}
                  busy={busy}
                  onSaveSettings={(next) =>
                    runMutation(async () => {
                      await updateSiteSettingsApi(adminToken, next);
                    }, 'Website settings updated live!')
                  }
                />
              )}

              {activeTab === 'themes' && (
                <AdminThemesTab
                  settings={overview.settings}
                  busy={busy}
                  onSaveSettings={(next) =>
                    runMutation(async () => {
                      await updateSiteSettingsApi(adminToken, next);
                    }, 'Storefront theme saved & applied live!')
                  }
                  onUploadMedia={async (payload) => {
                    const res = await uploadMediaApi(adminToken, payload);
                    return res.url;
                  }}
                />
              )}

              {activeTab === 'tools' && (
                <AdminToolsTab
                  tools={overview.tools}
                  currency={currency}
                  busy={busy}
                  onCreateTool={async (payload): Promise<ToolProduct> => {
                    setBusy(true);
                    setErrorMsg(null);
                    try {
                      const res = await createToolApi(adminToken, payload);
                      await loadOverview(true);
                      showNotice('Product added to store!');
                      return res.tool;
                    } catch (err) {
                      const status = (err as Error & { status?: number })?.status;
                      if (status === 401) {
                        onLogout();
                      }
                      throw err;
                    } finally {
                      setBusy(false);
                    }
                  }}
                  onUpdateTool={(id, payload) =>
                    runMutation(async () => {
                      await updateToolApi(adminToken, id, payload);
                    }, 'Product updated live!')
                  }
                  onDeleteTool={(id) =>
                    runMutation(async () => {
                      await deleteToolApi(adminToken, id);
                    }, 'Product deleted.')
                  }
                  onUploadMedia={async (payload) => {
                    const res = await uploadMediaApi(adminToken, payload);
                    return res.url;
                  }}
                  onFetchAccounts={async (toolId) => {
                    const res = await fetchProductAccountsApi(adminToken, toolId);
                    return res.accounts;
                  }}
                  onAddAccounts={async (toolId, planId, accounts) => {
                    const res = await addProductAccountsApi(
                      adminToken,
                      toolId,
                      planId,
                      accounts
                    );
                    showNotice(
                      `Added ${res.addedCount} account${res.addedCount === 1 ? '' : 's'} to pool!`
                    );
                    return res.accounts;
                  }}
                  onDeleteAccount={async (accountId) => {
                    await deleteProductAccountApi(adminToken, accountId);
                    showNotice('Account removed from pool.');
                  }}
                />
              )}

              {activeTab === 'payments' && (
                <AdminPaymentsTab
                  gateways={overview.paymentGateways || []}
                  busy={busy}
                  onCreateGateway={(payload) =>
                    runMutation(async () => {
                      await createPaymentGatewayApi(adminToken, payload);
                    }, 'Payment gateway added live!')
                  }
                  onUpdateGateway={(id, payload) =>
                    runMutation(async () => {
                      await updatePaymentGatewayApi(adminToken, id, payload);
                    }, 'Payment gateway updated live!')
                  }
                  onDeleteGateway={(id) =>
                    runMutation(async () => {
                      await deletePaymentGatewayApi(adminToken, id);
                    }, 'Payment gateway deleted.')
                  }
                  onUploadMedia={async (payload) => {
                    const res = await uploadMediaApi(adminToken, payload);
                    return res.url;
                  }}
                />
              )}

              {activeTab === 'banners' && (
                <AdminBannersTab
                  banners={overview.banners}
                  busy={busy}
                  onCreateBanner={(payload) =>
                    runMutation(async () => {
                      await createBannerApi(adminToken, payload);
                    }, 'Banner added live!')
                  }
                  onUpdateBanner={(id, payload) =>
                    runMutation(async () => {
                      await updateBannerApi(adminToken, id, payload);
                    }, 'Banner updated live!')
                  }
                  onDeleteBanner={(id) =>
                    runMutation(async () => {
                      await deleteBannerApi(adminToken, id);
                    }, 'Banner removed.')
                  }
                  onUploadMedia={async (payload) => {
                    const res = await uploadMediaApi(adminToken, payload);
                    return res.url;
                  }}
                />
              )}

              {activeTab === 'categories' && (
                <AdminCategoriesTab
                  categories={overview.categories}
                  busy={busy}
                  onUpdateCategory={(id, payload) =>
                    runMutation(async () => {
                      await updateCategoryApi(adminToken, id, payload);
                    }, 'Category updated live!')
                  }
                />
              )}

              {activeTab === 'users' && (
                <AdminUsersTab
                  users={overview.users}
                  currency={currency}
                  busy={busy}
                  onUpdateUser={(id, payload) =>
                    runMutation(async () => {
                      await updateUserApi(adminToken, id, payload);
                    }, 'User profile updated!')
                  }
                />
              )}

              {activeTab === 'orders' && (
                <AdminOrdersTab
                  orders={overview.orders}
                  currency={currency}
                  busy={busy}
                  onUpdateOrderStatus={(id, status) =>
                    runMutation(async () => {
                      await updateOrderStatusApi(adminToken, id, status);
                    }, `Order ${id} marked as ${status}.`)
                  }
                  onFulfillOrder={(id, payload) =>
                    runMutation(async () => {
                      await fulfillOrderApi(adminToken, id, payload);
                    }, `Order ${id} approved & delivered to user!`)
                  }
                  onDecideOrderPayment={async (id, payload) => {
                    setBusy(true);
                    setErrorMsg(null);
                    try {
                      const res = await decideOrderPaymentApi(
                        adminToken,
                        id,
                        payload
                      );
                      await loadOverview(true);
                      if (payload.decision === 'approve') {
                        showNotice(
                          res.autoDelivered
                            ? `Payment approved & account delivered for ${id}!`
                            : `Payment approved for ${id}! Ready to deliver account.`
                        );
                      } else {
                        showNotice(`Payment rejected & stock restored for ${id}.`);
                      }
                    } catch (err) {
                      const status = (err as Error & { status?: number })?.status;
                      if (status === 401) {
                        onLogout();
                        return;
                      }
                      setErrorMsg(
                        err instanceof Error
                          ? err.message
                          : 'Could not update payment status.'
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              )}

              {activeTab === 'reviews' && (
                <AdminReviewsTab
                  reviews={overview.reviews || []}
                  tools={overview.tools}
                  busy={busy}
                  onCreateReview={(payload) =>
                    runMutation(async () => {
                      await createAdminReviewApi(adminToken, payload);
                    }, 'Review published live!')
                  }
                  onUpdateReviewStatus={(id, status) =>
                    runMutation(async () => {
                      await updateAdminReviewStatusApi(adminToken, id, status);
                    }, status === 'approved' ? 'Review approved & published live!' : `Review marked as ${status}.`)
                  }
                  onDeleteReview={(id) =>
                    runMutation(async () => {
                      await deleteAdminReviewApi(adminToken, id);
                    }, 'Review deleted.')
                  }
                  onUploadMedia={async (payload) => {
                    const res = await uploadMediaApi(adminToken, payload);
                    return res.url;
                  }}
                />
              )}

              {activeTab === 'notifications' && (
                <AdminNotificationsTab
                  notifications={overview.notifications}
                  busy={busy}
                  onCreateNotification={(payload) =>
                    runMutation(async () => {
                      await createNotificationApi(adminToken, payload);
                    }, 'Alert published to storefront!')
                  }
                  onDeleteNotification={(id) =>
                    runMutation(async () => {
                      await deleteNotificationApi(adminToken, id);
                    }, 'Alert removed.')
                  }
                />
              )}
            </>
          ) : null}
        </main>
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-2xl bg-[#241B47]/95 border border-[#C084FC]/50 text-xs sm:text-sm font-semibold text-white shadow-2xl flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
