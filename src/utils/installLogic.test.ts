import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEnvTemplate,
  buildSimpleEnvTemplate,
  COMPLETE_SUPABASE_SQL,
  computeInstallReadiness,
  deriveSupabaseCallbackUrl,
  FRESH_SUPABASE_SQL,
  HOSTING_PLATFORMS,
  REQUIRED_SUPABASE_TABLES,
  sanitizeOrigin,
  UPGRADE_SUPABASE_SQL,
  validateInstallCompletionInput,
} from './installLogic';

test('HOSTING_PLATFORMS covers Hostinger and major Node.js deployment platforms', () => {
  const ids = HOSTING_PLATFORMS.map((p) => p.id);
  assert.ok(ids.includes('hostinger'));
  assert.ok(ids.includes('railway'));
  assert.ok(ids.includes('render'));
  assert.ok(ids.includes('digitalocean'));
  assert.ok(ids.includes('coolify'));
  assert.ok(ids.includes('cloudrun'));
  assert.ok(ids.includes('flyio'));
  for (const platform of HOSTING_PLATFORMS) {
    assert.ok(platform.steps.length >= 4);
    assert.ok(platform.buildCommand.includes('npm run build'));
  }
});

test('COMPLETE_SUPABASE_SQL defines all 11 required tables and Realtime publication', () => {
  assert.equal(REQUIRED_SUPABASE_TABLES.length, 11);
  for (const req of REQUIRED_SUPABASE_TABLES) {
    assert.ok(
      COMPLETE_SUPABASE_SQL.includes(`public.${req.table}`),
      `COMPLETE_SUPABASE_SQL missing public.${req.table}`
    );
  }
  assert.ok(COMPLETE_SUPABASE_SQL.includes('installation_completed'));
  assert.ok(COMPLETE_SUPABASE_SQL.includes('product_accounts'));
  assert.ok(COMPLETE_SUPABASE_SQL.includes('product_reviews'));
  assert.ok(UPGRADE_SUPABASE_SQL.includes('product_accounts'));
  assert.ok(UPGRADE_SUPABASE_SQL.includes('product_reviews'));
  assert.ok(UPGRADE_SUPABASE_SQL.includes('installation_completed'));
});

test('sanitizeOrigin blocks malformed host headers and normalizes localhost vs HTTPS', () => {
  assert.equal(sanitizeOrigin('https', 'store.example.com'), 'https://store.example.com');
  assert.equal(sanitizeOrigin('https', 'localhost:3000'), 'http://localhost:3000');
  assert.equal(sanitizeOrigin('javascript', 'store.example.com'), 'https://store.example.com');
  assert.equal(
    sanitizeOrigin('https', 'evil.com/path?x=1'),
    'http://localhost:3000'
  );
  assert.equal(
    sanitizeOrigin('https', 'evil.com\r\nX-Test: 1'),
    'http://localhost:3000'
  );
});

test('deriveSupabaseCallbackUrl formats valid Supabase hosts and falls back safely', () => {
  assert.equal(
    deriveSupabaseCallbackUrl('https://abcdef12345.supabase.co/'),
    'https://abcdef12345.supabase.co/auth/v1/callback'
  );
  assert.equal(
    deriveSupabaseCallbackUrl('not-a-url'),
    'https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback'
  );
});

test('buildEnvTemplate injects detected origin and all required keys', () => {
  const tpl = buildEnvTemplate('https://mytools.com/', 'hostinger');
  assert.ok(tpl.includes('APP_URL="https://mytools.com"'));
  assert.ok(tpl.includes('NEXT_PUBLIC_SUPABASE_URL='));
  assert.ok(tpl.includes('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='));
  assert.ok(tpl.includes('SUPABASE_SERVICE_ROLE_KEY='));
  assert.ok(tpl.includes('Hostinger'));
});

test('validateInstallCompletionInput enforces branding and admin account rules', () => {
  const badEmail = validateInstallCompletionInput({
    siteName: 'ToolBazaar',
    supportEmail: 'invalid-email',
    requireAdminAccount: false,
  });
  assert.equal(badEmail.ok, false);

  const shortPassword = validateInstallCompletionInput({
    siteName: 'ToolBazaar',
    supportEmail: 'hello@toolbazaar.com',
    requireAdminAccount: true,
    adminUsername: 'admin',
    adminPassword: '123',
  });
  assert.equal(shortPassword.ok, false);

  const valid = validateInstallCompletionInput({
    siteName: 'My Digital Store',
    siteTagline: 'Instant AI & Design Subscriptions',
    supportEmail: 'support@mydigitalstore.com',
    vipCouponCode: 'launch25',
    platformId: 'hostinger',
    requireAdminAccount: true,
    adminUsername: 'owner_admin',
    adminPassword: 'StrongPassword123!',
  });
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.vipCouponCode, 'LAUNCH25');
    assert.equal(valid.adminUsername, 'owner_admin');
    assert.equal(valid.platformId, 'hostinger');
  }
});

test('computeInstallReadiness summarizes env, db, oauth, and admin progress accurately', () => {
  const empty = computeInstallReadiness(null, null);
  assert.equal(empty.completedChecks, 0);
  assert.equal(empty.totalChecks, 4);

  const partial = computeInstallReadiness(
    {
      installed: false,
      installedAt: null,
      installedPlatform: null,
      currentOrigin: 'https://demo.com',
      supabaseHost: 'https://demo.supabase.co',
      supabaseConnected: true,
      env: {
        hasSupabaseUrl: true,
        hasSupabasePublishableKey: true,
        hasSupabaseServiceRoleKey: true,
        hasAppUrl: true,
        hasAdminEnv: false,
        hasStoredAdmin: false,
      },
      settings: {
        siteName: 'ToolBazaar',
        siteTagline: 'Premium Tools',
        supportEmail: 'support@toolbazaar.in',
        vipCouponCode: 'BAZAAR20',
        vipCouponText: '20% off',
      },
    },
    {
      ok: true,
      connected: true,
      latencyMs: 42,
      summary: 'All 11 tables ready',
      readyCount: 11,
      totalCount: 11,
      tables: [],
      storageBucketOk: true,
      storageDetail: 'Ready',
      missingEnvVars: [],
    }
  );
  assert.equal(partial.envReady, true);
  assert.equal(partial.dbReady, true);
  assert.equal(partial.oauthReady, true);
  assert.equal(partial.adminReady, false);
  assert.equal(partial.completedChecks, 3);
});

test('FRESH_SUPABASE_SQL defines all 11 tables with zero demo products and clean install lock', () => {
  for (const req of REQUIRED_SUPABASE_TABLES) {
    assert.ok(
      FRESH_SUPABASE_SQL.includes(`public.${req.table}`),
      `FRESH_SUPABASE_SQL missing public.${req.table}`
    );
  }
  assert.ok(!FRESH_SUPABASE_SQL.includes("'chatgpt-plus'"));
  assert.ok(!FRESH_SUPABASE_SQL.includes("'banner-welcome-home'"));
  assert.ok(FRESH_SUPABASE_SQL.includes('installation_completed'));

  const envSnippet = buildSimpleEnvTemplate();
  assert.ok(envSnippet.includes('NEXT_PUBLIC_SUPABASE_URL='));
  assert.ok(envSnippet.includes('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='));
  assert.ok(envSnippet.includes('SUPABASE_SERVICE_ROLE_KEY='));
});
