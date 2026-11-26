import type {
  CartItem,
  CategoryId,
  CurrencyCode,
  OrderRecord,
  ToolProduct,
} from '../types/store';

export const DEFAULT_CURRENCY: CurrencyCode = 'USD';

export interface CurrencyOption {
  code: CurrencyCode;
  name: string;
  shortName: string;
  symbol: string;
  /** Exchange multiplier from base stored INR amounts (1 USD = 85 INR, 1 USD = 278 PKR) */
  rateFromINR: number;
  decimals: number;
  locale: string;
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  {
    code: 'USD',
    name: 'US Dollar',
    shortName: 'Dollar',
    symbol: '$',
    rateFromINR: 1 / 85,
    decimals: 2,
    locale: 'en-US',
  },
  {
    code: 'PKR',
    name: 'Pakistani Rupee',
    shortName: 'Pakistani',
    symbol: 'Rs ',
    rateFromINR: 278 / 85,
    decimals: 0,
    locale: 'en-PK',
  },
  {
    code: 'INR',
    name: 'Indian Rupee',
    shortName: 'Indian',
    symbol: '₹',
    rateFromINR: 1,
    decimals: 0,
    locale: 'en-IN',
  },
];

export const CURRENCY_MAP: Record<CurrencyCode, CurrencyOption> = {
  USD: CURRENCY_OPTIONS[0],
  PKR: CURRENCY_OPTIONS[1],
  INR: CURRENCY_OPTIONS[2],
};

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return value === 'USD' || value === 'PKR' || value === 'INR';
}

export function convertFromINR(amountInINR: number, currency: CurrencyCode): number {
  const safe = Math.max(0, Number.isFinite(amountInINR) ? amountInINR : 0);
  const config = CURRENCY_MAP[currency] ?? CURRENCY_MAP[DEFAULT_CURRENCY];
  const converted = safe * config.rateFromINR;
  if (config.decimals === 0) {
    return Math.round(converted);
  }
  const factor = 10 ** config.decimals;
  return Math.round(converted * factor) / factor;
}

export function formatCurrency(
  amountInINR: number,
  currency: CurrencyCode = DEFAULT_CURRENCY
): string {
  const config = CURRENCY_MAP[currency] ?? CURRENCY_MAP[DEFAULT_CURRENCY];
  const converted = convertFromINR(amountInINR, config.code);
  const formatted = converted.toLocaleString(config.locale, {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  });
  return `${config.symbol}${formatted}`;
}

export const PROMO_CODES: Record<string, { percent: number; label: string }> = {
  SAVE10: { percent: 10, label: '10% Instant Discount' },
  BAZAAR20: { percent: 20, label: '20% VIP Discount' },
  TOOLS15: { percent: 15, label: '15% Bundle Saver' },
};

export function formatINR(amount: number): string {
  return formatCurrency(amount, 'INR');
}

export function calculateDiscountPercent(originalPrice: number, price: number): number {
  if (originalPrice <= 0 || price >= originalPrice) return 0;
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

export function filterTools(
  tools: ToolProduct[],
  category: CategoryId,
  query: string
): ToolProduct[] {
  const normalizedQuery = query.trim().toLowerCase();

  return tools.filter((tool) => {
    const matchesCategory = category === 'all' ? true : tool.category === category;
    if (!matchesCategory) return false;

    if (!normalizedQuery) return true;
    const haystack = [
      tool.name,
      tool.subtitle,
      tool.description,
      tool.category,
      ...tool.features,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}

export interface CartTotals {
  itemCount: number;
  subtotal: number;
  originalSubtotal: number;
  promoDiscount: number;
  totalSavings: number;
  grandTotal: number;
  appliedPromo: string | null;
}

export function applyCouponDiscountPrice(price: number, discountPercent: number): number {
  const safePrice = Math.max(0, Math.round(Number(price) || 0));
  const safePct = Math.min(90, Math.max(0, Math.round(Number(discountPercent) || 0)));
  if (safePct <= 0 || safePrice <= 0) return safePrice;
  return Math.max(0, safePrice - Math.round((safePrice * safePct) / 100));
}

export function calculateCartTotals(
  items: CartItem[],
  promoCode?: string,
  vipCouponCode?: string,
  vipCouponPercent = 20
): CartTotals {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const originalSubtotal = items.reduce(
    (sum, item) => sum + item.unitOriginalPrice * item.quantity,
    0
  );

  const normalizedPromo = (promoCode ?? '').trim().toUpperCase();
  const normalizedVip = (vipCouponCode ?? '').trim().toUpperCase();
  const safeVipPercent = Math.min(90, Math.max(1, Math.round(Number(vipCouponPercent) || 20)));

  let appliedPercent = 0;
  let isValidPromo = false;

  if (normalizedPromo) {
    if (normalizedVip && normalizedPromo === normalizedVip) {
      appliedPercent = safeVipPercent;
      isValidPromo = true;
    } else if (PROMO_CODES[normalizedPromo]) {
      appliedPercent = PROMO_CODES[normalizedPromo].percent;
      isValidPromo = true;
    }
  }

  const promoDiscount =
    isValidPromo && subtotal > 0 ? Math.round((subtotal * appliedPercent) / 100) : 0;

  const grandTotal = Math.max(0, subtotal - promoDiscount);
  const totalSavings = Math.max(0, originalSubtotal - grandTotal);

  return {
    itemCount,
    subtotal,
    originalSubtotal,
    promoDiscount,
    totalSavings,
    grandTotal,
    appliedPromo: isValidPromo ? normalizedPromo : null,
  };
}

export function addOrIncrementCartItem(
  cart: CartItem[],
  incoming: Omit<CartItem, 'quantity'>,
  maxAvailable: number
): CartItem[] {
  if (maxAvailable <= 0) return cart;
  const idx = cart.findIndex(
    (c) => c.toolId === incoming.toolId && c.planId === incoming.planId
  );
  if (idx === -1) {
    return [...cart, { ...incoming, quantity: 1 }];
  }
  const existing = cart[idx];
  const nextQty = Math.min(existing.quantity + 1, maxAvailable);
  return cart.map((item, i) => (i === idx ? { ...item, quantity: nextQty } : item));
}

export function updateCartItemQuantity(
  cart: CartItem[],
  toolId: string,
  planId: string,
  delta: number,
  maxAvailable: number
): CartItem[] {
  return cart
    .map((item) => {
      if (item.toolId !== toolId || item.planId !== planId) return item;
      const next = item.quantity + delta;
      if (next <= 0) return null;
      return { ...item, quantity: Math.min(next, Math.max(1, maxAvailable)) };
    })
    .filter((item): item is CartItem => item !== null);
}

export function generateAccessKey(seed: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let value = Math.abs(seed) || 104729;
  const segments: string[] = [];
  for (let s = 0; s < 3; s++) {
    let seg = '';
    for (let i = 0; i < 4; i++) {
      value = (value * 1664525 + 1013904223) % 4294967296;
      seg += chars[value % chars.length];
    }
    segments.push(seg);
  }
  return `TB-${segments.join('-')}`;
}

export function createOrderFromCart(
  cart: CartItem[],
  totals: CartTotals,
  customerEmail: string,
  orderCount: number,
  nowIso: string
): OrderRecord {
  const orderNumber = 1048 + orderCount;
  return {
    id: `ORD-${orderNumber}`,
    createdAt: nowIso,
    status: 'Delivered',
    items: cart.map((c) => ({ ...c })),
    subtotal: totals.subtotal,
    discount: totals.promoDiscount,
    total: totals.grandTotal,
    promoCode: totals.appliedPromo ?? undefined,
    customerEmail: customerEmail.trim(),
    accessKey: generateAccessKey(orderNumber * 7919 + totals.grandTotal),
  };
}

export function applyOrderToInventory(
  tools: ToolProduct[],
  items: CartItem[]
): ToolProduct[] {
  const qtyByTool = new Map<string, number>();
  for (const item of items) {
    qtyByTool.set(item.toolId, (qtyByTool.get(item.toolId) ?? 0) + item.quantity);
  }
  return tools.map((tool) => {
    const bought = qtyByTool.get(tool.id) ?? 0;
    if (bought === 0) return tool;
    return {
      ...tool,
      available: Math.max(0, tool.available - bought),
      sold: tool.sold + bought,
    };
  });
}
