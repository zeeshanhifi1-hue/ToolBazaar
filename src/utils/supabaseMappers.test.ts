import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_NEON_CREATOR_HERO_IMAGE,
  mapBannerRow,
  mapCategoryRow,
  mapOrderRow,
  mapPaymentGatewayRow,
  mapSiteSettingsRow,
  mapToolRow,
  normalizeThemeConfig,
  normalizeThemeId,
  sanitizeSafeMediaUrl,
} from './supabaseMappers';
import { applyCouponDiscountPrice, calculateCartTotals } from './storeLogic';
import { resolvePromoPercent } from './checkoutLogic';

test('sanitizeSafeMediaUrl allows https and root-relative paths and blocks dangerous schemes', () => {
  assert.equal(
    sanitizeSafeMediaUrl('/assets/aistudio/image_69901163.png'),
    '/assets/aistudio/image_69901163.png'
  );
  assert.equal(
    sanitizeSafeMediaUrl('https://cdn.example.com/banner.png'),
    'https://cdn.example.com/banner.png'
  );
  assert.equal(sanitizeSafeMediaUrl('javascript:alert(1)'), undefined);
  assert.equal(sanitizeSafeMediaUrl('data:text/html,<script>alert(1)</script>'), undefined);
  assert.equal(sanitizeSafeMediaUrl('//evil.example.com/x.png'), undefined);
  assert.equal(sanitizeSafeMediaUrl('http://insecure.example.com/x.png'), undefined);
});

test('mapCategoryRow maps valid category and rejects unknown ids', () => {
  const cat = mapCategoryRow({
    id: 'ai',
    label: 'AI Tools',
    description: 'Top AI subscriptions',
  });
  assert.deepEqual(cat, {
    id: 'ai',
    label: 'AI Tools',
    description: 'Top AI subscriptions',
  });
  assert.equal(mapCategoryRow({ id: 'unknown-cat', label: 'Bad' }), null);
});

test('mapBannerRow sanitizes image_url and falls back targetCategory safely', () => {
  const valid = mapBannerRow({
    id: 'b1',
    title: 'Welcome Home',
    image_url: '/assets/aistudio/image_69901163.png',
    target_category: 'ai',
  });
  assert.equal(valid?.imageSrc, '/assets/aistudio/image_69901163.png');
  assert.equal(valid?.targetCategory, 'ai');

  const blocked = mapBannerRow({
    id: 'b2',
    title: 'Bad',
    image_url: 'javascript:alert(1)',
  });
  assert.equal(blocked, null);
});

test('mapToolRow transforms snake_case database rows with fallback plans and discount math', () => {
  const tool = mapToolRow({
    id: 'chatgpt-plus',
    name: 'ChatGPT Plus',
    category_id: 'ai',
    brand_key: 'chatgpt',
    logo_url: 'https://cdn.example.com/chatgpt.png',
    original_price: 1999,
    price: 1449,
    available: 42,
    sold: 158,
    trending: true,
    features: ['GPT-4o'],
  });
  assert.equal(tool.name, 'ChatGPT Plus');
  assert.equal(tool.discountPercent, 28);
  assert.equal(tool.logoUrl, 'https://cdn.example.com/chatgpt.png');
  assert.equal(tool.plans.length, 1);
  assert.equal(tool.plans[0].price, 1449);
});

test('mapOrderRow normalizes database order payload cleanly', () => {
  const order = mapOrderRow({
    id: 'uuid-1',
    order_code: 'ORD-1051',
    created_at: '2026-11-24T12:00:00Z',
    status: 'Delivered',
    items: [
      {
        tool_id: 'capcut-pro',
        plan_id: '1m',
        plan_label: '1 Month',
        name: 'CapCut Pro',
        brand: 'capcut',
        unit_price: 599,
        unit_original_price: 999,
        quantity: 2,
      },
    ],
    subtotal: 1198,
    discount: 120,
    total: 1078,
    promo_code: 'SAVE10',
    customer_email: 'user@example.com',
    access_key: 'TB-AAAA-BBBB-CCCC',
  });
  assert.equal(order.id, 'ORD-1051');
  assert.equal(order.items[0].quantity, 2);
  assert.equal(order.total, 1078);
});

test('mapPaymentGatewayRow sanitizes logo_url and qr_code_url safely', () => {
  const gw = mapPaymentGatewayRow({
    id: 'easypaisa',
    name: 'EasyPaisa',
    account_title: 'ToolBazaar',
    account_number: '0300-1234567',
    currency: 'PKR',
    logo_url: 'https://cdn.example.com/ep.png',
    qr_code_url: 'javascript:alert(1)',
    is_active: true,
    sort_order: 1,
  });
  assert.equal(gw.logoUrl, 'https://cdn.example.com/ep.png');
  assert.equal(gw.qrCodeUrl, undefined);
});

test('normalizeThemeId, normalizeThemeConfig and mapSiteSettingsRow sanitize theme payloads', () => {
  assert.equal(normalizeThemeId('neon-creator'), 'neon-creator');
  assert.equal(normalizeThemeId('unknown-theme'), 'classic');

  const cfg = normalizeThemeConfig({
    heroTitle: 'Custom Hero Title',
    heroImageUrl: 'javascript:alert(1)',
    couponDiscountPercent: 25,
  });
  assert.equal(cfg.heroTitle, 'Custom Hero Title');
  assert.equal(cfg.heroImageUrl, DEFAULT_NEON_CREATOR_HERO_IMAGE);
  assert.equal(cfg.couponDiscountPercent, 25);

  const settings = mapSiteSettingsRow({
    id: 'main',
    site_name: 'ToolBazaar',
    active_theme: 'neon-creator',
    theme_config: { heroTitle: 'Creator Tools', couponDiscountPercent: 30 },
  });
  assert.equal(settings.activeTheme, 'neon-creator');
  assert.equal(settings.themeConfig?.heroTitle, 'Creator Tools');
  assert.equal(settings.themeConfig?.couponDiscountPercent, 30);
});

test('global coupon math matches across storefront cards, cart drawer, and server checkout', () => {
  assert.equal(applyCouponDiscountPrice(1000, 25), 750);
  const cartTotals = calculateCartTotals(
    [
      {
        toolId: 'chatgpt-plus',
        planId: '1m',
        planLabel: '1 Month',
        name: 'ChatGPT Plus',
        brand: 'chatgpt',
        unitPrice: 1000,
        unitOriginalPrice: 2000,
        quantity: 1,
      },
    ],
    'CREATOR25',
    'CREATOR25',
    25
  );
  assert.equal(cartTotals.promoDiscount, 250);
  assert.equal(cartTotals.grandTotal, 750);
  assert.equal(cartTotals.appliedPromo, 'CREATOR25');

  const serverPromo = resolvePromoPercent('creator25', 'CREATOR25', 25);
  assert.deepEqual(serverPromo, { code: 'CREATOR25', percent: 25 });
});
