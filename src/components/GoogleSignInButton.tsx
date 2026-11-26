import React from 'react';
import { Loader2 } from 'lucide-react';

interface GoogleSignInButtonProps {
  loading?: boolean;
  onClick: () => void;
  className?: string;
}

export function GoogleSignInButton({
  loading = false,
  onClick,
  className = '',
}: GoogleSignInButtonProps) {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className={`w-full h-12 rounded-2xl bg-white hover:bg-[#F5F2FF] active:scale-[0.98] text-[#141124] font-bold text-sm px-5 flex items-center justify-center gap-3 shadow-[0_8px_24px_rgba(0,0,0,0.35)] border border-white/80 transition-all disabled:opacity-65 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-[#C084FC] ${className}`}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-[#7C3AED]" />
      ) : (
        <svg
          className="w-5 h-5 shrink-0"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            fill="#4285F4"
            d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.08 3.56-5.15 3.56-8.65z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.87-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.72-4.95H1.29v3.1A12 12 0 0 0 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.29a12 12 0 0 0 0 10.8l3.99-3.1z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.94 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.6l3.99 3.1c.95-2.84 3.6-4.95 6.72-4.95z"
          />
        </svg>
      )}
      <span>{loading ? 'Connecting with Google...' : 'Continue with Google'}</span>
    </button>
  );
}
