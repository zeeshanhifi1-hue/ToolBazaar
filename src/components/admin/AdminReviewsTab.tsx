import React, { useMemo, useRef, useState } from 'react';
import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Database,
  Image as ImageIcon,
  Loader2,
  Plus,
  ShieldCheck,
  Star,
  Trash2,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import type { ProductReview, ReviewStatus, ToolProduct } from '../../types/store';
import {
  formatReviewDate,
  getTodayDateString,
  REVIEWS_SUPABASE_SQL,
} from '../../utils/reviewLogic';
import { sanitizeSafeMediaUrl } from '../../utils/supabaseMappers';

interface AdminReviewsTabProps {
  reviews: ProductReview[];
  tools: ToolProduct[];
  busy: boolean;
  onCreateReview: (payload: {
    toolId: string;
    authorName: string;
    rating: number;
    comment: string;
    screenshotUrl?: string;
    reviewDate: string;
    status?: ReviewStatus;
  }) => Promise<void>;
  onUpdateReviewStatus: (id: string, status: ReviewStatus) => Promise<void>;
  onDeleteReview: (id: string) => Promise<void>;
  onUploadMedia: (payload: {
    folder: 'reviews';
    filename: string;
    dataBase64: string;
  }) => Promise<string>;
}

export function AdminReviewsTab({
  reviews,
  tools,
  busy,
  onCreateReview,
  onUpdateReviewStatus,
  onDeleteReview,
  onUploadMedia,
}: AdminReviewsTabProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | ReviewStatus>('all');
  const [productFilter, setProductFilter] = useState<string>('all');

  // Add Admin Review form state
  const [toolId, setToolId] = useState<string>(() => tools[0]?.id ?? '');
  const [authorName, setAuthorName] = useState('');
  const [rating, setRating] = useState<number>(5);
  const [reviewDate, setReviewDate] = useState<string>(() => getTodayDateString());
  const [status, setStatus] = useState<ReviewStatus>('approved');
  const [comment, setComment] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [uploadingShot, setUploadingShot] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // SQL schema card copy state & image lightbox
  const [sqlExpanded, setSqlExpanded] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const toolNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of tools) map.set(t.id, t.name);
    return map;
  }, [tools]);

  const counts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    for (const r of reviews) {
      if (r.status === 'pending') pending += 1;
      else if (r.status === 'approved') approved += 1;
      else rejected += 1;
    }
    return { total: reviews.length, pending, approved, rejected };
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (productFilter !== 'all' && r.toolId !== productFilter) return false;
      return true;
    });
  }, [reviews, statusFilter, productFilter]);

  const handleScreenshotFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormError(null);
    if (file.size > 5 * 1024 * 1024) {
      setFormError('Screenshot must be 5MB or smaller.');
      return;
    }
    setUploadingShot(true);
    try {
      const dataBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Could not read selected image file.'));
        reader.readAsDataURL(file);
      });
      const url = await onUploadMedia({
        folder: 'reviews',
        filename: file.name,
        dataBase64,
      });
      setScreenshotUrl(url);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Screenshot upload failed. Try PNG/JPG.'
      );
    } finally {
      setUploadingShot(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const selectedToolId = toolId || tools[0]?.id || '';
    if (!selectedToolId) {
      setFormError('Please select a product.');
      return;
    }
    if (authorName.trim().length < 2) {
      setFormError('Please enter reviewer name (min 2 characters).');
      return;
    }
    if (comment.trim().length < 3) {
      setFormError('Please write a review message (min 3 characters).');
      return;
    }

    await onCreateReview({
      toolId: selectedToolId,
      authorName: authorName.trim(),
      rating,
      comment: comment.trim(),
      screenshotUrl: screenshotUrl.trim() || undefined,
      reviewDate: reviewDate || getTodayDateString(),
      status,
    });

    setAuthorName('');
    setRating(5);
    setComment('');
    setScreenshotUrl('');
    setReviewDate(getTodayDateString());
    setStatus('approved');
  };

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(REVIEWS_SUPABASE_SQL);
    } catch {
      // Fallback confirmation
    }
    setSqlCopied(true);
    window.setTimeout(() => setSqlCopied(false), 2000);
  };

  const safeDraftShot = sanitizeSafeMediaUrl(screenshotUrl);

  return (
    <div className="space-y-5">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-[#141126] border border-white/10 p-4">
          <div className="text-[11px] font-semibold text-[#9E97BE]">Total Reviews</div>
          <div className="font-display font-extrabold text-2xl text-white mt-1 tabular-nums">
            {counts.total}
          </div>
        </div>
        <div className="rounded-2xl bg-[#141126] border border-amber-400/35 p-4">
          <div className="text-[11px] font-semibold text-amber-300 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Pending Approval
          </div>
          <div className="font-display font-extrabold text-2xl text-amber-300 mt-1 tabular-nums">
            {counts.pending}
          </div>
        </div>
        <div className="rounded-2xl bg-[#141126] border border-emerald-400/30 p-4">
          <div className="text-[11px] font-semibold text-emerald-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approved &amp; Live
          </div>
          <div className="font-display font-extrabold text-2xl text-emerald-300 mt-1 tabular-nums">
            {counts.approved}
          </div>
        </div>
        <div className="rounded-2xl bg-[#141126] border border-rose-400/25 p-4">
          <div className="text-[11px] font-semibold text-rose-300 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" />
            Rejected
          </div>
          <div className="font-display font-extrabold text-2xl text-rose-300 mt-1 tabular-nums">
            {counts.rejected}
          </div>
        </div>
      </div>

      {/* Add Admin Review Card */}
      <section className="rounded-2xl bg-[#141126] border border-[#8B5CF6]/35 p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#7C3AED]/25 border border-[#C084FC]/40 flex items-center justify-center text-[#FACC15]">
              <Star className="w-4 h-4 fill-[#FACC15]" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-white">
                Add Product Review (Admin)
              </h2>
              <p className="text-xs text-[#A39DC4]">
                Publish a review on any product with custom star rating, screenshot &amp; any date (past, today, or future).
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-[#CFC9EB]">Select Product</span>
              <select
                value={toolId || tools[0]?.id || ''}
                onChange={(e) => setToolId(e.target.value)}
                className="w-full h-10 rounded-xl bg-[#0D0A1A] border border-white/15 px-3 text-xs font-semibold text-white focus:outline-none focus:border-[#A855F7]"
              >
                {tools.map((t) => (
                  <option key={t.id} value={t.id} className="bg-[#120E24] text-white">
                    {t.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-[#CFC9EB]">Reviewer Name</span>
              <input
                type="text"
                required
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="e.g. Hamza R. / Priya S."
                className="w-full h-10 rounded-xl bg-[#0D0A1A] border border-white/15 px-3 text-xs text-white placeholder:text-[#7F799F] focus:outline-none focus:border-[#A855F7]"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-[#CFC9EB] flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#C084FC]" />
                Review Date (Past / Today / Future)
              </span>
              <input
                type="date"
                required
                value={reviewDate}
                onChange={(e) => setReviewDate(e.target.value)}
                className="w-full h-10 rounded-xl bg-[#0D0A1A] border border-white/15 px-3 text-xs font-semibold text-white [color-scheme:dark] focus:outline-none focus:border-[#A855F7]"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-[#CFC9EB]">Visibility Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ReviewStatus)}
                className="w-full h-10 rounded-xl bg-[#0D0A1A] border border-white/15 px-3 text-xs font-semibold text-white focus:outline-none focus:border-[#A855F7]"
              >
                <option value="approved" className="bg-[#120E24] text-white">
                  Approved (Live Now)
                </option>
                <option value="pending" className="bg-[#120E24] text-white">
                  Pending Approval
                </option>
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#0D0A1A] border border-white/10 px-3.5 py-2.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-[#CFC9EB] mr-1">
                Star Rating:
              </span>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  aria-label={`Set admin review rating to ${star} stars`}
                  className="p-1 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <Star
                    className={`w-5 h-5 ${
                      star <= rating
                        ? 'text-[#FACC15] fill-[#FACC15]'
                        : 'text-white/25'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-1.5 text-xs font-bold text-[#FDE047] tabular-nums">
                {rating}/5
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleScreenshotFile}
                className="hidden"
                id="admin-review-screenshot-upload"
              />
              <label
                htmlFor="admin-review-screenshot-upload"
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-[#1E183B] hover:bg-[#2A2152] border border-[#A78BFA]/35 text-xs font-bold text-[#E9D5FF] cursor-pointer transition-colors"
              >
                {uploadingShot ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                <span>
                  {uploadingShot
                    ? 'Uploading...'
                    : safeDraftShot
                      ? 'Replace Screenshot'
                      : 'Upload Screenshot (Optional)'}
                </span>
              </label>

              {safeDraftShot && (
                <div className="flex items-center gap-1.5">
                  <img
                    src={safeDraftShot}
                    alt="Uploaded review screenshot preview"
                    className="w-9 h-9 rounded-lg object-cover border border-white/20"
                  />
                  <button
                    type="button"
                    onClick={() => setScreenshotUrl('')}
                    aria-label="Remove uploaded screenshot"
                    className="w-7 h-7 rounded-lg bg-rose-500/20 hover:bg-rose-500/35 text-rose-200 flex items-center justify-center"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-[#CFC9EB]">Review Message</span>
            <textarea
              rows={2}
              required
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write the product review message..."
              className="w-full rounded-xl bg-[#0D0A1A] border border-white/15 p-3 text-xs text-white placeholder:text-[#7F799F] focus:outline-none focus:border-[#A855F7]"
            />
          </label>

          {formError && (
            <p role="alert" className="text-xs font-semibold text-rose-300">
              {formError}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={busy || uploadingShot}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] hover:brightness-110 disabled:opacity-50 text-xs font-bold text-white shadow-[0_6px_20px_rgba(124,58,237,0.4)] transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Publish Review</span>
            </button>
          </div>
        </form>
      </section>

      {/* Moderation Queue & All Reviews */}
      <section className="rounded-2xl bg-[#141126] border border-white/10 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-bold text-base text-white">
              Review Moderation &amp; History
            </h2>
            <p className="text-xs text-[#A39DC4]">
              User-submitted reviews stay private to the buyer until you click Approve.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => {
              const active = statusFilter === tab;
              const badgeCount =
                tab === 'all'
                  ? counts.total
                  : tab === 'pending'
                    ? counts.pending
                    : tab === 'approved'
                      ? counts.approved
                      : counts.rejected;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-colors border ${
                    active
                      ? 'bg-[#7C3AED] border-[#C084FC]/60 text-white'
                      : 'bg-[#0D0A1A] border-white/10 text-[#C5BFE4] hover:text-white'
                  }`}
                >
                  {tab} ({badgeCount})
                </button>
              );
            })}

            <select
              aria-label="Filter reviews by product"
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="h-8 rounded-full bg-[#0D0A1A] border border-white/12 px-3 text-xs font-semibold text-[#E5E0FA] focus:outline-none focus:border-[#A855F7]"
            >
              <option value="all" className="bg-[#120E24] text-white">
                All Products
              </option>
              {tools.map((t) => (
                <option key={t.id} value={t.id} className="bg-[#120E24] text-white">
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredReviews.length === 0 ? (
          <div className="rounded-xl bg-[#0D0A1A] border border-white/8 p-8 text-center text-xs text-[#A39DC4]">
            No reviews found for the selected filter.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReviews.map((rev) => {
              const prodName = toolNameMap.get(rev.toolId) || rev.toolId;
              const safeShot = sanitizeSafeMediaUrl(rev.screenshotUrl);

              return (
                <article
                  key={rev.id}
                  className={`rounded-xl bg-[#0E0B1D] border p-3.5 sm:p-4 space-y-2.5 ${
                    rev.status === 'pending'
                      ? 'border-amber-400/40'
                      : rev.status === 'rejected'
                        ? 'border-rose-400/30 opacity-80'
                        : 'border-white/10'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display font-bold text-sm text-white">
                          {rev.authorName}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            rev.source === 'admin'
                              ? 'bg-purple-500/20 text-purple-200 border border-purple-400/35'
                              : 'bg-sky-500/20 text-sky-200 border border-sky-400/35'
                          }`}
                        >
                          {rev.source === 'admin' ? 'Admin' : 'Verified Buyer'}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            rev.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/35'
                              : rev.status === 'pending'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-400/35'
                          }`}
                        >
                          {rev.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap text-[11px] text-[#A8A1C7]">
                        <span className="font-semibold text-[#DDD6FE]">{prodName}</span>
                        <span>·</span>
                        <span>{formatReviewDate(rev.reviewDate)}</span>
                        {rev.orderId && (
                          <>
                            <span>·</span>
                            <span className="font-mono text-[#C4B5FD]">
                              Order {rev.orderId}
                            </span>
                          </>
                        )}
                        {rev.authorEmail && (
                          <>
                            <span>·</span>
                            <span>{rev.authorEmail}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < rev.rating
                              ? 'text-[#FACC15] fill-[#FACC15]'
                              : 'text-white/20'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <p className="text-xs sm:text-[13px] text-[#E4DFFA] leading-relaxed">
                    {rev.comment}
                  </p>

                  {safeShot && (
                    <div className="pt-0.5">
                      <button
                        type="button"
                        onClick={() => setPreviewImageUrl(safeShot)}
                        className="group relative inline-flex items-center gap-2 rounded-xl bg-[#181330] border border-white/12 p-1.5 pr-3 hover:border-[#C084FC]/50 transition-colors"
                      >
                        <img
                          src={safeShot}
                          alt={`Review screenshot by ${rev.authorName}`}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#DDD6FE] group-hover:text-white">
                          <ImageIcon className="w-3.5 h-3.5 text-[#C084FC]" />
                          View Screenshot
                        </span>
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/8 flex-wrap">
                    {rev.status !== 'approved' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void onUpdateReviewStatus(rev.id, 'approved')}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-600/85 hover:bg-emerald-500 disabled:opacity-50 text-xs font-bold text-white transition-colors"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.8]" />
                        <span>Approve &amp; Publish</span>
                      </button>
                    )}

                    {rev.status !== 'rejected' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void onUpdateReviewStatus(rev.id, 'rejected')}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/35 disabled:opacity-50 text-xs font-bold text-amber-200 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void onDeleteReview(rev.id)}
                      aria-label={`Delete review by ${rev.authorName}`}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/30 disabled:opacity-50 text-xs font-bold text-rose-200 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Supabase Reviews Database SQL Setup Card */}
      <section className="rounded-2xl bg-[#141126] border border-[#7C5CC4]/35 p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-400/35 flex items-center justify-center text-emerald-300 shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display font-bold text-sm sm:text-base text-white flex items-center gap-1.5">
                <span>Supabase Reviews SQL Schema</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </h2>
              <p className="text-xs text-[#A39DC4]">
                Copy &amp; run this SQL in your Supabase Dashboard SQL Editor to enable real-time persistent reviews &amp; RLS policies.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSqlExpanded((prev) => !prev)}
              className="h-9 px-3 rounded-xl bg-white/8 hover:bg-white/14 border border-white/12 text-xs font-bold text-white transition-colors"
            >
              {sqlExpanded ? 'Hide SQL' : 'Show SQL'}
            </button>
            <button
              type="button"
              onClick={() => void handleCopySql()}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-[#7C3AED] hover:bg-[#8B5CF6] text-xs font-bold text-white transition-colors"
            >
              {sqlCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>SQL Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Supabase SQL</span>
                </>
              )}
            </button>
          </div>
        </div>

        {sqlExpanded && (
          <pre className="rounded-xl bg-[#090713] border border-white/12 p-3.5 text-[11px] font-mono text-[#D8D0F5] overflow-x-auto max-h-80 overflow-y-auto leading-relaxed">
            {REVIEWS_SUPABASE_SQL}
          </pre>
        )}
      </section>

      {/* Lightbox Preview Modal for Review Screenshots */}
      {previewImageUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Review screenshot preview"
          onClick={() => setPreviewImageUrl(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full rounded-2xl bg-[#120E24] border border-white/20 p-2 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setPreviewImageUrl(null)}
              aria-label="Close screenshot preview"
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/75 hover:bg-black text-white flex items-center justify-center border border-white/20"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={previewImageUrl}
              alt="Full-size review screenshot"
              className="w-full max-h-[78vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
