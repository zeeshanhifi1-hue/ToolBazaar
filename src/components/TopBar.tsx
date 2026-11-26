import React from 'react';
import { Bell, Menu, Search, ShoppingCart, X } from 'lucide-react';
import { ToolBazaarBolt } from './BrandIcons';

interface TopBarProps {
  unreadCount: number;
  searchOpen: boolean;
  searchQuery?: string;
  searchResultCount?: number;
  cartCount?: number;
  siteName?: string;
  siteTagline?: string;
  onOpenMenu: () => void;
  onToggleSearch: () => void;
  onSearchChange?: (value: string) => void;
  onOpenCart?: () => void;
  onOpenNotifications: () => void;
  onGoHome: () => void;
}

function renderSplitBrandName(name: string) {
  const clean = name.trim() || 'ToolBazaar';
  if (clean === 'ToolBazaar') {
    return (
      <>
        <span className="text-[#B688FF]">Tool</span>
        <span className="text-white">Bazaar</span>
      </>
    );
  }
  const spaceIdx = clean.indexOf(' ');
  if (spaceIdx > 0) {
    return (
      <>
        <span className="text-[#B688FF]">{clean.slice(0, spaceIdx)}</span>
        <span className="text-white">{clean.slice(spaceIdx)}</span>
      </>
    );
  }
  const mid = Math.ceil(clean.length / 2);
  return (
    <>
      <span className="text-[#B688FF]">{clean.slice(0, mid)}</span>
      <span className="text-white">{clean.slice(mid)}</span>
    </>
  );
}

export function TopBar({
  unreadCount,
  searchOpen,
  searchQuery = '',
  searchResultCount,
  cartCount = 0,
  siteName = 'ToolBazaar',
  siteTagline = 'Premium Tools & Digital Products',
  onOpenMenu,
  onToggleSearch,
  onSearchChange,
  onOpenCart,
  onOpenNotifications,
  onGoHome,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 bg-[#0A0814]/92 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="max-w-[1680px] mx-auto px-3 sm:px-6 lg:px-6 xl:px-8 h-[56px] sm:h-[60px] lg:h-[66px] flex items-center justify-between gap-2 lg:gap-6">
        {/* Left: Hamburger + Brand Lockup */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Open navigation menu"
            className="w-10 h-10 sm:w-11 sm:h-11 lg:w-10 lg:h-10 rounded-[13px] sm:rounded-[14px] lg:rounded-xl bg-[#1D192E] hover:bg-[#272240] border border-white/10 flex items-center justify-center text-white shrink-0 transition-all active:scale-95 focus-visible:outline-2 focus-visible:outline-[#A855F7]"
          >
            <Menu className="w-5 h-5 stroke-[2.2]" />
          </button>

          <button
            type="button"
            onClick={onGoHome}
            aria-label={`${siteName} Home`}
            className="flex items-center gap-1.5 sm:gap-2 text-left min-w-0 group focus-visible:outline-2 focus-visible:outline-[#A855F7] rounded-xl py-1"
          >
            <ToolBazaarBolt className="w-6 h-6 sm:w-8 sm:h-8 shrink-0 transition-transform duration-200 group-hover:scale-105" />
            <div className="min-w-0">
              <div className="font-display font-extrabold text-[19px] sm:text-[23px] leading-[1.06] tracking-tight whitespace-nowrap">
                {renderSplitBrandName(siteName)}
              </div>
              <p className="text-[10px] sm:text-[12px] text-[#ABA5C8] leading-tight whitespace-nowrap mt-0.5 tracking-[-0.01em]">
                {siteTagline}
              </p>
            </div>
          </button>
        </div>

        {/* Center (Desktop Only): Sleek Integrated Search Bar */}
        {onSearchChange && (
          <div className="hidden lg:flex flex-1 max-w-[540px] xl:max-w-[620px] items-center">
            <div className="w-full h-[42px] rounded-full bg-[#151126] hover:bg-[#19142E] focus-within:bg-[#1A1531] border border-white/10 focus-within:border-[#A78BFA]/60 px-4 flex items-center gap-2.5 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <Search className="w-4 h-4 text-[#A79BC9] shrink-0" />
              <label htmlFor="desktop-toolbazaar-search" className="sr-only">
                Search premium digital tools
              </label>
              <input
                id="desktop-toolbazaar-search"
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search ChatGPT Plus, CapCut Pro, Canva, Adobe..."
                className="flex-1 bg-transparent text-[13.5px] text-white placeholder:text-[#847DA6] focus:outline-none min-w-0"
              />
              {searchQuery && (
                <>
                  {typeof searchResultCount === 'number' && (
                    <span className="text-[11px] font-medium text-[#C4B5FD] whitespace-nowrap tabular-nums">
                      {searchResultCount} results
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onSearchChange('')}
                    aria-label="Clear search"
                    className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Right: Mobile Search + Desktop Cart + Notifications */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Mobile/Tablet Search Toggle */}
          <button
            type="button"
            onClick={onToggleSearch}
            aria-label="Search tools"
            aria-expanded={searchOpen}
            className={`lg:hidden w-10 h-10 sm:w-11 sm:h-11 rounded-full border flex items-center justify-center transition-all active:scale-95 focus-visible:outline-2 focus-visible:outline-[#A855F7] ${
              searchOpen
                ? 'bg-[#6D28D9] border-[#C084FC]/60 text-white shadow-[0_0_18px_rgba(139,92,246,0.45)]'
                : 'bg-[#1D192E] hover:bg-[#272240] border-white/10 text-[#EAE6FF]'
            }`}
          >
            <Search className="w-[18px] h-[18px] sm:w-[19px] sm:h-[19px] stroke-[2.2]" />
          </button>

          {/* Desktop Quick Cart Action */}
          {onOpenCart && (
            <button
              type="button"
              onClick={onOpenCart}
              aria-label={`Shopping cart${cartCount > 0 ? `, ${cartCount} items` : ''}`}
              className="hidden lg:inline-flex items-center gap-2 h-10 px-4 rounded-full bg-[#19142D] hover:bg-[#241D40] border border-[#A78BFA]/30 hover:border-[#C4B5FD]/55 text-[13px] font-semibold text-white transition-all active:scale-95 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#A855F7]"
            >
              <ShoppingCart className="w-4 h-4 text-[#C4B5FD] stroke-[2.2]" />
              <span>Cart</span>
              {cartCount > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#7C3AED] text-white text-[11px] font-bold flex items-center justify-center tabular-nums">
                  {cartCount}
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onOpenNotifications}
            aria-label={
              unreadCount > 0
                ? `Notifications (${unreadCount} unread)`
                : 'Notifications'
            }
            className="relative w-10 h-10 sm:w-11 sm:h-11 lg:w-10 lg:h-10 rounded-full bg-[#1D192E] hover:bg-[#272240] border border-white/10 flex items-center justify-center text-[#EAE6FF] transition-all active:scale-95 focus-visible:outline-2 focus-visible:outline-[#A855F7]"
          >
            <Bell className="w-[18px] h-[18px] sm:w-[19px] sm:h-[19px] stroke-[2.2]" />
            {unreadCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute top-1.5 right-2 sm:top-2 sm:right-2.5 lg:top-1.5 lg:right-2 w-2.5 h-2.5 rounded-full bg-[#FF4557] ring-2 ring-[#1D192E]"
              />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
