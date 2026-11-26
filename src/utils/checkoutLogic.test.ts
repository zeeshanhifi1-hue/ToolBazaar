import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAccessKeyFromHex,
  buildOrderCode,
  determineInitialOrderOutcome,
  resolveCheckoutItemsAndTotals,
  validateServerOrderPayment,
} from './checkoutLogic.ts';
import type { PaymentGateway, ToolProduct } from '../types/store';

const sampleTools: ToolProduct[] = [
  {
    id: 'chatgpt-plus',
    name: 'ChatGPT Plus',
    badgeText: 'Premium',
    subtitle: 'Official GPT-4o',
    description: 'Official access',
    category: 'ai',
    brand: 'chatgpt',
    originalPrice: 1700,
    price: 850,
    discountPercent: 50,
    available: 5,
    sold: 100,
    trending: true,
    deliveryType: 'Instant Delivery',
    features: ['GPT-4o'],
    plans: [
      { id: '1m', label: '1 Month', months: 1, price: 850, originalPrice: 1700, deliveryMode: 'automatic' },
      { id: '3m', label: '3 Months', months: 3, price: 1700, originalPrice: 5100, deliveryMode: 'manual' },
    ],
    theme: { cardBg: '', cardBorder: '', glowColor: '' },
  },
];

const sampleGateways: PaymentGateway[] = [
  {
    id: 'easypaisa',
    name: 'EasyPaisa',
    accountTitle: 'ToolBazaar',
    accountNumber: '03001234567',
    currency: 'PKR',
    instructions: 'Send exact amount',
    isActive: true,
    sortOrder: 1,
  },
];

test('resolveCheckoutItemsAndTotals computes authoritative pricing and promo discounts', () => {
  const result = resolveCheckoutItemsAndTotals({
    requestedItems: [{ toolId: 'chatgpt-plus', planId: '1m', quantity: 2 }],
    catalogTools: sampleTools,
    promoCode: 'BAZAAR20',
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.subtotal, 1700);
    assert.equal(result.discount, 340);
    assert.equal(result.total, 1360);
    assert.equal(result.appliedPromo, 'BAZAAR20');
    assert.equal(result.hasManualPlan, false);
    assert.equal(result.qtyByToolId['chatgpt-plus'], 2);
  }
});

test('resolveCheckoutItemsAndTotals rejects quantities exceeding available stock', () => {
  const result = resolveCheckoutItemsAndTotals({
    requestedItems: [{ toolId: 'chatgpt-plus', planId: '1m', quantity: 6 }],
    catalogTools: sampleTools,
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /out of stock/i);
  }
});

test('resolveCheckoutItemsAndTotals detects manual delivery plan and supports custom VIP coupon', () => {
  const result = resolveCheckoutItemsAndTotals({
    requestedItems: [{ toolId: 'chatgpt-plus', planId: '3m', quantity: 1 }],
    catalogTools: sampleTools,
    promoCode: 'VIPSPECIAL',
    vipCouponCode: 'VIPSPECIAL',
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.hasManualPlan, true);
    assert.equal(result.appliedPromo, 'VIPSPECIAL');
    assert.equal(result.discount, 340);
    assert.equal(result.total, 1360);
  }
});

test('validateServerOrderPayment enforces balance sufficiency and gateway proof/trx', () => {
  const lowBal = validateServerOrderPayment({
    paymentMethod: 'balance',
    walletCredits: 500,
    total: 850,
    activeGateways: sampleGateways,
  });
  assert.equal(lowBal.ok, false);

  const okBal = validateServerOrderPayment({
    paymentMethod: 'balance',
    walletCredits: 1000,
    total: 850,
    activeGateways: sampleGateways,
  });
  assert.equal(okBal.ok, true);

  const missingTrx = validateServerOrderPayment({
    paymentMethod: 'gateway',
    walletCredits: 0,
    total: 850,
    paymentGatewayId: 'easypaisa',
    activeGateways: sampleGateways,
    paymentTrxId: '1',
  });
  assert.equal(missingTrx.ok, false);

  const okGw = validateServerOrderPayment({
    paymentMethod: 'gateway',
    walletCredits: 0,
    total: 850,
    paymentGatewayId: 'easypaisa',
    activeGateways: sampleGateways,
    paymentTrxId: 'EP-99887766',
  });
  assert.equal(okGw.ok, true);
  if (okGw.ok) {
    assert.equal(okGw.gateway?.id, 'easypaisa');
  }
});

test('determineInitialOrderOutcome and code builders produce valid statuses and formats', () => {
  const autoBal = determineInitialOrderOutcome({
    paymentMethod: 'balance',
    hasManualPlan: false,
    autoAssignedFromPool: false,
  });
  assert.equal(autoBal.status, 'Delivered');
  assert.equal(autoBal.paymentStatus, 'paid');

  const manualBal = determineInitialOrderOutcome({
    paymentMethod: 'balance',
    hasManualPlan: true,
    autoAssignedFromPool: false,
  });
  assert.equal(manualBal.status, 'Pending');
  assert.equal(manualBal.deliveryMode, 'manual');

  const gw = determineInitialOrderOutcome({
    paymentMethod: 'gateway',
    hasManualPlan: false,
    autoAssignedFromPool: false,
  });
  assert.equal(gw.status, 'Pending');
  assert.equal(gw.paymentStatus, 'pending_verification');

  assert.match(buildOrderCode(Date.UTC(2026, 4, 10), 'a1b2c3'), /^ORD-260510-A1B2C3$/);
  assert.match(buildAccessKeyFromHex('a1b2c3d4e5f6'), /^TB-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
});
