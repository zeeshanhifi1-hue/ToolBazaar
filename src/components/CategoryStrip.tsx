import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { CategoryId, CategoryItem } from '../types/store';
import { CategoryIcon } from './BrandIcons';

interface CategoryStripProps {
  categories: CategoryItem[];
  activeCategory: CategoryId;
  categoryCounts?: Partial<Record<CategoryId, number>>;
  onSelectCategory: (id: CategoryId) => void;
}

export function CategoryStrip({
  categories,
  activeCategory,
  categoryCounts,
  onSelectCategory,
}: CategoryStripProps) {
  return (
    <section aria-label="Tool categories" className="mt-1.5 lg:mt-0 lg:h-full">
      {/* Mobile & Tablet (< lg): Exact Original Compact Horizontal Strip */}
      <div className="flex sm:grid sm:grid-cols-6 lg:hidden gap-1.5 sm:gap-2.5 overflow-x-auto no-scrollbar">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              aria-pressed={isActive}
              className={`group relative flex-1 min-w-fit flex flex-col items-center justify-center gap-1 rounded-[15px] sm:rounded-[18px] py-2 sm:py-2.5 px-1.5 sm:px-2 min-h-[62px] sm:min-h-[74px] transition-all duration-200 active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-[#C084FC] ${
                isActive
                  ? 'border border-[#C4B5FD]/60 text-white'
                  : 'bg-[#171426] hover:bg-[#1F1B33] border border-white/10 text-[#DCD7F4]'
              }`}
              style={
                isActive
                  ? {
                      background:
                        'linear-gradient(160deg, #A35BFF 0%, #7C3AED 55%, #5B21B6 100%)',
                      boxShadow:
                        '0 8px 24px rgba(139, 92, 246, 0.45), inset 0 1px 1px rgba(255,255,255,0.35)',
                    }
                  : undefined
              }
            >
              <div className="transition-transform duration-200 group-hover:scale-105">
                <CategoryIcon id={cat.id} active={isActive} />
              </div>
              <span
                className={`text-[9.5px] sm:text-[12.5px] leading-none text-center whitespace-nowrap tracking-[-0.01em] ${
                  isActive ? 'font-bold text-white' : 'font-medium text-[#D6D2EC]'
                }`}
              >
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Desktop / Laptop (lg+): Sleek Side Categories Panel aligned next to Sliding Banners */}
      <div className="hidden lg:flex lg:flex-col h-full rounded-[22px] bg-[#131023]/95 border border-white/10 p-3 shadow-[0_14px_34px_rgba(6,4,18,0.55)]">
        <div className="flex items-center justify-between px-1.5 pb-2 mb-1.5 border-b border-white/[0.07]">
          <h2 className="font-display font-bold text-[14px] text-white tracking-tight">
            Categories
          </h2>
          <span className="text-[11.5px] font-medium text-[#9F98C4] tabular-nums">
            {categoryCounts?.all ?? categories.length} tools
          </span>
        </div>

        <div className="flex-1 flex flex-col justify-between gap-1">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            const count = categoryCounts?.[cat.id];
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                aria-pressed={isActive}
                className={`group w-full flex-1 flex items-center justify-between gap-2.5 rounded-[13px] px-2.5 py-1.5 text-left transition-all duration-200 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-[#C084FC] ${
                  isActive
                    ? 'border border-[#C4B5FD]/60 text-white'
                    : 'bg-[#19152C]/70 hover:bg-[#221D3B] border border-transparent hover:border-white/10 text-[#DCD7F4]'
                }`}
                style={
                  isActive
                    ? {
                        background:
                          'linear-gradient(105deg, #9C53FF 0%, #7C3AED 58%, #5B21B6 100%)',
                        boxShadow:
                          '0 6px 20px rgba(139, 92, 246, 0.38), inset 0 1px 1px rgba(255,255,255,0.28)',
                      }
                    : undefined
                }
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                      isActive ? 'bg-white/15' : 'bg-[#120E22]/90 border border-white/[0.06]'
                    }`}
                  >
                    <CategoryIcon id={cat.id} active={isActive} />
                  </div>
                  <div className="min-w-0">
                    <div
                      className={`text-[13.5px] leading-tight truncate ${
                        isActive ? 'font-bold text-white' : 'font-semibold text-[#E8E4FA]'
                      }`}
                    >
                      {cat.label}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {typeof count === 'number' && (
                    <span
                      className={`text-[11.5px] font-semibold tabular-nums ${
                        isActive ? 'text-white/90' : 'text-[#8F88B4]'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                  <ChevronRight
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      isActive
                        ? 'text-white translate-x-0.5'
                        : 'text-[#736B99] group-hover:text-[#CFC9EB] group-hover:translate-x-0.5'
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
