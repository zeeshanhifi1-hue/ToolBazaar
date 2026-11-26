import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  Check,
  CheckCircle2,
  Crown,
  Gift,
  Grid2x2,
  Headphones,
  Home,
  Menu,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Star,
  Tag,
  User,
  X,
  Zap,
} from 'lucide-react';
import type {
  CategoryId,
  CurrencyCode,
  NavTab,
  NeonCreatorThemeConfig,
  ProductReview,
  ToolProduct,
} from '../types/store';
import {
  applyCouponDiscountPrice,
  calculateDiscountPercent,
  formatCurrency,
} from '../utils/storeLogic';
import {
  DEFAULT_NEON_CREATOR_HERO_IMAGE,
  sanitizeSafeMediaUrl,
} from '../utils/supabaseMappers';
import { BrandAppIcon, ToolBazaarBolt } from './BrandIcons';

// ============================================================================
// NEON CREATOR TOP BAR
// ============================================================================
interface NeonCreatorTopBarProps {
  siteName: string;
  unreadCount: number;
  cartCount: number;
  searchOpen: boolean;
  onOpenMenu: () => void;
  onToggleSearch: () => void;
  onOpenNotifications: () => void;
  onOpenCart: () => void;
  onGoHome: () => void;
}

export function NeonCreatorTopBar({
  siteName,
  unreadCount,
  cartCount,
  searchOpen,
  onOpenMenu,
  onToggleSearch,
  onOpenNotifications,
  onOpenCart,
  onGoHome,
}: NeonCreatorTopBarProps) {
  const cleanName = (siteName || 'ToolBazaar').trim();
  const isToolBazaar = cleanName.toLowerCase() === 'toolbazaar';
  const splitIdx = isToolBazaar
    ? 4
    : Math.max(1, Math.floor(cleanName.length / 2));
  const firstPart = cleanName.slice(0, splitIdx);
  const secondPart = cleanName.slice(splitIdx);

  return (
    <header
      data-testid="neon-creator-topbar"
      className="sticky top-0 z-40 w-full bg-[#090517]/90 backdrop-blur-xl border-b border-white/8"
    >
      <div className="max-w-6xl mx-auto px-3.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
        {/* Left: Hamburger Menu */}
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open navigation menu"
          className="w-10 h-10 rounded-xl hover:bg-white/8 flex items-center justify-center text-white transition-colors"
        >
          <Menu className="w-6 h-6 stroke-[2.2]" />
        </button>

        {/* Center: ⚡ ToolBazaar */}
        <button
          type="button"
          onClick={onGoHome}
          aria-label={`${cleanName} Home`}
          className="inline-flex items-center gap-1.5 sm:gap-2 px-2 py-1 rounded-xl focus-visible:outline-2 focus-visible:outline-[#C084FC]"
        >
          <ToolBazaarBolt className="w-6 h-6 sm:w-7 sm:h-7 drop-shadow-[0_0_12px_rgba(168,85,247,0.85)]" />
          <span className="font-display font-extrabold text-[20px] sm:text-[23px] tracking-[-0.02em] leading-none">
            <span className="text-white">{firstPart}</span>
            <span className="text-[#C05BFF]">{secondPart}</span>
          </span>
        </button>

        {/* Right: Search + Notifications + Cart */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={onToggleSearch}
            aria-label="Search tools"
            aria-expanded={searchOpen}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              searchOpen
                ? 'bg-[#8B5CF6]/25 text-[#E9D5FF]'
                : 'text-white/90 hover:bg-white/8'
            }`}
          >
            <Search className="w-5 h-5 stroke-[2.2]" />
          </button>

          {cartCount > 0 && (
            <button
              type="button"
              onClick={onOpenCart}
              aria-label={`Open shopping cart (${cartCount} items)`}
              className="relative w-10 h-10 rounded-xl hover:bg-white/8 flex items-center justify-center text-white/90 transition-colors"
            >
              <ShoppingCart className="w-5 h-5 stroke-[2.1]" />
              <span className="absolute top-1.5 right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#A855F7] text-[10px] font-extrabold text-white flex items-center justify-center leading-none">
                {cartCount}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenNotifications}
            aria-label={
              unreadCount > 0
                ? `Notifications (${unreadCount} unread)`
                : 'Notifications'
            }
            className="relative w-10 h-10 rounded-xl hover:bg-white/8 flex items-center justify-center text-white/90 transition-colors"
          >
            <Bell className="w-5 h-5 stroke-[2.2]" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-[#FF3355] ring-2 ring-[#090517]" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

// ============================================================================
// NEON CREATOR FLOATING PILL BOTTOM NAV
// ============================================================================
interface NeonCreatorBottomNavProps {
  activeTab: NavTab;
  cartCount: number;
  onSelectTab: (tab: NavTab) => void;
  onOpenCart: () => void;
}

export function NeonCreatorBottomNav({
  activeTab,
  cartCount,
  onSelectTab,
  onOpenCart,
}: NeonCreatorBottomNavProps) {
  const navItems: {
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'categories', label: 'Categories', icon: Grid2x2 },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'profile', label: 'Account', icon: User },
  ];

  return (
    <div className="fixed bottom-3 inset-x-0 z-40 px-3 pointer-events-none">
      <div className="max-w-md mx-auto">
        <nav
          aria-label="Primary navigation"
          data-testid="neon-creator-bottom-nav"
          className="pointer-events-auto w-full rounded-full bg-[#130C29]/94 backdrop-blur-xl border border-[#A855F7]/35 p-1.5 grid grid-cols-4 gap-1 shadow-[0_14px_40px_rgba(0,0,0,0.82)]"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex flex-col items-center justify-center py-2 rounded-full transition-all ${
                  active
                    ? 'text-white'
                    : 'text-[#B4ACCE] hover:text-white hover:bg-white/5'
                }`}
                style={
                  active
                    ? {
                        background:
                          'linear-gradient(180deg, #B55CFF 0%, #8B3DFF 52%, #6D28D9 100%)',
                        boxShadow:
                          '0 0 24px rgba(168, 85, 247, 0.72), inset 0 1px 0 rgba(255,255,255,0.5)',
                      }
                    : undefined
                }
              >
                <Icon className="w-5 h-5 stroke-[2.1]" />
                <span className="mt-0.5 text-[11px] font-bold leading-none">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

// ============================================================================
// NEON CREATOR TOOL CARD
// ============================================================================
function formatSoldCompact(sold: number): string {
  if (sold >= 1000) return `${(sold / 1000).toFixed(1)}K`;
  return String(Math.max(120, sold));
}

interface NeonToolCardProps {
  tool: ToolProduct;
  currency: CurrencyCode;
  ratingText: string;
  reviewCountLabel: string;
  inCartQty: number;
  activeCouponPercent: number;
  className?: string;
  onOpenDetail: (tool: ToolProduct) => void;
  onQuickAdd: (tool: ToolProduct) => void;
}

function NeonToolCard({
  tool,
  currency,
  ratingText,
  reviewCountLabel,
  inCartQty,
  activeCouponPercent,
  className = '',
  onOpenDetail,
  onQuickAdd,
}: NeonToolCardProps) {
  const effectivePrice =
    activeCouponPercent > 0
      ? applyCouponDiscountPrice(tool.price, activeCouponPercent)
      : tool.price;
  const discountPct = calculateDiscountPercent(tool.originalPrice, effectivePrice);

  return (
    <article
      data-testid={`neon-tool-card-${tool.id}`}
      onClick={() => onOpenDetail(tool)}
      className={`group relative rounded-[20px] bg-[#130C28] hover:bg-[#191034] border border-[#A855F7]/28 hover:border-[#C084FC]/65 p-2.5 sm:p-3.5 transition-all cursor-pointer flex flex-col justify-between gap-2.5 overflow-hidden shadow-[0_8px_24px_rgba(6,3,18,0.6)] ${className}`}
    >
      {/* Subtle top specular line */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-4 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#C084FC]/45 to-transparent"
      />

      {/* Top-right Discount Pill */}
      {discountPct > 0 && (
        <span
          className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full text-[10px] font-extrabold text-white leading-tight"
          style={{
            background: 'linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)',
            boxShadow: '0 0 12px rgba(168, 85, 247, 0.5)',
          }}
        >
          -{discountPct}%
        </span>
      )}

      {/* Top Row: Brand Logo + Name/Subtitle */}
      <div className="flex items-start gap-2 sm:gap-2.5">
        <div className="shrink-0">
          <BrandAppIcon brand={tool.brand} logoUrl={tool.logoUrl} size="sm" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-bold text-[12.5px] sm:text-[15px] text-white leading-snug pr-12 line-clamp-2">
            {tool.name}
          </h3>
          <p className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#ACA4CE] truncate">
            {tool.subtitle}
          </p>
        </div>
      </div>

      {/* Bottom Row: Price + Rating on Left | Purple Square Cart Button on Right */}
      <div className="flex items-end justify-between gap-2 pt-0.5">
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-[11px] sm:text-xs text-[#8E87AE] line-through tabular-nums whitespace-nowrap">
              {formatCurrency(tool.originalPrice, currency)}
            </span>
            <span
              data-testid={`neon-price-${tool.id}`}
              className="font-display font-extrabold text-[17px] sm:text-[20px] leading-none text-[#EC79FF] tabular-nums whitespace-nowrap"
            >
              {formatCurrency(effectivePrice, currency)}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-[#D3CCE9]">
            <Star className="w-3.5 h-3.5 text-[#FACC15] fill-[#FACC15] shrink-0" />
            <span className="tabular-nums">{ratingText}</span>
            <span className="text-[#948DB5] tabular-nums">({reviewCountLabel})</span>
          </div>
        </div>

        <button
          type="button"
          disabled={tool.available <= 0}
          onClick={(e) => {
            e.stopPropagation();
            onQuickAdd(tool);
          }}
          aria-label={`Add ${tool.name} to cart`}
          className="relative w-10 h-9 sm:w-11 sm:h-10 rounded-xl flex items-center justify-center text-white shrink-0 transition-all active:scale-95 disabled:opacity-40"
          style={{
            background:
              inCartQty > 0
                ? 'linear-gradient(135deg, #22C55E 0%, #15803D 100%)'
                : 'linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)',
            boxShadow:
              inCartQty > 0
                ? '0 0 16px rgba(34, 197, 94, 0.5)'
                : '0 0 18px rgba(168, 85, 247, 0.55)',
          }}
        >
          {inCartQty > 0 ? (
            <Check className="w-4 h-4 stroke-[2.8]" />
          ) : (
            <ShoppingCart className="w-4 h-4 stroke-[2.2]" />
          )}
        </button>
      </div>
    </article>
  );
}

// ============================================================================
// NEON CREATOR HOME PAGE
// ============================================================================
interface NeonCreatorHomeProps {
  tools: ToolProduct[];
  reviews: ProductReview[];
  currency: CurrencyCode;
  activeCategory: CategoryId;
  activeCategoryLabel: string;
  searchQuery: string;
  config: NeonCreatorThemeConfig;
  vipCouponCode: string;
  vipCouponText: string;
  activeStoreCoupon: string | null;
  getCartQuantityForTool: (toolId: string) => number;
  onOpenTool: (tool: ToolProduct) => void;
  onQuickAdd: (tool: ToolProduct) => void;
  onApplyStoreCoupon: (code: string | null) => void;
  onResetFilters: () => void;
}

export function NeonCreatorHome({
  tools,
  reviews,
  currency,
  activeCategory,
  activeCategoryLabel,
  searchQuery,
  config,
  vipCouponCode,
  vipCouponText,
  activeStoreCoupon,
  getCartQuantityForTool,
  onOpenTool,
  onQuickAdd,
  onApplyStoreCoupon,
  onResetFilters,
}: NeonCreatorHomeProps) {
  const [showAllCatalog, setShowAllCatalog] = useState(false);
  const [offerModalOpen, setOfferModalOpen] = useState(false);

  const normalizedVipCode = (vipCouponCode || 'BAZAAR20').trim().toUpperCase();
  const couponPercent = Math.min(
    90,
    Math.max(1, Math.round(Number(config.couponDiscountPercent) || 20))
  );
  const isCouponActive =
    Boolean(activeStoreCoupon) &&
    activeStoreCoupon?.trim().toUpperCase() === normalizedVipCode;
  const effectiveCouponPercent = isCouponActive ? couponPercent : 0;

  const heroImgSrc =
    sanitizeSafeMediaUrl(config.heroImageUrl) || DEFAULT_NEON_CREATOR_HERO_IMAGE;

  const reviewStatsByTool = useMemo(() => {
    const map = new Map<string, { avg: number; count: number }>();
    const grouped = new Map<string, number[]>();
    for (const r of reviews) {
      if (r.status !== 'approved') continue;
      const arr = grouped.get(r.toolId) || [];
      arr.push(r.rating);
      grouped.set(r.toolId, arr);
    }
    grouped.forEach((ratings, toolId) => {
      const avg = ratings.reduce((s, n) => s + n, 0) / ratings.length;
      map.set(toolId, { avg, count: ratings.length });
    });
    return map;
  }, [reviews]);

  // Order Popular Tools first (trending first), then remaining tools below Special Offers
  const orderedTools = useMemo(() => {
    const trending = tools.filter((t) => t.trending);
    const others = tools.filter((t) => !t.trending);
    return [...trending, ...others];
  }, [tools]);

  const isFiltered = activeCategory !== 'all' || Boolean(searchQuery.trim());
  // Mobile shows 2 Popular Tools above Special Offers (matching mobile screenshot),
  // while Desktop (lg+) fills a clean 4-column row of 4 Popular Tools above Special Offers.
  const popularTools =
    isFiltered || showAllCatalog ? orderedTools : orderedTools.slice(0, 4);
  const moreTools =
    isFiltered || showAllCatalog ? [] : orderedTools.slice(2);

  const scrollToPopular = () => {
    const el = document.getElementById('neon-popular-tools');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const renderCard = (tool: ToolProduct, extraClassName = '') => {
    const stats = reviewStatsByTool.get(tool.id);
    const ratingText = stats ? stats.avg.toFixed(1) : '4.9';
    const reviewCountLabel = stats
      ? stats.count >= 1000
        ? `${(stats.count / 1000).toFixed(1)}K`
        : `${stats.count}`
      : formatSoldCompact(tool.sold);

    return (
      <NeonToolCard
        key={tool.id}
        tool={tool}
        currency={currency}
        ratingText={ratingText}
        reviewCountLabel={reviewCountLabel}
        inCartQty={getCartQuantityForTool(tool.id)}
        activeCouponPercent={effectiveCouponPercent}
        className={extraClassName}
        onOpenDetail={onOpenTool}
        onQuickAdd={onQuickAdd}
      />
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-5 pt-2 pb-6">
      {/* ==================== HERO BANNER CARD ==================== */}
      <section
        data-testid="neon-creator-hero"
        className="relative rounded-[24px] overflow-hidden border border-[#A855F7]/55 bg-[#0C061F] md:min-h-[340px] flex items-center"
        style={{
          boxShadow:
            '0 0 36px rgba(147, 51, 234, 0.28), inset 0 1px 0 rgba(255,255,255,0.16)',
        }}
      >
        {/* Ambient cosmic magenta/purple glow behind creator portrait */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 top-1/2 -translate-y-1/2 w-[300px] sm:w-[440px] h-[300px] sm:h-[440px] rounded-full blur-3xl opacity-55"
          style={{
            background:
              'radial-gradient(circle, rgba(192, 68, 255, 0.72) 0%, rgba(124, 58, 237, 0.35) 50%, transparent 75%)',
          }}
        />

        {/* Right Side Creator / Boy Portrait Image */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[52%] sm:w-[46%] md:w-[44%] overflow-hidden flex items-end justify-end">
          <img
            src={heroImgSrc}
            alt="ToolBazaar digital tools creator"
            data-testid="neon-creator-hero-img"
            className="w-full h-full object-cover object-top md:object-contain md:object-right-bottom scale-[1.03] md:scale-100 [mask-image:linear-gradient(to_right,transparent_0%,black_24%,black_100%)] [-webkit-mask-image:linear-gradient(to_right,transparent_0%,black_24%,black_100%)]"
          />
          {/* Seamless dark blend into left text side */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-[#0C061F] via-[#0C061F]/40 to-transparent"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#0C061F]/65 to-transparent"
          />
        </div>

        {/* Left Content Column */}
        <div className="relative z-10 w-[68%] sm:w-[60%] md:w-[58%] px-4 py-5 sm:px-7 sm:py-8 md:px-9 md:py-10 space-y-3 sm:space-y-4">
          {/* Crown Pill Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1C0E3C]/90 border border-[#A855F7]/50 max-w-full">
            <Crown className="w-3.5 h-3.5 text-[#FACC15] fill-[#FACC15] shrink-0" />
            <span className="text-[10px] sm:text-[11px] font-extrabold tracking-wider uppercase text-[#F3EAFF] truncate">
              {config.heroBadge}
            </span>
          </div>

          {/* Display Headline */}
          <h1 className="font-display font-extrabold text-[24px] xs:text-[27px] sm:text-[38px] md:text-[44px] leading-[1.06] tracking-[-0.025em] text-white">
            <span className="block">{config.heroTitle}</span>
            <span className="block text-[#C06BFF] drop-shadow-[0_0_20px_rgba(192,107,255,0.45)]">
              {config.heroTitleAccent}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-[12px] sm:text-[14px] md:text-[15px] text-[#CFC7E6] leading-snug max-w-[260px] sm:max-w-md">
            {config.heroSubtitle}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 pt-1">
            <button
              type="button"
              onClick={scrollToPopular}
              className="inline-flex items-center gap-1.5 h-9 sm:h-11 px-4 sm:px-6 rounded-full text-xs sm:text-sm font-extrabold text-white border border-[#E9D5FF]/45 transition-transform active:scale-95"
              style={{
                background:
                  'linear-gradient(135deg, #9333EA 0%, #B44CFF 55%, #7C3AED 100%)',
                boxShadow: '0 0 24px rgba(168, 85, 247, 0.65)',
              }}
            >
              <span>{config.heroPrimaryCta}</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
            </button>

            <button
              type="button"
              onClick={() => setOfferModalOpen(true)}
              data-testid="neon-best-deals-btn"
              className="inline-flex items-center gap-1.5 h-9 sm:h-11 px-3.5 sm:px-5 rounded-full bg-[#150C2E]/85 hover:bg-[#22144A] border border-white/25 hover:border-[#C084FC]/70 text-xs sm:text-sm font-bold text-white transition-colors"
            >
              <Tag className="w-3.5 h-3.5 text-[#E9D5FF]" />
              <span>{config.heroSecondaryCta}</span>
            </button>
          </div>
        </div>
      </section>

      {/* ==================== 4-COLUMN FEATURE TRUST BAR ==================== */}
      <section
        aria-label="Store highlights"
        className="rounded-[20px] bg-[#120B26]/92 border border-[#A855F7]/30 py-3.5 px-1.5 grid grid-cols-4 divide-x divide-white/10 shadow-[0_6px_24px_rgba(0,0,0,0.45)]"
      >
        <div className="flex flex-col items-center text-center px-1">
          <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-[#C084FC] mb-1.5 stroke-[2.1]" />
          <span className="text-[11px] sm:text-xs font-bold text-white leading-tight">
            Instant
          </span>
          <span className="text-[10px] sm:text-[11px] text-[#C4BBE0] leading-tight">
            Access
          </span>
        </div>

        <div className="flex flex-col items-center text-center px-1">
          <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-[#C084FC] mb-1.5 stroke-[2.1]" />
          <span className="text-[11px] sm:text-xs font-bold text-white leading-tight">
            Secure
          </span>
          <span className="text-[10px] sm:text-[11px] text-[#C4BBE0] leading-tight">
            &amp; Trusted
          </span>
        </div>

        <div className="flex flex-col items-center text-center px-1">
          <Headphones className="w-5 h-5 sm:w-6 sm:h-6 text-[#C084FC] mb-1.5 stroke-[2.1]" />
          <span className="text-[11px] sm:text-xs font-bold text-white leading-tight">
            24/7
          </span>
          <span className="text-[10px] sm:text-[11px] text-[#C4BBE0] leading-tight">
            Support
          </span>
        </div>

        <div className="flex flex-col items-center text-center px-1">
          <BadgeCheck className="w-5 h-5 sm:w-6 sm:h-6 text-[#C084FC] mb-1.5 stroke-[2.1]" />
          <span className="text-[11px] sm:text-xs font-bold text-white leading-tight">
            Best
          </span>
          <span className="text-[10px] sm:text-[11px] text-[#C4BBE0] leading-tight">
            Prices
          </span>
        </div>
      </section>

      {/* Active Global Coupon Banner */}
      {isCouponActive && (
        <div
          data-testid="active-store-coupon-banner"
          className="rounded-2xl bg-emerald-500/14 border border-emerald-400/40 px-4 py-2.5 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-200 min-w-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">
              Coupon <span className="font-mono text-white">{normalizedVipCode}</span> (-{couponPercent}%) applied to all products &amp; checkout!
            </span>
          </div>
          <button
            type="button"
            onClick={() => onApplyStoreCoupon(null)}
            className="text-[11px] font-bold text-emerald-200 hover:text-white px-2.5 py-1 rounded-lg bg-white/8 shrink-0"
          >
            Remove
          </button>
        </div>
      )}

      {/* ==================== POPULAR TOOLS SECTION ==================== */}
      <section id="neon-popular-tools" aria-label="Popular Tools" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              aria-hidden="true"
              className="w-1.5 h-6 rounded-full shrink-0"
              style={{
                background:
                  'linear-gradient(180deg, #E879F9 0%, #8B5CF6 100%)',
                boxShadow: '0 0 12px rgba(192, 132, 252, 0.8)',
              }}
            />
            <h2 className="font-display font-extrabold text-[19px] sm:text-[22px] text-white tracking-tight truncate">
              {isFiltered ? activeCategoryLabel : 'Popular Tools'}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => {
              if (isFiltered) {
                onResetFilters();
              } else {
                setShowAllCatalog((prev) => !prev);
              }
            }}
            className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-[#C084FC] hover:text-white transition-colors shrink-0"
          >
            <span>
              {isFiltered ? 'Show All' : showAllCatalog ? 'Compact View' : 'View All'}
            </span>
            <ArrowRight className="w-4 h-4 stroke-[2.4]" />
          </button>
        </div>

        {orderedTools.length === 0 ? (
          <div className="rounded-[22px] bg-[#130C28] border border-white/10 p-8 text-center space-y-3">
            <p className="font-display font-bold text-base text-white">
              No matching tools found
            </p>
            <p className="text-xs text-[#A39DC4]">
              Try another search keyword or reset the active category filter.
            </p>
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#7C3AED] hover:bg-[#8B5CF6] text-xs font-bold text-white"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          </div>
        ) : (
          <div
            data-testid="neon-popular-grid"
            className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5"
          >
            {popularTools.map((tool, idx) =>
              renderCard(
                tool,
                !isFiltered && !showAllCatalog && idx >= 2 ? 'hidden lg:flex' : ''
              )
            )}
          </div>
        )}
      </section>

      {/* ==================== SPECIAL OFFERS BANNER ==================== */}
      <section aria-label="Special Offers">
        <div
          role="button"
          tabIndex={0}
          data-testid="neon-special-offers-banner"
          onClick={() => setOfferModalOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setOfferModalOpen(true);
            }
          }}
          className="relative rounded-[22px] overflow-hidden border border-[#C084FC]/55 p-4 sm:p-5 flex items-center justify-between gap-3 sm:gap-4 cursor-pointer transition-all hover:border-[#E9D5FF]/80 active:scale-[0.99]"
          style={{
            background:
              'linear-gradient(125deg, #271054 0%, #160A33 48%, #341164 100%)',
            boxShadow:
              '0 0 30px rgba(147, 51, 234, 0.34), inset 0 1px 0 rgba(255,255,255,0.2)',
          }}
        >
          {/* Ambient neon confetti shimmer */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-10 left-1/3 w-48 h-24 rounded-full blur-2xl opacity-45"
            style={{ background: 'rgba(217, 70, 239, 0.55)' }}
          />

          <div className="relative flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#9333EA]/25 border border-[#E9D5FF]/35 flex items-center justify-center shrink-0 shadow-[0_0_22px_rgba(192,132,252,0.55)]">
              <Gift className="w-7 h-7 sm:w-8 sm:h-8 text-[#F0D9FF] stroke-[1.9]" />
            </div>

            <div className="min-w-0">
              <h3 className="font-display font-extrabold text-[17px] sm:text-[21px] text-white leading-tight truncate">
                {config.offerTitle}
              </h3>
              <p className="text-[11px] sm:text-xs text-[#D6CEEE] mt-0.5 line-clamp-2">
                {config.offerSubtitle}
              </p>
            </div>
          </div>

          <span
            data-testid="neon-explore-deals-btn"
            className="relative shrink-0 inline-flex items-center gap-1.5 h-9 sm:h-11 px-3.5 sm:px-5 rounded-full text-xs sm:text-sm font-extrabold text-white border border-[#E9D5FF]/45"
            style={{
              background:
                'linear-gradient(135deg, #9333EA 0%, #B44CFF 55%, #7C3AED 100%)',
              boxShadow: '0 0 22px rgba(168, 85, 247, 0.68)',
            }}
          >
            <span>{config.offerButtonText}</span>
            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
          </span>
        </div>
      </section>

      {/* ==================== MORE DIGITAL TOOLS GRID ==================== */}
      {moreTools.length > 0 && (
        <section aria-label="More Digital Tools" className="space-y-3 pt-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                aria-hidden="true"
                className="w-1.5 h-5 rounded-full bg-[#8B5CF6] shrink-0"
              />
              <h2 className="font-display font-extrabold text-[17px] sm:text-[20px] text-white tracking-tight truncate">
                More Premium Tools
              </h2>
            </div>
            <span className="text-xs font-semibold text-[#9D95BE] tabular-nums">
              {moreTools.length} more tools
            </span>
          </div>

          <div
            data-testid="neon-more-tools-grid"
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5"
          >
            {moreTools.map((tool, idx) =>
              renderCard(tool, idx < 2 ? 'lg:hidden' : '')
            )}
          </div>
        </section>
      )}

      {/* ==================== SPECIAL OFFERS COUPON MODAL ==================== */}
      {offerModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="special-offer-modal-title"
          onClick={() => setOfferModalOpen(false)}
        >
          <div
            data-testid="special-offer-coupon-modal"
            className="relative w-full max-w-md rounded-[26px] border border-[#C084FC]/55 bg-[#120A28] text-white p-5 sm:p-6 space-y-4 overflow-hidden shadow-[0_24px_70px_rgba(0,0,0,0.85)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top radiant glow */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-36 rounded-full blur-3xl opacity-60"
              style={{ background: 'rgba(168, 85, 247, 0.7)' }}
            />

            <div className="relative flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#9333EA]/30 border border-[#E9D5FF]/40 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.55)]">
                  <Sparkles className="w-6 h-6 text-[#F0D9FF]" />
                </div>
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">
                    Extra {couponPercent}% OFF All Tools
                  </span>
                  <h3
                    id="special-offer-modal-title"
                    className="font-display font-extrabold text-xl text-white mt-0.5"
                  >
                    {config.offerTitle}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOfferModalOpen(false)}
                aria-label="Close special offer modal"
                className="w-9 h-9 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center text-white/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="relative text-xs sm:text-sm text-[#CFC8E8] leading-relaxed">
              {vipCouponText}
            </p>

            {/* Interactive 1-Click Coupon Code Ticket */}
            <button
              type="button"
              data-testid="apply-coupon-ticket-btn"
              onClick={() => {
                onApplyStoreCoupon(normalizedVipCode);
                setOfferModalOpen(false);
              }}
              className="relative w-full rounded-2xl border-2 border-dashed border-[#C084FC] bg-[#1E1042] hover:bg-[#271556] p-4 transition-all text-center group"
            >
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#C4B5FD]">
                {isCouponActive
                  ? 'Currently Active Across All Products'
                  : 'Tap Coupon Code to Apply on All Products'}
              </div>
              <div className="mt-1.5 font-mono font-extrabold text-2xl sm:text-3xl tracking-[0.16em] text-white group-hover:text-[#F0ABFC] transition-colors">
                {normalizedVipCode}
              </div>
              <div className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold text-white bg-gradient-to-r from-[#9333EA] to-[#A855F7] shadow-[0_0_16px_rgba(168,85,247,0.6)]">
                {isCouponActive ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[2.8]" />
                    <span>Applied (-{couponPercent}% Live!)</span>
                  </>
                ) : (
                  <>
                    <Tag className="w-3.5 h-3.5" />
                    <span>Apply {couponPercent}% Off to All Products</span>
                  </>
                )}
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
