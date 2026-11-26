import type { OrderRecord, ProductReview, ReviewStatus } from '../types/store';

export const VALID_REVIEW_STATUSES = new Set<ReviewStatus>([
  'pending',
  'approved',
  'rejected',
]);

export const REVIEWS_PAGE_SIZE = 10;

export function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Normalizes a review date input (YYYY-MM-DD or ISO timestamp) to YYYY-MM-DD.
 * Supports past, present, and future dates for Admin scheduling.
 */
export function normalizeReviewDate(raw: unknown): string {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    const ymdMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
    if (ymdMatch) {
      const y = Number(ymdMatch[1]);
      const m = Number(ymdMatch[2]);
      const d = Number(ymdMatch[3]);
      if (y >= 2000 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        const dt = new Date(Date.UTC(y, m - 1, d));
        if (
          dt.getUTCFullYear() === y &&
          dt.getUTCMonth() === m - 1 &&
          dt.getUTCDate() === d
        ) {
          return `${ymdMatch[1]}-${ymdMatch[2]}-${ymdMatch[3]}`;
        }
      }
    }
  }
  return getTodayDateString();
}

export function formatReviewDate(reviewDate: string): string {
  const normalized = normalizeReviewDate(reviewDate);
  const [y, m, d] = normalized.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function validateReviewInput(input: {
  toolId?: unknown;
  authorName?: unknown;
  rating?: unknown;
  comment?: unknown;
  requireAuthorName?: boolean;
}):
  | { ok: true; toolId: string; authorName: string; rating: number; comment: string }
  | { ok: false; error: string } {
  const toolId = typeof input.toolId === 'string' ? input.toolId.trim() : '';
  if (!toolId) {
    return { ok: false, error: 'Please select a valid product.' };
  }

  const authorName =
    typeof input.authorName === 'string' ? input.authorName.trim().slice(0, 80) : '';
  if (input.requireAuthorName && authorName.length < 2) {
    return { ok: false, error: 'Reviewer name must be at least 2 characters.' };
  }

  const numRating = Number(input.rating);
  if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
    return { ok: false, error: 'Please select a star rating between 1 and 5.' };
  }

  const comment =
    typeof input.comment === 'string' ? input.comment.trim().slice(0, 1000) : '';
  if (comment.length < 3) {
    return { ok: false, error: 'Please write a short review message (min 3 characters).' };
  }

  return {
    ok: true,
    toolId,
    authorName: authorName || 'Verified Buyer',
    rating: numRating,
    comment,
  };
}

export function canUserReviewOrder(order: Pick<OrderRecord, 'status'>): boolean {
  return order.status === 'Delivered' || order.status === 'Active';
}

export function findExistingReviewForOrderItem(
  reviews: ProductReview[],
  orderId: string,
  toolId: string,
  userId?: string | null
): ProductReview | undefined {
  return reviews.find((rev) => {
    if (rev.toolId !== toolId) return false;
    if (rev.orderId && rev.orderId === orderId) return true;
    if (userId && rev.userId === userId && rev.orderId === orderId) return true;
    return false;
  });
}

function sortVisibleReviewsLatestFirst(a: ProductReview, b: ProductReview): number {
  // Show author's own pending review at top for instant feedback, then by reviewDate desc
  if (a.status === 'pending' && b.status !== 'pending') return -1;
  if (b.status === 'pending' && a.status !== 'pending') return 1;
  const dateCmp = b.reviewDate.localeCompare(a.reviewDate);
  if (dateCmp !== 0) return dateCmp;
  return b.createdAt.localeCompare(a.createdAt);
}

/**
 * Returns storefront-visible reviews for a specific product:
 * - Always includes all 'approved' reviews.
 * - Includes 'pending' reviews ONLY when they belong to viewerUserId.
 * - Never exposes 'rejected' reviews or other users' 'pending' reviews.
 */
export function filterVisibleReviewsForUser(
  reviews: ProductReview[],
  toolId: string,
  viewerUserId?: string | null
): ProductReview[] {
  return reviews
    .filter((rev) => {
      if (rev.toolId !== toolId) return false;
      if (rev.status === 'approved') return true;
      if (rev.status === 'pending' && viewerUserId && rev.userId === viewerUserId) {
        return true;
      }
      return false;
    })
    .sort(sortVisibleReviewsLatestFirst);
}

/**
 * Returns storefront-visible reviews across ALL products sorted newest-first:
 * - Always includes all 'approved' reviews across every product.
 * - Includes 'pending' reviews ONLY when they belong to viewerUserId.
 * - Never exposes 'rejected' reviews or other users' 'pending' reviews.
 */
export function filterAllVisibleReviewsForUser(
  reviews: ProductReview[],
  viewerUserId?: string | null
): ProductReview[] {
  return reviews
    .filter((rev) => {
      if (rev.status === 'approved') return true;
      if (rev.status === 'pending' && viewerUserId && rev.userId === viewerUserId) {
        return true;
      }
      return false;
    })
    .sort(sortVisibleReviewsLatestFirst);
}

/**
 * Computes public approved review statistics for a specific product.
 */
export function computeProductReviewStats(
  reviews: ProductReview[],
  toolId: string
): { averageRating: string; approvedCount: number } {
  const approved = reviews.filter(
    (rev) => rev.toolId === toolId && rev.status === 'approved'
  );
  if (approved.length === 0) {
    return { averageRating: '5.0', approvedCount: 0 };
  }
  const sum = approved.reduce((acc, r) => acc + r.rating, 0);
  return {
    averageRating: (sum / approved.length).toFixed(1),
    approvedCount: approved.length,
  };
}

/**
 * Computes overall approved review count and average rating across ALL products.
 */
export function computeOverallReviewStats(
  reviews: ProductReview[]
): { averageRating: string; approvedCount: number } {
  const approved = reviews.filter((rev) => rev.status === 'approved');
  if (approved.length === 0) {
    return { averageRating: '5.0', approvedCount: 0 };
  }
  const sum = approved.reduce((acc, r) => acc + r.rating, 0);
  return {
    averageRating: (sum / approved.length).toFixed(1),
    approvedCount: approved.length,
  };
}

/**
 * Computes progressive 10-by-10 unlock pagination metadata:
 * - First 10 reviews -> shows "View All" button to unlock the next 10 (total 20).
 * - After first unlock (>10 shown) -> shows "View More" button to unlock 10 more each click.
 */
export function getReviewsLoadMoreMeta(
  totalCount: number,
  visibleLimit: number,
  pageSize = REVIEWS_PAGE_SIZE
): {
  shownCount: number;
  remainingCount: number;
  hasMore: boolean;
  nextBatchSize: number;
  buttonLabel: 'View All' | 'View More';
} {
  const safePageSize = Math.max(1, Math.floor(pageSize));
  const safeTotal = Math.max(0, Math.floor(totalCount));
  const safeLimit = Math.max(safePageSize, Math.floor(visibleLimit));
  const shownCount = Math.min(safeTotal, safeLimit);
  const remainingCount = Math.max(0, safeTotal - shownCount);
  const hasMore = remainingCount > 0;
  const nextBatchSize = Math.min(safePageSize, remainingCount);
  const buttonLabel: 'View All' | 'View More' =
    safeLimit <= safePageSize ? 'View All' : 'View More';

  return {
    shownCount,
    remainingCount,
    hasMore,
    nextBatchSize,
    buttonLabel,
  };
}

export const REVIEWS_SUPABASE_SQL = `-- ============================================================================
-- ToolBazaar Real-Time Product Reviews & Ratings Table (Supabase SQL)
-- Run this once in your Supabase Dashboard -> SQL Editor
-- ============================================================================

create table if not exists public.product_reviews (
  id text primary key,
  tool_id text not null,
  order_id text,
  user_id uuid references auth.users(id) on delete set null,
  author_name text not null,
  author_email text,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text not null,
  screenshot_url text,
  review_date date not null default current_date,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  source text not null default 'user' check (source in ('user', 'admin')),
  verified boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_product_reviews_tool_status
  on public.product_reviews (tool_id, status, review_date desc);

create index if not exists idx_product_reviews_user_id
  on public.product_reviews (user_id);

alter table public.product_reviews enable row level security;

-- Public & authenticated users can read approved reviews, plus their own pending reviews
drop policy if exists "Read approved or own pending reviews" on public.product_reviews;
create policy "Read approved or own pending reviews"
  on public.product_reviews
  for select
  using (
    status = 'approved'
    or (auth.uid() is not null and user_id = auth.uid() and status = 'pending')
  );

-- Authenticated buyers can insert their own review only in pending status
drop policy if exists "Authenticated users insert own pending review" on public.product_reviews;
create policy "Authenticated users insert own pending review"
  on public.product_reviews
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and source = 'user'
  );

-- Enable Supabase Realtime for instant live updates across all clients
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'product_reviews'
  ) then
    alter publication supabase_realtime add table public.product_reviews;
  end if;
end $$;
`;
