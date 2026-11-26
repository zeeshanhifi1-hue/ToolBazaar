import React from 'react';
import { Box, Home, LayoutGrid, ShoppingCart, User } from 'lucide-react';
import type { NavTab } from '../types/store';

interface BottomNavProps {
  activeTab: NavTab;
  cartCount: number;
  onSelectTab: (tab: NavTab) => void;
  onOpenCart: () => void;
}

export function BottomNav({
  activeTab,
  cartCount,
  onSelectTab,
  onOpenCart,
}: BottomNavProps) {
  const renderTabButton = (
    tab: NavTab,
    label: string,
    Icon: React.ComponentType<{ className?: string }>
  ) => {
    const isActive = activeTab === tab;
    return (
      <button
        key={tab}
        type="button"
        onClick={() => onSelectTab(tab)}
        aria-current={isActive ? 'page' : undefined}
        className={`relative flex flex-col items-center justify-center min-h-[54px] px-2 sm:px-4 py-1.5 rounded-[18px] transition-all duration-200 active:scale-95 focus-visible:outline-2 focus-visible:outline-[#C084FC] ${
          isActive
            ? 'text-white border border-[#D8B4FE]/45'
            : 'text-[#BDB7DB] hover:text-white'
        }`}
        style={
          isActive
            ? {
                background:
                  'linear-gradient(180deg, #9C57FF 0%, #6F32F2 65%, #5521CE 100%)',
                boxShadow:
                  '0 6px 22px rgba(139, 92, 246, 0.55), inset 0 1px 1px rgba(255,255,255,0.35)',
              }
            : undefined
        }
      >
        <Icon
          className={`w-[21px] h-[21px] ${
            isActive ? 'stroke-[2.3]' : 'stroke-[1.8]'
          }`}
        />
        <span
          className={`mt-1 text-[11px] leading-none whitespace-nowrap ${
            isActive ? 'font-bold text-white' : 'font-medium'
          }`}
        >
          {label}
        </span>
      </button>
    );
  };

  return (
    <nav
      aria-label="Primary navigation"
      className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none"
    >
      {/* Mobile & Tablet (< lg): Exact Original Floating Bottom Dock */}
      <div className="lg:hidden max-w-3xl mx-auto px-0 sm:px-4 sm:pb-3 pointer-events-auto">
        <div
          className="relative grid grid-cols-5 items-center h-[74px] px-2.5 sm:px-5 rounded-t-[26px] sm:rounded-[28px] border-t sm:border border-white/14 bg-[#141123]/95 backdrop-blur-2xl"
          style={{
            boxShadow: '0 -8px 34px rgba(5, 3, 16, 0.82)',
          }}
        >
          {renderTabButton('home', 'Home', Home)}
          {renderTabButton('categories', 'Categories', LayoutGrid)}

          {/* Center Floating Glowing Cart Orb */}
          <div className="flex items-center justify-center relative">
            {/* Soft aura bloom behind orb */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-9 w-24 h-16 rounded-full bg-[#8B5CF6]/45 blur-xl"
            />
            <button
              type="button"
              onClick={onOpenCart}
              aria-label={`Open shopping cart${cartCount > 0 ? `, ${cartCount} items` : ''}`}
              className="relative -mt-8 w-[64px] h-[64px] rounded-full flex items-center justify-center text-white border-[2px] border-[#E9D5FF]/65 transition-transform duration-200 hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-white"
              style={{
                background:
                  'radial-gradient(circle at 35% 25%, #C084FC 0%, #8344FF 48%, #4F1EDB 100%)',
                boxShadow:
                  '0 0 32px rgba(139, 92, 246, 0.8), 0 8px 20px rgba(15, 7, 45, 0.85), inset 0 2px 4px rgba(255,255,255,0.45)',
              }}
            >
              <ShoppingCart className="w-7 h-7 stroke-[2.2]" />
              {cartCount > 0 && (
                <span
                  data-testid="cart-badge-count"
                  className="absolute -top-0.5 -right-0.5 min-w-[22px] h-[22px] px-1 rounded-full bg-[#FF4557] text-white text-[11px] font-extrabold flex items-center justify-center border-2 border-[#141123] tabular-nums shadow"
                >
                  {cartCount}
                </span>
              )}
            </button>
          </div>

          {renderTabButton('orders', 'Orders', Box)}
          {renderTabButton('profile', 'Profile', User)}
        </div>
      </div>

      {/* Desktop / Laptop (lg+): Sleek, Ultra-Compact Low-Profile Floating Command Dock */}
      <div className="hidden lg:flex justify-center pb-3.5 px-4 pointer-events-none">
        <div
          className="pointer-events-auto inline-flex items-center gap-1.5 h-[52px] px-2 rounded-full border border-white/14 bg-[#120E24]/88 backdrop-blur-2xl"
          style={{
            boxShadow:
              '0 14px 36px rgba(4, 2, 16, 0.85), 0 0 24px rgba(124, 58, 237, 0.2), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        >
          {(
            [
              { tab: 'home', label: 'Home', Icon: Home },
              { tab: 'categories', label: 'Categories', Icon: LayoutGrid },
            ] as const
          ).map(({ tab, label, Icon }) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => onSelectTab(tab)}
                aria-current={isActive ? 'page' : undefined}
                className={`h-[38px] px-4 rounded-full inline-flex items-center gap-2 text-[13px] whitespace-nowrap transition-all duration-200 active:scale-95 focus-visible:outline-2 focus-visible:outline-[#C084FC] ${
                  isActive
                    ? 'text-white font-bold border border-[#D8B4FE]/50'
                    : 'text-[#C4BEDF] hover:text-white hover:bg-white/[0.06] font-medium'
                }`}
                style={
                  isActive
                    ? {
                        background:
                          'linear-gradient(135deg, #9C57FF 0%, #7434F5 60%, #5B21B6 100%)',
                        boxShadow:
                          '0 4px 16px rgba(139, 92, 246, 0.5), inset 0 1px 1px rgba(255,255,255,0.3)',
                      }
                    : undefined
                }
              >
                <Icon className="w-4 h-4 shrink-0 stroke-[2.1]" />
                <span>{label}</span>
              </button>
            );
          })}

          <span aria-hidden="true" className="w-px h-5 bg-white/10 mx-0.5" />

          {/* Compact Integrated Glowing Cart Pill */}
          <button
            type="button"
            onClick={onOpenCart}
            aria-label={`Open shopping cart${cartCount > 0 ? `, ${cartCount} items` : ''}`}
            className="relative h-[38px] px-4 rounded-full inline-flex items-center gap-2 text-[13px] font-bold text-white border border-[#E9D5FF]/55 whitespace-nowrap transition-all duration-200 hover:brightness-110 active:scale-95 focus-visible:outline-2 focus-visible:outline-white"
            style={{
              background:
                'linear-gradient(135deg, #B266FF 0%, #7C3AED 55%, #5B21B6 100%)',
              boxShadow:
                '0 4px 18px rgba(139, 92, 246, 0.55), inset 0 1px 1px rgba(255,255,255,0.35)',
            }}
          >
            <ShoppingCart className="w-4 h-4 shrink-0 stroke-[2.3]" />
            <span>Cart</span>
            {cartCount > 0 && (
              <span
                data-testid="desktop-cart-badge-count"
                className="min-w-[19px] h-[19px] px-1 rounded-full bg-[#FF4557] text-white text-[10.5px] font-extrabold flex items-center justify-center tabular-nums shadow"
              >
                {cartCount}
              </span>
            )}
          </button>

          <span aria-hidden="true" className="w-px h-5 bg-white/10 mx-0.5" />

          {(
            [
              { tab: 'orders', label: 'Orders', Icon: Box },
              { tab: 'profile', label: 'Profile', Icon: User },
            ] as const
          ).map(({ tab, label, Icon }) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => onSelectTab(tab)}
                aria-current={isActive ? 'page' : undefined}
                className={`h-[38px] px-4 rounded-full inline-flex items-center gap-2 text-[13px] whitespace-nowrap transition-all duration-200 active:scale-95 focus-visible:outline-2 focus-visible:outline-[#C084FC] ${
                  isActive
                    ? 'text-white font-bold border border-[#D8B4FE]/50'
                    : 'text-[#C4BEDF] hover:text-white hover:bg-white/[0.06] font-medium'
                }`}
                style={
                  isActive
                    ? {
                        background:
                          'linear-gradient(135deg, #9C57FF 0%, #7434F5 60%, #5B21B6 100%)',
                        boxShadow:
                          '0 4px 16px rgba(139, 92, 246, 0.5), inset 0 1px 1px rgba(255,255,255,0.3)',
                      }
                    : undefined
                }
              >
                <Icon className="w-4 h-4 shrink-0 stroke-[2.1]" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
