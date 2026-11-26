import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildOAuthRedirectUrl,
  getInitials,
  mapAuthUserToProfile,
  parseOAuthCallbackParams,
} from './authHelpers';

test('getInitials computes clean uppercase initials from full name or email', () => {
  assert.equal(getInitials('Ahsan Khan', 'ahsan@gmail.com'), 'AK');
  assert.equal(getInitials('Zain', 'zain@gmail.com'), 'ZA');
  assert.equal(getInitials('', 'creator@toolbazaar.in'), 'CR');
  assert.equal(getInitials('', ''), 'TB');
});

test('mapAuthUserToProfile sanitizes avatar URLs and merges DB profile fields', () => {
  const profile = mapAuthUserToProfile(
    {
      id: 'user-123',
      email: 'user@gmail.com',
      created_at: '2026-11-24T10:00:00Z',
      user_metadata: {
        full_name: 'Ali Raza',
        avatar_url: 'https://lh3.googleusercontent.com/a/photo123',
      },
    },
    {
      id: 'user-123',
      wallet_credits: 450,
    }
  );

  assert.equal(profile.id, 'user-123');
  assert.equal(profile.email, 'user@gmail.com');
  assert.equal(profile.fullName, 'Ali Raza');
  assert.equal(profile.initials, 'AR');
  assert.equal(profile.avatarUrl, 'https://lh3.googleusercontent.com/a/photo123');
  assert.equal(profile.walletCredits, 450);

  const unsafeAvatarProfile = mapAuthUserToProfile({
    id: 'user-456',
    email: 'safe@gmail.com',
    user_metadata: {
      avatar_url: 'javascript:alert(1)',
    },
  });
  assert.equal(unsafeAvatarProfile.avatarUrl, undefined);
});

test('buildOAuthRedirectUrl and parseOAuthCallbackParams handle PKCE and implicit responses', () => {
  assert.equal(
    buildOAuthRedirectUrl('https://example.run.app/'),
    'https://example.run.app/auth-callback.html'
  );

  const pkce = parseOAuthCallbackParams('?code=abc-123', '');
  assert.equal(pkce.code, 'abc-123');
  assert.equal(pkce.error, null);

  const implicit = parseOAuthCallbackParams('', '#access_token=tok1&refresh_token=ref2');
  assert.equal(implicit.accessToken, 'tok1');
  assert.equal(implicit.refreshToken, 'ref2');

  const failed = parseOAuthCallbackParams('?error=access_denied&error_description=User+cancelled', '');
  assert.equal(failed.error, 'User cancelled');
});
