import React from 'react';
import {
  Bell,
  Box,
  Check,
  CheckCheck,
  Coins,
  Home,
  LayoutGrid,
  Search,
  Shield,
  ShoppingCart,
  Tag,
  User,
  X,
} from 'lucide-react';
import type {
  CategoryId,
  CurrencyCode,
  NavTab,
  NotificationItem,
} from '../types/store';
import { CURRENCY_OPTIONS } from '../utils/storeLogic';
import { ToolBazaarBolt } from './BrandIcons';

interface SearchBarOverlayProps {
  open: boolean;
  query: string;
  resultCount: number;
  onChange: (value: string) => void;
  onClose: () => void;
}

export function SearchBarOverlay({
  open,
  query,
  resultCount,
  onChange,
  onClose,
}: SearchBarOverlayProps) {
  if (!open) return null;

  return (
    <div className="mb-3 rounded-[18px] bg-[#17132A] border border-[#A78BFA]/40 p-2.5 flex items-center gap-2 shadow-[0_8px_24px_rgba(10,6,28,0.6)]">
      <Search className="w-4 h-4 text-[#C084FC] ml-1.5 shrink-0" />
      <label htmlFor="toolbazaar-search" className="sr-only">
        Search premium digital tools
      </label>
      <input
        id="toolbazaar-search"
        type="search"
        autoFocus
        value={query}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search ChatGPT, CapCut, Canva, Adobe..."
        className="flex-1 bg-transparent text-sm text-white placeholder:text-[#8E88AD] focus:outline-none min-w-0"
      />
      {query && (
        <span className="text-[11px] font-semibold text-[#C4B5FD] whitespace-nowrap tabular-nums">
          {resultCount} found
        </span>
      )}
      <button
        type="button"
        onClick={() => {
          onChange('');
          onClose();
        }}
        aria-label="Close search"
        className="w-8 h-8 rounded-xl bg-white/8 hover:bg-white/15 flex items-center justify-center text-white/80 hover:text-white shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

interface SideMenuDrawerProps {
  open: boolean;
  activeTab: NavTab;
  currency: CurrencyCode;
  siteName?: string;
  vipCouponCode?: string;
  vipCouponText?: string;
  onSelectCurrency: (currency: CurrencyCode) => void;
  onClose: () => void;
  onNavigateTab: (tab: NavTab) => void;
  onSelectCategory: (cat: CategoryId) => void;
  onOpenCart: () => void;
  onOpenAdmin?: () => void;
}

export function SideMenuDrawer({
  open,
  activeTab,
  currency,
  siteName = 'ToolBazaar',
  vipCouponCode = 'BAZAAR20',
  vipCouponText = 'Apply BAZAAR20 at checkout for 20% extra discount on all tools.',
  onSelectCurrency,
  onClose,
  onNavigateTab,
  onSelectCategory,
  onOpenCart,
  onOpenAdmin,
}: SideMenuDrawerProps) {
  if (!open) return null;

  const navItems: { tab: NavTab; label: string; icon: React.ReactNode }[] = [
    { tab: 'home', label: 'Home Store', icon: <Home className="w-4 h-4" /> },
    { tab: 'categories', label: 'All Categories', icon: <LayoutGrid className="w-4 h-4" /> },
    { tab: 'orders', label: 'My Orders & Keys', icon: <Box className="w-4 h-4" /> },
    { tab: 'profile', label: 'Profile & Wallet', icon: <User className="w-4 h-4" /> },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
      onClick={onClose}
    >
      <div
        className="w-[290px] max-w-[84vw] h-full bg-[#120F22] border-r border-white/12 p-5 flex flex-col justify-between gap-4 overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ToolBazaarBolt className="w-7 h-7" />
              <div>
                <div className="font-display font-extrabold text-lg leading-none">
                  {siteName === 'ToolBazaar' ? (
                    <>
                      <span className="text-[#B688FF]">Tool</span>
                      <span className="text-white">Bazaar</span>
                    </>
                  ) : (
                    <span className="text-white">{siteName}</span>
                  )}
                </div>
                <p className="text-[10px] text-[#9E97BE] mt-0.5">
                  Official Digital Marketplace
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close navigation menu"
              className="w-9 h-9 rounded-xl bg-white/8 hover:bg-white/15 flex items-center justify-center text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5">
            {navItems.map((item) => {
              const active = activeTab === item.tab;
              return (
                <button
                  key={item.tab}
                  type="button"
                  onClick={() => {
                    onNavigateTab(item.tab);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-[#7C3AED] text-white shadow-[0_4px_18px_rgba(139,92,246,0.45)]'
                      : 'text-[#CFC9EA] hover:bg-white/6 hover:text-white'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenCart();
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-semibold text-[#CFC9EA] hover:bg-white/6 hover:text-white transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Shopping Cart</span>
            </button>

            {onOpenAdmin && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAdmin();
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-semibold text-[#D8B4FE] hover:bg-[#7C3AED]/20 hover:text-white transition-colors"
              >
                <Shield className="w-4 h-4" />
                <span>Admin Panel</span>
              </button>
            )}
          </div>

          {/* Currency Switcher Section */}
          <div className="pt-4 border-t border-white/10" aria-label="Currency selector">
            <div className="flex items-center justify-between px-1 mb-2.5">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#9A93BA]">
                <Coins className="w-3.5 h-3.5 text-[#C084FC]" />
                Currency
              </span>
              <span className="text-[10px] font-bold text-[#C4B5FD] px-2 py-0.5 rounded-md bg-[#7C3AED]/20 border border-[#C084FC]/30">
                {currency}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {CURRENCY_OPTIONS.map((option) => {
                const selected = currency === option.code;
                return (
                  <button
                    key={option.code}
                    type="button"
                    aria-pressed={selected}
                    aria-label={`Select ${option.name} (${option.code})`}
                    onClick={() => onSelectCurrency(option.code)}
                    className={`relative rounded-2xl px-2 py-2.5 text-center border transition-all active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-[#C084FC] ${
                      selected
                        ? 'bg-[#7C3AED]/25 border-[#B794FF] text-white shadow-[0_0_16px_rgba(139,92,246,0.35)]'
                        : 'bg-[#1A1530] hover:bg-[#231C42] border-white/10 text-[#CFC9EA] hover:text-white'
                    }`}
                  >
                    {selected && (
                      <span
                        aria-hidden="true"
                        className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-[#7C3AED] flex items-center justify-center text-white"
                      >
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    )}
                    <div
                      className={`text-sm font-display font-extrabold leading-none ${
                        selected ? 'text-[#E9D5FF]' : 'text-[#C4B5FD]'
                      }`}
                    >
                      {option.symbol.trim()}
                    </div>
                    <div className="mt-1 text-xs font-bold leading-none text-white">
                      {option.code}
                    </div>
                    <div className="mt-1 text-[10px] leading-none text-[#A39DC4] truncate">
                      {option.shortName}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-white/10">
            <div className="text-[11px] font-semibold text-[#9A93BA] px-1 mb-2">
              Quick Filter
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['ai', 'AI Tools'],
                  ['video', 'Video Tools'],
                  ['design', 'Design Tools'],
                  ['productivity', 'Productivity'],
                ] as [CategoryId, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    onSelectCategory(id);
                    onNavigateTab('home');
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#1D1836] hover:bg-[#2A224F] border border-white/10 text-xs font-medium text-[#DED9F7]"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-[#1C1636] border border-[#A78BFA]/30 p-3.5 shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold text-[#D8B4FE]">
            <Tag className="w-3.5 h-3.5" />
            <span>VIP Coupon: {vipCouponCode}</span>
          </div>
          <p className="mt-1 text-[11px] text-[#BEB8DC]">
            {vipCouponText}
          </p>
        </div>
      </div>
    </div>
  );
}

interface NotificationsModalProps {
  open: boolean;
  notifications: NotificationItem[];
  onClose: () => void;
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
}

export function NotificationsModal({
  open,
  notifications,
  onClose,
  onMarkAllRead,
  onMarkRead,
}: NotificationsModalProps) {
  if (!open) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end p-3 sm:p-5 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notifications-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm mt-14 rounded-[24px] bg-[#141126] border border-white/15 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3.5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#C084FC]" />
            <h2 id="notifications-title" className="font-display font-bold text-base text-white">
              Notifications
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#C4B5FD] hover:text-white px-2 py-1 rounded-lg bg-white/5"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close notifications"
              className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="max-h-[65vh] overflow-y-auto divide-y divide-white/[0.06]">
          {notifications.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onMarkRead(item.id)}
              className={`w-full text-left px-4 py-3.5 transition-colors hover:bg-white/[0.04] ${
                item.read ? 'opacity-70' : 'bg-[#7C3AED]/[0.08]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-xs text-white flex items-center gap-1.5">
                  {!item.read && (
                    <span className="w-2 h-2 rounded-full bg-[#A855F7] shrink-0" />
                  )}
                  {item.title}
                </span>
                <span className="text-[10px] text-[#9A93BA] shrink-0">
                  {item.time}
                </span>
              </div>
              <p className="mt-1 text-xs text-[#C2BBE0] leading-relaxed">
                {item.message}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
