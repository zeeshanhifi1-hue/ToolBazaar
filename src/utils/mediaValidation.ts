import type { CurrencyCode, DeliveryField, PaymentMethod } from '../types/store';

export type MediaFolder = 'logos' | 'banners' | 'qr' | 'proofs' | 'reviews';

export interface ValidatedImageUpload {
  buffer: Buffer;
  extension: '.png' | '.jpg' | '.webp' | '.gif';
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';
}

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB (logos & QR codes)
const MAX_LARGE_BYTES = 5 * 1024 * 1024; // 5 MB (banners, payment proofs & review screenshots)

const VALID_CURRENCIES = new Set<CurrencyCode>(['USD', 'PKR', 'INR']);

/**
 * Validates base64 image payload by strict magic bytes (not trusting client MIME alone)
 * and enforces folder-specific size limits.
 */
export function validateImageUploadPayload(
  dataBase64: unknown,
  folder: MediaFolder
): { ok: true; file: ValidatedImageUpload } | { ok: false; error: string } {
  if (typeof dataBase64 !== 'string' || !dataBase64.trim()) {
    return { ok: false, error: 'Image file data is required.' };
  }

  // Strip optional data URI prefix safely
  const rawBase64 = dataBase64
    .replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '')
    .trim();
  if (!/^[A-Za-z0-9+/=\r\n]+$/.test(rawBase64)) {
    return { ok: false, error: 'Invalid base64 image encoding.' };
  }

  const buffer = Buffer.from(rawBase64, 'base64');
  const maxBytes =
    folder === 'banners' || folder === 'proofs' || folder === 'reviews'
      ? MAX_LARGE_BYTES
      : MAX_LOGO_BYTES;
  if (buffer.length === 0) {
    return { ok: false, error: 'Uploaded image file is empty.' };
  }
  if (buffer.length > maxBytes) {
    return {
      ok: false,
      error: `Image is too large. Maximum allowed size is ${Math.round(maxBytes / (1024 * 1024))}MB.`,
    };
  }

  // Magic-byte sniffing for PNG, JPEG, WEBP, GIF
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { ok: true, file: { buffer, extension: '.png', mimeType: 'image/png' } };
  }

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ok: true, file: { buffer, extension: '.jpg', mimeType: 'image/jpeg' } };
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { ok: true, file: { buffer, extension: '.webp', mimeType: 'image/webp' } };
  }

  if (
    buffer.length >= 6 &&
    (buffer.subarray(0, 6).toString('ascii') === 'GIF87a' ||
      buffer.subarray(0, 6).toString('ascii') === 'GIF89a')
  ) {
    return { ok: true, file: { buffer, extension: '.gif', mimeType: 'image/gif' } };
  }

  return {
    ok: false,
    error: 'Unsupported file format. Please upload a PNG, JPG, WebP, or GIF image.',
  };
}

export function sanitizeTextFileName(rawName: unknown, fallback = 'account.txt'): string {
  if (typeof rawName !== 'string' || !rawName.trim()) return fallback;
  const base = rawName.trim().split(/[\\/]/).pop() || fallback;
  const safe = base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  if (!safe) return fallback;
  return safe.toLowerCase().endsWith('.txt') ? safe : `${safe}.txt`;
}

export function sanitizeDeliveryFields(raw: unknown): DeliveryField[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === 'object'))
    .map((entry) => ({
      label: typeof entry.label === 'string' ? entry.label.trim().slice(0, 60) : '',
      value: typeof entry.value === 'string' ? entry.value.trim().slice(0, 400) : '',
    }))
    .filter((entry) => entry.label.length > 0 && entry.value.length > 0)
    .slice(0, 20);
}

export function formatDeliveryAsTextFile(
  content?: string,
  fields?: DeliveryField[]
): string {
  const parts: string[] = [];
  if (fields && fields.length > 0) {
    for (const f of fields) {
      parts.push(`${f.label}: ${f.value}`);
    }
  }
  const cleanContent = (content || '').trim();
  if (cleanContent) {
    if (parts.length > 0) parts.push('');
    parts.push(cleanContent);
  }
  return parts.join('\n');
}

export function validatePaymentGatewayPayload(input: {
  name?: unknown;
  accountTitle?: unknown;
  accountNumber?: unknown;
  currency?: unknown;
}): { ok: true; currency: CurrencyCode } | { ok: false; error: string } {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const accountNumber =
    typeof input.accountNumber === 'string' ? input.accountNumber.trim() : '';
  const currency =
    typeof input.currency === 'string'
      ? (input.currency.trim().toUpperCase() as CurrencyCode)
      : ('USD' as CurrencyCode);

  if (name.length < 2) {
    return { ok: false, error: 'Payment gateway name is required.' };
  }
  if (accountNumber.length < 3) {
    return {
      ok: false,
      error: 'Account number, wallet address, or payment ID is required.',
    };
  }
  if (!VALID_CURRENCIES.has(currency)) {
    return { ok: false, error: 'Currency must be USD, PKR, or INR.' };
  }
  return { ok: true, currency };
}

export function validateCheckoutPaymentSelection(input: {
  method: PaymentMethod;
  walletCredits: number;
  grandTotal: number;
  gatewayId?: string;
  trxId?: string;
  proofUrl?: string;
}): { ok: true } | { ok: false; error: string } {
  if (input.method === 'balance') {
    if (input.walletCredits < input.grandTotal) {
      return {
        ok: false,
        error: 'Insufficient My Balance. Please select a payment gateway instead.',
      };
    }
    return { ok: true };
  }

  if (!input.gatewayId || !input.gatewayId.trim()) {
    return { ok: false, error: 'Please choose a payment gateway.' };
  }
  const hasTrx = Boolean(input.trxId && input.trxId.trim().length >= 3);
  const hasProof = Boolean(input.proofUrl && input.proofUrl.trim().length > 0);
  if (!hasTrx && !hasProof) {
    return {
      ok: false,
      error: 'Please enter your Transaction ID or upload a payment proof screenshot.',
    };
  }
  return { ok: true };
}
