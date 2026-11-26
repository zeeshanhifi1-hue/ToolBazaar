import crypto from 'node:crypto';

const SCRYPT_KEYLEN = 64;
const DEFAULT_TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash) return false;
  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, hashHex] = parts;
  if (!salt || !hashHex) return false;

  try {
    const expected = Buffer.from(hashHex, 'hex');
    const actual = crypto.scryptSync(password, salt, expected.length);
    if (actual.length !== expected.length) return false;
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function safeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function validateAdminCredentialsInput(
  username: unknown,
  password: unknown
): { ok: true; username: string; password: string } | { ok: false; error: string } {
  const cleanUser = typeof username === 'string' ? username.trim() : '';
  const cleanPass = typeof password === 'string' ? password : '';

  if (cleanUser.length < 3 || cleanUser.length > 32) {
    return { ok: false, error: 'Username must be between 3 and 32 characters.' };
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(cleanUser)) {
    return {
      ok: false,
      error: 'Username may only contain letters, numbers, dots, underscores, or hyphens.',
    };
  }
  if (cleanPass.length < 8 || cleanPass.length > 128) {
    return { ok: false, error: 'Password must be at least 8 characters long.' };
  }

  return { ok: true, username: cleanUser, password: cleanPass };
}

export function createAdminToken(
  username: string,
  secret: Buffer,
  ttlMs: number = DEFAULT_TOKEN_TTL_MS,
  nowMs: number = Date.now()
): string {
  const payload = {
    sub: username,
    iat: nowMs,
    exp: nowMs + ttlMs,
    jti: crypto.randomBytes(8).toString('hex'),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');
  return `${encodedPayload}.${sig}`;
}

export function verifyAdminToken(
  token: string,
  secret: Buffer,
  nowMs: number = Date.now()
): { username: string } | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [encodedPayload, providedSig] = parts;
  if (!encodedPayload || !providedSig) return null;

  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');

  const sigBufA = Buffer.from(providedSig, 'utf8');
  const sigBufB = Buffer.from(expectedSig, 'utf8');
  if (sigBufA.length !== sigBufB.length || !crypto.timingSafeEqual(sigBufA, sigBufB)) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8')
    ) as { sub?: unknown; exp?: unknown };
    if (typeof parsed.sub !== 'string' || !parsed.sub) return null;
    if (typeof parsed.exp !== 'number' || parsed.exp <= nowMs) return null;
    return { username: parsed.sub };
  } catch {
    return null;
  }
}
