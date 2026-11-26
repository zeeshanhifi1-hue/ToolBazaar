import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, RotateCcw } from 'lucide-react';
import {
  CATEGORIES,
  HERO_BANNERS,
  INITIAL_NOTIFICATIONS,
  INITIAL_TOOLS,
} from './data/mockData';
import type {
  CartItem,
  CategoryId,
  CategoryItem,
  CurrencyCode,
  HeroBannerData,
  NavTab,
  NotificationItem,
  OrderRecord,
  PaymentGateway,
  PlanOption,
  ProductReview,
  SiteSettings,
  ToolProduct,
  UserProfile,
} from './types/store';
import {
  addOrIncrementCartItem,
  applyOrderToInventory,
  CURRENCY_MAP,
  DEFAULT_CURRENCY,
  filterTools,
  isCurrencyCode,
  updateCartItemQuantity,
} from './utils/storeLogic';
import { mapAuthUserToProfile } from './utils/authHelpers';
import { isSupabaseConfigured } from './lib/supabase';
import {
  completeOAuthFromMessage,
  fetchLiveUserProfile,
  getInitialAuthSession,
  signInWithGoogle,
  signOutUser,
  subscribeToAuthState,
  subscribeToUserProfile,
  syncUserProfileInDb,
} from './services/authService';
import {
  fetchBannersFromDb,
  fetchCategoriesFromDb,
  fetchNotificationsFromDb,
  fetchOrdersFromDb,
  fetchPaymentGatewaysFromDb,
  fetchReviewsFromDb,
  fetchSiteSettingsFromDb,
  fetchStoreSnapshot,
  fetchToolsFromDb,
  placeOrderViaServerApi,
  submitUserReviewApi,
  subscribeToRealtimeStore,
  uploadReviewScreenshotApi,
  type PlaceOrderPaymentInput,
  type SubmitUserReviewInput,
} from './services/toolbazaarApi';
import {
  DEFAULT_SITE_SETTINGS,
  normalizeThemeConfig,
  normalizeThemeId,
} from './utils/supabaseMappers';
import type { AdminAuthResponse, AdminOverviewData } from './services/adminApi';
import { TrendingMedalIcon } from './components/BrandIcons';
import { TopBar } from './components/TopBar';
import { CategoryStrip } from './components/CategoryStrip';
import { HeroBannerCarousel } from './components/HeroBannerCarousel';
import { ToolCard } from './components/ToolCard';
import { BottomNav } from './components/BottomNav';
import {
  NeonCreatorBottomNav,
  NeonCreatorHome,
  NeonCreatorTopBar,
} from './components/NeonCreatorHome';
import { ToolDetailModal } from './components/ToolDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { OrdersView } from './components/OrdersView';
import { CategoriesView } from './components/CategoriesView';
import { ProfileView } from './components/ProfileView';
import { AdminPanel } from './components/AdminPanel';
import { InstallWizard } from './components/InstallWizard';
import { fetchInstallStatusApi } from './services/installApi';
import type { InstallStatusResponse } from './utils/installLogic';
import {
  NotificationsModal,
  SearchBarOverlay,
  SideMenuDrawer,
} from './components/Overlays';

const STORAGE_KEYS = {
  cart: 'toolbazaar_cart_v1',
  wishlist: 'toolbazaar_wishlist_v1',
  manualCurrency: 'toolbazaar_currency_manual_v1',
};

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [activeCategory, setActiveCategory] = useState<CategoryId>('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllTools, setShowAllTools] = useState(true);

  const normalizePath = (p: string) => p.replace(/\/+$/, '') || '/';
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(
    () => normalizePath(window.location.pathname) === '/admin'
  );
  const [isInstallRoute, setIsInstallRoute] = useState<boolean>(
    () => normalizePath(window.location.pathname) === '/install'
  );
  const [autostartBypass] = useState<boolean>(() => {
    try {
      return new URLSearchParams(window.location.search).get('autostart') === '1';
    } catch {
      return false;
    }
  });
  const [installStatus, setInstallStatus] = useState<InstallStatusResponse | null>(null);
  const [installChecked, setInstallChecked] = useState<boolean>(false);
  const [previewStoreBypass, setPreviewStoreBypass] = useState<boolean>(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminUsername, setAdminUsername] = useState<string | null>(null);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(
    DEFAULT_SITE_SETTINGS
  );

  const [categories, setCategories] = useState<CategoryItem[]>(CATEGORIES);
  const [banners, setBanners] = useState<HeroBannerData[]>(HERO_BANNERS);
  const [tools, setTools] = useState<ToolProduct[]>(INITIAL_TOOLS);
  const [cart, setCart] = useState<CartItem[]>(() =>
    readStorage<CartItem[]>(STORAGE_KEYS.cart, [])
  );
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [wishlist, setWishlist] = useState<string[]>(() =>
    readStorage<string[]>(STORAGE_KEYS.wishlist, ['chatgpt-plus', 'canva-pro'])
  );
  const [notifications, setNotifications] = useState<NotificationItem[]>(
    INITIAL_NOTIFICATIONS
  );
  const [paymentGateways, setPaymentGateways] = useState<PaymentGateway[]>([]);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [currency, setCurrency] = useState<CurrencyCode>(() => {
    const saved = readStorage<unknown>(STORAGE_KEYS.manualCurrency, null);
    return isCurrencyCode(saved) ? saved : DEFAULT_CURRENCY;
  });
  const manualCurrencySelectedRef = useRef<boolean>(
    isCurrencyCode(readStorage<unknown>(STORAGE_KEYS.manualCurrency, null))
  );

  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeStoreCoupon, setActiveStoreCoupon] = useState<string | null>(null);

  const isNeonCreatorTheme =
    normalizeThemeId(siteSettings.activeTheme) === 'neon-creator';
  const neonThemeConfig = useMemo(
    () => normalizeThemeConfig(siteSettings.themeConfig),
    [siteSettings.themeConfig]
  );

  const selectedTool = useMemo(
    () => (selectedToolId ? tools.find((t) => t.id === selectedToolId) ?? null : null),
    [selectedToolId, tools]
  );

  const setSelectedTool = useCallback((tool: ToolProduct | null) => {
    setSelectedToolId(tool ? tool.id : null);
  }, []);

  const toolsSectionRef = useRef<HTMLElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const activeUserIdRef = useRef<string | null>(null);
  const activeUserRef = useRef<UserProfile | null>(null);

  useEffect(() => {
    activeUserIdRef.current = user?.id ?? null;
    activeUserRef.current = user;
  }, [user]);

  // Keep browser navigation (/admin <-> /install <-> /) in sync
  useEffect(() => {
    const onPopState = () => {
      const normalized = window.location.pathname.replace(/\/+$/, '') || '/';
      setIsAdminRoute(normalized === '/admin');
      setIsInstallRoute(normalized === '/install');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Check one-time installation status from server on initial boot
  useEffect(() => {
    let cancelled = false;
    void fetchInstallStatusApi()
      .then((res) => {
        if (cancelled) return;
        setInstallStatus(res);
        setInstallChecked(true);
      })
      .catch(() => {
        if (cancelled) return;
        setInstallChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (siteSettings.siteName) {
      document.title = `${siteSettings.siteName} — ${siteSettings.siteTagline}`;
    }
  }, [siteSettings.siteName, siteSettings.siteTagline]);

  const navigateToAdmin = useCallback(() => {
    if (window.location.pathname !== '/admin') {
      window.history.pushState({}, '', '/admin');
    }
    setIsInstallRoute(false);
    setIsAdminRoute(true);
  }, []);

  const navigateToStore = useCallback(() => {
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
    setIsInstallRoute(false);
    setIsAdminRoute(false);
    setPreviewStoreBypass(true);
  }, []);

  const handleInstallationCompleted = useCallback((nextSettings: SiteSettings) => {
    setSiteSettings(nextSettings);
    setInstallStatus((prev) =>
      prev
        ? {
            ...prev,
            installed: true,
            installedAt: new Date().toISOString(),
            settings: {
              siteName: nextSettings.siteName,
              siteTagline: nextSettings.siteTagline,
              supportEmail: nextSettings.supportEmail,
              vipCouponCode: nextSettings.vipCouponCode,
              vipCouponText: nextSettings.vipCouponText,
            },
          }
        : prev
    );
  }, []);

  const handleAdminAuthenticated = useCallback((auth: AdminAuthResponse) => {
    setAdminToken(auth.token);
    setAdminUsername(auth.username);
  }, []);

  const handleAdminLogout = useCallback(() => {
    setAdminToken(null);
    setAdminUsername(null);
  }, []);

  const handleAdminStoreMutated = useCallback((overview: AdminOverviewData) => {
    setSiteSettings(overview.settings);
    if (overview.categories.length > 0) setCategories(overview.categories);
    if (overview.banners.length > 0) setBanners(overview.banners);
    setTools(overview.tools);
    setNotifications(overview.notifications);
    if (Array.isArray(overview.paymentGateways)) {
      setPaymentGateways(overview.paymentGateways);
    }
    const uid = activeUserIdRef.current;
    if (uid && Array.isArray(overview.users)) {
      const matchedUser = overview.users.find((u) => u.id === uid);
      if (matchedUser) {
        setUser((prev) =>
          prev
            ? {
                ...prev,
                fullName: matchedUser.fullName || prev.fullName,
                walletCredits: matchedUser.walletCredits,
              }
            : prev
        );
      }
    }
    if (Array.isArray(overview.reviews)) {
      setReviews(
        overview.reviews.filter(
          (r) => r.status === 'approved' || (r.status === 'pending' && uid && r.userId === uid)
        )
      );
    }
  }, []);

  // Listen for Supabase Google OAuth sessions in real time + popup postMessage bridge
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let cancelled = false;
    let unsubProfile: (() => void) | null = null;

    const hydrateAuthenticatedUser = async (
      session: Awaited<ReturnType<typeof getInitialAuthSession>>
    ) => {
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (!session?.user) {
        if (!cancelled) {
          setUser(null);
          setOrders([]);
          setAuthLoading(false);
        }
        return;
      }

      const authUser = session.user;
      const profile = await syncUserProfileInDb(authUser);
      if (cancelled) return;

      setUser(profile);
      setAuthError(null);
      setAuthLoading(false);

      const userOrders = await fetchOrdersFromDb(authUser.id, profile);
      if (!cancelled && userOrders) {
        setOrders(userOrders);
      }

      unsubProfile = subscribeToUserProfile(authUser.id, (row) => {
        if (!cancelled) {
          setUser(mapAuthUserToProfile(authUser, row));
        }
      });
    };

    void getInitialAuthSession().then((session) => {
      void hydrateAuthenticatedUser(session);
    });

    const unsubAuth = subscribeToAuthState((session) => {
      void hydrateAuthenticatedUser(session);
    });

    const handleOAuthPopupMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as Record<string, unknown> | null;
      if (!data || data.type !== 'TOOLBAZAAR_SUPABASE_OAUTH') return;

      void completeOAuthFromMessage({
        code: data.code,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        error: data.error,
      }).then((res) => {
        if (cancelled) return;
        if (!res.ok) {
          setAuthLoading(false);
          setAuthError(res.error || 'Google sign-in failed. Please try again.');
        } else {
          setAuthError(null);
          showToast('Signed in with Google successfully!');
        }
      });
    };

    window.addEventListener('message', handleOAuthPopupMessage);

    return () => {
      cancelled = true;
      unsubAuth();
      if (unsubProfile) unsubProfile();
      window.removeEventListener('message', handleOAuthPopupMessage);
    };
  }, []);

  // Sync live storefront data from Supabase and subscribe to Realtime Postgres changes
  useEffect(() => {
    let cancelled = false;

    const loadInitial = async () => {
      // Load authoritative site settings, payment gateways & preview overrides if active
      try {
        const [settingsRes, overridesRes, gatewaysRes] = await Promise.all([
          fetch('/api/site-settings', { cache: 'no-store' }),
          fetch('/api/storefront-overrides', { cache: 'no-store' }),
          fetch('/api/payment-gateways', { cache: 'no-store' }),
        ]);
        if (!cancelled && settingsRes.ok) {
          const sJson = (await settingsRes.json()) as { settings?: SiteSettings };
          if (sJson.settings) setSiteSettings(sJson.settings);
        }
        if (!cancelled && gatewaysRes.ok) {
          const gJson = (await gatewaysRes.json()) as {
            gateways?: PaymentGateway[];
          };
          if (Array.isArray(gJson.gateways)) {
            setPaymentGateways(gJson.gateways);
          }
        }
        if (!cancelled && overridesRes.ok) {
          const oJson = (await overridesRes.json()) as {
            active?: boolean;
            settings?: SiteSettings;
            categories?: CategoryItem[];
            banners?: HeroBannerData[];
            tools?: ToolProduct[];
            notifications?: NotificationItem[];
            paymentGateways?: PaymentGateway[];
          };
          if (oJson.active) {
            if (oJson.settings) setSiteSettings(oJson.settings);
            if (oJson.categories?.length) setCategories(oJson.categories);
            if (oJson.banners?.length) setBanners(oJson.banners);
            if (oJson.tools) setTools(oJson.tools);
            if (oJson.notifications) setNotifications(oJson.notifications);
            if (Array.isArray(oJson.paymentGateways)) {
              setPaymentGateways(oJson.paymentGateways);
            }
            return;
          }
        }
      } catch {
        // Ignore network errors on optional server settings endpoint
      }

      if (!isSupabaseConfigured) return;

      const snapshot = await fetchStoreSnapshot();
      if (cancelled) return;
      if (snapshot.settings) setSiteSettings(snapshot.settings);
      if (snapshot.categories) setCategories(snapshot.categories);
      if (snapshot.banners) setBanners(snapshot.banners);
      if (snapshot.tools) setTools(snapshot.tools);
      if (snapshot.notifications) setNotifications(snapshot.notifications);
      if (snapshot.paymentGateways && snapshot.paymentGateways.length > 0) {
        setPaymentGateways(snapshot.paymentGateways);
      }
    };

    void loadInitial();

    if (!isSupabaseConfigured) {
      return () => {
        cancelled = true;
      };
    }

    const unsubscribe = subscribeToRealtimeStore({
      onSettingsChange: () => {
        void fetchSiteSettingsFromDb().then((row) => {
          if (!cancelled && row) setSiteSettings(row);
        });
      },
      onCategoriesChange: () => {
        void fetchCategoriesFromDb().then((rows) => {
          if (!cancelled && rows) setCategories(rows);
        });
      },
      onBannersChange: () => {
        void fetchBannersFromDb().then((rows) => {
          if (!cancelled && rows) setBanners(rows);
        });
      },
      onToolsChange: () => {
        void fetchToolsFromDb().then((rows) => {
          if (!cancelled && rows) setTools(rows);
        });
      },
      onOrdersChange: () => {
        const uid = activeUserIdRef.current;
        if (!uid) return;
        void fetchOrdersFromDb(uid, activeUserRef.current).then((rows) => {
          if (!cancelled && rows) setOrders(rows);
        });
      },
      onNotificationsChange: () => {
        void fetchNotificationsFromDb().then((rows) => {
          if (!cancelled && rows) setNotifications(rows);
        });
      },
      onPaymentGatewaysChange: () => {
        void fetchPaymentGatewaysFromDb().then((rows) => {
          if (!cancelled && rows) setPaymentGateways(rows);
        });
      },
      onReviewsChange: () => {
        void fetchReviewsFromDb(activeUserRef.current).then((rows) => {
          if (!cancelled && rows) setReviews(rows);
        });
      },
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  // Authoritative real-time refresh for signed-in user's wallet balance, orders & reviews
  const refreshAuthenticatedUserData = useCallback(async () => {
    const currentUser = activeUserRef.current;
    if (!currentUser?.id) return;

    const [liveProfile, liveOrders, liveReviews] = await Promise.all([
      fetchLiveUserProfile(currentUser),
      fetchOrdersFromDb(currentUser.id, currentUser),
      fetchReviewsFromDb(currentUser),
    ]);

    if (activeUserIdRef.current !== currentUser.id) return;

    if (liveProfile) {
      setUser((prev) =>
        prev && prev.id === currentUser.id
          ? {
              ...prev,
              fullName: liveProfile.fullName || prev.fullName,
              avatarUrl: liveProfile.avatarUrl || prev.avatarUrl,
              walletCredits: liveProfile.walletCredits,
            }
          : prev
      );
    }
    if (liveOrders) {
      setOrders(liveOrders);
    }
    if (liveReviews) {
      setReviews(liveReviews);
    }
  }, []);

  // Re-fetch user-scoped reviews, orders & wallet balance whenever user changes, opens Orders/Profile/Cart, or returns from Admin
  useEffect(() => {
    let cancelled = false;
    void fetchReviewsFromDb(user).then((rows) => {
      if (!cancelled && rows) setReviews(rows);
    });
    if (user?.id) {
      void refreshAuthenticatedUserData();
    }
    return () => {
      cancelled = true;
    };
  }, [user?.id, refreshAuthenticatedUserData]);

  useEffect(() => {
    if (!user?.id || isAdminRoute) return;
    if (activeTab === 'orders' || activeTab === 'profile' || cartOpen) {
      void refreshAuthenticatedUserData();
    }
  }, [activeTab, cartOpen, isAdminRoute, user?.id, refreshAuthenticatedUserData]);

  useEffect(() => {
    if (!user?.id) return;

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        void refreshAuthenticatedUserData();
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible' && !isAdminRoute) {
        void refreshAuthenticatedUserData();
      }
    }, 8000);

    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.clearInterval(intervalId);
    };
  }, [user?.id, isAdminRoute, refreshAuthenticatedUserData]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(cart));
    } catch {
      // Ignore storage quota errors
    }
  }, [cart]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.wishlist, JSON.stringify(wishlist));
    } catch {
      // Ignore storage quota errors
    }
  }, [wishlist]);

  // Auto-select default currency from backend geolocation (PK -> PKR, IN -> INR, others -> USD)
  useEffect(() => {
    if (manualCurrencySelectedRef.current) return;

    let cancelled = false;
    const detectGeoCurrency = async () => {
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        const res = await fetch(
          `/api/geo-currency?tz=${encodeURIComponent(tz)}`,
          { cache: 'no-store' }
        );
        if (!res.ok || cancelled || manualCurrencySelectedRef.current) return;
        const data = (await res.json()) as { currency?: unknown };
        if (isCurrencyCode(data?.currency) && !cancelled && !manualCurrencySelectedRef.current) {
          setCurrency(data.currency);
        }
      } catch {
        // Keep default USD if backend geo lookup is unreachable
      }
    };

    void detectGeoCurrency();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelectCurrency = (nextCurrency: CurrencyCode) => {
    manualCurrencySelectedRef.current = true;
    setCurrency(nextCurrency);
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.manualCurrency,
        JSON.stringify(nextCurrency)
      );
    } catch {
      // Ignore storage quota errors
    }
    const meta = CURRENCY_MAP[nextCurrency];
    showToast(`Currency changed to ${meta.name} (${meta.code})`);
  };

  const handleContinueWithGoogle = async () => {
    setAuthError(null);
    setAuthLoading(true);
    const result = await signInWithGoogle();
    if (!result.started) {
      setAuthLoading(false);
      setAuthError(result.error || 'Could not start Google sign-in.');
    } else {
      // Release spinner if user closes popup without completing sign-in
      window.setTimeout(() => {
        setAuthLoading(false);
      }, 12000);
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    setUser(null);
    setOrders([]);
    setAuthError(null);
    showToast('Signed out successfully');
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const totalCartItems = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const filteredTools = useMemo(
    () => filterTools(tools, activeCategory, searchQuery),
    [tools, activeCategory, searchQuery]
  );

  const displayedTools = useMemo(() => {
    if (showAllTools || activeCategory !== 'all' || searchQuery.trim()) {
      return filteredTools;
    }
    return filteredTools.slice(0, 4);
  }, [filteredTools, showAllTools, activeCategory, searchQuery]);

  const wishlistTools = useMemo(
    () => tools.filter((t) => wishlist.includes(t.id)),
    [tools, wishlist]
  );

  const categoryCounts = useMemo<Partial<Record<CategoryId, number>>>(() => {
    const counts: Partial<Record<CategoryId, number>> = { all: tools.length };
    for (const t of tools) {
      counts[t.category] = (counts[t.category] ?? 0) + 1;
    }
    return counts;
  }, [tools]);

  const getCartQuantityForTool = (toolId: string) =>
    cart
      .filter((item) => item.toolId === toolId)
      .reduce((sum, item) => sum + item.quantity, 0);

  const handleQuickAdd = (tool: ToolProduct) => {
    const defaultPlan = tool.plans[0];
    if (!defaultPlan || tool.available <= 0) return;

    setCart((prev) =>
      addOrIncrementCartItem(
        prev,
        {
          toolId: tool.id,
          planId: defaultPlan.id,
          planLabel: defaultPlan.label,
          name: tool.name,
          brand: tool.brand,
          unitPrice: defaultPlan.price,
          unitOriginalPrice: defaultPlan.originalPrice,
        },
        tool.available
      )
    );
    showToast(`${tool.name} added to cart`);
  };

  const handleAddPlanToCart = (
    tool: ToolProduct,
    plan: PlanOption,
    openCartAfter = false
  ) => {
    if (tool.available <= 0) return;
    setCart((prev) =>
      addOrIncrementCartItem(
        prev,
        {
          toolId: tool.id,
          planId: plan.id,
          planLabel: plan.label,
          name: tool.name,
          brand: tool.brand,
          unitPrice: plan.price,
          unitOriginalPrice: plan.originalPrice,
        },
        tool.available
      )
    );
    if (openCartAfter) {
      setCartOpen(true);
    } else {
      showToast(`${tool.name} (${plan.label}) added to cart`);
    }
  };

  const handleUpdateQty = (toolId: string, planId: string, delta: number) => {
    const tool = tools.find((t) => t.id === toolId);
    const maxStock = tool?.available ?? 99;
    setCart((prev) =>
      updateCartItemQuantity(prev, toolId, planId, delta, maxStock)
    );
  };

  const handleRemoveCartItem = (toolId: string, planId: string) => {
    setCart((prev) =>
      prev.filter((item) => !(item.toolId === toolId && item.planId === planId))
    );
  };

  const handlePlaceOrder = async (
    email: string,
    promoCode: string | undefined,
    payment: PlaceOrderPaymentInput
  ): Promise<{ ok: boolean; error?: string }> => {
    if (cart.length === 0) return { ok: false, error: 'Your cart is empty.' };
    if (!user) {
      const msg = 'Please continue with Google to complete checkout.';
      setAuthError(msg);
      return { ok: false, error: msg };
    }

    const serverResult = await placeOrderViaServerApi(
      email || user.email,
      cart,
      promoCode,
      payment,
      user
    );

    if (serverResult.error || !serverResult.order) {
      // Refresh balance in case credits changed on the server
      void refreshAuthenticatedUserData();
      return {
        ok: false,
        error: serverResult.error || 'Could not place order. Please try again.',
      };
    }

    const savedOrder = serverResult.order;
    setOrders((prev) => [
      savedOrder,
      ...prev.filter((existing) => existing.id !== savedOrder.id),
    ]);

    if (typeof serverResult.walletCredits === 'number') {
      const nextCredits = serverResult.walletCredits;
      setUser((prev) => (prev ? { ...prev, walletCredits: nextCredits } : prev));
    } else if (payment.paymentMethod === 'balance') {
      setUser((prev) =>
        prev
          ? {
              ...prev,
              walletCredits: Math.max(0, prev.walletCredits - savedOrder.total),
            }
          : prev
      );
    }

    setTools((prev) => applyOrderToInventory(prev, cart));
    setCart([]);
    setCartOpen(false);
    setSelectedToolId(null);
    setActiveTab('orders');

    setNotifications((prev) => [
      {
        id: `notif-${savedOrder.id}`,
        title:
          savedOrder.paymentStatus === 'pending_verification'
            ? `Order #${savedOrder.id} Payment Submitted`
            : savedOrder.status === 'Pending'
              ? `Order #${savedOrder.id} Pending Admin Delivery`
              : `Order #${savedOrder.id} Delivered`,
        message:
          savedOrder.paymentStatus === 'pending_verification'
            ? `Your ${savedOrder.paymentGatewayName || 'payment gateway'} receipt is pending admin verification.`
            : savedOrder.status === 'Pending'
              ? 'Payment received via My Balance. Admin will deliver your account inside My Orders.'
              : `Activation key ${savedOrder.accessKey} is now active in My Orders.`,
        time: 'Just now',
        read: false,
        accent: savedOrder.paymentStatus === 'pending_verification' ? 'amber' : 'green',
      },
      ...prev.filter((n) => n.id !== `notif-${savedOrder.id}`),
    ]);

    showToast(
      savedOrder.paymentStatus === 'pending_verification'
        ? `Order ${savedOrder.id} submitted! Pending payment verification.`
        : savedOrder.status === 'Pending'
          ? `Order ${savedOrder.id} placed! Pending admin delivery.`
          : `Order ${savedOrder.id} confirmed! Delivered to My Orders.`
    );

    // Confirm live DB sync in background
    void refreshAuthenticatedUserData();
    if (isSupabaseConfigured) {
      void fetchToolsFromDb().then((rows) => {
        if (rows) setTools(rows);
      });
    }

    return { ok: true };
  };

  const handleSubmitUserReview = async (
    payload: SubmitUserReviewInput
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!user) {
      return { ok: false, error: 'Please sign in to submit a product review.' };
    }
    const res = await submitUserReviewApi(payload, user);
    if (res.error || !res.review) {
      return { ok: false, error: res.error || 'Could not submit your review.' };
    }
    const created = res.review;
    setReviews((prev) => [created, ...prev.filter((r) => r.id !== created.id)]);
    showToast('Review submitted! Pending Admin approval.');
    return { ok: true };
  };

  const handleUploadReviewScreenshot = (
    filename: string,
    dataBase64: string
  ): Promise<string> => uploadReviewScreenshotApi(filename, dataBase64, user);

  const handleToggleWishlist = (toolId: string) => {
    setWishlist((prev) =>
      prev.includes(toolId)
        ? prev.filter((id) => id !== toolId)
        : [...prev, toolId]
    );
  };

  const handleBannerCta = (targetCategory: CategoryId) => {
    setActiveTab('home');
    setActiveCategory(targetCategory);
    setShowAllTools(true);
    toolsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleViewAllToggle = () => {
    if (activeCategory !== 'all' || searchQuery.trim()) {
      setActiveCategory('all');
      setSearchQuery('');
      setShowAllTools(true);
    } else {
      setShowAllTools((prev) => !prev);
    }
  };

  const activeCategoryLabel = useMemo(() => {
    if (activeCategory === 'all') return 'Trending Premium Tools';
    const match = categories.find((c) => c.id === activeCategory);
    return match ? `${match.label} — Premium` : 'Trending Premium Tools';
  }, [activeCategory, categories]);

  if (isAdminRoute) {
    return (
      <AdminPanel
        adminToken={adminToken}
        adminUsername={adminUsername}
        currency={currency}
        siteSettings={siteSettings}
        onAuthenticated={handleAdminAuthenticated}
        onLogout={handleAdminLogout}
        onBackToStore={navigateToStore}
        onStoreDataMutated={handleAdminStoreMutated}
      />
    );
  }

  if (!isInstallRoute && !autostartBypass && !previewStoreBypass && !installChecked) {
    return <div className="min-h-screen bg-[#090713] text-white" aria-busy="true" />;
  }

  const shouldAutoOpenInstaller =
    installChecked &&
    installStatus !== null &&
    !installStatus.installed &&
    !autostartBypass &&
    !previewStoreBypass;

  if (isInstallRoute || shouldAutoOpenInstaller) {
    return (
      <InstallWizard
        initialStatus={installStatus}
        onInstallationCompleted={handleInstallationCompleted}
        onOpenStorefront={navigateToStore}
        onOpenAdmin={navigateToAdmin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#090713] text-white relative overflow-x-hidden">
      {/* Subtle deep cosmic ambient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 45% at 50% -10%, rgba(124, 58, 237, 0.22) 0%, rgba(9, 7, 19, 0) 70%)',
        }}
      />

      {/* Sticky Top Bar */}
      {isNeonCreatorTheme ? (
        <NeonCreatorTopBar
          siteName={siteSettings.siteName}
          unreadCount={unreadCount}
          cartCount={totalCartItems}
          searchOpen={searchOpen}
          onOpenMenu={() => setMenuOpen(true)}
          onToggleSearch={() => {
            setSelectedToolId(null);
            setSearchOpen((prev) => !prev);
            if (activeTab !== 'home') setActiveTab('home');
          }}
          onOpenNotifications={() => setNotificationsOpen(true)}
          onOpenCart={() => setCartOpen(true)}
          onGoHome={() => {
            setSelectedToolId(null);
            setActiveTab('home');
            setActiveCategory('all');
            setSearchQuery('');
          }}
        />
      ) : (
        <TopBar
          unreadCount={unreadCount}
          searchOpen={searchOpen}
          searchQuery={searchQuery}
          searchResultCount={filteredTools.length}
          cartCount={totalCartItems}
          siteName={siteSettings.siteName}
          siteTagline={siteSettings.siteTagline}
          onOpenMenu={() => setMenuOpen(true)}
          onToggleSearch={() => {
            setSelectedToolId(null);
            setSearchOpen((prev) => !prev);
            if (activeTab !== 'home') setActiveTab('home');
          }}
          onSearchChange={(val) => {
            setSelectedToolId(null);
            setSearchQuery(val);
            if (activeTab !== 'home') setActiveTab('home');
          }}
          onOpenCart={() => setCartOpen(true)}
          onOpenNotifications={() => setNotificationsOpen(true)}
          onGoHome={() => {
            setSelectedToolId(null);
            setActiveTab('home');
            setActiveCategory('all');
            setSearchQuery('');
          }}
        />
      )}

      {/* Main Content Container */}
      <main
        className={`relative z-10 max-w-[1680px] mx-auto px-3 sm:px-6 lg:px-6 xl:px-8 pt-0.5 lg:pt-2 ${
          selectedTool ? 'pb-8' : isNeonCreatorTheme ? 'pb-28' : 'pb-24 lg:pb-20'
        }`}
      >
        <div className={isNeonCreatorTheme ? 'max-w-6xl mx-auto' : 'lg:hidden'}>
          <SearchBarOverlay
            open={searchOpen}
            query={searchQuery}
            resultCount={filteredTools.length}
            onChange={(val) => {
              setSelectedToolId(null);
              setSearchQuery(val);
              if (activeTab !== 'home') setActiveTab('home');
            }}
            onClose={() => setSearchOpen(false)}
          />
        </div>

        {selectedTool ? (
          <ToolDetailModal
            tool={selectedTool}
            allTools={tools}
            categoryLabel={
              categories.find((c) => c.id === selectedTool.category)?.label ||
              'Tools'
            }
            currency={currency}
            isWishlisted={wishlist.includes(selectedTool.id)}
            user={user}
            reviews={reviews}
            orders={orders}
            onBackHome={() => setSelectedToolId(null)}
            onSelectCategory={(catId) => {
              setSelectedToolId(null);
              setActiveCategory(catId);
              setActiveTab('home');
              setShowAllTools(true);
            }}
            onToggleWishlist={handleToggleWishlist}
            onAddToCart={handleAddPlanToCart}
            onSubmitReview={handleSubmitUserReview}
            onUploadReviewScreenshot={handleUploadReviewScreenshot}
          />
        ) : (
          <>
            {activeTab === 'home' && isNeonCreatorTheme && (
              <NeonCreatorHome
                tools={filteredTools}
                reviews={reviews}
                currency={currency}
                activeCategory={activeCategory}
                activeCategoryLabel={activeCategoryLabel}
                searchQuery={searchQuery}
                config={neonThemeConfig}
                vipCouponCode={siteSettings.vipCouponCode}
                vipCouponText={siteSettings.vipCouponText}
                activeStoreCoupon={activeStoreCoupon}
                getCartQuantityForTool={getCartQuantityForTool}
                onOpenTool={setSelectedTool}
                onQuickAdd={handleQuickAdd}
                onApplyStoreCoupon={(code) => {
                  setActiveStoreCoupon(code);
                  if (code) {
                    showToast(
                      `Coupon ${code} (-${neonThemeConfig.couponDiscountPercent}%) applied to all products!`
                    );
                  } else {
                    showToast('Coupon removed');
                  }
                }}
                onResetFilters={() => {
                  setActiveCategory('all');
                  setSearchQuery('');
                }}
              />
            )}

            {activeTab === 'home' && !isNeonCreatorTheme && (
          <>
            {/* Mobile: Stacked Category Strip + Banner | Desktop (lg+): Side-by-Side Categories + Sliding Banners */}
            <div className="lg:grid lg:grid-cols-12 lg:gap-4 xl:gap-5 lg:items-stretch lg:mt-1.5">
              <div className="lg:col-span-3 xl:col-span-3 flex flex-col">
                <CategoryStrip
                  categories={categories}
                  activeCategory={activeCategory}
                  categoryCounts={categoryCounts}
                  onSelectCategory={(id) => {
                    setActiveCategory(id);
                    setShowAllTools(true);
                  }}
                />
              </div>

              <div className="lg:col-span-9 xl:col-span-9 flex flex-col">
                <HeroBannerCarousel
                  banners={banners}
                  onBannerCta={handleBannerCta}
                />
              </div>
            </div>

            {/* Trending Premium Tools Section */}
            <section
              ref={toolsSectionRef}
              aria-label="Trending Premium Tools"
              className="mt-2 sm:mt-2.5 lg:mt-5"
            >
              <div className="flex items-center justify-between gap-2 mb-2 sm:mb-2.5 lg:mb-3.5">
                <div className="flex items-center gap-2 min-w-0">
                  <TrendingMedalIcon className="w-6 h-6 shrink-0" />
                  <h2 className="font-display font-bold text-[18px] sm:text-[21px] lg:text-[22px] leading-tight text-white truncate">
                    {activeCategoryLabel}
                  </h2>
                  <span className="hidden lg:inline text-[13px] font-medium text-[#958EBA] ml-1.5 tabular-nums whitespace-nowrap">
                    · {displayedTools.length} digital products
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleViewAllToggle}
                  className="inline-flex items-center gap-1 text-[13px] sm:text-[14px] font-bold text-[#BC93FF] hover:text-white whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-[#C084FC] rounded-lg px-1.5 py-1"
                >
                  <span>
                    {activeCategory !== 'all' || searchQuery.trim()
                      ? 'Show All'
                      : 'View All'}
                  </span>
                  <ArrowRight className="w-4 h-4 stroke-[2.4]" />
                </button>
              </div>

              {displayedTools.length === 0 ? (
                <div className="rounded-[22px] bg-[#161327] border border-white/10 p-8 text-center space-y-3">
                  <p className="font-display font-bold text-base text-white">
                    No matching tools found
                  </p>
                  <p className="text-xs text-[#A39DC4]">
                    Try another keyword or reset the active category filter.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategory('all');
                      setSearchQuery('');
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#7C3AED] hover:bg-[#8B5CF6] text-xs font-bold text-white"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div
                  data-testid="tools-grid"
                  className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 lg:gap-4"
                >
                  {displayedTools.map((tool) => (
                    <ToolCard
                      key={tool.id}
                      tool={tool}
                      currency={currency}
                      inCartQty={getCartQuantityForTool(tool.id)}
                      onOpenDetail={setSelectedTool}
                      onQuickAdd={handleQuickAdd}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {activeTab === 'categories' && (
          <CategoriesView
            categories={categories}
            tools={tools}
            onPickCategory={(catId) => {
              setActiveCategory(catId);
              setActiveTab('home');
              setShowAllTools(true);
            }}
          />
        )}

        {activeTab === 'orders' && (
          <OrdersView
            user={user}
            authLoading={authLoading}
            authError={authError}
            orders={orders}
            tools={tools}
            reviews={reviews}
            currency={currency}
            onContinueWithGoogle={() => {
              void handleContinueWithGoogle();
            }}
            onReorder={(tool) => {
              handleQuickAdd(tool);
              setCartOpen(true);
            }}
            onExploreStore={() => setActiveTab('home')}
            onSubmitReview={handleSubmitUserReview}
            onUploadReviewScreenshot={handleUploadReviewScreenshot}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            user={user}
            authLoading={authLoading}
            authError={authError}
            orderCount={orders.length}
            wishlistTools={wishlistTools}
            currency={currency}
            onContinueWithGoogle={() => {
              void handleContinueWithGoogle();
            }}
            onSignOut={() => {
              void handleSignOut();
            }}
            onOpenTool={setSelectedTool}
            onGoToOrders={() => setActiveTab('orders')}
          />
        )}
          </>
        )}
      </main>

      {/* Toast Feedback */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-[#241B47]/95 border border-[#C084FC]/50 text-xs sm:text-sm font-semibold text-white shadow-[0_8px_28px_rgba(10,6,28,0.85)] backdrop-blur-md flex items-center gap-2 whitespace-nowrap"
        >
          <CheckCircle2 className="w-4 h-4 text-[#4ADE80] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Fixed Bottom Navigation Dock (hidden on Product Detail Page so Total Price + Buy Now sits cleanly) */}
      {!selectedTool &&
        (isNeonCreatorTheme ? (
          <NeonCreatorBottomNav
            activeTab={activeTab}
            cartCount={totalCartItems}
            onSelectTab={(tab) => {
              setSelectedToolId(null);
              setActiveTab(tab);
            }}
            onOpenCart={() => setCartOpen(true)}
          />
        ) : (
          <BottomNav
            activeTab={activeTab}
            cartCount={totalCartItems}
            onSelectTab={(tab) => {
              setSelectedToolId(null);
              setActiveTab(tab);
            }}
            onOpenCart={() => setCartOpen(true)}
          />
        ))}

      {/* Interactive Modals & Drawers */}
      <CartDrawer
        open={cartOpen}
        cart={cart}
        tools={tools}
        paymentGateways={paymentGateways}
        currency={currency}
        user={user}
        authLoading={authLoading}
        authError={authError}
        vipCouponCode={siteSettings.vipCouponCode}
        vipCouponPercent={neonThemeConfig.couponDiscountPercent}
        activeStoreCoupon={activeStoreCoupon}
        onContinueWithGoogle={() => {
          void handleContinueWithGoogle();
        }}
        onClose={() => setCartOpen(false)}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveCartItem}
        onPlaceOrder={handlePlaceOrder}
      />

      <SideMenuDrawer
        open={menuOpen}
        activeTab={activeTab}
        currency={currency}
        siteName={siteSettings.siteName}
        vipCouponCode={siteSettings.vipCouponCode}
        vipCouponText={siteSettings.vipCouponText}
        onClose={() => setMenuOpen(false)}
        onNavigateTab={(tab) => {
          setSelectedToolId(null);
          setActiveTab(tab);
        }}
        onSelectCategory={(cat) => {
          setSelectedToolId(null);
          setActiveCategory(cat);
        }}
        onSelectCurrency={handleSelectCurrency}
        onOpenCart={() => setCartOpen(true)}
        onOpenAdmin={navigateToAdmin}
      />

      <NotificationsModal
        open={notificationsOpen}
        notifications={notifications}
        onClose={() => setNotificationsOpen(false)}
        onMarkAllRead={() =>
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
        }
        onMarkRead={(id) =>
          setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
          )
        }
      />
    </div>
  );
}
