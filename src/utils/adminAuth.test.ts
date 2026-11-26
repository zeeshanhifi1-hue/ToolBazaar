import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  createAdminToken,
  hashPassword,
  validateAdminCredentialsInput,
  verifyAdminToken,
  verifyPassword,
} from './adminAuth';

test('hashPassword and verifyPassword use salted scrypt hashes safely', () => {
  const hash1 = hashPassword('SuperSecure#2026');
  const hash2 = hashPassword('SuperSecure#2026');
  assert.notEqual(hash1, hash2); // unique random salt each time
  assert.equal(verifyPassword('SuperSecure#2026', hash1), true);
  assert.equal(verifyPassword('WrongPassword', hash1), false);
  assert.equal(verifyPassword('', hash1), false);
  assert.equal(verifyPassword('SuperSecure#2026', 'invalid-format'), false);
});

test('validateAdminCredentialsInput enforces username and password constraints', () => {
  assert.equal(validateAdminCredentialsInput('ab', '12345678').ok, false);
  assert.equal(validateAdminCredentialsInput('bad user!', '12345678').ok, false);
  assert.equal(validateAdminCredentialsInput('admin', 'short').ok, false);
  const valid = validateAdminCredentialsInput('admin_tb', 'StrongPass99');
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.username, 'admin_tb');
  }
});

test('createAdminToken and verifyAdminToken verify signature and expiration', () => {
  const secret = crypto.randomBytes(32);
  const now = 1_700_000_000_000;
  const token = createAdminToken('admin', secret, 60_000, now);

  assert.deepEqual(verifyAdminToken(token, secret, now + 10_000), { username: 'admin' });
  assert.equal(verifyAdminToken(token, secret, now + 61_000), null);
  assert.equal(verifyAdminToken(`${token}tampered`, secret, now + 10_000), null);
  assert.equal(verifyAdminToken(token, crypto.randomBytes(32), now + 10_000), null);
});
