import type {
  CartItem,
  OrderRecord,
  PaymentGateway,
  PaymentMethod,
  ToolProduct,
} from '../types/store';
import { sanitizeSafeMediaUrl } from './supabaseMappers.ts';

export interface RequestedCheckoutItem {
  toolId: string;
  planId: string;
  quantity: number;
}

export interface ResolvedCheckoutResult {
  ok: true;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  appliedPromo: string | null;
  hasManualPlan: boolean;
  qtyByToolId: Record<string, number>;
}

export interface CheckoutValidationError {
  ok: false;
  error: string;
}

const BUILTIN_PROMO_PERCENTS: Record<string, number> = {
  SAVE10: 10,
  TOOLS15: 15,
  BAZAAR20: 20,
};

export function resolvePromoPercent(
  rawPromoCode: unknown,
  vipCouponCode?: string,
  vipCouponPercent = 20
): { code: string | null; percent: number } {
  const normalized =
    typeof rawPromoCode === 'string' ? rawPromoCode.trim().toUpperCase() : '';
  if (!normalized) return { code: null, percent: 0 };

  const normalizedVip = (vipCouponCode || '').trim().toUpperCase();
  const safeVipPercent = Number.isFinite(vipCouponPercent)
    ? Math.min(90, Math.max(1, Math.round(vipCouponPercent)))
    : 20;

  if (normalizedVip && normalized === normalizedVip) {
    return { code: normalized, percent: safeVipPercent };
  }

  const builtin = BUILTIN_PROMO_PERCENTS[normalized];
  if (typeof builtin === 'number') {
    return { code: normalized, percent: builtin };
  }

  return { code: null, percent: 0 };
}

export function resolveCheckoutItemsAndTotals(params: {
  requestedItems: unknown;
  catalogTools: ToolProduct[];
  promoCode?: unknown;
  vipCouponCode?: string;
  vipCouponPercent?: number;
}): ResolvedCheckoutResult | CheckoutValidationError {
  const {
    requestedItems,
    catalogTools,
    promoCode,
    vipCouponCode,
    vipCouponPercent,
  } = params;

  if (!Array.isArray(requestedItems) || requestedItems.length === 0) {
    return { ok: false, error: 'Your cart is empty.' };
  }
  if (requestedItems.length > 30) {
    return { ok: false, error: 'Too many line items in a single order.' };
  }

  const toolMap = new Map<string, ToolProduct>();
  for (const t of catalogTools) {
    if (!toolMap.has(t.id)) {
      toolMap.set(t.id, t);
    }
  }

  const resolvedItems: CartItem[] = [];
  const qtyByToolId: Record<string, number> = {};
  let subtotal = 0;
  let hasManualPlan = false;

  for (const rawItem of requestedItems) {
    const obj = (rawItem && typeof rawItem === 'object' ? rawItem : {}) as Record<
      string,
      unknown
    >;
    const toolId = String(obj.toolId ?? obj.tool_id ?? '').trim();
    const requestedPlanId = String(obj.planId ?? obj.plan_id ?? '').trim();
    const qtyNum = Number(obj.quantity);
    const quantity = Number.isFinite(qtyNum) ? Math.floor(qtyNum) : 0;

    if (!toolId) {
      return { ok: false, error: 'Invalid product item in cart.' };
    }
    if (quantity < 1 || quantity > 50) {
      return { ok: false, error: 'Item quantity must be between 1 and 50.' };
    }

    const tool = toolMap.get(toolId);
    if (!tool) {
      return {
        ok: false,
        error: `Product "${toolId}" is no longer available in the store.`,
      };
    }

    const nextToolQty = (qtyByToolId[toolId] ?? 0) + quantity;
    if (tool.available < nextToolQty) {
      return {
        ok: false,
        error: `${tool.name} is out of stock (only ${tool.available} available).`,
      };
    }
    qtyByToolId[toolId] = nextToolQty;

    const matchedPlan =
      tool.plans.find((p) => p.id === requestedPlanId) || tool.plans[0];

    const planId = matchedPlan?.id || requestedPlanId || '1m';
    const planLabel = matchedPlan?.label || '1 Month';
    const unitPrice = Math.max(0, Math.round(matchedPlan?.price ?? tool.price));
    const unitOriginalPrice = Math.max(
      unitPrice,
      Math.round(matchedPlan?.originalPrice ?? tool.originalPrice)
    );
    if (matchedPlan?.deliveryMode === 'manual') {
      hasManualPlan = true;
    }

    subtotal += unitPrice * quantity;
    resolvedItems.push({
      toolId: tool.id,
      planId,
      planLabel,
      name: tool.name,
      brand: tool.brand,
      unitPrice,
      unitOriginalPrice,
      quantity,
    });
  }

  const promo = resolvePromoPercent(promoCode, vipCouponCode, vipCouponPercent);
  const discount =
    promo.percent > 0 && subtotal > 0
      ? Math.round((subtotal * promo.percent) / 100)
      : 0;
  const total = Math.max(0, subtotal - discount);

  return {
    ok: true,
    items: resolvedItems,
    subtotal,
    discount,
    total,
    appliedPromo: promo.code,
    hasManualPlan,
    qtyByToolId,
  };
}

export type PaymentValidationResult =
  | {
      ok: true;
      paymentMethod: PaymentMethod;
      gateway: PaymentGateway | null;
      paymentTrxId?: string;
      paymentProofUrl?: string;
    }
  | CheckoutValidationError;

export function validateServerOrderPayment(params: {
  paymentMethod: unknown;
  walletCredits: number;
  total: number;
  paymentGatewayId?: unknown;
  activeGateways: PaymentGateway[];
  paymentTrxId?: unknown;
  paymentProofUrl?: unknown;
}): PaymentValidationResult {
  const rawMethod =
    typeof params.paymentMethod === 'string'
      ? params.paymentMethod.trim().toLowerCase()
      : 'balance';
  const paymentMethod: PaymentMethod = rawMethod === 'gateway' ? 'gateway' : 'balance';

  if (paymentMethod === 'balance') {
    const safeCredits = Number.isFinite(params.walletCredits)
      ? Math.max(0, Math.floor(params.walletCredits))
      : 0;
    if (safeCredits < params.total) {
      return {
        ok: false,
        error:
          'Insufficient My Balance credits. Please top up your credits or choose a Payment Gateway.',
      };
    }
    return {
      ok: true,
      paymentMethod: 'balance',
      gateway: null,
    };
  }

  const gatewayId =
    typeof params.paymentGatewayId === 'string' ? params.paymentGatewayId.trim() : '';
  const gateway =
    params.activeGateways.find((g) => g.id === gatewayId && g.isActive) || null;
  if (!gateway) {
    return {
      ok: false,
      error: 'Selected payment gateway is unavailable. Please choose an active gateway.',
    };
  }

  const trxId =
    typeof params.paymentTrxId === 'string'
      ? params.paymentTrxId.trim().slice(0, 120)
      : '';
  const rawProof =
    typeof params.paymentProofUrl === 'string' ? params.paymentProofUrl.trim() : '';
  const sanitizedProof = rawProof ? sanitizeSafeMediaUrl(rawProof) : undefined;
  if (rawProof && !sanitizedProof) {
    return {
      ok: false,
      error: 'Payment proof URL must start with https:// or /',
    };
  }

  if (trxId.length < 3 && !sanitizedProof) {
    return {
      ok: false,
      error:
        'Please enter your Transaction ID (TRX ID) or upload a payment screenshot.',
    };
  }

  return {
    ok: true,
    paymentMethod: 'gateway',
    gateway,
    paymentTrxId: trxId || undefined,
    paymentProofUrl: sanitizedProof,
  };
}

export function determineInitialOrderOutcome(params: {
  paymentMethod: PaymentMethod;
  hasManualPlan: boolean;
  autoAssignedFromPool: boolean;
}): {
  status: OrderRecord['status'];
  paymentStatus: NonNullable<OrderRecord['paymentStatus']>;
  deliveryMode: 'automatic' | 'manual';
} {
  if (params.paymentMethod === 'gateway') {
    return {
      status: 'Pending',
      paymentStatus: 'pending_verification',
      deliveryMode: params.hasManualPlan ? 'manual' : 'automatic',
    };
  }

  if (params.hasManualPlan) {
    return {
      status: 'Pending',
      paymentStatus: 'paid',
      deliveryMode: 'manual',
    };
  }

  return {
    status: 'Delivered',
    paymentStatus: 'paid',
    deliveryMode: params.autoAssignedFromPool ? 'automatic' : 'automatic',
  };
}

export function buildOrderCode(nowMs: number, randomHex: string): string {
  const d = new Date(nowMs);
  const y = d.getUTCFullYear().toString().slice(-2);
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const suffix = randomHex.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6) || '1048AB';
  return `ORD-${y}${m}${day}-${suffix}`;
}

export function buildAccessKeyFromHex(randomHex: string): string {
  const clean = (
    randomHex.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() + 'ABCDEFGHJKLM23456789'
  ).slice(0, 12);
  return `TB-${clean.slice(0, 4)}-${clean.slice(4, 8)}-${clean.slice(8, 12)}`;
}
