import React, { useState } from 'react';
import {
  Check,
  ChevronDown,
  Copy,
  Gift,
  Heart,
  HelpCircle,
  LogOut,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import type { CurrencyCode, ToolProduct, UserProfile } from '../types/store';
import { formatCurrency } from '../utils/storeLogic';
import { BrandAppIcon, ToolBazaarBolt } from './BrandIcons';
import { GoogleSignInButton } from './GoogleSignInButton';

interface ProfileViewProps {
  user: UserProfile | null;
  authLoading: boolean;
  authError: string | null;
  orderCount: number;
  wishlistTools: ToolProduct[];
  currency: CurrencyCode;
  onContinueWithGoogle: () => void;
  onSignOut: () => void;
  onOpenTool: (tool: ToolProduct) => void;
  onGoToOrders: () => void;
}

const FAQS = [
  {
    q: 'How fast is digital tool delivery?',
    a: 'All orders are delivered instantly in your Orders tab and email right after checkout with official activation instructions.',
  },
  {
    q: 'Are accounts safe and backed by warranty?',
    a: 'Yes, every ToolBazaar subscription includes 100% working assurance and full replacement coverage for your selected plan duration.',
  },
  {
    q: 'Which promo codes are active today?',
    a: 'Use SAVE10 for 10% off or BAZAAR20 for 20% off any AI, Video, or Design subscription in your cart.',
  },
];

export function ProfileView({
  user,
  authLoading,
  authError,
  orderCount,
  wishlistTools,
  currency,
  onContinueWithGoogle,
  onSignOut,
  onOpenTool,
  onGoToOrders,
}: ProfileViewProps) {
  const [copiedRef, setCopiedRef] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const referralCode = 'BAZAAR20';

  const handleCopyReferral = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
    } catch {
      // Ignore restricted clipboard environments
    }
    setCopiedRef(true);
    window.setTimeout(() => setCopiedRef(false), 1800);
  };

  if (!user) {
    return (
      <section
        aria-label="Sign in to Profile"
        className="mt-8 sm:mt-12 flex items-center justify-center"
      >
        <div
          className="w-full max-w-md rounded-[26px] border border-[#A78BFA]/35 p-7 sm:p-8 text-center shadow-[0_18px_50px_rgba(6,4,18,0.65)] space-y-6"
          style={{
            background:
              'linear-gradient(145deg, rgba(34, 23, 72, 0.92) 0%, rgba(20, 16, 40, 0.98) 60%, rgba(16, 13, 30, 1) 100%)',
          }}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-[#271C52] border border-[#C084FC]/45 flex items-center justify-center shadow-[0_0_24px_rgba(139,92,246,0.4)]">
              <ToolBazaarBolt className="w-8 h-8" />
            </div>
            <div>
              <h1 className="font-display font-extrabold text-xl sm:text-2xl text-white">
                Welcome to ToolBazaar
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm text-[#B8B1D6] leading-relaxed">
                Sign in with your Google account to create your profile and access your orders.
              </p>
            </div>
          </div>

          <GoogleSignInButton
            loading={authLoading}
            onClick={onContinueWithGoogle}
          />

          {authError && (
            <p
              role="alert"
              className="text-xs text-[#FF8593] bg-[#3B1522]/70 border border-[#F43F5E]/35 rounded-xl px-3.5 py-2.5 leading-relaxed"
            >
              {authError}
            </p>
          )}
        </div>
      </section>
    );
  }

  return (
    <section aria-label="User Profile" className="mt-3 space-y-4">
      {/* Authenticated Google User Card */}
      <div
        className="rounded-[24px] border border-[#A78BFA]/35 p-5 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap"
        style={{
          background:
            'linear-gradient(135deg, #1E1540 0%, #2C1A5E 55%, #191330 100%)',
        }}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          {user.avatarUrl && !avatarFailed ? (
            <img
              src={user.avatarUrl}
              alt={user.fullName}
              referrerPolicy="no-referrer"
              onError={() => setAvatarFailed(true)}
              className="w-14 h-14 rounded-2xl object-cover border border-[#C084FC]/50 shadow-lg shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#A855F7] to-[#6366F1] flex items-center justify-center font-display font-extrabold text-xl text-white shadow-lg shrink-0">
              {user.initials}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-display font-bold text-lg text-white truncate">
              {user.fullName}
            </h1>
            <p className="text-xs text-[#C7C0E6] truncate">{user.email}</p>
            <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#4ADE80]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified Google Account</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onGoToOrders}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/18 border border-white/15 text-xs font-bold text-white transition-colors"
          >
            {orderCount} {orderCount === 1 ? 'Order' : 'Orders'}
          </button>
          <button
            type="button"
            onClick={onSignOut}
            aria-label="Sign out"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#2B1733] hover:bg-[#3D1D47] border border-[#F43F5E]/35 text-xs font-bold text-[#FDA4AF] transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Wallet & Referral Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-[20px] bg-[#161327] border border-white/10 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#22C55E]/15 border border-[#4ADE80]/30 flex items-center justify-center text-[#4ADE80]">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-[#A39DC4]">ToolBazaar Credits</div>
              <div className="font-display font-extrabold text-lg text-white tabular-nums">
                {formatCurrency(user.walletCredits, currency)}
              </div>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-[#4ADE80]">Ready</span>
        </div>

        <div className="rounded-[20px] bg-[#161327] border border-white/10 p-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#A855F7]/20 border border-[#C084FC]/35 flex items-center justify-center text-[#D8B4FE] shrink-0">
              <Gift className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-[#A39DC4]">Active VIP Promo</div>
              <div className="font-mono font-bold text-sm text-white tracking-wider">
                {referralCode}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopyReferral}
            className="inline-flex items-center gap-1 rounded-xl bg-[#2A1F52] hover:bg-[#3B2B73] border border-[#A78BFA]/40 px-3 py-1.5 text-xs font-bold text-white shrink-0"
          >
            {copiedRef ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#4ADE80]" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Saved Tools / Wishlist */}
      <div className="rounded-[22px] bg-[#161327] border border-white/10 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-base text-white flex items-center gap-2">
            <Heart className="w-4 h-4 text-[#F472B6]" />
            Saved Tools
          </h2>
          <span className="text-xs text-[#A39DC4] tabular-nums">
            {wishlistTools.length} saved
          </span>
        </div>

        {wishlistTools.length === 0 ? (
          <p className="text-xs text-[#9D97BC] py-2">
            Tap the heart icon inside any tool card to bookmark deals here.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {wishlistTools.map((tool) => (
              <button
                key={tool.id}
                type="button"
                onClick={() => onOpenTool(tool)}
                className="flex items-center justify-between gap-3 rounded-2xl bg-[#1E1A35] hover:bg-[#272246] border border-white/10 p-3 text-left transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <BrandAppIcon brand={tool.brand} logoUrl={tool.logoUrl} size="sm" />
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-white truncate">
                      {tool.name}
                    </div>
                    <div className="text-[11px] text-[#A8A2C6] truncate">
                      {tool.subtitle}
                    </div>
                  </div>
                </div>
                <span className="font-display font-extrabold text-sm text-white tabular-nums shrink-0">
                  {formatCurrency(tool.price, currency)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Support & FAQ */}
      <div className="rounded-[22px] bg-[#161327] border border-white/10 p-4 space-y-2.5">
        <h2 className="font-display font-bold text-base text-white flex items-center gap-2 mb-1">
          <HelpCircle className="w-4 h-4 text-[#C084FC]" />
          Support &amp; Frequently Asked Questions
        </h2>
        {FAQS.map((item, idx) => {
          const expanded = openFaq === idx;
          return (
            <div
              key={item.q}
              className="rounded-xl bg-[#110E20] border border-white/[0.07] overflow-hidden"
            >
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setOpenFaq(expanded ? null : idx)}
                className="w-full px-3.5 py-3 flex items-center justify-between gap-2 text-left text-xs sm:text-sm font-semibold text-white"
              >
                <span>{item.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-[#A78BFA] shrink-0 transition-transform ${
                    expanded ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {expanded && (
                <p className="px-3.5 pb-3 text-xs text-[#B5AFD2] leading-relaxed">
                  {item.a}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
