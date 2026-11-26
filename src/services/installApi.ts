import type {
  InstallStatusResponse,
  SupabaseConnectionTestResponse,
} from '../utils/installLogic';
import type { SiteSettings } from '../types/store';

export async function fetchInstallStatusApi(): Promise<InstallStatusResponse> {
  const res = await fetch('/api/install/status', {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  const data = (await res.json().catch(() => ({}))) as Partial<InstallStatusResponse> & {
    error?: string;
  };
  if (!res.ok || typeof data.installed !== 'boolean') {
    throw new Error(data.error || 'Could not load installation status.');
  }
  return data as InstallStatusResponse;
}

export async function testSupabaseConnectionApi(): Promise<SupabaseConnectionTestResponse> {
  const res = await fetch('/api/install/test-supabase', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({}),
  });
  const data = (await res.json().catch(() => ({}))) as Partial<SupabaseConnectionTestResponse> & {
    error?: string;
  };
  if (!res.ok && typeof data.ok !== 'boolean') {
    throw new Error(data.error || 'Could not run Supabase connection test.');
  }
  return data as SupabaseConnectionTestResponse;
}

export interface CompleteInstallationPayload {
  siteName: string;
  siteTagline: string;
  supportEmail: string;
  vipCouponCode: string;
  vipCouponText: string;
  platformId: string;
  adminUsername?: string;
  adminPassword?: string;
}

export async function completeInstallationApi(
  payload: CompleteInstallationPayload
): Promise<{
  ok: boolean;
  installedAt: string;
  settings: SiteSettings;
  adminCreated: boolean;
  message: string;
}> {
  const res = await fetch('/api/install/complete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    installedAt?: string;
    settings?: SiteSettings;
    adminCreated?: boolean;
    message?: string;
    error?: string;
  };
  if (!res.ok || !data.ok || !data.settings) {
    throw new Error(data.error || 'Could not finalize installation.');
  }
  return {
    ok: true,
    installedAt: data.installedAt || new Date().toISOString(),
    settings: data.settings,
    adminCreated: Boolean(data.adminCreated),
    message: data.message || 'Installation complete!',
  };
}
