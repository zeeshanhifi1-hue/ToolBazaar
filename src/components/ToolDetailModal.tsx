import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Heart,
  HelpCircle,
  Image as ImageIcon,
  Loader2,
  MessageCircleMore,
  Send,
  ShoppingCart,
  Star,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import type {
  CategoryId,
  CurrencyCode,
  OrderRecord,
  PlanOption,
  ProductReview,
  ToolProduct,
  UserProfile,
} from '../types/store';
import { calculateDiscountPercent, formatCurrency } from '../utils/storeLogic';
import {
  canUserReviewOrder,
  computeOverallReviewStats,
  filterAllVisibleReviewsForUser,
  formatReviewDate,
  getReviewsLoadMoreMeta,
  REVIEWS_PAGE_SIZE,
} from '../utils/reviewLogic';
import { sanitizeSafeMediaUrl } from '../utils/supabaseMappers';
import { BrandAppIcon, CrownMiniIcon } from './BrandIcons';

type DetailTabId = 'details' | 'features' | 'reviews' | 'faq';

interface ToolDetailPageProps {
  tool: ToolProduct;
  allTools?: ToolProduct[];
  categoryLabel: string;
  currency: CurrencyCode;
  isWishlisted: boolean;
  user: UserProfile | null;
  reviews: ProductReview[];
  orders: OrderRecord[];
  onBackHome: () => void;
  onSelectCategory: (catId: CategoryId) => void;
  onToggleWishlist: (toolId: string) => void;
  onAddToCart: (tool: ToolProduct, plan: PlanOption, openCartAfter?: boolean) => void;
  onSubmitReview: (payload: {
    toolId: string;
    orderId?: string;
    rating: number;
    comment: string;
    screenshotUrl?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onUploadReviewScreenshot: (filename: string, dataBase64: string) => Promise<string>;
}

function getDefaultFaqs(tool: ToolProduct) {
  return [
    {
      q: `How fast will I receive my ${tool.name} subscription?`,
      a: `Automatic plans deliver your credentials instantly in My Orders right after checkout. Payment Gateway orders activate right after quick admin verification.`,
    },
    {
      q: `Is this an official and safe ${tool.name} access?`,
      a: `Yes, 100% genuine and safe access with full working guarantee for your entire selected subscription period.`,
    },
    {
      q: `Which payment methods are supported?`,
      a: `You can pay instantly with My Balance or choose any active Payment Gateway at checkout (EasyPaisa, JazzCash, USDT Crypto, UPI, and more).`,
    },
    {
      q: `What if I need help during my subscription?`,
      a: `Our 24/7 support team is always available to help with setup, login guidance, or instant replacements if anything ever stops working.`,
    },
  ];
}

function getPlanSubLabel(plan: PlanOption): string {
  if (plan.description && plan.description.trim()) {
    return plan.description.trim();
  }
  const days = plan.months === 12 ? 365 : Math.max(1, plan.months) * 30;
  return `Full access for ${days} days`;
}

function toShortHeroHighlight(raw: string): string {
  const cleaned = raw.trim().replace(/\s+/g, ' ');
  if (cleaned.length <= 16) return cleaned;

  const lower = cleaned.toLowerCase();
  if (lower.includes('gpt-4o')) return 'GPT-4o & o1';
  if (lower.includes('dall-e') || lower.includes('vision')) return 'DALL-E & Vision';
  if (lower.includes('priority')) return 'Priority Access';
  if (lower.includes('warranty') || lower.includes('replacement')) return 'Full Warranty';
  if (lower.includes('higher') && lower.includes('limit')) return 'Higher Limits';
  if (lower.includes('all') && lower.includes('feature')) return 'All Features';
  if (lower.includes('instant')) return 'Instant Access';
  if (lower.includes('4k') || lower.includes('ultra hd')) return '4K Ultra HD';
  if (lower.includes('ad-free') || lower.includes('no ads')) return 'Ad-Free Access';
  if (lower.includes('offline')) return 'Offline Mode';

  const stripped = cleaned.replace(
    /^(official|full|unlimited|fast|instant|premium|direct)\s+/i,
    ''
  );
  const words = stripped.split(' ');
  const trailingStopWords = new Set(['&', 'and', 'or', 'for', 'with', 'in', 'of', 'to', 'during', 'the']);
  let result = '';
  for (const word of words) {
    const candidate = result ? `${result} ${word}` : word;
    if (candidate.length > 16 && result) break;
    result = candidate;
    if (result.split(' ').length >= 3) break;
  }
  const parts = result.split(' ');
  while (parts.length > 1 && trailingStopWords.has(parts[parts.length - 1].toLowerCase())) {
    parts.pop();
  }
  return parts.join(' ') || cleaned.slice(0, 16);
}

function getPlanBadge(
  plan: PlanOption,
  index: number,
  totalPlans: number
): { text: string; bg: string } | null {
  const discount = calculateDiscountPercent(plan.originalPrice, plan.price);
  if (index === 0) {
    return {
      text: 'Most Popular',
      bg: 'linear-gradient(90deg, #EC4899 0%, #C026D3 100%)',
    };
  }
  if (totalPlans >= 3 && index === totalPlans - 1) {
    return {
      text: 'Best Value',
      bg: 'linear-gradient(90deg, #9333EA 0%, #A855F7 100%)',
    };
  }
  if (discount > 0) {
    return {
      text: `Save ${discount}%`,
      bg: 'linear-gradient(90deg, #FB4B6F 0%, #EC4899 100%)',
    };
  }
  return null;
}

/* Custom Neon Trust Icons matching the attached screenshot 1:1 */
function InstantBoltTrustIcon() {
  return (
    <svg viewBox="0 0 36 36" fill="none" className="w-7 h-7 sm:w-8 sm:h-8 mx-auto" aria-hidden="true">
      <defs>
        <linearGradient id="tb-trust-bolt" x1="10" y1="3" x2="26" y2="33" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F5D0FE" />
          <stop offset="45%" stopColor="#E879F9" />
          <stop offset="100%" stopColor="#9333EA" />
        </linearGradient>
      </defs>
      <path
        d="M20.8 4L8.5 19.6c-.45.58-.04 1.4.7 1.4h6.7l-2.1 10.9c-.16.86.94 1.38 1.52.71L27.6 17c.45-.58.04-1.4-.7-1.4h-6.7l2.1-10.9c.16-.86-.94-1.38-1.5-.7z"
        fill="url(#tb-trust-bolt)"
      />
    </svg>
  );
}

function SafeShieldTrustIcon() {
  return (
    <svg viewBox="0 0 36 36" fill="none" className="w-7 h-7 sm:w-8 sm:h-8 mx-auto" aria-hidden="true">
      <defs>
        <linearGradient id="tb-trust-shield" x1="18" y1="4" x2="18" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4ADE80" />
          <stop offset="100%" stopColor="#16A34A" />
        </linearGradient>
      </defs>
      <path
        d="M18 4.2L7 8.8v8.4c0 7.2 4.7 13.6 11 15.6 6.3-2 11-8.4 11-15.6V8.8L18 4.2z"
        fill="url(#tb-trust-shield)"
      />
      <path
        d="M13.2 18.2l3.2 3.3 6.6-6.8"
        stroke="#081C10"
        strokeWidth="2.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SupportHeadsetTrustIcon() {
  return (
    <svg viewBox="0 0 36 36" fill="none" className="w-7 h-7 sm:w-8 sm:h-8 mx-auto" aria-hidden="true">
      <defs>
        <linearGradient id="tb-trust-headset" x1="6" y1="6" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E9D5FF" />
          <stop offset="55%" stopColor="#C084FC" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <path
        d="M8.5 18v-1.2C8.5 11.4 12.75 7 18 7s9.5 4.4 9.5 9.8V18"
        stroke="url(#tb-trust-headset)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <rect x="6" y="17" width="4.8" height="8.5" rx="2.4" fill="url(#tb-trust-headset)" />
      <rect x="25.2" y="17" width="4.8" height="8.5" rx="2.4" fill="url(#tb-trust-headset)" />
      <path
        d="M27.2 25.5c0 2.5-2.2 4.3-5.2 4.3h-2.5"
        stroke="url(#tb-trust-headset)"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
      <circle cx="18.2" cy="29.8" r="1.7" fill="#E9D5FF" />
    </svg>
  );
}

function GuaranteeBadgeTrustIcon() {
  return (
    <svg viewBox="0 0 36 36" fill="none" className="w-7 h-7 sm:w-8 sm:h-8 mx-auto" aria-hidden="true">
      <defs>
        <linearGradient id="tb-trust-seal" x1="7" y1="5" x2="29" y2="31" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F3E8FF" />
          <stop offset="48%" stopColor="#C084FC" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <path
        d="M18 4.4l2.9 2.2 3.6-.3 1.4 3.3 3.3 1.4-.3 3.6 2.2 2.9-2.2 2.9.3 3.6-3.3 1.4-1.4 3.3-3.6-.3-2.9 2.2-2.9-2.2-3.6.3-1.4-3.3-3.3-1.4.3-3.6-2.2-2.9 2.2-2.9-.3-3.6 3.3-1.4 1.4-3.3 3.6.3L18 4.4z"
        fill="url(#tb-trust-seal)"
      />
      <path
        d="M13.3 18.1l3.2 3.2 6.4-6.5"
        stroke="#1C0E35"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GoldCrownHeroIcon() {
  return (
    <svg
      viewBox="0 0 44 30"
      fill="none"
      className="w-9 h-7 sm:w-11 sm:h-8 drop-shadow-[0_3px_10px_rgba(250,204,21,0.75)]"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="tb-hero-crown" x1="22" y1="2" x2="22" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="50%" stopColor="#FACC15" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <path
        d="M5 24.5L3 9.5l10.5 6.8L22 5.2l8.5 11.1L41 9.5l-2 15a2.4 2.4 0 01-2.4 2.1H7.4A2.4 2.4 0 015 24.5z"
        fill="url(#tb-hero-crown)"
        stroke="#FEF9C3"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle cx="3" cy="8.5" r="2.2" fill="#FEF08A" />
      <circle cx="22" cy="4.2" r="2.5" fill="#FEF9C3" />
      <circle cx="41" cy="8.5" r="2.2" fill="#FEF08A" />
    </svg>
  );
}

export function ToolDetailModal({
  tool,
  allTools = [],
  categoryLabel,
  currency,
  isWishlisted,
  user,
  reviews,
  orders,
  onBackHome,
  onSelectCategory,
  onToggleWishlist,
  onAddToCart,
  onSubmitReview,
  onUploadReviewScreenshot,
}: ToolDetailPageProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    tool.plans[0]?.id ?? ''
  );
  const [activeSection, setActiveSection] = useState<DetailTabId>('details');
  const [openFaqIdx, setOpenFaqIdx] = useState<number>(0);

  // Real-time verified buyer review form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [draftRating, setDraftRating] = useState(5);
  const [draftComment, setDraftComment] = useState('');
  const [draftScreenshotUrl, setDraftScreenshotUrl] = useState('');
  const [uploadingShot, setUploadingShot] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [previewShotUrl, setPreviewShotUrl] = useState<string | null>(null);
  const [visibleReviewLimit, setVisibleReviewLimit] = useState<number>(
    REVIEWS_PAGE_SIZE
  );

  useEffect(() => {
    setSelectedPlanId(tool.plans[0]?.id ?? '');
    setActiveSection('details');
    setOpenFaqIdx(0);
    setShowReviewForm(false);
    setDraftComment('');
    setDraftScreenshotUrl('');
    setReviewError(null);
    setPreviewShotUrl(null);
    setVisibleReviewLimit(REVIEWS_PAGE_SIZE);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [tool.id]);

  // Keep selectedPlanId valid if Admin updates plans in real time
  useEffect(() => {
    if (
      tool.plans.length > 0 &&
      !tool.plans.some((p) => p.id === selectedPlanId)
    ) {
      setSelectedPlanId(tool.plans[0].id);
    }
  }, [tool.plans, selectedPlanId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewShotUrl) {
          setPreviewShotUrl(null);
        } else {
          onBackHome();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onBackHome, previewShotUrl]);

  const activePlan =
    tool.plans.find((p) => p.id === selectedPlanId) ?? tool.plans[0];
  const activeDiscount = activePlan
    ? calculateDiscountPercent(activePlan.originalPrice, activePlan.price)
    : tool.discountPercent;
  const outOfStock = tool.available <= 0;

  const visibleReviews = useMemo(
    () => filterAllVisibleReviewsForUser(reviews, user?.id),
    [reviews, user?.id]
  );
  const reviewStats = useMemo(
    () => computeOverallReviewStats(reviews),
    [reviews]
  );
  const toolNameMap = useMemo(() => {
    const map = new Map<string, string>();
    map.set(tool.id, tool.name);
    for (const item of allTools) {
      map.set(item.id, item.name);
    }
    return map;
  }, [allTools, tool.id, tool.name]);

  const displayedReviews = useMemo(
    () => visibleReviews.slice(0, visibleReviewLimit),
    [visibleReviews, visibleReviewLimit]
  );
  const reviewPagination = useMemo(
    () =>
      getReviewsLoadMoreMeta(
        visibleReviews.length,
        visibleReviewLimit,
        REVIEWS_PAGE_SIZE
      ),
    [visibleReviews.length, visibleReviewLimit]
  );
  const faqs = useMemo(() => getDefaultFaqs(tool), [tool]);

  // Check if current signed-in user has a delivered/active order containing this tool
  const eligibleOrder = useMemo(() => {
    if (!user) return undefined;
    return orders.find(
      (ord) =>
        canUserReviewOrder(ord) &&
        ord.items.some((it) => it.toolId === tool.id)
    );
  }, [orders, tool.id, user]);

  const totalReviewCount = reviewStats.approvedCount;
  const avgRating = reviewStats.averageRating;

  const heroFeatures = tool.features.slice(0, 4);

  const handleReviewFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReviewError(null);
    if (file.size > 5 * 1024 * 1024) {
      setReviewError('Screenshot must be 5MB or smaller.');
      return;
    }
    setUploadingShot(true);
    try {
      const dataBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Could not read selected image.'));
        reader.readAsDataURL(file);
      });
      const url = await onUploadReviewScreenshot(file.name, dataBase64);
      setDraftScreenshotUrl(url);
    } catch (err) {
      setReviewError(
        err instanceof Error ? err.message : 'Could not upload screenshot.'
      );
    } finally {
      setUploadingShot(false);
      e.target.value = '';
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewError(null);
    const cleaned = draftComment.trim();
    if (cleaned.length < 3) {
      setReviewError('Please write a short review message (at least 3 characters).');
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await onSubmitReview({
        toolId: tool.id,
        orderId: eligibleOrder?.id,
        rating: draftRating,
        comment: cleaned,
        screenshotUrl: draftScreenshotUrl || undefined,
      });
      if (!res.ok) {
        setReviewError(res.error || 'Could not submit your review.');
        return;
      }
      setDraftComment('');
      setDraftRating(5);
      setDraftScreenshotUrl('');
      setShowReviewForm(false);
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <article
      aria-labelledby="product-detail-heading"
      className="max-w-[780px] mx-auto pt-2 pb-24 space-y-3.5"
    >
      {/* 1. Breadcrumb Bar: Home > Category > Tool Name */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-[12.5px] sm:text-[13.5px] px-0.5 overflow-x-auto no-scrollbar"
      >
        <button
          type="button"
          onClick={onBackHome}
          className="inline-flex items-center gap-1.5 text-[#C7C0E6] hover:text-white transition-colors whitespace-nowrap shrink-0"
        >
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-3.5 h-3.5 text-[#C7C0E6]"
            aria-hidden="true"
          >
            <path d="M10.7 2.3a1 1 0 00-1.4 0l-7 6.8a1 1 0 00.7 1.7H4v6a1 1 0 001 1h3.5a.5.5 0 00.5-.5V13a1 1 0 011-1h0a1 1 0 011 1v4.3a.5.5 0 00.5.5H15a1 1 0 001-1v-6h1a1 1 0 00.7-1.7l-7-6.8z" />
          </svg>
          <span>Home</span>
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-[#7A739D] shrink-0" />
        <button
          type="button"
          onClick={() => onSelectCategory(tool.category)}
          className="text-[#C7C0E6] hover:text-white transition-colors whitespace-nowrap shrink-0"
        >
          {categoryLabel}
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-[#7A739D] shrink-0" />
        <span className="font-bold text-white truncate">{tool.name}</span>
      </nav>

      {/* 2. Hero Product Card (Exact Deep Violet Wave + Fixed Premium Subscription Badge) */}
      <section
        className="relative overflow-hidden rounded-[22px] border border-[#9B6BFF]/45 p-4 sm:p-5 shadow-[0_14px_40px_rgba(88,28,135,0.34)]"
        style={{
          background:
            'linear-gradient(125deg, #16112B 0%, #1E133D 46%, #311461 82%, #471680 100%)',
        }}
      >
        {/* Subtle luminous silk-wave ribbons matching the screenshot */}
        <svg
          viewBox="0 0 600 260"
          fill="none"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 w-full h-full opacity-75"
        >
          <defs>
            <linearGradient id="tb-wave-1" x1="250" y1="220" x2="600" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#7C3AED" stopOpacity="0" />
              <stop offset="48%" stopColor="#A855F7" stopOpacity="0.48" />
              <stop offset="80%" stopColor="#D946EF" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#6366F1" stopOpacity="0.18" />
            </linearGradient>
            <radialGradient id="tb-wave-glow" cx="84%" cy="55%" r="42%">
              <stop offset="0%" stopColor="#A855F7" stopOpacity="0.55" />
              <stop offset="55%" stopColor="#6D28D9" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#16112B" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="600" height="260" fill="url(#tb-wave-glow)" />
          <path
            d="M150 250C250 185 335 230 430 165C505 112 548 52 605 22L605 265L150 265Z"
            fill="url(#tb-wave-1)"
          />
          <path
            d="M210 258C310 170 400 225 495 160C545 126 576 92 608 72"
            stroke="#E879F9"
            strokeOpacity="0.35"
            strokeWidth="2.5"
          />
          <path
            d="M280 262C375 205 455 245 550 188C578 171 595 155 612 140"
            stroke="#818CF8"
            strokeOpacity="0.42"
            strokeWidth="2"
          />
        </svg>

        <div className="relative z-10 flex items-stretch justify-between gap-2.5 sm:gap-5">
          {/* Left Side: App Icon + Title + Gold Premium + Subtitle + 2x2 Checkmarks */}
          <div className="flex-1 min-w-0 flex flex-col justify-between gap-3.5">
            <div className="flex items-start gap-3 sm:gap-4">
              <BrandAppIcon
                brand={tool.brand}
                logoUrl={tool.logoUrl}
                size="lg"
                className="!w-[68px] !h-[68px] sm:!w-[84px] sm:!h-[84px] !rounded-[17px] shadow-[0_10px_28px_rgba(0,0,0,0.45)]"
              />
              <div className="min-w-0 flex-1">
                <h1
                  id="product-detail-heading"
                  className="font-display font-extrabold text-[20px] sm:text-[27px] leading-[1.12] tracking-tight text-white truncate"
                >
                  {tool.name}
                </h1>
                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 bg-gradient-to-r from-[#45310F]/95 to-[#2D200B]/95 border border-[#F59E0B]/45 text-[11.5px] sm:text-[12.5px] font-bold text-[#FDE047]">
                    <CrownMiniIcon className="w-3.5 h-3.5" />
                    <span>{tool.badgeText || 'Premium'}</span>
                  </span>
                  {outOfStock && (
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 bg-rose-500/25 border border-rose-400/55 text-[10px] font-extrabold uppercase text-rose-200">
                      Out of Stock
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-[12px] sm:text-[13.5px] text-[#E3DEF8] font-medium leading-snug line-clamp-2">
                  {tool.subtitle}
                </p>
              </div>
            </div>

            {/* 2x2 Feature Highlights Grid */}
            <div className="grid grid-cols-2 gap-x-2 sm:gap-x-4 gap-y-1.5 sm:gap-y-2 pt-0.5">
              {heroFeatures.map((feat) => (
                <div key={feat} title={feat} className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-[16px] h-[16px] sm:w-[18px] sm:h-[18px] rounded-full flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(168,85,247,0.55)]"
                    style={{
                      background:
                        'linear-gradient(135deg, #B56BFF 0%, #7C3AED 55%, #5B21B6 100%)',
                    }}
                  >
                    <Check className="w-2.5 h-2.5 text-white stroke-[3.5]" />
                  </span>
                  <span className="text-[11px] sm:text-[13px] font-medium text-[#F0ECFF] truncate">
                    {toShortHeroHighlight(feat)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side: Fixed "Premium Subscription" + "Official Access ✓" Neon Badge */}
          <div className="shrink-0 w-[124px] sm:w-[172px] flex flex-col items-center justify-center">
            <div className="-mb-3.5 relative z-20">
              <GoldCrownHeroIcon />
            </div>
            <div
              className="relative z-10 w-full rounded-[16px] px-2 sm:px-3 pt-4 pb-2.5 sm:pb-3 text-center border-[1.5px] border-[#E9D5FF]/85"
              style={{
                background:
                  'linear-gradient(150deg, rgba(192,38,211,0.44) 0%, rgba(109,40,217,0.62) 52%, rgba(79,70,229,0.55) 100%)',
                boxShadow:
                  '0 0 28px rgba(168,85,247,0.65), inset 0 1px 12px rgba(255,255,255,0.28)',
              }}
            >
              <span className="block font-display font-extrabold italic text-[16px] sm:text-[21px] leading-[1.08] tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]">
                Premium
              </span>
              <span className="block font-display font-extrabold italic text-[15px] sm:text-[19.5px] leading-[1.12] tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]">
                Subscription
              </span>
            </div>

            <div className="mt-2.5 inline-flex items-center gap-1 rounded-full px-2.5 sm:px-3.5 py-1 bg-[#0E0A22]/90 border border-[#93C5FD]/65 shadow-[0_4px_16px_rgba(79,70,229,0.48)]">
              <span className="text-[10.5px] sm:text-[12px] font-bold text-white whitespace-nowrap">
                Official Access
              </span>
              <Check className="w-3 h-3 text-white stroke-[3] shrink-0" />
            </div>
          </div>
        </div>
      </section>

      {/* 3. Stats Strip Card: Rating/Reviews | Sold | Available */}
      <section
        aria-label="Product statistics"
        className="rounded-[16px] bg-[#141025]/95 border border-[#7C5CC4]/35 px-2 sm:px-4 py-3 grid grid-cols-3 divide-x divide-white/12 items-center"
      >
        <button
          type="button"
          onClick={() => setActiveSection('reviews')}
          className="flex items-center justify-center gap-1 sm:gap-1.5 px-1 text-center hover:opacity-90 transition-opacity min-w-0"
        >
          <Star className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-[#FACC15] fill-[#FACC15] shrink-0" />
          <strong className="font-display font-extrabold text-[13px] sm:text-[15px] text-white tabular-nums shrink-0">
            {avgRating}
          </strong>
          <span className="text-[10.5px] sm:text-[13px] text-[#C8C2E4] truncate">
            ({totalReviewCount.toLocaleString()} Reviews)
          </span>
        </button>

        <div className="flex items-center justify-center gap-1.5 px-1 text-center min-w-0">
          <ShoppingCart className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-[#E6E2FA] shrink-0" />
          <strong className="font-display font-extrabold text-[13px] sm:text-[15px] text-white tabular-nums">
            {tool.sold.toLocaleString()}
          </strong>
          <span className="text-[11px] sm:text-[13px] text-[#C8C2E4]">Sold</span>
        </div>

        <div className="flex items-center justify-center gap-1.5 px-1 text-center min-w-0">
          <Box className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-[#E6E2FA] shrink-0" />
          <strong
            className={`font-display font-extrabold text-[13px] sm:text-[15px] tabular-nums ${
              outOfStock ? 'text-rose-400' : 'text-[#84CC16]'
            }`}
          >
            {tool.available}
          </strong>
          <span className="text-[11px] sm:text-[13px] text-[#C8C2E4] truncate">
            {outOfStock ? 'Out' : 'Available'}
          </span>
        </div>
      </section>

      {/* 4. Working 4-Section Pill Tabs: Product Details | Features | Reviews | FAQ */}
      <div
        role="tablist"
        aria-label="Product information sections"
        className="flex items-center justify-between sm:justify-start gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-0.5"
      >
        {(
          [
            { id: 'details', label: 'Product Details', Icon: FileText },
            { id: 'features', label: 'Features', Icon: Star },
            { id: 'reviews', label: 'Reviews', Icon: MessageCircleMore },
            { id: 'faq', label: 'FAQ', Icon: HelpCircle },
          ] as const
        ).map(({ id, label, Icon }) => {
          const isActive = activeSection === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveSection(id)}
              className={`h-9 sm:h-11 px-2 sm:px-4 rounded-full border text-[10.5px] sm:text-[13.5px] font-bold inline-flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap shrink-0 transition-all ${
                isActive
                  ? 'text-white border-[#D8B4FE]/75 shadow-[0_0_20px_rgba(147,51,234,0.58)]'
                  : 'bg-[#151128]/95 hover:bg-[#1E183A] border-white/14 text-[#DDD7F5]'
              }`}
              style={
                isActive
                  ? {
                      background:
                        'linear-gradient(135deg, #9E4BFF 0%, #7C3AED 55%, #5B21B6 100%)',
                    }
                  : undefined
              }
            >
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* 5. Active Tab Content Card */}
      <section className="rounded-[18px] bg-[#141025]/95 border border-[#7C5CC4]/35 p-4">
        {activeSection === 'details' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#A855F7]/30 border border-[#D8B4FE]/55 text-[#F3E8FF] font-display font-extrabold text-xs flex items-center justify-center shrink-0">
                  i
                </span>
                <h2 className="font-display font-bold text-[15px] sm:text-[16px] text-white">
                  About This Product
                </h2>
              </div>

              {activePlan && (
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                    activePlan.deliveryMode === 'manual'
                      ? 'text-amber-300'
                      : 'text-emerald-400'
                  }`}
                >
                  {activePlan.deliveryMode === 'manual' ? (
                    <>
                      <Clock className="w-3 h-3" />
                      <span>Manual Approval</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3 h-3" />
                      <span>Instant Delivery</span>
                    </>
                  )}
                </span>
              )}
            </div>
            <p className="text-[13px] sm:text-[14px] text-[#D7D2EE] leading-relaxed">
              {tool.description}
            </p>
            {activePlan?.description && (
              <p className="text-xs text-[#C4B5FD] bg-[#1C1636] border border-white/10 rounded-xl px-3 py-2">
                {activePlan.label}: {activePlan.description}
              </p>
            )}
          </div>
        )}

        {activeSection === 'features' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-[#FACC15] fill-[#FACC15] shrink-0" />
              <h2 className="font-display font-bold text-[15px] sm:text-[16px] text-white">
                Premium Features Included
              </h2>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {tool.features.map((feat) => (
                <li
                  key={feat}
                  className="flex items-start gap-2 rounded-xl bg-[#1A1530] border border-white/8 px-3 py-2.5 text-xs sm:text-[13px] text-[#E8E3FF]"
                >
                  <span
                    className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background:
                        'linear-gradient(135deg, #A855F7 0%, #6D28D9 100%)',
                    }}
                  >
                    <Check className="w-2.5 h-2.5 text-white stroke-[3.5]" />
                  </span>
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeSection === 'reviews' && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-[#FACC15] fill-[#FACC15]" />
                <h2 className="font-display font-bold text-[15px] sm:text-[16px] text-white">
                  Customer Reviews ({totalReviewCount.toLocaleString()})
                </h2>
              </div>
              {eligibleOrder ? (
                <button
                  type="button"
                  onClick={() => setShowReviewForm((prev) => !prev)}
                  className="px-3 py-1.5 rounded-full bg-[#7C3AED]/30 hover:bg-[#7C3AED]/50 border border-[#C084FC]/45 text-xs font-bold text-[#F3E8FF] transition-colors"
                >
                  {showReviewForm ? 'Cancel' : 'Write a Review'}
                </button>
              ) : (
                <span className="text-[11px] font-medium text-[#A9A2CA]">
                  Verified buyers can rate in My Orders
                </span>
              )}
            </div>

            {showReviewForm && eligibleOrder && (
              <form
                onSubmit={handleSubmitReview}
                className="rounded-xl bg-[#1A1530] border border-[#A855F7]/40 p-3 space-y-2.5"
              >
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-[#CFC9EB] mr-1">
                    Your Rating:
                  </span>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setDraftRating(n)}
                      aria-label={`Rate ${n} star${n === 1 ? '' : 's'}`}
                      className="p-0.5"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          n <= draftRating
                            ? 'text-[#FACC15] fill-[#FACC15]'
                            : 'text-white/25'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <textarea
                  rows={2}
                  required
                  value={draftComment}
                  onChange={(e) => setDraftComment(e.target.value)}
                  placeholder={`Share your experience with ${tool.name}...`}
                  className="w-full rounded-xl bg-[#0F0B1F] border border-white/12 p-2.5 text-xs text-white placeholder:text-[#8680A8] focus:outline-none focus:border-[#A855F7]"
                />
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <input
                      id="detail-review-shot-input"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={handleReviewFileChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="detail-review-shot-input"
                      className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-white/8 hover:bg-white/14 border border-white/12 text-[11px] font-bold text-[#E9D5FF] cursor-pointer"
                    >
                      {uploadingShot ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {uploadingShot
                          ? 'Uploading...'
                          : draftScreenshotUrl
                            ? 'Change Screenshot'
                            : 'Screenshot (Optional)'}
                      </span>
                    </label>
                    {sanitizeSafeMediaUrl(draftScreenshotUrl) && (
                      <div className="flex items-center gap-1">
                        <img
                          src={sanitizeSafeMediaUrl(draftScreenshotUrl)}
                          alt="Draft review screenshot"
                          className="w-8 h-8 rounded-md object-cover border border-white/20"
                        />
                        <button
                          type="button"
                          onClick={() => setDraftScreenshotUrl('')}
                          aria-label="Remove screenshot"
                          className="w-6 h-6 rounded-md bg-rose-500/20 text-rose-200 flex items-center justify-center"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={submittingReview || uploadingShot}
                    className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-[#7C3AED] hover:bg-[#8B5CF6] disabled:opacity-50 text-xs font-bold text-white"
                  >
                    {submittingReview ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>Submit Review</span>
                  </button>
                </div>
                {reviewError && (
                  <p role="alert" className="text-xs text-rose-300">
                    {reviewError}
                  </p>
                )}
              </form>
            )}

            {visibleReviews.length === 0 ? (
              <div className="rounded-xl bg-[#1A1530] border border-white/8 p-5 text-center space-y-1">
                <p className="text-xs font-bold text-white">No reviews yet</p>
                <p className="text-[11px] text-[#A8A1C7]">
                  Be the first verified buyer to review a product from My Orders after purchase!
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {displayedReviews.map((rev) => {
                  const safeShot = sanitizeSafeMediaUrl(rev.screenshotUrl);
                  const productLabel = toolNameMap.get(rev.toolId);
                  return (
                    <div
                      key={rev.id}
                      className={`rounded-xl bg-[#1A1530] border p-3 space-y-1.5 ${
                        rev.status === 'pending'
                          ? 'border-amber-400/45'
                          : 'border-white/8'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                          <span className="text-xs font-bold text-white truncate">
                            {rev.authorName}
                          </span>
                          {productLabel && (
                            <span className="rounded-full px-2 py-0.5 bg-[#7C3AED]/20 border border-[#C084FC]/30 text-[10px] font-semibold text-[#DDD6FE] truncate max-w-[150px]">
                              {productLabel}
                            </span>
                          )}
                          {rev.verified && (
                            <span className="text-[10px] font-semibold text-emerald-300">
                              Verified Buyer
                            </span>
                          )}
                          {rev.status === 'pending' && (
                            <span className="rounded-full px-2 py-0.5 bg-amber-500/20 border border-amber-400/40 text-[10px] font-bold text-amber-200">
                              Pending Approval · Only visible to you
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[#9A93BA] shrink-0">
                          {formatReviewDate(rev.reviewDate)}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < rev.rating
                                ? 'text-[#FACC15] fill-[#FACC15]'
                                : 'text-white/20'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-[#D5CFF0] leading-relaxed">
                        {rev.comment}
                      </p>
                      {safeShot && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => setPreviewShotUrl(safeShot)}
                            className="inline-flex items-center gap-2 rounded-xl bg-[#120E24] border border-white/12 p-1.5 pr-3 hover:border-[#C084FC]/50 transition-colors"
                          >
                            <img
                              src={safeShot}
                              alt={`Review screenshot by ${rev.authorName}`}
                              className="w-14 h-14 rounded-lg object-cover"
                            />
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#DDD6FE]">
                              <ImageIcon className="w-3.5 h-3.5 text-[#C084FC]" />
                              View Screenshot
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {reviewPagination.hasMore && (
                  <div className="pt-1.5 flex flex-col items-center gap-1.5">
                    <button
                      type="button"
                      data-testid="reviews-load-more-btn"
                      onClick={() =>
                        setVisibleReviewLimit((prev) => prev + REVIEWS_PAGE_SIZE)
                      }
                      className="w-full sm:w-auto min-w-[200px] h-10 px-5 rounded-full border border-[#C084FC]/55 text-xs sm:text-[13px] font-bold text-white inline-flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-[0_6px_20px_rgba(124,58,237,0.35)] hover:brightness-110"
                      style={{
                        background:
                          'linear-gradient(135deg, #9333EA 0%, #7C3AED 55%, #5B21B6 100%)',
                      }}
                    >
                      <span>{reviewPagination.buttonLabel}</span>
                      <span className="rounded-full px-2 py-0.5 bg-white/15 text-[10.5px] font-extrabold tabular-nums">
                        +{reviewPagination.nextBatchSize}
                      </span>
                    </button>
                    <span className="text-[11px] text-[#A29BC2] tabular-nums">
                      Showing {reviewPagination.shownCount} of {visibleReviews.length} latest reviews
                    </span>
                  </div>
                )}

                {!reviewPagination.hasMore && visibleReviews.length > REVIEWS_PAGE_SIZE && (
                  <p className="pt-1 text-center text-[11px] text-[#9E97BE] tabular-nums">
                    Showing all {visibleReviews.length} reviews
                  </p>
                )}
              </div>
            )}

            {previewShotUrl && (
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Review screenshot"
                onClick={() => setPreviewShotUrl(null)}
                className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="relative max-w-2xl w-full rounded-2xl bg-[#120E24] border border-white/20 p-2 shadow-2xl"
                >
                  <button
                    type="button"
                    onClick={() => setPreviewShotUrl(null)}
                    aria-label="Close screenshot"
                    className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/75 text-white flex items-center justify-center border border-white/20"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <img
                    src={previewShotUrl}
                    alt="Full-size review screenshot"
                    className="w-full max-h-[78vh] object-contain rounded-xl"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === 'faq' && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 mb-1">
              <HelpCircle className="w-5 h-5 text-[#C084FC] shrink-0" />
              <h2 className="font-display font-bold text-[15px] sm:text-[16px] text-white">
                Frequently Asked Questions
              </h2>
            </div>
            {faqs.map((item, idx) => {
              const isOpen = openFaqIdx === idx;
              return (
                <div
                  key={item.q}
                  className="rounded-xl bg-[#1A1530] border border-white/10 overflow-hidden"
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaqIdx(isOpen ? -1 : idx)}
                    className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-left text-xs sm:text-[13px] font-bold text-white hover:bg-white/5 transition-colors"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#C084FC] shrink-0 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <p className="px-3.5 pb-3 text-xs text-[#CEC9E8] leading-relaxed border-t border-white/6 pt-2">
                      {item.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 6. Choose Subscription Card (Exact Radio List + Badges + Gold Selected Price) */}
      <section className="rounded-[20px] bg-[#141025]/95 border border-[#7C5CC4]/35 p-3 sm:p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CrownMiniIcon className="w-5 h-5" />
            <h2 className="font-display font-bold text-[16px] sm:text-[17px] text-white">
              Choose Subscription
            </h2>
          </div>

          <button
            type="button"
            onClick={() => onToggleWishlist(tool.id)}
            aria-label={
              isWishlisted
                ? `Remove ${tool.name} from wishlist`
                : `Save ${tool.name} to wishlist`
            }
            aria-pressed={isWishlisted}
            className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${
              isWishlisted
                ? 'bg-[#EC4899]/20 border-[#F472B6]/60 text-[#F472B6]'
                : 'bg-white/5 border-white/12 text-[#CFC9E8] hover:text-white'
            }`}
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
          </button>
        </div>

        <div role="radiogroup" aria-label="Subscription plans" className="space-y-2.5">
          {tool.plans.map((plan, index) => {
            const selected = activePlan && plan.id === activePlan.id;
            const badge = getPlanBadge(plan, index, tool.plans.length);
            return (
              <button
                key={plan.id}
                type="button"
                role="radio"
                aria-checked={Boolean(selected)}
                onClick={() => setSelectedPlanId(plan.id)}
                className={`w-full text-left rounded-[15px] px-2.5 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3 transition-all ${
                  selected
                    ? 'border-[1.5px] border-[#E0A3FF] shadow-[0_0_24px_rgba(168,85,247,0.38)]'
                    : 'border border-white/12 bg-[#18142C]/85 hover:border-white/25'
                }`}
                style={
                  selected
                    ? {
                        background:
                          'linear-gradient(95deg, rgba(64,28,118,0.72) 0%, rgba(30,20,62,0.95) 54%, rgba(61,24,110,0.68) 100%)',
                      }
                    : undefined
                }
              >
                {/* Left: Radio + Calendar + Plan Label (+ inline mobile badge) & Subtext */}
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <span
                    className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      selected
                        ? 'bg-[#7C3AED] border-2 border-[#E9D5FF] shadow-[0_0_12px_rgba(168,85,247,0.85)]'
                        : 'border-[1.8px] border-white/45 bg-transparent'
                    }`}
                  >
                    {selected && (
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white" />
                    )}
                  </span>

                  <Calendar className="w-3.5 h-3.5 sm:w-[18px] sm:h-[18px] text-[#E9E4FF] shrink-0" />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-display font-bold text-[13px] sm:text-[15.5px] text-white leading-tight truncate">
                        {plan.label}
                      </span>
                      {badge && (
                        <span
                          className="sm:hidden inline-flex items-center rounded-full px-1.5 py-[2px] text-[9px] leading-none font-extrabold text-white whitespace-nowrap shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.28)]"
                          style={{ background: badge.bg }}
                        >
                          {badge.text}
                        </span>
                      )}
                    </div>
                    <div className="text-[10.5px] sm:text-[12px] text-[#B7B0D6] truncate mt-0.5 leading-snug">
                      {getPlanSubLabel(plan)}
                    </div>
                  </div>
                </div>

                {/* Middle Badge on Tablet / Desktop (sm+) */}
                {badge && (
                  <span
                    className="hidden sm:inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-extrabold text-white whitespace-nowrap shrink-0 shadow-[0_3px_12px_rgba(0,0,0,0.28)]"
                    style={{ background: badge.bg }}
                  >
                    {badge.text}
                  </span>
                )}

                {/* Right: Stacked cleanly on mobile, side-by-side on sm+ */}
                <div className="flex flex-col items-end justify-center sm:flex-row sm:items-baseline sm:gap-2 shrink-0 pl-1 text-right">
                  <span className="order-2 sm:order-1 text-[10px] sm:text-[12.5px] text-[#9F98BE] line-through tabular-nums whitespace-nowrap leading-tight mt-0.5 sm:mt-0">
                    {formatCurrency(plan.originalPrice, currency)}
                  </span>
                  <span
                    className={`order-1 sm:order-2 font-display font-extrabold text-[14.5px] sm:text-[19px] tabular-nums whitespace-nowrap leading-tight ${
                      selected ? 'text-[#FDE047]' : 'text-white'
                    }`}
                  >
                    {formatCurrency(plan.price, currency)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 7. 4-Column Trust Guarantee Bar (Exact Icons & Labels) */}
      <section
        aria-label="Purchase guarantees"
        className="rounded-[18px] bg-[#141025]/95 border border-[#7C5CC4]/35 px-1.5 sm:px-3 py-3.5 grid grid-cols-4 divide-x divide-white/12 text-center"
      >
        <div className="px-1 space-y-1.5">
          <InstantBoltTrustIcon />
          <div className="text-[11px] sm:text-[12.5px] leading-tight text-[#E3DEF8] font-medium">
            <span className="block">Instant</span>
            <span className="block">Activation</span>
          </div>
        </div>

        <div className="px-1 space-y-1.5">
          <SafeShieldTrustIcon />
          <div className="text-[11px] sm:text-[12.5px] leading-tight text-[#E3DEF8]">
            <strong className="block font-extrabold text-white">100%</strong>
            <span className="block font-medium">Safe &amp; Secure</span>
          </div>
        </div>

        <div className="px-1 space-y-1.5">
          <SupportHeadsetTrustIcon />
          <div className="text-[11px] sm:text-[12.5px] leading-tight text-[#E3DEF8]">
            <strong className="block font-extrabold text-white">24/7</strong>
            <span className="block font-medium">Support</span>
          </div>
        </div>

        <div className="px-1 space-y-1.5">
          <GuaranteeBadgeTrustIcon />
          <div className="text-[11px] sm:text-[12.5px] leading-tight text-[#E3DEF8] font-medium">
            <span className="block">Working</span>
            <span className="block">Guaranteed</span>
          </div>
        </div>
      </section>

      {/* 8. Pinned Bottom Total Price & Buy Now Bar (Compact Floating Capsule Dock) */}
      {activePlan && (
        <section
          aria-label="Order summary and purchase"
          className="fixed left-2.5 right-2.5 bottom-[max(0.55rem,env(safe-area-inset-bottom))] sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-[calc(100%-3rem)] sm:max-w-[780px] sm:bottom-3 z-40 rounded-[18px] border border-[#9B6BFF]/55 px-3.5 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2.5 backdrop-blur-xl shadow-[0_12px_34px_rgba(9,6,22,0.88),0_0_24px_rgba(124,58,237,0.34)]"
          style={{
            background:
              'linear-gradient(125deg, rgba(27,19,52,0.96) 0%, rgba(19,14,38,0.96) 50%, rgba(40,22,75,0.96) 100%)',
          }}
        >
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-semibold tracking-wide text-[#CFC6EE] leading-none">
              Total Price
            </div>
            <div className="mt-1 flex items-baseline gap-1.5 flex-wrap">
              <span
                data-testid="product-total-price"
                className="font-display font-extrabold text-[18px] sm:text-[22px] leading-none text-white tabular-nums whitespace-nowrap"
              >
                {formatCurrency(activePlan.price, currency)}
              </span>
              <span className="text-[11px] sm:text-[12.5px] text-[#A29BC2] line-through tabular-nums whitespace-nowrap">
                {formatCurrency(activePlan.originalPrice, currency)}
              </span>
              {activeDiscount > 0 && (
                <span className="rounded-full px-2 py-0.5 text-[9.5px] sm:text-[10.5px] font-extrabold text-white bg-gradient-to-r from-[#FB3768] to-[#E11D48] shadow-[0_2px_10px_rgba(244,63,94,0.45)] whitespace-nowrap leading-none">
                  {activeDiscount}% OFF
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            disabled={outOfStock}
            onClick={() => onAddToCart(tool, activePlan, true)}
            className="h-9 sm:h-10 px-4 sm:px-6 rounded-full font-display font-bold text-[13px] sm:text-[14px] text-white inline-flex items-center justify-center gap-1.5 shrink-0 transition-all active:scale-[0.97] disabled:opacity-45 disabled:cursor-not-allowed"
            style={{
              background: outOfStock
                ? 'linear-gradient(135deg, #4B2235 0%, #381828 100%)'
                : 'linear-gradient(135deg, #B56BFF 0%, #8B5CF6 48%, #6D28D9 100%)',
              border: outOfStock
                ? '1px solid rgba(251, 113, 133, 0.35)'
                : '1.5px solid rgba(233, 213, 255, 0.65)',
              boxShadow: outOfStock
                ? 'none'
                : '0 0 20px rgba(139, 92, 246, 0.62), inset 0 1px 5px rgba(255,255,255,0.35)',
            }}
          >
            <ShoppingCart className="w-4 h-4 stroke-[2.3]" />
            <span>{outOfStock ? 'Out of Stock' : 'Buy Now'}</span>
          </button>
        </section>
      )}
    </article>
  );
}
