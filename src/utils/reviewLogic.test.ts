import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canUserReviewOrder,
  computeOverallReviewStats,
  computeProductReviewStats,
  filterAllVisibleReviewsForUser,
  filterVisibleReviewsForUser,
  findExistingReviewForOrderItem,
  formatReviewDate,
  getReviewsLoadMoreMeta,
  normalizeReviewDate,
  REVIEWS_PAGE_SIZE,
  validateReviewInput,
} from './reviewLogic';
import type { ProductReview } from '../types/store';

const sampleReviews: ProductReview[] = [
  {
    id: 'rev-1',
    toolId: 'chatgpt-plus',
    orderId: 'ORD-101',
    userId: 'user-a',
    authorName: 'Aarav M.',
    rating: 5,
    comment: 'Instant activation and smooth experience.',
    reviewDate: '2026-11-20',
    status: 'approved',
    source: 'user',
    verified: true,
    createdAt: '2026-11-20T10:00:00.000Z',
  },
  {
    id: 'rev-2',
    toolId: 'chatgpt-plus',
    orderId: 'ORD-102',
    userId: 'user-b',
    authorName: 'Zainab K.',
    rating: 4,
    comment: 'Great service, waiting for approval.',
    reviewDate: '2026-11-24',
    status: 'pending',
    source: 'user',
    verified: true,
    createdAt: '2026-11-24T12:00:00.000Z',
  },
  {
    id: 'rev-3',
    toolId: 'chatgpt-plus',
    userId: 'user-c',
    authorName: 'Spam User',
    rating: 1,
    comment: 'Rejected spam review.',
    reviewDate: '2026-11-21',
    status: 'rejected',
    source: 'user',
    verified: false,
    createdAt: '2026-11-21T08:00:00.000Z',
  },
  {
    id: 'rev-4',
    toolId: 'chatgpt-plus',
    authorName: 'Future Admin Review',
    rating: 4,
    comment: 'Scheduled future date admin review.',
    reviewDate: '2027-01-15',
    status: 'approved',
    source: 'admin',
    verified: true,
    createdAt: '2026-11-25T09:00:00.000Z',
  },
  {
    id: 'rev-5',
    toolId: 'canva-pro',
    authorName: 'Bilal K.',
    rating: 5,
    comment: 'Canva Pro works great across devices!',
    reviewDate: '2026-11-23',
    status: 'approved',
    source: 'admin',
    verified: true,
    createdAt: '2026-11-23T11:00:00.000Z',
  },
];

test('validateReviewInput enforces rating 1..5 and valid comment/product', () => {
  assert.equal(validateReviewInput({ toolId: '', rating: 5, comment: 'Great!' }).ok, false);
  assert.equal(
    validateReviewInput({ toolId: 'chatgpt-plus', rating: 0, comment: 'Great!' }).ok,
    false
  );
  assert.equal(
    validateReviewInput({ toolId: 'chatgpt-plus', rating: 6, comment: 'Great!' }).ok,
    false
  );
  assert.equal(
    validateReviewInput({ toolId: 'chatgpt-plus', rating: 4.5, comment: 'Great!' }).ok,
    false
  );
  assert.equal(
    validateReviewInput({ toolId: 'chatgpt-plus', rating: 5, comment: 'ok' }).ok,
    false
  );
  assert.equal(
    validateReviewInput({
      toolId: 'chatgpt-plus',
      authorName: 'A',
      rating: 5,
      comment: 'Works great!',
      requireAuthorName: true,
    }).ok,
    false
  );

  const valid = validateReviewInput({
    toolId: 'chatgpt-plus',
    authorName: 'Rahul Verma',
    rating: 5,
    comment: 'Instant access, works like magic!',
    requireAuthorName: true,
  });
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.rating, 5);
    assert.equal(valid.authorName, 'Rahul Verma');
  }
});

test('normalizeReviewDate supports past, present, and future dates', () => {
  assert.equal(normalizeReviewDate('2024-05-10'), '2024-05-10');
  assert.equal(normalizeReviewDate('2027-08-25'), '2027-08-25');
  assert.equal(normalizeReviewDate('2026-11-24T18:30:00.000Z'), '2026-11-24');
  assert.match(formatReviewDate('2027-01-15'), /Jan 15, 2027|15 Jan 2027/);
});

test('filterVisibleReviewsForUser shows pending review ONLY to its author and hides rejected', () => {
  const guestVisible = filterVisibleReviewsForUser(sampleReviews, 'chatgpt-plus', null);
  assert.deepEqual(
    guestVisible.map((r) => r.id),
    ['rev-4', 'rev-1']
  );

  const otherUserVisible = filterVisibleReviewsForUser(sampleReviews, 'chatgpt-plus', 'user-a');
  assert.deepEqual(
    otherUserVisible.map((r) => r.id),
    ['rev-4', 'rev-1']
  );

  const authorVisible = filterVisibleReviewsForUser(sampleReviews, 'chatgpt-plus', 'user-b');
  assert.deepEqual(
    authorVisible.map((r) => r.id),
    ['rev-2', 'rev-4', 'rev-1']
  );
});

test('filterAllVisibleReviewsForUser aggregates all products newest-first and computes overall stats', () => {
  const guestAll = filterAllVisibleReviewsForUser(sampleReviews, null);
  assert.deepEqual(
    guestAll.map((r) => r.id),
    ['rev-4', 'rev-5', 'rev-1']
  );

  const authorAll = filterAllVisibleReviewsForUser(sampleReviews, 'user-b');
  assert.deepEqual(
    authorAll.map((r) => r.id),
    ['rev-2', 'rev-4', 'rev-5', 'rev-1']
  );

  const overall = computeOverallReviewStats(sampleReviews);
  assert.equal(overall.approvedCount, 3);
  assert.equal(overall.averageRating, '4.7');
});

test('getReviewsLoadMoreMeta unlocks 10-by-10 with View All first and View More next', () => {
  assert.equal(REVIEWS_PAGE_SIZE, 10);

  const page1 = getReviewsLoadMoreMeta(25, 10);
  assert.equal(page1.shownCount, 10);
  assert.equal(page1.remainingCount, 15);
  assert.equal(page1.hasMore, true);
  assert.equal(page1.nextBatchSize, 10);
  assert.equal(page1.buttonLabel, 'View All');

  const page2 = getReviewsLoadMoreMeta(25, 20);
  assert.equal(page2.shownCount, 20);
  assert.equal(page2.remainingCount, 5);
  assert.equal(page2.hasMore, true);
  assert.equal(page2.nextBatchSize, 5);
  assert.equal(page2.buttonLabel, 'View More');

  const page3 = getReviewsLoadMoreMeta(25, 30);
  assert.equal(page3.shownCount, 25);
  assert.equal(page3.remainingCount, 0);
  assert.equal(page3.hasMore, false);
});

test('computeProductReviewStats counts only approved reviews', () => {
  const stats = computeProductReviewStats(sampleReviews, 'chatgpt-plus');
  assert.equal(stats.approvedCount, 2);
  assert.equal(stats.averageRating, '4.5');

  const emptyStats = computeProductReviewStats(sampleReviews, 'non-existent');
  assert.equal(emptyStats.approvedCount, 0);
  assert.equal(emptyStats.averageRating, '5.0');
});

test('canUserReviewOrder and findExistingReviewForOrderItem enforce delivered orders', () => {
  assert.equal(canUserReviewOrder({ status: 'Delivered' }), true);
  assert.equal(canUserReviewOrder({ status: 'Active' }), true);
  assert.equal(canUserReviewOrder({ status: 'Pending' }), false);
  assert.equal(canUserReviewOrder({ status: 'Processing' }), false);
  assert.equal(canUserReviewOrder({ status: 'Rejected' }), false);

  const existing = findExistingReviewForOrderItem(
    sampleReviews,
    'ORD-102',
    'chatgpt-plus',
    'user-b'
  );
  assert.equal(existing?.id, 'rev-2');
});
