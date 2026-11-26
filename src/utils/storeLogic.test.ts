import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addOrIncrementCartItem,
  applyOrderToInventory,
  calculateCartTotals,
  calculateDiscountPercent,
  convertFromINR,
  createOrderFromCart,
  DEFAULT_CURRENCY,
  filterTools,
  formatCurrency,
  formatINR,
  isCurrencyCode,
  updateCartItemQuantity,
} from './storeLogic';
import type { CartItem, ToolProduct } from '../types/store';

const sampleTools: ToolProduct[] = [
  {
    id: 'chatgpt-plus',
    name: 'ChatGPT Plus',
    badgeText: 'Premium',
    subtitle: 'Official GPT-4o Access',
    description: 'Full GPT-4o access.',
    category: 'ai',
    brand: 'chatgpt',
    originalPrice: 1999,
    price: 1449,
    discountPercent: 27,
    available: 42,
    sold: 158,
    trending: true,
    deliveryType: 'Instant Delivery',
    features: ['GPT-4o', 'DALL-E 3'],
    plans: [{ id: '1m', label: '1 Month', months: 1, price: 1449, originalPrice: 1999 }],
    theme: { cardBg: '', cardBorder: '', glowColor: '' },
  },
  {
    id: 'capcut-pro',
    name: 'CapCut Pro',
    badgeText: 'Premium',
    subtitle: 'Pro Video Editing Features',
    description: 'All pro effects unlocked.',
    category: 'video',
    brand: 'capcut',
    originalPrice: 999,
    price: 599,
    discountPercent: 40,
    available: 87,
    sold: 413,
    trending: true,
    deliveryType: 'Instant Delivery',
    features: ['4K Export', 'Auto Captions'],
    plans: [{ id: '1m', label: '1 Month', months: 1, price: 599, originalPrice: 999 }],
    theme: { cardBg: '', cardBorder: '', glowColor: '' },
  },
];

test('formatINR formats Indian rupees accurately', () => {
  assert.equal(formatINR(1449), '₹1,449');
  assert.equal(formatINR(599), '₹599');
  assert.equal(formatINR(124999), '₹1,24,999');
});

test('currency conversion defaults to USD and converts accurately to PKR and INR', () => {
  assert.equal(DEFAULT_CURRENCY, 'USD');
  assert.equal(isCurrencyCode('USD'), true);
  assert.equal(isCurrencyCode('PKR'), true);
  assert.equal(isCurrencyCode('INR'), true);
  assert.equal(isCurrencyCode('EUR'), false);

  assert.equal(convertFromINR(850, 'USD'), 10);
  assert.equal(formatCurrency(850, 'USD'), '$10.00');
  assert.equal(formatCurrency(1449), '$17.05');

  assert.equal(convertFromINR(850, 'PKR'), 2780);
  assert.equal(formatCurrency(850, 'PKR'), 'Rs 2,780');
  assert.equal(formatCurrency(1449, 'PKR'), 'Rs 4,739');

  assert.equal(formatCurrency(1449, 'INR'), '₹1,449');
  assert.equal(formatCurrency(-50, 'USD'), '$0.00');
});

test('calculateDiscountPercent returns rounded integer discount', () => {
  assert.equal(calculateDiscountPercent(1999, 1449), 28);
  assert.equal(calculateDiscountPercent(999, 599), 40);
  assert.equal(calculateDiscountPercent(4999, 2499), 50);
  assert.equal(calculateDiscountPercent(0, 100), 0);
});

test('filterTools filters by category and search query', () => {
  assert.equal(filterTools(sampleTools, 'all', '').length, 2);
  assert.equal(filterTools(sampleTools, 'ai', '').length, 1);
  assert.equal(filterTools(sampleTools, 'ai', '')[0].id, 'chatgpt-plus');
  assert.equal(filterTools(sampleTools, 'all', 'video').length, 1);
  assert.equal(filterTools(sampleTools, 'all', 'video')[0].id, 'capcut-pro');
  assert.equal(filterTools(sampleTools, 'video', 'gpt').length, 0);
});

test('cart item addition, quantity updates, and stock clamping', () => {
  let cart: CartItem[] = [];
  cart = addOrIncrementCartItem(
    cart,
    {
      toolId: 'chatgpt-plus',
      planId: '1m',
      planLabel: '1 Month',
      name: 'ChatGPT Plus',
      brand: 'chatgpt',
      unitPrice: 1449,
      unitOriginalPrice: 1999,
    },
    2
  );
  assert.equal(cart.length, 1);
  assert.equal(cart[0].quantity, 1);

  cart = updateCartItemQuantity(cart, 'chatgpt-plus', '1m', 5, 2);
  assert.equal(cart[0].quantity, 2);

  cart = updateCartItemQuantity(cart, 'chatgpt-plus', '1m', -2, 2);
  assert.equal(cart.length, 0);
});

test('calculateCartTotals applies valid promo codes and computes savings', () => {
  const cart: CartItem[] = [
    {
      toolId: 'chatgpt-plus',
      planId: '1m',
      planLabel: '1 Month',
      name: 'ChatGPT Plus',
      brand: 'chatgpt',
      unitPrice: 1449,
      unitOriginalPrice: 1999,
      quantity: 1,
    },
    {
      toolId: 'capcut-pro',
      planId: '1m',
      planLabel: '1 Month',
      name: 'CapCut Pro',
      brand: 'capcut',
      unitPrice: 599,
      unitOriginalPrice: 999,
      quantity: 1,
    },
  ];
  const baseTotals = calculateCartTotals(cart);
  assert.equal(baseTotals.itemCount, 2);
  assert.equal(baseTotals.subtotal, 2048);
  assert.equal(baseTotals.grandTotal, 2048);
  assert.equal(baseTotals.appliedPromo, null);

  const promoTotals = calculateCartTotals(cart, 'save10');
  assert.equal(promoTotals.appliedPromo, 'SAVE10');
  assert.equal(promoTotals.promoDiscount, 205);
  assert.equal(promoTotals.grandTotal, 1843);
  assert.equal(promoTotals.totalSavings, 2998 - 1843);
});

test('createOrderFromCart and applyOrderToInventory update inventory deterministically', () => {
  const cart: CartItem[] = [
    {
      toolId: 'chatgpt-plus',
      planId: '1m',
      planLabel: '1 Month',
      name: 'ChatGPT Plus',
      brand: 'chatgpt',
      unitPrice: 1449,
      unitOriginalPrice: 1999,
      quantity: 2,
    },
  ];
  const totals = calculateCartTotals(cart, 'BAZAAR20');
  const order = createOrderFromCart(
    cart,
    totals,
    'buyer@example.com',
    1,
    '2026-11-24T12:00:00.000Z'
  );
  assert.equal(order.id, 'ORD-1049');
  assert.equal(order.status, 'Delivered');
  assert.ok(order.accessKey.startsWith('TB-'));

  const updatedTools = applyOrderToInventory(sampleTools, cart);
  assert.equal(updatedTools[0].available, 40);
  assert.equal(updatedTools[0].sold, 160);
  assert.equal(updatedTools[1].available, 87);
});
