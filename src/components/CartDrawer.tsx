import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Headphones,
  Layers,
  Loader2,
  Lock,
  Minus,
  Plus,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Trash2,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import type {
  CartItem,
  CurrencyCode,
  PaymentGateway,
  PaymentMethod,
  ToolProduct,
  UserProfile,
} from '../types/store';
import {
  calculateCartTotals,
  formatCurrency,
  PROMO_CODES,
} from '../utils/storeLogic';
import { sanitizeSafeMediaUrl } from '../utils/supabaseMappers';
import { validateCheckoutPaymentSelection } from '../utils/mediaValidation';
import {
  uploadPaymentProofApi,
  type PlaceOrderPaymentInput,
} from '../services/toolbazaarApi';
import { BrandAppIcon } from './BrandIcons';
import { GoogleSignInButton } from './GoogleSignInButton';
import { PaymentGatewayLogo, Wallet3DBadge } from './PaymentGatewayLogo';

function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Could not read screenshot file.'));
    };
    reader.onerror = () => reject(new Error('Failed to read screenshot file.'));
    reader.readAsDataURL(file);
  });
}

interface CartDrawerProps {
  open: boolean;
  cart: CartItem[];
  tools: ToolProduct[];
  paymentGateways: PaymentGateway[];
  currency: CurrencyCode;
  user: UserProfile | null;
  authLoading: boolean;
  authError: string | null;
  vipCouponCode?: string;
  vipCouponPercent?: number;
  activeStoreCoupon?: string | null;
  onContinueWithGoogle: () => void;
  onClose: () => void;
  onUpdateQty: (toolId: string, planId: string, delta: number) => void;
  onRemoveItem: (toolId: string, planId: string) => void;
  onPlaceOrder: (
    email: string,
    promoCode: string | undefined,
    payment: PlaceOrderPaymentInput
  ) => Promise<{ ok: boolean; error?: string }>;
}

export function CartDrawer({
  open,
  cart,
  tools,
  paymentGateways,
  currency,
  user,
  authLoading,
  authError,
  vipCouponCode = 'BAZAAR20',
  vipCouponPercent = 20,
  activeStoreCoupon,
  onContinueWithGoogle,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onPlaceOrder,
}: CartDrawerProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [promoInput, setPromoInput] = useState('');
  const [appliedCode, setAppliedCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');
  const [emailError, setEmailError] = useState('');

  // Step 2: Payment method state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('gateway');
  const [selectedGatewayId, setSelectedGatewayId] = useState<string>('');
  const [trxId, setTrxId] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);

  const activeGateways = useMemo(
    () => paymentGateways.filter((g) => g.isActive),
    [paymentGateways]
  );

  const normalizedVipCode = (vipCouponCode || 'BAZAAR20').trim().toUpperCase();
  const totals = calculateCartTotals(
    cart,
    appliedCode,
    normalizedVipCode,
    vipCouponPercent
  );
  const canPayWithBalance = Boolean(user && user.walletCredits >= totals.grandTotal);

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
      setEmailError('');
    }
  }, [user?.email]);

  // Sync globally applied store coupon into CartDrawer automatically
  useEffect(() => {
    if (activeStoreCoupon && activeStoreCoupon.trim()) {
      const normalized = activeStoreCoupon.trim().toUpperCase();
      setAppliedCode(normalized);
      setPromoInput(normalized);
      setPromoError('');
    }
  }, [activeStoreCoupon, open]);

  useEffect(() => {
    if (!open || cart.length === 0) {
      setStep(1);
      setPaymentError('');
      setSubmitting(false);
    }
  }, [open, cart.length]);

  useEffect(() => {
    if (activeGateways.length > 0 && !selectedGatewayId) {
      setSelectedGatewayId(activeGateways[0].id);
    }
  }, [activeGateways, selectedGatewayId]);

  if (!open) return null;

  const selectedGateway =
    activeGateways.find((g) => g.id === selectedGatewayId) || activeGateways[0] || null;

  const quickPromoCodes = Array.from(
    new Set(['SAVE10', normalizedVipCode].filter(Boolean))
  );

  const handleApplyPromo = (codeOverride?: string) => {
    const candidate = (codeOverride ?? promoInput).trim().toUpperCase();
    if (!candidate) {
      setAppliedCode('');
      setPromoError('');
      return;
    }
    const isValid =
      Boolean(PROMO_CODES[candidate]) ||
      (Boolean(normalizedVipCode) && candidate === normalizedVipCode);
    if (!isValid) {
      setPromoError(`Invalid promo code. Try SAVE10 or ${normalizedVipCode}.`);
      return;
    }
    setPromoInput(candidate);
    setAppliedCode(candidate);
    setPromoError('');
  };

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      const trimmed = email.trim();
      if (!trimmed || !trimmed.includes('@') || !trimmed.includes('.')) {
        setEmailError('Enter a valid email for instant license delivery.');
        return;
      }
    }
    setEmailError('');
    setPaymentError('');
    if (canPayWithBalance) {
      setPaymentMethod('balance');
    } else {
      setPaymentMethod('gateway');
      if (activeGateways.length > 0 && !selectedGatewayId) {
        setSelectedGatewayId(activeGateways[0].id);
      }
    }
    setStep(2);
  };

  const handleCopyAccountNumber = async (accountNum: string) => {
    try {
      await navigator.clipboard.writeText(accountNum);
    } catch {
      // ignore clipboard fallback
    }
    setCopiedAccount(true);
    window.setTimeout(() => setCopiedAccount(false), 1800);
  };

  const handleUploadProofFile = async (file: File | undefined) => {
    if (!file) return;
    if (!user) {
      setPaymentError('Please sign in with Google first to upload your payment screenshot.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPaymentError('Payment screenshot must be 5 MB or smaller (PNG, JPG, WebP, GIF).');
      return;
    }
    setPaymentError('');
    setUploadingProof(true);
    try {
      const dataBase64 = await readImageAsDataUrl(file);
      const url = await uploadPaymentProofApi(file.name, dataBase64);
      setProofUrl(url);
    } catch (err) {
      setPaymentError(
        err instanceof Error ? err.message : 'Could not upload payment screenshot.'
      );
    } finally {
      setUploadingProof(false);
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onContinueWithGoogle();
      return;
    }

    const validation = validateCheckoutPaymentSelection({
      method: paymentMethod,
      walletCredits: user.walletCredits,
      grandTotal: totals.grandTotal,
      gatewayId: selectedGateway?.id,
      trxId,
      proofUrl,
    });
    if (!validation.ok) {
      setPaymentError(validation.error || 'Please complete your payment details.');
      return;
    }

    setPaymentError('');
    setSubmitting(true);
    try {
      const result = await onPlaceOrder(
        (email || user.email).trim(),
        totals.appliedPromo ?? undefined,
        paymentMethod === 'balance'
          ? { paymentMethod: 'balance' }
          : {
              paymentMethod: 'gateway',
              paymentGatewayId: selectedGateway?.id,
              paymentTrxId: trxId.trim(),
              paymentProofUrl: proofUrl.trim() || undefined,
            }
      );

      if (!result.ok) {
        setPaymentError(result.error || 'Could not place order. Please try again.');
        return;
      }

      setAppliedCode('');
      setPromoInput('');
      setTrxId('');
      setProofUrl('');
      setStep(1);
    } finally {
      setSubmitting(false);
    }
  };

  const safeQrUrl = sanitizeSafeMediaUrl(selectedGateway?.qrCodeUrl);
  const safeProofPreview = sanitizeSafeMediaUrl(proofUrl);

  const payButtonLabel =
    paymentMethod === 'balance'
      ? `Pay with My Balance · ${formatCurrency(totals.grandTotal, currency)}`
      : selectedGateway
        ? `Pay with ${selectedGateway.name} · ${formatCurrency(
            totals.grandTotal,
            selectedGateway.currency
          )}`
        : `Complete Payment · ${formatCurrency(totals.grandTotal, currency)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:justify-center bg-black/80 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-[500px] max-h-[93vh] flex flex-col rounded-t-[28px] sm:rounded-[28px] border border-[#A855F7]/30 bg-[#0D091D] text-white shadow-[0_24px_80px_rgba(0,0,0,0.75)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle top cosmic aura */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[340px] h-40 rounded-full opacity-45 blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(168,85,247,0.65) 0%, rgba(124,58,237,0.18) 55%, transparent 100%)',
          }}
        />

        {/* Header */}
        <div className="relative px-5 py-4 border-b border-white/10 flex items-center justify-between bg-[#130D28]/90 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            {step === 2 ? (
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setPaymentError('');
                }}
                aria-label="Back to cart"
                className="w-10 h-10 rounded-2xl bg-[#1F173B] hover:bg-[#2B2050] border border-white/15 flex items-center justify-center text-white transition-colors shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-[#7C3AED]/30 border border-[#C084FC]/40 flex items-center justify-center text-[#E9D5FF] shrink-0">
                <ShoppingBag className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0">
              <h2
                id="cart-drawer-title"
                className="font-display font-extrabold text-lg sm:text-xl leading-tight tracking-tight text-white truncate"
              >
                {step === 1 ? 'Your Cart' : 'Payment Method'}
              </h2>
              <p className="text-xs text-[#A8A1C8] truncate">
                {totals.itemCount === 0
                  ? 'No tools added yet'
                  : step === 1
                    ? `Step 1 of 2 · ${totals.itemCount} ${totals.itemCount === 1 ? 'item' : 'items'}`
                    : `Choose a payment method · Total ${formatCurrency(totals.grandTotal, currency)}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close shopping cart"
            className="w-10 h-10 rounded-2xl bg-[#1F173B]/90 hover:bg-[#2B2050] border border-white/12 flex items-center justify-center text-white/80 hover:text-white transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="relative flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {cart.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#1B1435] border border-white/10 flex items-center justify-center text-[#A78BFA]">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h3 className="font-display font-bold text-lg text-white">
                Your cart is empty
              </h3>
              <p className="text-sm text-[#A59EC4] max-w-xs mx-auto">
                Add any trending AI, video, or design tool to unlock instant official activation.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 px-5 py-2.5 rounded-full bg-white text-[#120D24] font-bold text-sm hover:bg-[#EFEAFF] transition-colors"
              >
                Browse Tools
              </button>
            </div>
          ) : step === 1 ? (
            /* ==================== STEP 1: CART REVIEW ==================== */
            <>
              <div className="space-y-3">
                {cart.map((item) => {
                  const tool = tools.find((t) => t.id === item.toolId);
                  const stock = tool?.available ?? 99;
                  return (
                    <div
                      key={`${item.toolId}-${item.planId}`}
                      className="rounded-2xl bg-[#17112E] border border-white/10 p-3.5 flex items-center gap-3"
                    >
                      <BrandAppIcon
                        brand={item.brand}
                        logoUrl={tool?.logoUrl}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-display font-bold text-sm text-white truncate">
                            {item.name}
                          </h3>
                          <button
                            type="button"
                            onClick={() => onRemoveItem(item.toolId, item.planId)}
                            aria-label={`Remove ${item.name} from cart`}
                            className="p-1.5 rounded-lg text-[#9D97BC] hover:text-[#FF6B7B] hover:bg-white/5 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[11px] text-[#A9A2C8]">
                          {item.planLabel} Plan
                        </p>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span className="font-display font-extrabold text-base text-white tabular-nums whitespace-nowrap">
                              {formatCurrency(item.unitPrice * item.quantity, currency)}
                            </span>
                            <span className="text-[11px] text-[#8A84A8] line-through tabular-nums whitespace-nowrap">
                              {formatCurrency(
                                item.unitOriginalPrice * item.quantity,
                                currency
                              )}
                            </span>
                          </div>

                          <div className="inline-flex items-center gap-1 rounded-xl bg-[#0F0B1F] border border-white/10 p-0.5">
                            <button
                              type="button"
                              onClick={() => onUpdateQty(item.toolId, item.planId, -1)}
                              aria-label={`Decrease quantity for ${item.name}`}
                              className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span
                              data-testid={`qty-${item.toolId}`}
                              className="w-6 text-center text-xs font-bold tabular-nums"
                            >
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              disabled={item.quantity >= stock}
                              onClick={() => onUpdateQty(item.toolId, item.planId, 1)}
                              aria-label={`Increase quantity for ${item.name}`}
                              className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white disabled:opacity-35"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Promo Code Box */}
              <div className="rounded-2xl bg-[#16112C] border border-white/10 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="promo-code-input"
                    className="text-xs font-semibold text-[#CFC9EB] flex items-center gap-1.5"
                  >
                    <Tag className="w-3.5 h-3.5 text-[#C084FC]" />
                    Promo Code
                  </label>
                  <div className="flex items-center gap-1.5">
                    {quickPromoCodes.map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => handleApplyPromo(code)}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#7C3AED]/25 hover:bg-[#7C3AED]/45 border border-[#C084FC]/40 text-[#E9D5FF] transition-colors"
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    id="promo-code-input"
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    placeholder={`Enter SAVE10 or ${normalizedVipCode}`}
                    className="flex-1 h-10 rounded-xl bg-[#0C081A] border border-white/12 px-3 text-xs text-white placeholder:text-[#787296] focus:outline-none focus:border-[#A855F7]"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyPromo()}
                    className="px-4 h-10 rounded-xl bg-[#7C3AED] hover:bg-[#8B5CF6] text-xs font-bold text-white transition-colors"
                  >
                    Apply
                  </button>
                </div>
                {promoError && (
                  <p className="text-[11px] text-[#FF6B7B]">{promoError}</p>
                )}
                {totals.appliedPromo && (
                  <p className="text-[11px] text-[#4ADE80] flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Code {totals.appliedPromo} applied — saved{' '}
                    {formatCurrency(totals.promoDiscount, currency)}!
                  </p>
                )}
              </div>

              {/* Delivery Email + Price Summary */}
              <form
                id="checkout-step1-form"
                onSubmit={handleProceedToPayment}
                className="space-y-4"
              >
                {user && (
                  <div>
                    <label
                      htmlFor="delivery-email"
                      className="block text-xs font-semibold text-[#CFC9EB] mb-1.5"
                    >
                      Delivery Email
                    </label>
                    <input
                      id="delivery-email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailError) setEmailError('');
                      }}
                      placeholder="you@example.com"
                      className="w-full h-11 rounded-xl bg-[#0C081A] border border-white/12 px-3.5 text-sm text-white placeholder:text-[#787296] focus:outline-none focus:border-[#A855F7]"
                    />
                    {emailError && (
                      <p className="mt-1 text-[11px] text-[#FF6B7B]">{emailError}</p>
                    )}
                  </div>
                )}

                <div className="rounded-2xl bg-[#16112C] border border-white/10 p-4 space-y-2 text-xs">
                  <div className="flex justify-between text-[#B3ADD1]">
                    <span>Subtotal</span>
                    <span className="tabular-nums font-medium text-white">
                      {formatCurrency(totals.subtotal, currency)}
                    </span>
                  </div>
                  {totals.promoDiscount > 0 && (
                    <div className="flex justify-between text-[#4ADE80]">
                      <span>Promo ({totals.appliedPromo})</span>
                      <span className="tabular-nums font-bold">
                        -{formatCurrency(totals.promoDiscount, currency)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#C4B5FD]">
                    <span>Total Savings vs MRP</span>
                    <span className="tabular-nums font-semibold">
                      {formatCurrency(totals.totalSavings, currency)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-white/10 flex justify-between items-baseline text-sm font-bold text-white">
                    <span>Grand Total</span>
                    <span
                      data-testid="cart-grand-total"
                      className="font-display font-extrabold text-xl tabular-nums"
                    >
                      {formatCurrency(totals.grandTotal, currency)}
                    </span>
                  </div>
                </div>
              </form>
            </>
          ) : (
            /* ==================== STEP 2: PREMIUM PAYMENT METHOD UI ==================== */
            <form
              id="checkout-step2-form"
              onSubmit={handleFinalSubmit}
              className="space-y-4"
            >
              {/* Hero My Balance Card */}
              <button
                type="button"
                disabled={!canPayWithBalance}
                onClick={() => {
                  if (!canPayWithBalance) return;
                  setPaymentMethod('balance');
                  setPaymentError('');
                }}
                data-testid="payment-my-balance-card"
                className={`relative w-full text-left rounded-[22px] p-4 overflow-hidden transition-all border ${
                  paymentMethod === 'balance' && canPayWithBalance
                    ? 'border-[#C084FC] shadow-[0_0_28px_rgba(168,85,247,0.48)]'
                    : canPayWithBalance
                      ? 'border-[#8B5CF6]/50 hover:border-[#C084FC]/70 shadow-[0_8px_24px_rgba(91,33,182,0.28)]'
                      : 'border-[#8B5CF6]/30 opacity-90 cursor-not-allowed'
                }`}
                style={{
                  background:
                    'linear-gradient(135deg, #2D1658 0%, #1C113A 50%, #34165F 100%)',
                }}
              >
                {/* Top specular edge highlight */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-6 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#E9D5FF]/70 to-transparent"
                />

                <div className="relative flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <Wallet3DBadge />
                    <div className="min-w-0">
                      <div className="font-display font-extrabold text-[17px] text-white leading-tight">
                        My Balance
                      </div>
                      <div className="text-xs text-[#C2B8E0] mt-0.5">
                        {user ? 'Available Balance' : 'Sign in to check balance'}
                      </div>
                      <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                        <span
                          className={`font-display font-extrabold text-xl sm:text-2xl tabular-nums leading-none ${
                            !user
                              ? 'text-[#C4B5FD]'
                              : canPayWithBalance
                                ? 'text-[#2EE66B]'
                                : 'text-[#FBBF24]'
                          }`}
                        >
                          {user
                            ? formatCurrency(user.walletCredits, currency)
                            : formatCurrency(0, currency)}
                        </span>
                        {user && !canPayWithBalance && (
                          <span className="text-[10px] font-semibold text-amber-200/90">
                            Need {formatCurrency(totals.grandTotal, currency)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-extrabold text-white border border-[#E9D5FF]/40"
                      style={{
                        background:
                          'linear-gradient(135deg, #9333EA 0%, #7C3AED 55%, #A855F7 100%)',
                        boxShadow: '0 0 18px rgba(168, 85, 247, 0.6)',
                      }}
                    >
                      <Zap className="w-3.5 h-3.5 fill-white text-white" />
                      Instant
                    </span>

                    {canPayWithBalance && (
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          paymentMethod === 'balance'
                            ? 'border-white bg-[#8B5CF6]'
                            : 'border-white/35 bg-transparent'
                        }`}
                      >
                        {paymentMethod === 'balance' && (
                          <Check className="w-3 h-3 text-white stroke-[3]" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </button>

              {/* Select Payment Method Header */}
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Layers className="w-4 h-4 text-[#C084FC] shrink-0" />
                  <h3 className="font-display font-bold text-[15px] text-white truncate">
                    Select Payment Method
                  </h3>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-medium text-[#C2BBE0] shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />
                  <span className="hidden xs:inline sm:inline">Secure &amp; Multiple Options</span>
                  <span className="xs:hidden sm:hidden">Secure</span>
                </div>
              </div>

              {/* 2-Column Uniform Payment Gateways Grid */}
              {activeGateways.length === 0 ? (
                <div className="rounded-2xl bg-[#16112B] border border-white/10 p-4 text-xs text-[#A59EC4]">
                  No payment gateways are active right now. Please contact support or pay with My Balance.
                </div>
              ) : (
                <div
                  className="grid grid-cols-2 gap-2.5 sm:gap-3"
                  data-testid="payment-gateways-grid"
                >
                  {activeGateways.map((gw) => {
                    const active =
                      paymentMethod === 'gateway' &&
                      selectedGateway?.id === gw.id;
                    return (
                      <button
                        key={gw.id}
                        type="button"
                        data-testid={`gateway-card-${gw.id}`}
                        onClick={() => {
                          setPaymentMethod('gateway');
                          setSelectedGatewayId(gw.id);
                          setPaymentError('');
                        }}
                        className={`relative text-left rounded-[18px] p-3 transition-all border overflow-hidden ${
                          active
                            ? 'border-[#C084FC] shadow-[0_0_24px_rgba(168,85,247,0.48)]'
                            : 'bg-[#17122B] border-white/12 hover:border-[#A855F7]/50 hover:bg-[#1C1636]'
                        }`}
                        style={
                          active
                            ? {
                                background:
                                  'linear-gradient(145deg, #371872 0%, #231245 55%, #3C1874 100%)',
                              }
                            : undefined
                        }
                      >
                        {/* Top-right selection circle */}
                        <span
                          className={`absolute top-2.5 right-2.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            active
                              ? 'border-white/90 bg-[#8B5CF6] shadow-[0_0_10px_rgba(168,85,247,0.8)]'
                              : 'border-white/30 bg-transparent'
                          }`}
                        >
                          {active && (
                            <Check className="w-3 h-3 text-white stroke-[3]" />
                          )}
                        </span>

                        <div className="flex items-start gap-2.5">
                          {/* Left Column: Gateway Logo + Currency Pill directly below */}
                          <div className="flex flex-col items-center gap-1.5 shrink-0">
                            <PaymentGatewayLogo
                              name={gw.name}
                              logoUrl={gw.logoUrl}
                              size="md"
                            />
                            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-[#2C234B] border border-white/10 text-[10px] font-bold tracking-wide text-[#E4DFFA]">
                              {gw.currency}
                            </span>
                          </div>

                          {/* Right Column: Gateway Name + Converted Total Amount */}
                          <div className="min-w-0 flex-1 pr-5 pt-0.5">
                            <div className="font-display font-bold text-[13px] sm:text-sm text-white leading-snug line-clamp-2">
                              {gw.name}
                            </div>
                            <div className="mt-1.5 font-display font-bold text-xs sm:text-[13px] text-[#DED8F7] tabular-nums truncate">
                              {formatCurrency(totals.grandTotal, gw.currency)}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 3-Column Trust Badges Strip */}
              <div
                className="rounded-[18px] border border-[#A855F7]/30 px-2 py-3 grid grid-cols-3 divide-x divide-white/10"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(46, 25, 86, 0.72) 0%, rgba(20, 14, 40, 0.92) 100%)',
                  boxShadow: '0 0 22px rgba(124, 58, 237, 0.16)',
                }}
              >
                <div className="flex flex-col items-center text-center px-1.5">
                  <Shield className="w-5 h-5 text-[#B47BFF] fill-[#A855F7]/25 mb-1" />
                  <div className="text-[11px] font-bold text-white leading-tight">
                    100% Secure
                  </div>
                  <div className="text-[10px] text-[#B3ABD1] leading-tight mt-0.5">
                    Payment
                  </div>
                </div>
                <div className="flex flex-col items-center text-center px-1.5">
                  <Zap className="w-5 h-5 text-[#2EE66B] fill-[#2EE66B]/30 mb-1" />
                  <div className="text-[11px] font-bold text-white leading-tight">
                    Instant
                  </div>
                  <div className="text-[10px] text-[#B3ABD1] leading-tight mt-0.5">
                    Delivery
                  </div>
                </div>
                <div className="flex flex-col items-center text-center px-1.5">
                  <Headphones className="w-5 h-5 text-[#B47BFF] mb-1" />
                  <div className="text-[11px] font-bold text-white leading-tight">
                    24/7
                  </div>
                  <div className="text-[10px] text-[#B3ABD1] leading-tight mt-0.5">
                    Support
                  </div>
                </div>
              </div>

              {/* Selected Gateway Transfer Details + Proof Upload */}
              {paymentMethod === 'gateway' && selectedGateway && (
                <div className="rounded-2xl bg-[#151029] border border-[#A855F7]/35 p-4 space-y-3.5">
                  <div className="flex items-center justify-between gap-2.5 pb-2.5 border-b border-white/10">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <PaymentGatewayLogo
                        name={selectedGateway.name}
                        logoUrl={selectedGateway.logoUrl}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#E9D5FF] truncate">
                          Send Payment to {selectedGateway.name}
                        </div>
                        <div className="text-[11px] text-[#9E97BE] truncate">
                          Account Title: {selectedGateway.accountTitle}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] uppercase text-[#9E97BE]">
                        Amount Due
                      </div>
                      <div className="font-display font-extrabold text-base text-[#2EE66B] tabular-nums">
                        {formatCurrency(
                          totals.grandTotal,
                          selectedGateway.currency
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Account Number + Copy Button */}
                  <div className="rounded-xl bg-[#0C081A] border border-white/10 p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-wide text-[#9A93BA]">
                        Account Number / Wallet Address
                      </div>
                      <div className="font-mono font-bold text-xs sm:text-sm text-white break-all mt-0.5">
                        {selectedGateway.accountNumber}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        void handleCopyAccountNumber(selectedGateway.accountNumber)
                      }
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#7C3AED] hover:bg-[#8B5CF6] text-[11px] font-bold text-white shrink-0"
                    >
                      {copiedAccount ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>

                  {/* QR Code Preview if Admin uploaded one */}
                  {safeQrUrl && (
                    <div className="flex flex-col items-center rounded-xl bg-[#0C081A] border border-white/10 p-3">
                      <div className="w-36 h-36 rounded-xl bg-white p-2">
                        <img
                          src={safeQrUrl}
                          alt={`${selectedGateway.name} scan to pay QR code`}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <span className="mt-1.5 text-[11px] text-[#B3ADD1]">
                        Scan QR code to pay via {selectedGateway.name}
                      </span>
                    </div>
                  )}

                  {selectedGateway.instructions && (
                    <p className="text-xs text-[#CFC9EB] leading-relaxed">
                      {selectedGateway.instructions}
                    </p>
                  )}

                  {/* Transaction ID Input */}
                  <div>
                    <label
                      htmlFor="payment-trx-input"
                      className="block text-xs font-semibold text-[#CFC9EB] mb-1.5"
                    >
                      Transaction ID / Reference Number *
                    </label>
                    <input
                      id="payment-trx-input"
                      type="text"
                      required
                      value={trxId}
                      onChange={(e) => {
                        setTrxId(e.target.value);
                        if (paymentError) setPaymentError('');
                      }}
                      placeholder="e.g. TRX-98451234 or Hash"
                      className="w-full h-10 rounded-xl bg-[#0C081A] border border-white/14 px-3 text-xs font-mono text-white placeholder:text-[#787296] focus:outline-none focus:border-[#A855F7]"
                    />
                  </div>

                  {/* Payment Proof Screenshot Upload */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#CFC9EB]">
                        Payment Proof Screenshot
                      </span>
                      <label className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/10 hover:bg-white/18 border border-white/14 text-[11px] font-bold text-white cursor-pointer">
                        {uploadingProof ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {uploadingProof
                            ? 'Uploading...'
                            : safeProofPreview
                              ? 'Change Screenshot'
                              : 'Upload Screenshot'}
                        </span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          className="hidden"
                          disabled={uploadingProof}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = '';
                            void handleUploadProofFile(file);
                          }}
                        />
                      </label>
                    </div>

                    {safeProofPreview && (
                      <div className="flex items-center gap-3 rounded-xl bg-[#0C081A] border border-emerald-400/35 p-2">
                        <img
                          src={safeProofPreview}
                          alt="Uploaded payment proof preview"
                          className="w-12 h-12 rounded-lg object-cover border border-white/12 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-emerald-300">
                            Screenshot attached
                          </div>
                          <div className="text-[11px] text-[#9A93BA]">
                            Ready for admin verification
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setProofUrl('')}
                          aria-label="Remove uploaded payment proof"
                          className="w-8 h-8 rounded-lg bg-white/8 hover:bg-rose-500/25 flex items-center justify-center text-[#CFC9EA]"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!user && (
                <div className="rounded-2xl bg-[#1A1334] border border-[#A78BFA]/35 p-3.5 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#E9D5FF]">
                    <Lock className="w-3.5 h-3.5 text-[#C084FC] shrink-0" />
                    <span>Sign in required to complete payment</span>
                  </div>
                  <p className="text-[11px] text-[#BEB8DC] leading-relaxed">
                    Continue with Google so your payment proof &amp; delivered account are linked to your Orders page.
                  </p>
                  {authError && (
                    <p role="alert" className="text-[11px] text-[#FF8593]">
                      {authError}
                    </p>
                  )}
                </div>
              )}

              {paymentError && (
                <div
                  role="alert"
                  className="rounded-xl bg-rose-500/15 border border-rose-400/35 px-3.5 py-2.5 text-xs text-rose-200 flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-300" />
                  <span>{paymentError}</span>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Sticky Footer */}
        {cart.length > 0 && (
          <div className="relative p-4 border-t border-white/10 bg-[#120C25]/95 backdrop-blur-md">
            {step === 1 ? (
              <button
                type="submit"
                form="checkout-step1-form"
                className="w-full h-12 rounded-2xl text-white font-extrabold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                style={{
                  background:
                    'linear-gradient(135deg, #A35BFF 0%, #7C3AED 55%, #5B21B6 100%)',
                  boxShadow: '0 8px 26px rgba(139, 92, 246, 0.5)',
                }}
              >
                <span>
                  Next: Choose Payment · {formatCurrency(totals.grandTotal, currency)}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : !user ? (
              <GoogleSignInButton
                loading={authLoading}
                onClick={onContinueWithGoogle}
              />
            ) : (
              <button
                type="submit"
                form="checkout-step2-form"
                disabled={submitting || uploadingProof}
                data-testid="payment-submit-cta"
                className="w-full h-[54px] px-4 rounded-2xl text-white font-display font-extrabold text-sm sm:text-[15px] flex items-center justify-between gap-2 disabled:opacity-60 transition-all active:scale-[0.98] border border-emerald-200/35"
                style={{
                  background:
                    'linear-gradient(180deg, #32EB7A 0%, #14BD57 52%, #0C9240 100%)',
                  boxShadow:
                    '0 10px 28px rgba(34, 197, 94, 0.45), inset 0 1px 0 rgba(255,255,255,0.4)',
                }}
              >
                <span className="w-7 h-7 shrink-0" aria-hidden="true" />
                <span className="inline-flex items-center justify-center gap-2 truncate">
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span>Processing Order...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-white text-white shrink-0" />
                      <span className="truncate">{payButtonLabel}</span>
                    </>
                  )}
                </span>
                <span className="w-7 h-7 rounded-full bg-black/20 flex items-center justify-center shrink-0">
                  <ArrowRight className="w-4 h-4 text-white" />
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
