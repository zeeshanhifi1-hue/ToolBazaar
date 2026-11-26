import type { UserProfile } from '../types/store';
import { sanitizeSafeMediaUrl } from './supabaseMappers';

export interface DbProfileRow {
  id: string;
  email?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  wallet_credits?: number | null;
  created_at?: string | null;
}

export interface AuthUserLike {
  id: string;
  email?: string | null;
  created_at?: string | null;
  user_metadata?: Record<string, unknown> | null;
}

export interface OAuthCallbackPayload {
  code: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  error: string | null;
}

export function getInitials(fullName: string, email: string): string {
  const cleanedName = fullName.trim();
  if (cleanedName) {
    const parts = cleanedName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return cleanedName.slice(0, 2).toUpperCase();
  }
  const cleanedEmail = email.trim();
  if (cleanedEmail) {
    return cleanedEmail.slice(0, 2).toUpperCase();
  }
  return 'TB';
}

export function mapAuthUserToProfile(
  authUser: AuthUserLike,
  dbRow?: DbProfileRow | null
): UserProfile {
  const meta = authUser.user_metadata ?? {};
  const email = String(dbRow?.email || authUser.email || '').trim();
  const metaName =
    typeof meta.full_name === 'string'
      ? meta.full_name
      : typeof meta.name === 'string'
        ? meta.name
        : '';
  const fallbackName = email ? email.split('@')[0] : 'ToolBazaar Member';
  const fullName = String(dbRow?.full_name || metaName || fallbackName).trim();

  const rawAvatar =
    dbRow?.avatar_url ??
    (typeof meta.avatar_url === 'string'
      ? meta.avatar_url
      : typeof meta.picture === 'string'
        ? meta.picture
        : undefined);

  return {
    id: authUser.id,
    email,
    fullName,
    avatarUrl: sanitizeSafeMediaUrl(rawAvatar),
    initials: getInitials(fullName, email),
    walletCredits: Math.max(0, Number(dbRow?.wallet_credits) || 0),
    createdAt: String(dbRow?.created_at || authUser.created_at || new Date().toISOString()),
  };
}

export function buildOAuthRedirectUrl(origin: string): string {
  const cleanOrigin = origin.replace(/\/+$/, '');
  return `${cleanOrigin}/auth-callback.html`;
}

export function parseOAuthCallbackParams(
  search: string,
  hash: string
): OAuthCallbackPayload {
  const searchParams = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);

  const code = searchParams.get('code')?.trim() || null;
  const accessToken = hashParams.get('access_token')?.trim() || null;
  const refreshToken = hashParams.get('refresh_token')?.trim() || null;
  const error =
    searchParams.get('error_description')?.trim() ||
    searchParams.get('error')?.trim() ||
    hashParams.get('error_description')?.trim() ||
    hashParams.get('error')?.trim() ||
    null;

  return { code, accessToken, refreshToken, error };
}
