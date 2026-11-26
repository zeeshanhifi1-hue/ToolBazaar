import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { UserProfile } from '../types/store';
import {
  buildOAuthRedirectUrl,
  mapAuthUserToProfile,
  type DbProfileRow,
} from '../utils/authHelpers';

export interface GoogleSignInResult {
  started: boolean;
  error?: string;
}

function isInsideIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  const client = supabase;
  if (!isSupabaseConfigured || !client) {
    return {
      started: false,
      error:
        'Supabase keys are not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in Secrets.',
    };
  }

  const inIframe = isInsideIframe();
  const redirectTo = inIframe
    ? buildOAuthRedirectUrl(window.location.origin)
    : `${window.location.origin}/`;

  if (inIframe) {
    // Open the Supabase/Google authorization URL directly in a popup so Google never blocks inside an iframe.
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });

    if (error || !data?.url) {
      return {
        started: false,
        error: error?.message || 'Unable to start Google sign-in. Check Supabase Google provider settings.',
      };
    }

    let safeAuthUrl: string;
    try {
      const parsed = new URL(data.url);
      if (parsed.protocol !== 'https:') {
        return { started: false, error: 'Invalid OAuth URL protocol.' };
      }
      safeAuthUrl = parsed.toString();
    } catch {
      return { started: false, error: 'Invalid OAuth URL returned by Supabase.' };
    }

    const width = 520;
    const height = 640;
    const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
    const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));

    const popup = window.open(
      safeAuthUrl,
      'toolbazaar_google_oauth',
      `width=${width},height=${height},left=${left},top=${top},noopener=false,resizable=yes,scrollbars=yes`
    );

    if (!popup) {
      return {
        started: false,
        error: 'Popup was blocked by your browser. Please allow popups for this site and try again.',
      };
    }

    return { started: true };
  }

  // Standard top-level browser tab: direct PKCE redirect
  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        prompt: 'select_account',
      },
    },
  });

  if (error) {
    return {
      started: false,
      error: error.message,
    };
  }

  return { started: true };
}

export async function completeOAuthFromMessage(payload: {
  code?: unknown;
  accessToken?: unknown;
  refreshToken?: unknown;
  error?: unknown;
}): Promise<{ ok: boolean; error?: string }> {
  const client = supabase;
  if (!client) return { ok: false, error: 'Supabase is not configured.' };

  if (typeof payload.error === 'string' && payload.error.trim()) {
    return { ok: false, error: payload.error.trim() };
  }

  if (typeof payload.code === 'string' && payload.code.trim()) {
    const { error } = await client.auth.exchangeCodeForSession(payload.code.trim());
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }

  if (
    typeof payload.accessToken === 'string' &&
    payload.accessToken.trim() &&
    typeof payload.refreshToken === 'string' &&
    payload.refreshToken.trim()
  ) {
    const { error } = await client.auth.setSession({
      access_token: payload.accessToken.trim(),
      refresh_token: payload.refreshToken.trim(),
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }

  return { ok: false, error: 'Missing authentication code from Google.' };
}

export async function signOutUser(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getInitialAuthSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export async function fetchLiveUserProfile(
  previewUser?: Pick<UserProfile, 'id' | 'email' | 'fullName'> | null
): Promise<UserProfile | null> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }
  if (previewUser?.id) {
    headers['x-preview-user-id'] = previewUser.id;
    if (previewUser.email) headers['x-preview-user-email'] = previewUser.email;
    if (previewUser.fullName) headers['x-preview-user-name'] = previewUser.fullName;
  }

  if (!headers.Authorization && !headers['x-preview-user-id']) {
    return null;
  }

  try {
    const res = await fetch('/api/me/profile', {
      method: 'GET',
      headers,
      cache: 'no-store',
    });
    if (res.ok) {
      const json = (await res.json()) as { profile?: UserProfile };
      if (json.profile && typeof json.profile.id === 'string') {
        return json.profile;
      }
    }
  } catch {
    // Fall back to direct Supabase client query below if needed
  }

  return null;
}

export async function syncUserProfileInDb(authUser: User): Promise<UserProfile> {
  const baseProfile = mapAuthUserToProfile(authUser);

  // Prefer server-authoritative /api/me/profile so wallet_credits always syncs accurately
  const serverProfile = await fetchLiveUserProfile({
    id: authUser.id,
    email: baseProfile.email,
    fullName: baseProfile.fullName,
  });
  if (serverProfile) {
    return {
      ...baseProfile,
      ...serverProfile,
      avatarUrl: serverProfile.avatarUrl || baseProfile.avatarUrl,
    };
  }

  const client = supabase;
  if (!client) return baseProfile;

  // Fallback: fetch existing profile row directly from Supabase client
  const { data: existing } = await client
    .from('profiles')
    .select('id, email, full_name, avatar_url, wallet_credits, created_at')
    .eq('id', authUser.id)
    .maybeSingle();

  if (existing) {
    return mapAuthUserToProfile(authUser, existing as DbProfileRow);
  }

  // Upsert profile row if trigger hasn't created it yet
  const { data: inserted } = await client
    .from('profiles')
    .upsert(
      {
        id: authUser.id,
        email: baseProfile.email,
        full_name: baseProfile.fullName,
        avatar_url: baseProfile.avatarUrl ?? null,
      },
      { onConflict: 'id' }
    )
    .select('id, email, full_name, avatar_url, wallet_credits, created_at')
    .maybeSingle();

  return mapAuthUserToProfile(authUser, (inserted as DbProfileRow | null) ?? null);
}

export function subscribeToAuthState(
  onChange: (session: Session | null) => void
): () => void {
  const client = supabase;
  if (!client) return () => {};

  const {
    data: { subscription },
  } = client.auth.onAuthStateChange((_event, session) => {
    onChange(session ?? null);
  });

  return () => {
    subscription.unsubscribe();
  };
}

export function subscribeToUserProfile(
  userId: string,
  onProfileUpdated: (row: DbProfileRow) => void
): () => void {
  const client = supabase;
  if (!client || !userId) return () => {};

  const channel = client
    .channel(`toolbazaar-profile-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${userId}`,
      },
      (payload) => {
        const next = payload.new as DbProfileRow | undefined;
        if (next && typeof next.id === 'string') {
          onProfileUpdated(next);
        }
      }
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
