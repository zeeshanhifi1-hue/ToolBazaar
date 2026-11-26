import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import {
  fetchAdminStatus,
  loginAdmin,
  setupFirstAdmin,
  type AdminAuthResponse,
} from '../../services/adminApi';
import { ToolBazaarBolt } from '../BrandIcons';

interface AdminAuthScreenProps {
  siteName: string;
  onAuthenticated: (auth: AdminAuthResponse) => void;
  onBackToStore: () => void;
}

export function AdminAuthScreen({
  siteName,
  onAuthenticated,
  onBackToStore,
}: AdminAuthScreenProps) {
  const [checking, setChecking] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchAdminStatus()
      .then((status) => {
        if (!cancelled) {
          setNeedsSetup(status.needsSetup);
          setChecking(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setChecking(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedUser = username.trim();
    if (trimmedUser.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (needsSetup && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const auth = needsSetup
        ? await setupFirstAdmin(trimmedUser, password)
        : await loginAdmin(trimmedUser, password);
      onAuthenticated(auth);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Authentication failed.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090713] text-white flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(ellipse 75% 45% at 50% 0%, rgba(124, 58, 237, 0.28) 0%, rgba(9, 7, 19, 0) 70%)',
        }}
      />

      <div className="relative z-10 w-full max-w-md space-y-5">
        <button
          type="button"
          onClick={onBackToStore}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#C4B5FD] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {siteName}
        </button>

        <div className="rounded-[28px] bg-[#131024]/95 border border-white/12 p-6 sm:p-8 shadow-[0_24px_64px_rgba(6,4,18,0.85)] backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[#7C3AED]/20 border border-[#C084FC]/40 flex items-center justify-center shrink-0">
              <ToolBazaarBolt className="w-7 h-7" />
            </div>
            <div>
              <h1 className="font-display font-extrabold text-xl text-white leading-tight">
                {needsSetup ? 'Create Admin Account' : 'Admin Panel Login'}
              </h1>
              <p className="text-xs text-[#A39DC4] mt-0.5">
                {needsSetup
                  ? `Set your admin username and password for ${siteName}`
                  : `Manage ${siteName} products, orders & users`}
              </p>
            </div>
          </div>

          {checking ? (
            <div className="py-10 text-center text-sm text-[#A39DC4]">
              Checking admin access...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {needsSetup && (
                <div className="rounded-2xl bg-[#7C3AED]/15 border border-[#C084FC]/30 px-3.5 py-2.5 text-xs text-[#E9D5FF] flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#C084FC] shrink-0 mt-0.5" />
                  <span>
                    First-time setup: choose a secure username and password
                    (minimum 8 characters) to lock and protect your Admin Panel.
                  </span>
                </div>
              )}

              <div>
                <label
                  htmlFor="admin-username"
                  className="block text-xs font-semibold text-[#CFC9EA] mb-1.5"
                >
                  Admin Username
                </label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 text-[#9A93BA] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="admin-username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. admin"
                    className="w-full h-11 pl-10 pr-3.5 rounded-2xl bg-[#1B1732] border border-white/12 text-sm text-white placeholder:text-[#7D769D] focus:outline-none focus:border-[#A855F7]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="admin-password"
                  className="block text-xs font-semibold text-[#CFC9EA] mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#9A93BA] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="admin-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={needsSetup ? 'new-password' : 'current-password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full h-11 pl-10 pr-11 rounded-2xl bg-[#1B1732] border border-white/12 text-sm text-white placeholder:text-[#7D769D] focus:outline-none focus:border-[#A855F7]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl hover:bg-white/10 flex items-center justify-center text-[#A39DC4] hover:text-white"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {needsSetup && (
                <div>
                  <label
                    htmlFor="admin-confirm-password"
                    className="block text-xs font-semibold text-[#CFC9EA] mb-1.5"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#9A93BA] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="admin-confirm-password"
                      name="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      className="w-full h-11 pl-10 pr-3.5 rounded-2xl bg-[#1B1732] border border-white/12 text-sm text-white placeholder:text-[#7D769D] focus:outline-none focus:border-[#A855F7]"
                    />
                  </div>
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="rounded-2xl bg-rose-500/15 border border-rose-400/35 px-3.5 py-2.5 text-xs font-medium text-rose-200"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-11 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#9333EA] hover:from-[#8B5CF6] hover:to-[#A855F7] disabled:opacity-60 text-sm font-bold text-white shadow-[0_8px_24px_rgba(124,58,237,0.45)] transition-all active:scale-[0.99]"
              >
                {submitting
                  ? needsSetup
                    ? 'Creating Admin Account...'
                    : 'Signing in...'
                  : needsSetup
                    ? 'Create Admin & Enter Dashboard'
                    : 'Sign In to Admin Panel'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
