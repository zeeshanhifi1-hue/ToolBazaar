export type CategoryId =
  | 'all'
  | 'ai'
  | 'video'
  | 'design'
  | 'productivity'
  | 'more';

export type NavTab = 'home' | 'categories' | 'orders' | 'profile';

export type CurrencyCode = 'USD' | 'PKR' | 'INR';

export type BrandKey =
  | 'chatgpt'
  | 'capcut'
  | 'canva'
  | 'adobe'
  | 'midjourney'
  | 'claude'
  | 'premiere'
  | 'figma'
  | 'notion'
  | 'grammarly'
  | 'perplexity'
  | 'envato';

export type DeliveryMode = 'automatic' | 'manual';

export type PaymentMethod = 'balance' | 'gateway';

export type PaymentStatus =
  | 'paid'
  | 'pending_verification'
  | 'approved'
  | 'rejected';

export interface PaymentGateway {
  id: string;
  name: string;
  accountTitle: string;
  accountNumber: string;
  currency: CurrencyCode;
  instructions: string;
  logoUrl?: string;
  qrCodeUrl?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface DeliveryField {
  label: string;
  value: string;
}

export interface PlanOption {
  id: string;
  label: string;
  months: number;
  price: number;
  originalPrice: number;
  description?: string;
  deliveryMode?: DeliveryMode;
}

export interface ProductAccountItem {
  id: string;
  toolId: string;
  planId: string;
  fileName: string;
  accountContent: string;
  accountFields?: DeliveryField[];
  status: 'available' | 'assigned';
  assignedOrderId?: string;
  createdAt: string;
  assignedAt?: string;
}

export interface ToolProduct {
  id: string;
  name: string;
  badgeText: string;
  subtitle: string;
  description: string;
  category: Exclude<CategoryId, 'all'>;
  brand: BrandKey;
  logoUrl?: string;
  originalPrice: number;
  price: number;
  discountPercent: number;
  available: number;
  sold: number;
  trending: boolean;
  deliveryType: string;
  features: string[];
  plans: PlanOption[];
  theme: {
    cardBg: string;
    cardBorder: string;
    glowColor: string;
  };
}

export interface CategoryItem {
  id: CategoryId;
  label: string;
  description: string;
}

export interface HeroBannerData {
  id: string;
  imageSrc: string;
  alt: string;
  targetCategory: CategoryId;
  borderGlow: string;
}

export interface CartItem {
  toolId: string;
  planId: string;
  planLabel: string;
  name: string;
  brand: BrandKey;
  unitPrice: number;
  unitOriginalPrice: number;
  quantity: number;
}

export interface OrderRecord {
  id: string;
  createdAt: string;
  status: 'Pending' | 'Processing' | 'Active' | 'Delivered' | 'Rejected';
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  promoCode?: string;
  customerEmail: string;
  accessKey: string;
  deliveryMode?: DeliveryMode;
  deliveryContent?: string;
  deliveryFilename?: string;
  deliveryFields?: DeliveryField[];
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  paymentGatewayId?: string;
  paymentGatewayName?: string;
  paymentCurrency?: CurrencyCode;
  paymentTrxId?: string;
  paymentProofUrl?: string;
  paymentNote?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  accent: 'purple' | 'green' | 'amber';
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  initials: string;
  walletCredits: number;
  createdAt: string;
}

export type StoreThemeId = 'classic' | 'neon-creator';

export interface NeonCreatorThemeConfig {
  heroBadge: string;
  heroTitle: string;
  heroTitleAccent: string;
  heroSubtitle: string;
  heroPrimaryCta: string;
  heroSecondaryCta: string;
  heroImageUrl: string;
  offerTitle: string;
  offerSubtitle: string;
  offerButtonText: string;
  couponDiscountPercent: number;
}

export interface SiteSettings {
  id: string;
  siteName: string;
  siteTagline: string;
  supportEmail: string;
  vipCouponCode: string;
  vipCouponText: string;
  activeTheme?: StoreThemeId;
  themeConfig?: NeonCreatorThemeConfig;
  updatedAt?: string;
}

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export type ReviewSource = 'user' | 'admin';

export interface ProductReview {
  id: string;
  toolId: string;
  orderId?: string;
  userId?: string;
  authorName: string;
  authorEmail?: string;
  rating: number;
  comment: string;
  screenshotUrl?: string;
  reviewDate: string;
  status: ReviewStatus;
  source: ReviewSource;
  verified: boolean;
  createdAt: string;
}

