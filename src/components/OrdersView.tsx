import React, { useState } from 'react';
import {
  Check,
  Clock,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  KeyRound,
  Loader2,
  PackageCheck,
  RefreshCw,
  Send,
  Star,
  Upload,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import type {
  CartItem,
  CurrencyCode,
  OrderRecord,
  ProductReview,
  ToolProduct,
  UserProfile,
} from '../types/store';
import { formatCurrency } from '../utils/storeLogic';
import {
  formatDeliveryAsTextFile,
  sanitizeTextFileName,
} from '../utils/mediaValidation';
import {
  canUserReviewOrder,
  findExistingReviewForOrderItem,
} from '../utils/reviewLogic';
import { sanitizeSafeMediaUrl } from '../utils/supabaseMappers';
import { BrandAppIcon } from './BrandIcons';
import { GoogleSignInButton } from './GoogleSignInButton';

interface OrdersViewProps {
  user: UserProfile | null;
  authLoading: boolean;
  authError: string | null;
  orders: OrderRecord[];
  tools: ToolProduct[];
  reviews: ProductReview[];
  currency: CurrencyCode;
  onContinueWithGoogle: () => void;
  onReorder: (tool: ToolProduct) => void;
  onExploreStore: () => void;
  onSubmitReview: (payload: {
    toolId: string;
    orderId?: string;
    rating: number;
    comment: string;
    screenshotUrl?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onUploadReviewScreenshot: (filename: string, dataBase64: string) => Promise<string>;
}

export function OrdersView({
  user,
  authLoading,
  authError,
  orders,
  tools,
  reviews,
  currency,
  onContinueWithGoogle,
  onReorder,
  onExploreStore,
  onSubmitReview,
  onUploadReviewScreenshot,
}: OrdersViewProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<{
    orderId: string;
    item: CartItem;
    logoUrl?: string;
  } | null>(null);
  const [draftRating, setDraftRating] = useState<number>(5);
  const [draftComment, setDraftComment] = useState<string>('');
  const [draftScreenshotUrl, setDraftScreenshotUrl] = useState<string>('');
  const [uploadingShot, setUploadingShot] = useState<boolean>(false);
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const openReviewModal = (orderId: string, item: CartItem, logoUrl?: string) => {
    setReviewTarget({ orderId, item, logoUrl });
    setDraftRating(5);
    setDraftComment('');
    setDraftScreenshotUrl('');
    setReviewError(null);
  };

  const closeReviewModal = () => {
    setReviewTarget(null);
    setReviewError(null);
  };

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
        reader.onerror = () => reject(new Error('Could not read selected file.'));
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

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTarget) return;
    setReviewError(null);
    const cleaned = draftComment.trim();
    if (cleaned.length < 3) {
      setReviewError('Please write a short review message (at least 3 characters).');
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await onSubmitReview({
        toolId: reviewTarget.item.toolId,
        orderId: reviewTarget.orderId,
        rating: draftRating,
        comment: cleaned,
        screenshotUrl: draftScreenshotUrl || undefined,
      });
      if (!res.ok) {
        setReviewError(res.error || 'Could not submit your review.');
        return;
      }
      closeReviewModal();
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleCopyText = async (copyKey: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback visual confirmation if clipboard API is restricted
    }
    setCopiedId(copyKey);
    window.setTimeout(() => setCopiedId(null), 1800);
  };

  const handleDownloadTxt = (order: OrderRecord) => {
    const text =
      formatDeliveryAsTextFile(order.deliveryContent, order.deliveryFields) ||
      `Order: ${order.id}\nActivation Key: ${order.accessKey}`;
    const filename = sanitizeTextFileName(
      order.deliveryFilename || `${order.id}-account.txt`
    );
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section aria-label="My Orders" className="mt-3 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#7C3AED]/25 border border-[#C084FC]/40 flex items-center justify-center text-[#C4B5FD]">
            <PackageCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-white">
              My Orders
            </h1>
            <p className="text-xs text-[#A39DC4]">
              Instant accounts, activation keys &amp; verified purchase history
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold text-[#C4B5FD] tabular-nums">
          {orders.length} {orders.length === 1 ? 'Order' : 'Orders'}
        </span>
      </div>

      {!user ? (
        <div className="rounded-[22px] bg-[#161327] border border-[#A78BFA]/30 p-7 text-center space-y-4 max-w-md mx-auto">
          <h2 className="font-display font-bold text-lg text-white">
            Sign in to view your orders
          </h2>
          <p className="text-xs sm:text-sm text-[#A59EC4]">
            Continue with Google to access your instant accounts, activation keys, and purchase history.
          </p>
          <GoogleSignInButton
            loading={authLoading}
            onClick={onContinueWithGoogle}
          />
          {authError && (
            <p role="alert" className="text-xs text-[#FF8593]">
              {authError}
            </p>
          )}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-[22px] bg-[#161327] border border-white/10 p-8 text-center space-y-3">
          <h2 className="font-display font-bold text-lg text-white">
            No orders yet
          </h2>
          <p className="text-sm text-[#A59EC4]">
            Your instant digital licenses and account details will appear here right after checkout.
          </p>
          <button
            type="button"
            onClick={onExploreStore}
            className="px-5 py-2.5 rounded-full bg-white text-[#120D24] font-bold text-sm"
          >
            Explore Tools
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {orders.map((order) => {
            const firstTool = tools.find((t) => t.id === order.items[0]?.toolId);
            const dateStr = new Date(order.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });
            const isPending = order.status === 'Pending';
            const isRejected =
              order.status === 'Rejected' || order.paymentStatus === 'rejected';
            const isPaymentPendingVerification =
              order.paymentStatus === 'pending_verification';
            const isGatewayOrder = order.paymentMethod === 'gateway';
            const safeProofUrl = sanitizeSafeMediaUrl(order.paymentProofUrl);
            const hasFields = Boolean(
              order.deliveryFields && order.deliveryFields.length > 0
            );
            const hasContent = Boolean(order.deliveryContent?.trim());
            const hasAccountDelivery =
              !isPending && !isRejected && (hasContent || hasFields);

            return (
              <article
                key={order.id}
                className={`rounded-[20px] bg-[#161327] border p-4 space-y-3.5 ${
                  isRejected
                    ? 'border-rose-400/45'
                    : isPending || isPaymentPendingVerification
                      ? 'border-amber-400/40'
                      : 'border-white/12'
                }`}
              >
                <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-white/[0.07]">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display font-bold text-sm text-white">
                        {order.id}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-white/7 border border-white/10 text-[#D8D1F5]">
                        {isGatewayOrder ? (
                          <CreditCard className="w-3 h-3 text-[#C084FC]" />
                        ) : (
                          <Wallet className="w-3 h-3 text-emerald-400" />
                        )}
                        {isGatewayOrder
                          ? order.paymentGatewayName || 'Payment Gateway'
                          : 'My Balance'}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#9B95BA] mt-0.5">
                      {dateStr} · {order.customerEmail}
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold border shrink-0 ${
                      isRejected
                        ? 'bg-rose-500/15 border-rose-400/45 text-rose-300'
                        : isPending
                          ? 'bg-amber-500/15 border-amber-400/45 text-amber-300'
                          : 'bg-[#14532D]/60 border-[#4ADE80]/40 text-[#4ADE80]'
                    }`}
                  >
                    {isRejected ? (
                      <XCircle className="w-3 h-3 stroke-[2.5]" />
                    ) : isPending ? (
                      <Clock className="w-3 h-3 stroke-[2.5]" />
                    ) : (
                      <Check className="w-3 h-3 stroke-[3]" />
                    )}
                    {order.status}
                  </span>
                </div>

                {/* Items */}
                <div className="space-y-2.5">
                  {order.items.map((item) => {
                    const matchedTool = tools.find((t) => t.id === item.toolId);
                    const canRate = canUserReviewOrder(order);
                    const existingReview = findExistingReviewForOrderItem(
                      reviews,
                      order.id,
                      item.toolId,
                      user?.id
                    );

                    return (
                      <div
                        key={`${order.id}-${item.toolId}-${item.planId}`}
                        className="flex items-center justify-between gap-2.5 flex-wrap"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <BrandAppIcon
                            brand={item.brand}
                            logoUrl={matchedTool?.logoUrl}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-sm text-white truncate">
                              {item.name}
                            </div>
                            <div className="text-[11px] text-[#A9A2C8]">
                              {item.planLabel} × {item.quantity}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {canRate &&
                            (existingReview ? (
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-bold border ${
                                  existingReview.status === 'approved'
                                    ? 'bg-emerald-500/15 border-emerald-400/35 text-emerald-300'
                                    : 'bg-amber-500/15 border-amber-400/40 text-amber-200'
                                }`}
                              >
                                <Star className="w-3 h-3 text-[#FACC15] fill-[#FACC15]" />
                                <span>
                                  {existingReview.rating}/5 ·{' '}
                                  {existingReview.status === 'approved'
                                    ? 'Published'
                                    : 'Pending Approval'}
                                </span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  openReviewModal(order.id, item, matchedTool?.logoUrl)
                                }
                                aria-label={`Rate ${item.name}`}
                                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 bg-[#3A280A]/90 hover:bg-[#52380E] border border-[#F59E0B]/50 text-[11px] font-bold text-[#FDE047] transition-colors"
                              >
                                <Star className="w-3 h-3 text-[#FACC15] fill-[#FACC15]" />
                                <span>Rate Product</span>
                              </button>
                            ))}

                          <div className="font-display font-bold text-sm text-white tabular-nums">
                            {formatCurrency(item.unitPrice * item.quantity, currency)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Rejected / Pending Verification / Pending Delivery / Delivered Credentials */}
                {isRejected ? (
                  <div className="rounded-xl bg-rose-500/12 border border-rose-400/35 px-3.5 py-3 flex items-start gap-2.5">
                    <XCircle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
                    <div className="text-xs text-rose-100 leading-relaxed space-y-1">
                      <strong className="font-bold text-rose-200 block">
                        Payment Rejected
                      </strong>
                      <p>
                        {order.paymentNote ||
                          'Your payment could not be verified. Please double-check your TRX ID or contact support.'}
                      </p>
                      {order.paymentTrxId && (
                        <p className="text-[11px] font-mono text-rose-200/90">
                          TRX ID: {order.paymentTrxId}
                        </p>
                      )}
                    </div>
                  </div>
                ) : isPending ? (
                  <div className="rounded-xl bg-amber-500/10 border border-amber-400/35 px-3.5 py-3 space-y-2">
                    <div className="flex items-start gap-2.5">
                      <Clock className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-100 leading-relaxed">
                        <strong className="font-bold text-amber-200 block">
                          {isPaymentPendingVerification
                            ? `Payment Verification Pending (${order.paymentGatewayName || 'Gateway'})`
                            : 'Pending Admin Approval'}
                        </strong>
                        {isPaymentPendingVerification
                          ? 'We received your payment details. Once Admin verifies your payment, your account credentials will appear right here automatically.'
                          : 'Your order is confirmed! Our team is preparing your account credentials. They will appear right here automatically once approved.'}
                      </div>
                    </div>

                    {(order.paymentTrxId || safeProofUrl) && (
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-amber-400/20 text-[11px]">
                        {order.paymentTrxId && (
                          <span className="font-mono text-amber-100">
                            TRX: <strong>{order.paymentTrxId}</strong>
                          </span>
                        )}
                        {safeProofUrl && (
                          <a
                            href={safeProofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-bold text-amber-200 hover:text-white underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View Uploaded Proof
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ) : hasAccountDelivery ? (
                  <div className="rounded-xl bg-[#0E0B1B] border border-emerald-400/35 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-xs font-bold text-emerald-300 truncate">
                          Delivered Account Details
                          {order.deliveryFilename
                            ? ` (${order.deliveryFilename})`
                            : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyText(
                              `${order.id}-delivery`,
                              formatDeliveryAsTextFile(
                                order.deliveryContent,
                                order.deliveryFields
                              ) || order.accessKey
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-[#2A1F52] hover:bg-[#3B2B73] border border-[#A78BFA]/40 px-2.5 py-1 text-[11px] font-bold text-white transition-colors"
                        >
                          {copiedId === `${order.id}-delivery` ? (
                            <>
                              <Check className="w-3 h-3 text-[#4ADE80]" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadTxt(order)}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600/85 hover:bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-white transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          <span>.txt</span>
                        </button>
                      </div>
                    </div>

                    {hasFields && order.deliveryFields && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {order.deliveryFields.map((field, idx) => (
                          <div
                            key={`${field.label}-${idx}`}
                            className="rounded-lg bg-[#17122D] border border-white/10 px-2.5 py-1.5 text-xs"
                          >
                            <span className="text-[10px] uppercase tracking-wide text-[#A39DC4] block">
                              {field.label}
                            </span>
                            <span className="font-mono font-semibold text-white break-all">
                              {field.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {hasContent && order.deliveryContent && (
                      <pre className="rounded-lg bg-[#17122D] border border-white/10 p-2.5 text-xs font-mono text-[#E9D5FF] whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                        {order.deliveryContent}
                      </pre>
                    )}
                  </div>
                ) : (
                  /* Classic Activation Key Box */
                  <div className="rounded-xl bg-[#0E0B1B] border border-[#8B5CF6]/30 px-3 py-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <KeyRound className="w-4 h-4 text-[#C084FC] shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[10px] text-[#9E97BE]">
                          Official Activation Key
                        </div>
                        <code className="text-xs font-mono font-bold text-[#E9D5FF] tracking-wider">
                          {order.accessKey}
                        </code>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyText(order.id, order.accessKey)}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#2A1F52] hover:bg-[#3B2B73] border border-[#A78BFA]/40 px-2.5 py-1.5 text-[11px] font-bold text-white shrink-0 transition-colors"
                    >
                      {copiedId === order.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#4ADE80]" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Footer Totals & Reorder */}
                <div className="flex items-center justify-between pt-1">
                  <div className="text-xs text-[#AAA4C9]">
                    Total Paid:{' '}
                    <strong className="font-display font-extrabold text-base text-white tabular-nums ml-1">
                      {formatCurrency(order.total, currency)}
                    </strong>
                    {order.promoCode && (
                      <span className="ml-2 text-[11px] text-[#4ADE80]">
                        ({order.promoCode})
                      </span>
                    )}
                  </div>

                  {firstTool && firstTool.available > 0 && (
                    <button
                      type="button"
                      onClick={() => onReorder(firstTool)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-white/8 hover:bg-white/15 border border-white/15 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Buy Again</span>
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Rate & Review Modal for Delivered/Active Purchased Products */}
      {reviewTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Rate ${reviewTarget.item.name}`}
          onClick={closeReviewModal}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-[22px] bg-[#161229] border border-[#9B6BFF]/45 p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <BrandAppIcon
                  brand={reviewTarget.item.brand}
                  logoUrl={reviewTarget.logoUrl}
                  size="sm"
                />
                <div className="min-w-0">
                  <h2 className="font-display font-bold text-base text-white truncate">
                    Rate {reviewTarget.item.name}
                  </h2>
                  <p className="text-[11px] text-[#A6A0C6]">
                    Order {reviewTarget.orderId} · {reviewTarget.item.planLabel}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeReviewModal}
                aria-label="Close review modal"
                className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center text-white shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-3.5">
              <div className="rounded-xl bg-[#0E0B1C] border border-white/10 p-3 flex flex-col items-center gap-2">
                <span className="text-xs font-semibold text-[#CFC9EB]">
                  Tap to rate your experience
                </span>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setDraftRating(n)}
                      aria-label={`Rate ${n} star${n === 1 ? '' : 's'}`}
                      className="p-1 transition-transform active:scale-90"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          n <= draftRating
                            ? 'text-[#FACC15] fill-[#FACC15]'
                            : 'text-white/25'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <span className="text-xs font-bold text-[#FDE047]">
                  {draftRating} out of 5 Stars
                </span>
              </div>

              <label className="block space-y-1">
                <span className="text-xs font-semibold text-[#CFC9EB]">
                  Your Review Message
                </span>
                <textarea
                  rows={3}
                  required
                  value={draftComment}
                  onChange={(e) => setDraftComment(e.target.value)}
                  placeholder={`How was your experience with ${reviewTarget.item.name}?`}
                  className="w-full rounded-xl bg-[#0E0B1C] border border-white/12 p-3 text-xs text-white placeholder:text-[#8680A8] focus:outline-none focus:border-[#A855F7]"
                />
              </label>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-[#CFC9EB] block">
                  Upload Screenshot (Optional)
                </span>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <input
                    id="order-review-shot-input"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleReviewFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="order-review-shot-input"
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-[#221A40] hover:bg-[#2E2356] border border-[#A78BFA]/35 text-xs font-bold text-[#EDE9FE] cursor-pointer transition-colors"
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
                          : 'Attach Screenshot'}
                    </span>
                  </label>

                  {sanitizeSafeMediaUrl(draftScreenshotUrl) && (
                    <div className="flex items-center gap-1.5">
                      <img
                        src={sanitizeSafeMediaUrl(draftScreenshotUrl)}
                        alt="Attached review screenshot"
                        className="w-10 h-10 rounded-lg object-cover border border-white/20"
                      />
                      <button
                        type="button"
                        onClick={() => setDraftScreenshotUrl('')}
                        aria-label="Remove screenshot"
                        className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-200 flex items-center justify-center"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-[#A8A1C9] leading-relaxed">
                Your review will appear immediately for you as <strong>Pending Approval</strong> and go public on the product page once approved by Admin.
              </p>

              {reviewError && (
                <p role="alert" className="text-xs font-semibold text-rose-300">
                  {reviewError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeReviewModal}
                  className="h-10 px-4 rounded-xl bg-white/8 hover:bg-white/14 text-xs font-bold text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview || uploadingShot}
                  className="inline-flex items-center gap-1.5 h-10 px-5 rounded-xl bg-gradient-to-r from-[#9E4BFF] to-[#6D28D9] hover:brightness-110 disabled:opacity-50 text-xs font-bold text-white"
                >
                  {submittingReview ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Submit Review</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

