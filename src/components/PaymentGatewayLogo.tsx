import React from 'react';
import { CreditCard } from 'lucide-react';
import type { PaymentGateway } from '../types/store';
import { sanitizeSafeMediaUrl } from '../utils/supabaseMappers';

interface PaymentGatewayLogoProps {
  gateway?: Pick<PaymentGateway, 'id' | 'name' | 'logoUrl'>;
  name?: string;
  logoUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  sizeClass?: string;
}

const SIZE_CLASSES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-9 h-9',
  md: 'w-11 h-11',
  lg: 'w-12 h-12',
};

export function PaymentGatewayLogo({
  gateway,
  name,
  logoUrl,
  size = 'md',
  sizeClass,
}: PaymentGatewayLogoProps) {
  const resolvedName = gateway?.name || name || 'Payment Gateway';
  const resolvedLogoUrl = gateway?.logoUrl ?? logoUrl;
  const resolvedSizeClass = sizeClass || SIZE_CLASSES[size];
  const safeLogo = sanitizeSafeMediaUrl(resolvedLogoUrl);

  if (safeLogo) {
    return (
      <div
        className={`${resolvedSizeClass} rounded-xl bg-white/95 p-1 flex items-center justify-center overflow-hidden shadow-md border border-white/20 shrink-0`}
      >
        <img
          src={safeLogo}
          alt={`${resolvedName} logo`}
          className="w-full h-full object-contain rounded-lg"
          loading="lazy"
        />
      </div>
    );
  }

  const key = `${gateway?.id || ''} ${resolvedName}`.toLowerCase();

  // EasyPaisa — Vibrant green rounded tile with stylized 'e'
  if (key.includes('easypaisa') || key.includes('easy paisa')) {
    return (
      <div
        className={`${resolvedSizeClass} rounded-xl flex items-center justify-center shrink-0 shadow-[0_6px_16px_rgba(34,197,94,0.38)]`}
        style={{
          background: 'linear-gradient(145deg, #4ADE80 0%, #16A34A 65%, #15803D 100%)',
        }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 40 40" className="w-7 h-7" fill="none">
          <path
            d="M27.6 21.8H14.8c.5 3.1 2.9 5 6.3 5 2.4 0 4.3-.9 5.6-2.3l2.6 2.4c-1.9 2.3-4.9 3.6-8.4 3.6-6.2 0-10.3-4.2-10.3-10.4 0-6.1 4.2-10.6 10.1-10.6 5.9 0 9.6 4.1 9.6 10.2 0 .8-.1 1.5-.2 2.1h-2.5zm-12.7-3.4h11c-.4-2.9-2.3-4.9-5.3-4.9-3 0-5.1 2-5.7 4.9z"
            fill="#FFFFFF"
          />
        </svg>
      </div>
    );
  }

  // JazzCash — Bold crimson circular emblem with golden Jazz accent
  if (key.includes('jazz')) {
    return (
      <div
        className={`${resolvedSizeClass} rounded-full flex items-center justify-center shrink-0 shadow-[0_6px_16px_rgba(220,38,38,0.4)] border border-amber-300/35`}
        style={{
          background: 'radial-gradient(circle at 30% 25%, #FB923C 0%, #DC2626 52%, #7F1D1D 100%)',
        }}
        aria-hidden="true"
      >
        <span className="font-display font-black text-[13px] tracking-tight text-amber-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]">
          Jazz
        </span>
      </div>
    );
  }

  // USDT / Crypto — Clean Tether emerald circle
  if (
    key.includes('usdt') ||
    key.includes('trc20') ||
    key.includes('crypto') ||
    key.includes('tether') ||
    key.includes('binance')
  ) {
    return (
      <div
        className={`${resolvedSizeClass} rounded-full flex items-center justify-center shrink-0 shadow-[0_6px_16px_rgba(16,185,129,0.38)]`}
        style={{
          background: 'linear-gradient(145deg, #34D399 0%, #10B981 55%, #047857 100%)',
        }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 40 40" className="w-7 h-7" fill="none">
          <path d="M11 11h18v4h-6.8v14h-4.4V15H11v-4z" fill="#FFFFFF" />
          <ellipse
            cx="20"
            cy="20.5"
            rx="11"
            ry="3.1"
            stroke="#FFFFFF"
            strokeWidth="2.4"
          />
        </svg>
      </div>
    );
  }

  // UPI / PhonePe / GPay — Clean uniform tile matching the other cards (no clutter)
  if (
    key.includes('upi') ||
    key.includes('phonepe') ||
    key.includes('gpay') ||
    key.includes('paytm')
  ) {
    return (
      <div
        className={`${resolvedSizeClass} rounded-xl flex items-center justify-center shrink-0 shadow-[0_6px_16px_rgba(99,102,241,0.38)] border border-indigo-300/25`}
        style={{
          background: 'linear-gradient(145deg, #4338CA 0%, #312E81 60%, #1E1B4B 100%)',
        }}
        aria-hidden="true"
      >
        <div className="flex items-center gap-0.5">
          <span className="font-display font-black italic text-[13px] tracking-tight text-white">
            UPI
          </span>
          <svg viewBox="0 0 10 14" className="w-2.5 h-3.5" fill="none">
            <path d="M1 1l5 6-5 6" stroke="#FB923C" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4.5 1l5 6-5 6" stroke="#22C55E" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    );
  }

  // Generic Payment Gateway Icon
  return (
    <div
      className={`${resolvedSizeClass} rounded-xl flex items-center justify-center shrink-0 shadow-[0_6px_16px_rgba(124,58,237,0.35)] border border-[#C084FC]/30`}
      style={{
        background: 'linear-gradient(145deg, #9333EA 0%, #6D28D9 65%, #4C1D95 100%)',
      }}
      aria-hidden="true"
    >
      <CreditCard className="w-5 h-5 text-white" />
    </div>
  );
}

export function Wallet3DBadge({ className = 'w-14 h-14' }: { className?: string }) {
  return (
    <div
      className={`${className} relative flex items-center justify-center shrink-0`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-[0_10px_18px_rgba(124,58,237,0.5)]" fill="none">
        <defs>
          <linearGradient id="walletBodyGrad" x1="8" y1="16" x2="54" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#A855F7" />
            <stop offset="55%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#4C1D95" />
          </linearGradient>
          <linearGradient id="walletCashGrad" x1="16" y1="8" x2="48" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4ADE80" />
            <stop offset="100%" stopColor="#16A34A" />
          </linearGradient>
          <linearGradient id="walletClaspGrad" x1="38" y1="30" x2="58" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#C084FC" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
        </defs>
        {/* Cash notes sticking out of the wallet */}
        <rect x="18" y="10" width="28" height="18" rx="4" transform="rotate(-11 18 10)" fill="#22C55E" opacity="0.85" />
        <rect x="20" y="13" width="28" height="18" rx="4" transform="rotate(-4 20 13)" fill="url(#walletCashGrad)" />
        {/* Main purple wallet body */}
        <rect x="8" y="20" width="46" height="34" rx="10" fill="url(#walletBodyGrad)" stroke="#E9D5FF" strokeOpacity="0.35" strokeWidth="1.5" />
        {/* Highlight edge */}
        <path d="M16 24h30" stroke="#F3E8FF" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />
        {/* Magnetic side clasp */}
        <rect x="38" y="31" width="18" height="12" rx="6" fill="url(#walletClaspGrad)" stroke="#F3E8FF" strokeOpacity="0.45" strokeWidth="1.5" />
        <circle cx="44.5" cy="37" r="2.8" fill="#F5F3FF" />
      </svg>
    </div>
  );
}
