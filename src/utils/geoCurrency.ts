import type { CurrencyCode } from '../types/store.ts';

const GEO_HEADER_KEYS = [
  'cf-ipcountry',
  'x-appengine-country',
  'x-vercel-ip-country',
  'cloudfront-viewer-country',
  'fastly-client-geo-country',
  'x-geo-country',
  'x-country-code',
  'x-client-region',
] as const;

const INVALID_COUNTRY_CODES = new Set(['XX', 'ZZ', 'T1', 'A1', 'A2', 'O1']);

export function normalizeCountryCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return null;
  if (INVALID_COUNTRY_CODES.has(code)) return null;
  return code;
}

export function countryToCurrency(countryCode?: string | null): CurrencyCode {
  const code = normalizeCountryCode(countryCode);
  if (code === 'PK') return 'PKR';
  if (code === 'IN') return 'INR';
  return 'USD';
}

export function extractCountryFromHeaders(
  headers: Record<string, string | string[] | undefined>
): string | null {
  const lowerMap = new Map<string, string | string[] | undefined>();
  for (const [k, v] of Object.entries(headers)) {
    lowerMap.set(k.toLowerCase(), v);
  }

  for (const headerName of GEO_HEADER_KEYS) {
    const raw = lowerMap.get(headerName);
    const first = Array.isArray(raw) ? raw[0] : raw;
    const normalized = normalizeCountryCode(first);
    if (normalized) return normalized;
  }
  return null;
}

function isPrivateOrReservedIpv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // Multicast / reserved
  return false;
}

function isValidPublicIp(rawIp: string): string | null {
  let ip = rawIp.trim();
  if (!ip) return null;
  if (ip.startsWith('::ffff:')) {
    ip = ip.slice(7);
  }
  // IPv4
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
    return isPrivateOrReservedIpv4(ip) ? null : ip;
  }
  // IPv6 (basic syntax & exclude loopback / unique local / link local)
  if (/^[0-9a-fA-F:]+$/.test(ip) && ip.includes(':')) {
    const lower = ip.toLowerCase();
    if (
      lower === '::1' ||
      lower === '::' ||
      lower.startsWith('fc') ||
      lower.startsWith('fd') ||
      lower.startsWith('fe8') ||
      lower.startsWith('fe9') ||
      lower.startsWith('fea') ||
      lower.startsWith('feb')
    ) {
      return null;
    }
    return ip;
  }
  return null;
}

export function extractPublicClientIp(
  forwardedFor?: string | string[],
  remoteAddress?: string
): string | null {
  const candidates: string[] = [];
  if (typeof forwardedFor === 'string') {
    candidates.push(...forwardedFor.split(','));
  } else if (Array.isArray(forwardedFor)) {
    for (const entry of forwardedFor) {
      candidates.push(...entry.split(','));
    }
  }
  if (remoteAddress) {
    candidates.push(remoteAddress);
  }

  for (const candidate of candidates) {
    const valid = isValidPublicIp(candidate);
    if (valid) return valid;
  }
  return null;
}

export function countryFromTimeZone(tz?: string | null): string | null {
  if (typeof tz !== 'string') return null;
  const normalized = tz.trim().toLowerCase();
  if (normalized === 'asia/karachi') return 'PK';
  if (normalized === 'asia/kolkata' || normalized === 'asia/calcutta') return 'IN';
  return null;
}

export function countryFromAcceptLanguage(header?: string | string[] | null): string | null {
  const raw = Array.isArray(header) ? header[0] : header;
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const primaryTag = raw.split(',')[0]?.split(';')[0]?.trim() ?? '';
  const regionMatch = primaryTag.match(/[-_]([A-Za-z]{2})$/);
  if (!regionMatch) return null;
  const region = normalizeCountryCode(regionMatch[1]);
  if (region === 'PK' || region === 'IN') return region;
  return null;
}
