import React from 'react';
import { Box, Check, ShoppingCart } from 'lucide-react';
import type { CurrencyCode, ToolProduct } from '../types/store';
import { formatCurrency } from '../utils/storeLogic';
import { BrandAppIcon, CrownMiniIcon, FlameBadgeIcon } from './BrandIcons';

interface ToolCardProps {
  tool: ToolProduct;
  currency: CurrencyCode;
  inCartQty: number;
  onOpenDetail: (tool: ToolProduct) => void;
  onQuickAdd: (tool: ToolProduct) => void;
}

export function ToolCard({
  tool,
  currency,
  inCartQty,
  onOpenDetail,
  onQuickAdd,
}: ToolCardProps) {
  const isOutOfStock = tool.available <= 0;

  return (
    <article
      className="group relative rounded-[20px] lg:rounded-[22px] border transition-all duration-200 hover:-translate-y-0.5 lg:hover:-translate-y-1 lg:hover:brightness-[1.04] flex flex-col justify-between overflow-hidden"
      style={{
        background: tool.theme.cardBg,
        borderColor: tool.theme.cardBorder,
        boxShadow: `0 10px 26px rgba(6, 4, 18, 0.55), inset 0 1px 0 rgba(255,255,255,0.08)`,
      }}
    >
      {/* Subtle brand glow aura in top-left */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 -left-10 w-28 h-28 rounded-full blur-2xl opacity-70"
        style={{ background: tool.theme.glowColor }}
      />

      {/* Main clickable body -> opens Tool Detail */}
      <div className="relative z-10 p-2.5 sm:p-3 lg:p-4 pb-2 lg:pb-3 flex-1 flex flex-col">
        <button
          type="button"
          onClick={() => onOpenDetail(tool)}
          aria-label={`View details for ${tool.name}`}
          className="text-left w-full focus-visible:outline-2 focus-visible:outline-[#C084FC] rounded-xl cursor-pointer"
        >
          {/* Top Row: Glossy App Icon + Title / Premium Badge / Subtitle */}
          <div className="flex items-start gap-2 sm:gap-2.5 lg:gap-3">
            <BrandAppIcon
              brand={tool.brand}
              logoUrl={tool.logoUrl}
              size="md"
              className="!w-10 !h-10 sm:!w-12 sm:!h-12 lg:!w-[52px] lg:!h-[52px] !rounded-[12px] sm:!rounded-[14px] lg:!rounded-[15px]"
            />

            <div className="min-w-0 flex-1">
              <h3 className="font-display font-bold text-[13.5px] sm:text-[16px] lg:text-[16.5px] leading-tight text-white truncate">
                {tool.name}
              </h3>

              {/* Gold Crown Premium Tag */}
              <div className="mt-1 inline-flex items-center gap-1 rounded-[6px] px-1.5 py-[2px] bg-[#4A3B14]/75 border border-[#FACC15]/30">
                <CrownMiniIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
                <span className="text-[9.5px] sm:text-[10px] font-semibold text-[#FDE047] leading-none">
                  {tool.badgeText}
                </span>
              </div>

              <p className="mt-1 text-[9.5px] sm:text-[11.5px] leading-snug text-[#BEB9D8] line-clamp-1 tracking-[-0.01em]">
                {tool.subtitle}
              </p>
            </div>
          </div>

          {/* Discount Flame Pill + Out of Stock Badge */}
          <div className="mt-2 flex items-center flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full px-2 sm:px-2.5 py-[3px] bg-gradient-to-r from-[#F3EFFE] via-[#E2D9FE] to-[#C8B5FD] text-[#1A0D36] text-[10px] sm:text-[11px] font-extrabold leading-none shadow-sm">
              <FlameBadgeIcon className="w-3 h-3 shrink-0" />
              <span>{tool.discountPercent}% OFF</span>
            </span>
            {isOutOfStock && (
              <span className="inline-flex items-center rounded-full px-2 py-[3px] bg-rose-500/20 border border-rose-400/50 text-rose-300 text-[9.5px] sm:text-[10px] font-extrabold uppercase tracking-wide leading-none">
                Out of Stock
              </span>
            )}
          </div>
        </button>

        {/* Price + Quick Add Cart Row */}
        <div className="mt-2 lg:mt-3 flex items-center justify-between gap-1">
          <div className="flex items-baseline gap-1 sm:gap-1.5 min-w-0 flex-wrap">
            <span className="text-[11px] sm:text-[13px] text-[#8E89A8] line-through tabular-nums whitespace-nowrap">
              {formatCurrency(tool.originalPrice, currency)}
            </span>
            <span className="font-display font-extrabold text-[15.5px] sm:text-[20px] lg:text-[21px] text-white leading-none tabular-nums whitespace-nowrap">
              {formatCurrency(tool.price, currency)}
            </span>
          </div>

          <button
            type="button"
            disabled={isOutOfStock}
            onClick={() => onQuickAdd(tool)}
            aria-label={`Add ${tool.name} to cart`}
            className={`relative w-8 h-8 sm:w-10 sm:h-9 lg:w-10 lg:h-10 rounded-[10px] sm:rounded-[11px] lg:rounded-xl border flex items-center justify-center shrink-0 transition-all active:scale-95 focus-visible:outline-2 focus-visible:outline-[#C084FC] ${
              isOutOfStock
                ? 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed'
                : inCartQty > 0
                  ? 'bg-[#7C3AED] hover:bg-[#8B5CF6] border-[#C4B5FD]/70 text-white shadow-[0_0_14px_rgba(139,92,246,0.55)]'
                  : 'bg-[#3C2A73]/85 hover:bg-[#5B3DC2] border-[#A78BFA]/45 text-white'
            }`}
          >
            {inCartQty > 0 ? (
              <>
                <Check className="w-4 h-4 stroke-[2.6]" />
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#22C55E] text-[#052E16] text-[10px] font-extrabold flex items-center justify-center tabular-nums shadow">
                  {inCartQty}
                </span>
              </>
            ) : (
              <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
            )}
          </button>
        </div>

        {/* Bottom Stats Footer: Available (green) & Sold (orange) */}
        <div className="mt-2 lg:mt-3 pt-1.5 lg:pt-2.5 border-t border-white/[0.06] flex items-center justify-between gap-1 text-[9.5px] sm:text-[11px] lg:text-[11.5px]">
          <div className="inline-flex items-center gap-1 min-w-0">
            <Box
              className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 stroke-[2] ${
                isOutOfStock ? 'text-rose-400' : 'text-[#4ADE80]'
              }`}
            />
            <span className="text-[#ABA6C4] truncate">
              Available:{' '}
              <strong
                className={`font-bold tabular-nums ${
                  isOutOfStock ? 'text-rose-400' : 'text-[#4ADE80]'
                }`}
              >
                {tool.available}
              </strong>
            </span>
          </div>

          <div className="inline-flex items-center gap-1 shrink-0">
            <ShoppingCart className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#FB923C] shrink-0 stroke-[2]" />
            <span className="text-[#ABA6C4]">
              Sold:{' '}
              <strong className="font-bold text-[#FB923C] tabular-nums">
                {tool.sold}
              </strong>
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
