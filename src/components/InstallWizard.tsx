import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Database,
  Download,
  ExternalLink,
  KeyRound,
  Loader2,
  Lock,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Store,
} from 'lucide-react';
import type { SiteSettings } from '../types/store';
import {
  COMPLETE_SUPABASE_SQL,
  FRESH_SUPABASE_SQL,
  UPGRADE_SUPABASE_SQL,
  buildSimpleEnvTemplate,
  deriveSupabaseCallbackUrl,
  type InstallStatusResponse,
  type SupabaseConnectionTestResponse,
} from '../utils/installLogic';
import {
  completeInstallationApi,
  fetchInstallStatusApi,
  testSupabaseConnectionApi,
} from '../services/installApi';

interface InstallWizardProps {
  initialStatus?: InstallStatusResponse | null;
  onInstallationCompleted: (settings: SiteSettings) => void;
  onOpenStorefront: () => void;
  onOpenAdmin: () => void;
}

type WizardStep = 1 | 2 | 3;
type SqlMode = 'fresh' | 'sample' | 'upgrade';

const STEPS: { id: WizardStep; num: string; title: string }[] = [
  { id: 1, num: '1', title: 'Supabase' },
  { id: 2, num: '2', title: 'Database' },
  { id: 3, num: '3', title: 'Admin & Finish' },
];

async function copyTextSafe(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below
  }
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.focus();
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

export const InstallWizard: React.FC<InstallWizardProps> = ({
  initialStatus = null,
  onInstallationCompleted,
  onOpenStorefront,
  onOpenAdmin,
}) => {
  const [status, setStatus] = useState<InstallStatusResponse | null>(initialStatus);
  const [loadingStatus, setLoadingStatus] = useState(!initialStatus);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [step, setStep] = useState<WizardStep>(1);
  const [sqlMode, setSqlMode] = useState<SqlMode>('fresh');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [testingDb, setTestingDb] = useState(false);
  const [dbTest, setDbTest] = useState<SupabaseConnectionTestResponse | null>(null);
  const [dbTestError, setDbTestError] = useState<string | null>(null);

  const [showGoogleUrls, setShowGoogleUrls] = useState(false);

  const [siteName, setSiteName] = useState(initialStatus?.settings.siteName || 'ToolBazaar');
  const [siteTagline, setSiteTagline] = useState(
    initialStatus?.settings.siteTagline || 'Premium Tools & Digital Products'
  );
  const [supportEmail, setSupportEmail] = useState(
    initialStatus?.settings.supportEmail || 'support@yourdomain.com'
  );
  const [vipCouponCode, setVipCouponCode] = useState(
    initialStatus?.settings.vipCouponCode || 'WELCOME20'
  );
  const [vipCouponText, setVipCouponText] = useState(
    initialStatus?.settings.vipCouponText ||
      'Apply WELCOME20 at checkout for 20% extra discount.'
  );

  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('');

  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [justCompletedMsg, setJustCompletedMsg] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    setLoadingStatus(true);
    setStatusError(null);
    try {
      const fresh = await fetchInstallStatusApi();
      setStatus(fresh);
      if (fresh.settings.siteName) setSiteName(fresh.settings.siteName);
      if (fresh.settings.siteTagline) setSiteTagline(fresh.settings.siteTagline);
      if (fresh.settings.supportEmail) setSupportEmail(fresh.settings.supportEmail);
      if (fresh.settings.vipCouponCode) setVipCouponCode(fresh.settings.vipCouponCode);
      if (fresh.settings.vipCouponText) setVipCouponText(fresh.settings.vipCouponText);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Could not reach server.');
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    if (!initialStatus) {
      void refreshStatus();
    }
  }, [initialStatus, refreshStatus]);

  const handleCopy = async (key: string, text: string) => {
    const ok = await copyTextSafe(text);
    if (ok) {
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((curr) => (curr === key ? null : curr));
      }, 1800);
    }
  };

  const activeSql = useMemo(() => {
    if (sqlMode === 'fresh') return FRESH_SUPABASE_SQL;
    if (sqlMode === 'sample') return COMPLETE_SUPABASE_SQL;
    return UPGRADE_SUPABASE_SQL;
  }, [sqlMode]);

  const handleDownloadSql = () => {
    const filename =
      sqlMode === 'fresh'
        ? 'fresh-database.sql'
        : sqlMode === 'sample'
          ? 'complete-schema-with-demo.sql'
          : 'upgrade-migration.sql';
    const blob = new Blob([activeSql], { type: 'text/sql;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleTestSupabase = async () => {
    setTestingDb(true);
    setDbTestError(null);
    try {
      const result = await testSupabaseConnectionApi();
      setDbTest(result);
    } catch (err) {
      setDbTestError(
        err instanceof Error ? err.message : 'Failed to test Supabase connection.'
      );
    } finally {
      setTestingDb(false);
    }
  };

  const detectedOrigin = useMemo(() => {
    if (status?.currentOrigin) return status.currentOrigin;
    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin;
    }
    return 'https://your-domain.com';
  }, [status?.currentOrigin]);

  const supabaseCallbackUrl = useMemo(
    () => deriveSupabaseCallbackUrl(status?.supabaseHost),
    [status?.supabaseHost]
  );

  const simpleEnvSnippet = useMemo(() => buildSimpleEnvTemplate(), []);

  const envAllReady = Boolean(
    status?.env.hasSupabaseUrl &&
      status?.env.hasSupabasePublishableKey &&
      status?.env.hasSupabaseServiceRoleKey
  );

  const needsAdminCreation = Boolean(
    status && !status.env.hasAdminEnv && !status.env.hasStoredAdmin
  );

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompleteError(null);

    if (needsAdminCreation) {
      if (adminUsername.trim().length < 3) {
        setCompleteError('Admin username must be at least 3 characters.');
        return;
      }
      if (adminPassword.length < 8) {
        setCompleteError('Admin password must be at least 8 characters.');
        return;
      }
      if (adminPassword !== adminPasswordConfirm) {
        setCompleteError('Admin passwords do not match.');
        return;
      }
    }

    setCompleting(true);
    try {
      const result = await completeInstallationApi({
        siteName: siteName.trim(),
        siteTagline: siteTagline.trim(),
        supportEmail: supportEmail.trim(),
        vipCouponCode: vipCouponCode.trim(),
        vipCouponText: vipCouponText.trim(),
        platformId: 'web',
        adminUsername: needsAdminCreation ? adminUsername.trim() : undefined,
        adminPassword: needsAdminCreation ? adminPassword : undefined,
      });

      setJustCompletedMsg(result.message);
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              installed: true,
              installedAt: result.installedAt,
              installedPlatform: 'web',
              env: {
                ...prev.env,
                hasStoredAdmin: prev.env.hasStoredAdmin || result.adminCreated,
              },
              settings: {
                siteName: result.settings.siteName,
                siteTagline: result.settings.siteTagline,
                supportEmail: result.settings.supportEmail,
                vipCouponCode: result.settings.vipCouponCode,
                vipCouponText: result.settings.vipCouponText,
              },
            }
          : prev
      );
      onInstallationCompleted(result.settings);
    } catch (err) {
      setCompleteError(
        err instanceof Error ? err.message : 'Could not complete installation.'
      );
    } finally {
      setCompleting(false);
    }
  };

  // =========================================================================
  // LOCKED STATE — ONCE ONE-TIME INSTALLATION IS COMPLETED
  // =========================================================================
  if (status?.installed) {
    return (
      <div className="min-h-screen bg-[#090713] text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#120F22] border border-white/10 rounded-xl p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="space-y-1">
              <h1 className="font-display text-xl font-bold text-white">
                {justCompletedMsg ? 'Setup Complete' : 'Installer Locked'}
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed">
                {justCompletedMsg ||
                  'One-time installation is finished and locked for security.'}
              </p>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4 space-y-2 text-xs text-slate-300">
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Website</span>
              <span className="font-semibold text-white">{status.settings.siteName}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Supabase</span>
              <span className={status.supabaseConnected ? 'text-emerald-400 font-medium' : 'text-amber-400'}>
                {status.supabaseConnected ? 'Connected' : 'Not Connected'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={onOpenAdmin}
              className="min-h-[44px] px-4 py-2.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-semibold text-white inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              Admin Panel
            </button>
            <button
              type="button"
              onClick={onOpenStorefront}
              className="min-h-[44px] px-4 py-2.5 rounded-lg border border-white/15 hover:bg-white/5 text-sm font-semibold text-slate-100 inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Store className="w-4 h-4" />
              Open Store
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090713] text-white">
      {/* Compact Header */}
      <header className="sticky top-0 z-30 bg-[#090713]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="font-display font-bold text-base tracking-tight text-white truncate">
              ToolBazaar Setup
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenAdmin}
              className="px-3 py-1.5 rounded-lg border border-white/15 hover:bg-white/5 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={onOpenStorefront}
              className="px-3 py-1.5 rounded-lg border border-white/15 hover:bg-white/5 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
            >
              Store
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        {/* Clean 3-Step Horizontal Stepper */}
        <nav aria-label="Setup steps" className="grid grid-cols-3 gap-2">
          {STEPS.map((item) => {
            const active = step === item.id;
            const done =
              (item.id === 1 && envAllReady) ||
              (item.id === 2 && Boolean(dbTest?.ok));
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setStep(item.id)}
                className={`min-h-[44px] px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg border text-left transition-colors flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2.5 cursor-pointer ${
                  active
                    ? 'bg-[#17122C] border-[#7C3AED] text-white'
                    : 'bg-[#120F22] border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                }`}
              >
                <span
                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md text-[11px] sm:text-xs font-mono font-semibold flex items-center justify-center shrink-0 ${
                    done
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : active
                        ? 'bg-[#7C3AED] text-white'
                        : 'bg-white/10 text-slate-400'
                  }`}
                >
                  {done ? <Check className="w-3.5 h-3.5" /> : item.num}
                </span>
                <span className="text-xs sm:text-sm font-semibold whitespace-nowrap">
                  {item.id === 3 ? (
                    <>
                      Admin<span className="hidden sm:inline"> &amp; Finish</span>
                    </>
                  ) : (
                    item.title
                  )}
                </span>
              </button>
            );
          })}
        </nav>

        {statusError && (
          <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-3 text-xs sm:text-sm text-rose-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{statusError}</span>
            </div>
            <button
              type="button"
              onClick={() => void refreshStatus()}
              className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-xs font-semibold text-white cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* STEP 1: SUPABASE CONNECTION                                       */}
        {/* ================================================================= */}
        {step === 1 && (
          <section className="bg-[#120F22] border border-white/10 rounded-xl p-5 sm:p-7 space-y-6">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <h1 className="font-display text-xl sm:text-2xl font-bold text-white">
                  1. Connect Supabase
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  Check your live Supabase status below. Add missing keys in your hosting Environment Variables and redeploy.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void refreshStatus()}
                disabled={loadingStatus}
                className="min-h-[38px] px-3 py-1.5 rounded-lg border border-white/15 hover:bg-white/5 text-xs font-semibold text-white inline-flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingStatus ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {/* Live Connected Status */}
            <div className="border border-white/10 rounded-lg divide-y divide-white/10 bg-[#0B0817] text-xs sm:text-sm">
              <div className="px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-slate-400">Connected Project</span>
                <span className="font-mono text-white truncate max-w-[65%]">
                  {status?.supabaseHost || 'Not connected yet'}
                </span>
              </div>
              {[
                {
                  label: 'NEXT_PUBLIC_SUPABASE_URL',
                  ok: Boolean(status?.env.hasSupabaseUrl),
                },
                {
                  label: 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
                  ok: Boolean(status?.env.hasSupabasePublishableKey),
                },
                {
                  label: 'SUPABASE_SERVICE_ROLE_KEY',
                  ok: Boolean(status?.env.hasSupabaseServiceRoleKey),
                },
                {
                  label: 'Admin Account (/admin)',
                  ok: Boolean(status?.env.hasAdminEnv || status?.env.hasStoredAdmin),
                  pendingText: 'Set in Step 3',
                },
              ].map((row) => (
                <div key={row.label} className="px-4 py-3 flex items-center justify-between gap-3">
                  <code className="font-mono text-xs text-slate-200 truncate">{row.label}</code>
                  {row.ok ? (
                    <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-semibold shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Connected
                    </span>
                  ) : (
                    <span className="text-amber-400 text-xs font-medium shrink-0">
                      {row.pendingText || 'Missing'}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Clean 3-key Env Variables block */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-300">
                  Required Environment Variables (Supabase -&gt; Settings -&gt; API)
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy('env', simpleEnvSnippet)}
                  className="text-xs text-violet-300 hover:text-white inline-flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'env' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <pre className="bg-[#0B0817] border border-white/10 rounded-lg p-3.5 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed">
                {simpleEnvSnippet}
              </pre>
            </div>

            <div className="border-t border-white/10 pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="min-h-[44px] px-5 py-2.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-semibold text-white inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                Next: Database Tables
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </section>
        )}

        {/* ================================================================= */}
        {/* STEP 2: DATABASE TABLES (SQL & LIVE TEST)                         */}
        {/* ================================================================= */}
        {step === 2 && (
          <section className="bg-[#120F22] border border-white/10 rounded-xl p-5 sm:p-7 space-y-6">
            <div className="border-b border-white/10 pb-4">
              <h1 className="font-display text-xl sm:text-2xl font-bold text-white">
                2. Setup Database Tables
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Copy the SQL below, run it once in{' '}
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-300 hover:text-violet-200 underline inline-flex items-center gap-1"
                >
                  Supabase SQL Editor
                  <ExternalLink className="w-3 h-3" />
                </a>
                , then test your tables.
              </p>
            </div>

            {/* SQL Mode + Copy / Download */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex rounded-lg bg-[#0B0817] border border-white/10 p-1">
                  {(
                    [
                      { id: 'fresh', label: 'Fresh Clean DB' },
                      { id: 'sample', label: 'With Sample Data' },
                      { id: 'upgrade', label: 'Upgrade Existing' },
                    ] as const
                  ).map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setSqlMode(mode.id)}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                        sqlMode === mode.id
                          ? 'bg-[#7C3AED] text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy('sql', activeSql)}
                    className="min-h-[36px] px-3 py-1.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedKey === 'sql' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Copied SQL
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy SQL
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadSql}
                    className="min-h-[36px] px-3 py-1.5 rounded-lg border border-white/15 hover:bg-white/5 text-xs font-semibold text-slate-200 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                </div>
              </div>

              <pre className="bg-[#0B0817] border border-white/10 rounded-lg p-3.5 text-[11px] font-mono text-slate-300 max-h-[220px] overflow-auto leading-relaxed">
                {activeSql}
              </pre>
            </div>

            {/* Live Connection Test */}
            <div className="border-t border-white/10 pt-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Database className="w-4 h-4 text-violet-400" />
                  Live Table Check (11 Tables)
                </div>
                <button
                  type="button"
                  onClick={() => void handleTestSupabase()}
                  disabled={testingDb}
                  className="min-h-[40px] px-4 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-xs sm:text-sm font-semibold text-white inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {testingDb ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    'Test Supabase Tables'
                  )}
                </button>
              </div>

              {dbTestError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200">
                  {dbTestError}
                </div>
              )}

              {dbTest && (
                <div className="space-y-3">
                  <div
                    className={`p-3.5 rounded-lg border text-xs sm:text-sm flex items-center justify-between gap-3 ${
                      dbTest.ok
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-100'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-100'
                    }`}
                  >
                    <span>{dbTest.summary}</span>
                    <span className="font-mono text-xs shrink-0 tabular-nums">
                      {dbTest.readyCount}/{dbTest.totalCount}
                    </span>
                  </div>

                  <div className="border border-white/10 rounded-lg divide-y divide-white/8 bg-[#0B0817] text-xs">
                    {dbTest.tables.map((t) => (
                      <div key={t.table} className="px-3.5 py-2.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <code className="font-mono text-slate-100">{t.table}</code>
                          {!t.ok && (
                            <p className="text-[11px] text-amber-300 mt-0.5">{t.detail}</p>
                          )}
                        </div>
                        {t.ok ? (
                          <span className="text-emerald-400 font-semibold shrink-0 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Ready
                          </span>
                        ) : (
                          <span className="text-rose-400 font-semibold shrink-0 inline-flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Missing
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-white/10 pt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="min-h-[44px] px-4 py-2 rounded-lg border border-white/15 hover:bg-white/5 text-sm font-semibold text-slate-200 inline-flex items-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="min-h-[44px] px-5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-semibold text-white inline-flex items-center gap-2 cursor-pointer"
              >
                Next: Admin &amp; Website
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </section>
        )}

        {/* ================================================================= */}
        {/* STEP 3: ADMIN ACCOUNT, WEBSITE SETTINGS & FINISH                  */}
        {/* ================================================================= */}
        {step === 3 && (
          <section className="bg-[#120F22] border border-white/10 rounded-xl p-5 sm:p-7 space-y-6">
            <div className="border-b border-white/10 pb-4">
              <h1 className="font-display text-xl sm:text-2xl font-bold text-white">
                3. Admin &amp; Website Setup
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Configure your store info and Admin login, then finish one-time setup.
              </p>
            </div>

            <form onSubmit={handleCompleteSubmit} className="space-y-6">
              {/* Store Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="install-site-name" className="block text-xs font-medium text-slate-300">
                    Website Name
                  </label>
                  <input
                    id="install-site-name"
                    type="text"
                    required
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="ToolBazaar"
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-lg bg-[#0B0817] border border-white/15 text-sm text-white focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="install-support-email" className="block text-xs font-medium text-slate-300">
                    Support Email
                  </label>
                  <input
                    id="install-support-email"
                    type="email"
                    required
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    placeholder="support@yourdomain.com"
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-lg bg-[#0B0817] border border-white/15 text-sm text-white focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="install-tagline" className="block text-xs font-medium text-slate-300">
                    Tagline
                  </label>
                  <input
                    id="install-tagline"
                    type="text"
                    value={siteTagline}
                    onChange={(e) => setSiteTagline(e.target.value)}
                    placeholder="Premium Tools & Digital Products"
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-lg bg-[#0B0817] border border-white/15 text-sm text-white focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="install-coupon" className="block text-xs font-medium text-slate-300">
                    Promo Coupon Code
                  </label>
                  <input
                    id="install-coupon"
                    type="text"
                    value={vipCouponCode}
                    onChange={(e) => setVipCouponCode(e.target.value.toUpperCase())}
                    placeholder="WELCOME20"
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-lg bg-[#0B0817] border border-white/15 text-sm font-mono text-white focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label htmlFor="install-coupon-text" className="block text-xs font-medium text-slate-300">
                    Promo Banner Text
                  </label>
                  <input
                    id="install-coupon-text"
                    type="text"
                    value={vipCouponText}
                    onChange={(e) => setVipCouponText(e.target.value)}
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-lg bg-[#0B0817] border border-white/15 text-sm text-white focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>
              </div>

              {/* Admin Login Section */}
              <div className="border-t border-white/10 pt-5 space-y-4">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-violet-400" />
                  Admin Panel Login (/admin)
                </h2>

                {needsAdminCreation ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="space-y-1.5">
                      <label htmlFor="install-admin-user" className="block text-xs font-medium text-slate-300">
                        Admin Username
                      </label>
                      <input
                        id="install-admin-user"
                        type="text"
                        required
                        minLength={3}
                        value={adminUsername}
                        onChange={(e) => setAdminUsername(e.target.value)}
                        placeholder="admin"
                        className="w-full min-h-[42px] px-3.5 py-2 rounded-lg bg-[#0B0817] border border-white/15 text-sm text-white focus:outline-none focus:border-[#7C3AED]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="install-admin-pass" className="block text-xs font-medium text-slate-300">
                        Password (min 8 chars)
                      </label>
                      <input
                        id="install-admin-pass"
                        type="password"
                        required
                        minLength={8}
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="Strong password"
                        className="w-full min-h-[42px] px-3.5 py-2 rounded-lg bg-[#0B0817] border border-white/15 text-sm text-white focus:outline-none focus:border-[#7C3AED]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="install-admin-confirm" className="block text-xs font-medium text-slate-300">
                        Confirm Password
                      </label>
                      <input
                        id="install-admin-confirm"
                        type="password"
                        required
                        minLength={8}
                        value={adminPasswordConfirm}
                        onChange={(e) => setAdminPasswordConfirm(e.target.value)}
                        placeholder="Repeat password"
                        className="w-full min-h-[42px] px-3.5 py-2 rounded-lg bg-[#0B0817] border border-white/15 text-sm text-white focus:outline-none focus:border-[#7C3AED]"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-xs sm:text-sm text-emerald-100 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      Admin login is already configured. You can sign in at <code className="font-mono">/admin</code> after finishing.
                    </span>
                  </div>
                )}
              </div>

              {/* Optional Compact Google Login URLs */}
              <div className="border border-white/10 rounded-lg bg-[#0B0817]">
                <button
                  type="button"
                  onClick={() => setShowGoogleUrls((prev) => !prev)}
                  className="w-full px-4 py-3 flex items-center justify-between gap-2 text-xs font-semibold text-slate-200 hover:text-white cursor-pointer"
                >
                  <span className="inline-flex items-center gap-2">
                    <KeyRound className="w-3.5 h-3.5 text-violet-400" />
                    Optional: Google Login Redirect URLs
                  </span>
                  {showGoogleUrls ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>
                {showGoogleUrls && (
                  <div className="px-4 pb-4 pt-1 border-t border-white/10 space-y-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Site URL (Supabase &amp; Google Origin)</span>
                        <button
                          type="button"
                          onClick={() => handleCopy('origin', detectedOrigin)}
                          className="text-violet-300 hover:text-white cursor-pointer"
                        >
                          {copiedKey === 'origin' ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <code className="block font-mono text-white overflow-x-auto whitespace-nowrap">
                        {detectedOrigin}
                      </code>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Google Authorized Redirect URI</span>
                        <button
                          type="button"
                          onClick={() => handleCopy('cb', supabaseCallbackUrl)}
                          className="text-violet-300 hover:text-white cursor-pointer"
                        >
                          {copiedKey === 'cb' ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <code className="block font-mono text-white overflow-x-auto whitespace-nowrap">
                        {supabaseCallbackUrl}
                      </code>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Supabase Redirect URLs</span>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(
                              'sb-red',
                              `${detectedOrigin}/auth-callback.html\n${detectedOrigin}/**`
                            )
                          }
                          className="text-violet-300 hover:text-white cursor-pointer"
                        >
                          {copiedKey === 'sb-red' ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <code className="block font-mono text-white overflow-x-auto whitespace-nowrap">
                        {detectedOrigin}/auth-callback.html
                      </code>
                    </div>
                  </div>
                )}
              </div>

              {completeError && (
                <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs sm:text-sm text-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{completeError}</span>
                </div>
              )}

              <div className="border-t border-white/10 pt-4 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="min-h-[44px] px-4 py-2 rounded-lg border border-white/15 hover:bg-white/5 text-sm font-semibold text-slate-200 inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  type="submit"
                  disabled={completing}
                  className="min-h-[44px] px-6 py-2.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-semibold text-white inline-flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
                >
                  {completing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Finishing Setup...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-4 h-4" />
                      Complete Setup &amp; Go Live
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        )}
      </main>
    </div>
  );
};
