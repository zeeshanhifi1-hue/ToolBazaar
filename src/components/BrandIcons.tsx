import React from 'react';
import type { BrandKey, CategoryId } from '../types/store';

export function ToolBazaarBolt({ className = 'w-7 h-7' }: { className?: string }) {
  const uid = React.useId().replace(/:/g, '');
  const gradId = `tb-bolt-grad-${uid}`;
  const glowId = `tb-bolt-glow-${uid}`;

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="6" y1="2" x2="26" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D8B4FE" />
          <stop offset="50%" stopColor="#9333EA" />
          <stop offset="100%" stopColor="#6D28D9" />
        </linearGradient>
        <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="M18.6 3.2L7.4 17.1c-.45.56-.05 1.4.67 1.4h6.1l-1.9 10.1c-.16.86.95 1.38 1.52.71l11.2-13.9c.45-.56.05-1.4-.67-1.4h-6.1l1.9-10.1c.16-.86-.95-1.38-1.52-.71z"
        fill={`url(#${gradId})`}
        filter={`url(#${glowId})`}
      />
    </svg>
  );
}

export function FlameBadgeIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="flame-outer" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="45%" stopColor="#FB923C" />
          <stop offset="100%" stopColor="#EF4444" />
        </linearGradient>
      </defs>
      <path
        d="M12.6 2.3c.2 3.1-2.5 4.9-3.6 7.4-.5 1.1-.4 2.4.1 3.3-1.2-.6-1.9-1.8-2-3.2C5.2 11.4 4.5 13.7 4.5 15.6c0 4.1 3.3 6.9 7.5 6.9 4.4 0 7.5-3.1 7.5-7.4 0-3.8-2.2-7.1-4.8-9.8-.7-.7-1.4-1.9-2.1-3z"
        fill="url(#flame-outer)"
      />
      <path
        d="M12.2 12.6c-.8 1.4-2.1 2.4-2.1 4.1 0 1.6 1.1 2.8 2.6 2.8 1.6 0 2.8-1.2 2.8-2.9 0-1.7-1.1-3.1-3.3-4z"
        fill="#FEF08A"
      />
    </svg>
  );
}

export function TrendingMedalIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" fill="none" className={className} aria-hidden="true">
      <path d="M9.5 17.5L6.8 25.2L11.2 23.4L13.2 26.2L14 19.2" fill="#EF4444" />
      <path d="M18.5 17.5L21.2 25.2L16.8 23.4L14.8 26.2L14 19.2" fill="#DC2626" />
      <circle cx="14" cy="11.5" r="8.2" fill="url(#medal-gold)" stroke="#FDE047" strokeWidth="1.2" />
      <path
        d="M14 6.7l1.35 2.75 3.04.44-2.2 2.14.52 3.02L14 13.62l-2.71 1.43.52-3.02-2.2-2.14 3.04-.44L14 6.7z"
        fill="#FFFBEB"
      />
      <defs>
        <linearGradient id="medal-gold" x1="7" y1="4" x2="21" y2="19" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function CrownMiniIcon({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M2.5 14.8L4 6.2l4 3.3L10 4.5l2 5 4-3.3 1.5 8.6a1 1 0 01-1 1.2H3.5a1 1 0 01-1-1.2z"
        fill="#FACC15"
      />
    </svg>
  );
}

export function CategoryIcon({
  id,
  active,
}: {
  id: CategoryId;
  active: boolean;
}) {
  switch (id) {
    case 'all':
      return (
        <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" aria-hidden="true">
          <rect x="3.5" y="3.5" width="7.2" height="7.2" rx="1.8" fill={active ? '#FFFFFF' : '#C4B5FD'} />
          <rect x="13.3" y="3.5" width="7.2" height="7.2" rx="1.8" fill={active ? '#FFFFFF' : '#C4B5FD'} />
          <rect x="3.5" y="13.3" width="7.2" height="7.2" rx="1.8" fill={active ? '#FFFFFF' : '#A78BFA'} />
          <rect x="13.3" y="13.3" width="7.2" height="7.2" rx="1.8" fill={active ? '#FFFFFF' : '#A78BFA'} />
        </svg>
      );
    case 'ai':
      return (
        <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" aria-hidden="true">
          <line x1="12" y1="3.5" x2="12" y2="6.8" stroke={active ? '#FFFFFF' : '#93C5FD'} strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="3" r="1.4" fill={active ? '#FFFFFF' : '#93C5FD'} />
          <rect x="5" y="7" width="14" height="11.5" rx="3.5" fill={active ? '#FFFFFF' : '#818CF8'} />
          <circle cx="9.3" cy="12.2" r="1.35" fill={active ? '#6D28D9' : '#0F172A'} />
          <circle cx="14.7" cy="12.2" r="1.35" fill={active ? '#6D28D9' : '#0F172A'} />
          <path d="M9.5 15.5h5" stroke={active ? '#6D28D9' : '#0F172A'} strokeWidth="1.5" strokeLinecap="round" />
          <rect x="2.6" y="10.8" width="1.8" height="4.2" rx="0.9" fill={active ? '#E9D5FF' : '#6366F1'} />
          <rect x="19.6" y="10.8" width="1.8" height="4.2" rx="0.9" fill={active ? '#E9D5FF' : '#6366F1'} />
        </svg>
      );
    case 'video':
      return (
        <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" aria-hidden="true">
          <rect
            x="2.8"
            y="5.2"
            width="18.4"
            height="13.6"
            rx="4"
            fill={active ? '#FFFFFF' : '#F87171'}
          />
          <path
            d="M10.2 9.1l5.1 2.9-5.1 2.9V9.1z"
            fill={active ? '#6D28D9' : '#1A132B'}
          />
        </svg>
      );
    case 'design':
      return (
        <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" aria-hidden="true">
          <path
            d="M19.2 4.8c.7.7.7 1.9 0 2.6l-7.7 7.7-2.6-2.6 7.7-7.7c.7-.7 1.9-.7 2.6 0z"
            fill={active ? '#FFFFFF' : '#A78BFA'}
          />
          <path
            d="M8.6 13.2c-1.8.4-3.1 1.7-3.4 3.5-.2 1.2-.9 2-1.8 2.4 1.8.8 4.4.7 6-.8 1.2-1.1 1.4-2.8.8-4.1l-1.6-1z"
            fill={active ? '#E9D5FF' : '#C084FC'}
          />
        </svg>
      );
    case 'productivity':
      return (
        <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" aria-hidden="true">
          <path d="M12 4L3.8 8.4L12 12.8L20.2 8.4L12 4Z" fill={active ? '#FFFFFF' : '#A78BFA'} />
          <path d="M3.8 12.2L12 16.6L20.2 12.2" stroke={active ? '#EDE9FE' : '#8B5CF6'} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3.8 15.8L12 20.2L20.2 15.8" stroke={active ? '#DDD6FE' : '#7C3AED'} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'more':
      return (
        <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" aria-hidden="true">
          <circle cx="6.2" cy="12" r="2" fill={active ? '#FFFFFF' : '#B8AEE0'} />
          <circle cx="12" cy="12" r="2" fill={active ? '#FFFFFF' : '#B8AEE0'} />
          <circle cx="17.8" cy="12" r="2" fill={active ? '#FFFFFF' : '#B8AEE0'} />
        </svg>
      );
  }
}

export function BrandAppIcon({
  brand,
  logoUrl,
  size = 'md',
  className = '',
}: {
  brand: BrandKey;
  logoUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'podium';
  className?: string;
}) {
  const [imgFailed, setImgFailed] = React.useState(false);

  React.useEffect(() => {
    setImgFailed(false);
  }, [logoUrl]);

  const sizeClass =
    size === 'sm'
      ? 'w-10 h-10 rounded-[11px]'
      : size === 'lg'
        ? 'w-14 h-14 rounded-[16px]'
        : size === 'podium'
          ? 'w-14 h-14 sm:w-16 sm:h-16 rounded-[16px]'
          : 'w-12 h-12 rounded-[14px]';

  const glossOverlay = (
    <div
      className="pointer-events-none absolute inset-0 rounded-[inherit]"
      style={{
        background:
          'linear-gradient(145deg, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.06) 42%, rgba(0,0,0,0.12) 100%)',
      }}
    />
  );

  if (logoUrl && !imgFailed) {
    return (
      <div
        className={`relative flex items-center justify-center shrink-0 overflow-hidden shadow-lg border border-white/25 bg-[#1B1730] ${sizeClass} ${className}`}
      >
        <img
          src={logoUrl}
          alt=""
          aria-hidden="true"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover block"
        />
        {glossOverlay}
      </div>
    );
  }

  switch (brand) {
    case 'chatgpt':
      return (
        <div
          className={`relative flex items-center justify-center shrink-0 overflow-hidden shadow-lg border border-white/25 ${sizeClass} ${className}`}
          style={{ background: 'linear-gradient(140deg, #21D9A2 0%, #0FA57A 58%, #077054 100%)' }}
        >
          {glossOverlay}
          <svg viewBox="0 0 40 40" className="w-[70%] h-[70%] relative z-10" fill="none" aria-hidden="true">
            <g stroke="#FFFFFF" strokeWidth="2.15" strokeLinecap="round" strokeLinejoin="round">
              {[0, 60, 120, 180, 240, 300].map((deg) => (
                <path
                  key={deg}
                  transform={`rotate(${deg} 20 20)`}
                  d="M20 15.2V8.9a4.4 4.4 0 0 1 7.6-2.9c1.7 1.8 1.6 4.7-.3 6.3l-4.5 3.6"
                />
              ))}
            </g>
          </svg>
        </div>
      );

    case 'capcut':
      return (
        <div
          className={`relative flex items-center justify-center shrink-0 overflow-hidden shadow-lg border border-white/50 ${sizeClass} ${className}`}
          style={{ background: 'linear-gradient(145deg, #FFFFFF 0%, #EEF0F6 68%, #D8DCE8 100%)' }}
        >
          {glossOverlay}
          <svg viewBox="0 0 40 40" className="w-[66%] h-[66%] relative z-10" fill="none" aria-hidden="true">
            <path
              d="M9.5 11.8h12.2c2.2 0 3.5 1.3 3.5 3.1v1.2L31 13.2v4.1l-9.2 4.7 9.2 4.7v4.1l-5.8-2.9v1.2c0 1.8-1.3 3.1-3.5 3.1H9.5c-1.8 0-3-1.2-3-2.9v-4.7l6.6-2.6-6.6-2.6v-4.7c0-1.7 1.2-2.9 3-2.9zm2 4.2v2.4l7.6 3.6-7.6 3.6V28h9.6v-2.4l-6.1-3.6 6.1-3.6V16h-9.6z"
              fill="#0D0B14"
            />
          </svg>
        </div>
      );

    case 'canva':
      return (
        <div
          className={`relative flex items-center justify-center shrink-0 overflow-hidden shadow-lg border border-white/25 ${sizeClass} ${className}`}
          style={{ background: 'linear-gradient(135deg, #00D2D3 0%, #3B82F6 52%, #8B3DFF 100%)' }}
        >
          {glossOverlay}
          <span
            className="relative z-10 text-white font-bold italic tracking-tight select-none"
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: size === 'sm' ? '12px' : size === 'lg' || size === 'podium' ? '16px' : '14px',
              textShadow: '0 1px 4px rgba(0,0,0,0.25)',
            }}
          >
            Canva
          </span>
        </div>
      );

    case 'adobe':
      return (
        <div
          className={`relative flex items-center justify-center shrink-0 overflow-hidden shadow-lg border border-white/25 ${sizeClass} ${className}`}
          style={{ background: 'linear-gradient(145deg, #FF2A1F 0%, #E10E17 55%, #A30816 100%)' }}
        >
          {glossOverlay}
          <svg viewBox="0 0 40 40" className="w-[64%] h-[64%] relative z-10" fill="none" aria-hidden="true">
            <path d="M23.5 9H32v22.5L23.5 9z" fill="#FFFFFF" />
            <path d="M16.5 9H8v22.5L16.5 9z" fill="#FFFFFF" />
            <path d="M20 17.5L25.4 31.5h-4.2l-1.5-4.3h-4.1L20 17.5z" fill="#FFFFFF" />
          </svg>
        </div>
      );

    case 'midjourney':
      return (
        <div
          className={`relative flex items-center justify-center shrink-0 overflow-hidden shadow-lg border border-white/20 ${sizeClass} ${className}`}
          style={{ background: 'linear-gradient(145deg, #1E1B4B 0%, #3730A3 60%, #4F46E5 100%)' }}
        >
          {glossOverlay}
          <svg viewBox="0 0 40 40" className="w-[68%] h-[68%] relative z-10" fill="none" aria-hidden="true">
            <path d="M12 24c4-7 7-11 9-14 1 6 3 10 6 14H12z" stroke="#FFFFFF" strokeWidth="2.2" strokeLinejoin="round" />
            <path d="M9 27c4.5 2.4 17.5 2.4 22 0" stroke="#A5B4FC" strokeWidth="2.3" strokeLinecap="round" />
            <path d="M15 24c2-4 3.5-7 4.2-10" stroke="#E0E7FF" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
      );

    case 'claude':
      return (
        <div
          className={`relative flex items-center justify-center shrink-0 overflow-hidden shadow-lg border border-white/25 ${sizeClass} ${className}`}
          style={{ background: 'linear-gradient(145deg, #F0936F 0%, #D97757 58%, #A64E32 100%)' }}
        >
          {glossOverlay}
          <svg viewBox="0 0 40 40" className="w-[62%] h-[62%] relative z-10" fill="none" aria-hidden="true">
            <path
              d="M20 7v26M7 20h26M10.8 10.8l18.4 18.4M29.2 10.8L10.8 29.2"
              stroke="#FFF8F4"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
            <circle cx="20" cy="20" r="3.5" fill="#FFF8F4" />
          </svg>
        </div>
      );

    case 'premiere':
      return (
        <div
          className={`relative flex items-center justify-center shrink-0 overflow-hidden shadow-lg border border-[#A78BFA]/50 ${sizeClass} ${className}`}
          style={{ background: 'linear-gradient(145deg, #1E0B4B 0%, #0D0526 100%)' }}
        >
          {glossOverlay}
          <span className="relative z-10 font-display font-extrabold text-[#B794FF] text-[19px] tracking-tight">
            Pr
          </span>
        </div>
      );

    case 'figma':
      return (
        <div
          className={`relative flex items-center justify-center shrink-0 overflow-hidden shadow-lg border border-white/20 ${sizeClass} ${className}`}
          style={{ background: 'linear-gradient(145deg, #27223B 0%, #151222 100%)' }}
        >
          {glossOverlay}
          <svg viewBox="0 0 40 40" className="w-[64%] h-[64%] relative z-10" fill="none" aria-hidden="true">
            <path d="M15 9h5v8h-5a4 4 0 010-8z" fill="#F24E1E" />
            <path d="M20 9h5a4 4 0 010 8h-5V9z" fill="#FF7262" />
            <path d="M15 17h5v8h-5a4 4 0 010-8z" fill="#A259FF" />
            <circle cx="24" cy="21" r="4" fill="#1ABCFE" />
            <path d="M15 25h5v4a4 4 0 11-5-4z" fill="#0ACF83" />
          </svg>
        </div>
      );

    case 'notion':
      return (
        <div
          className={`relative flex items-center justify-center shrink-0 overflow-hidden shadow-lg border border-white/40 ${sizeClass} ${className}`}
          style={{ background: 'linear-gradient(145deg, #FFFFFF 0%, #E5E7EB 100%)' }}
        >
          {glossOverlay}
          <span
            className="relative z-10 font-extrabold text-[#111118] text-[22px] leading-none"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            N
          </span>
        </div>
      );

    case 'grammarly':
      return (
        <div
          className={`relative flex items-center justify-center shrink-0 overflow-hidden shadow-lg border border-white/25 ${sizeClass} ${className}`}
          style={{ background: 'linear-gradient(145deg, #1AE0B2 0%, #11A683 100%)' }}
        >
          {glossOverlay}
          <svg viewBox="0 0 40 40" className="w-[62%] h-[62%] relative z-10" fill="none" aria-hidden="true">
            <path
              d="M28.5 16.5A9.5 9.5 0 1029 22h-8.5"
              stroke="#FFFFFF"
              strokeWidth="3.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M24 18.5L29 22l-3.6 3.6" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      );

    case 'perplexity':
      return (
        <div
          className={`relative flex items-center justify-center shrink-0 overflow-hidden shadow-lg border border-white/25 ${sizeClass} ${className}`}
          style={{ background: 'linear-gradient(145deg, #22D3EE 0%, #0E7490 100%)' }}
        >
          {glossOverlay}
          <svg viewBox="0 0 40 40" className="w-[62%] h-[62%] relative z-10" fill="none" aria-hidden="true">
            <path
              d="M20 8v24M11 13l9 7 9-7M11 27l9-7 9 7M12 10h16v20H12z"
              stroke="#FFFFFF"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      );

    case 'envato':
      return (
        <div
          className={`relative flex items-center justify-center shrink-0 overflow-hidden shadow-lg border border-white/25 ${sizeClass} ${className}`}
          style={{ background: 'linear-gradient(145deg, #A3E635 0%, #4D7C0F 100%)' }}
        >
          {glossOverlay}
          <svg viewBox="0 0 40 40" className="w-[60%] h-[60%] relative z-10" fill="none" aria-hidden="true">
            <path
              d="M26.5 9.5c-7.5 1-14.5 7.5-14.5 15.5 0 4.5 3.6 7.5 8 7.5 6.8 0 11.2-5.5 10.5-14.5-.2-3-1.4-6.4-4-8.5z"
              fill="#FFFFFF"
            />
            <path d="M16 26c2-4 5.2-7.8 9.2-10.5" stroke="#4D7C0F" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </div>
      );
  }
}
