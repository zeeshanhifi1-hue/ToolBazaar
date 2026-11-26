import React from 'react';
import { ArrowRight, Layers } from 'lucide-react';
import type { CategoryId, CategoryItem, ToolProduct } from '../types/store';
import { BrandAppIcon, CategoryIcon } from './BrandIcons';

interface CategoriesViewProps {
  categories: CategoryItem[];
  tools: ToolProduct[];
  onPickCategory: (id: CategoryId) => void;
}

export function CategoriesView({
  categories,
  tools,
  onPickCategory,
}: CategoriesViewProps) {
  return (
    <section aria-label="All Categories" className="mt-3 space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-[#7C3AED]/25 border border-[#C084FC]/40 flex items-center justify-center text-[#C4B5FD]">
          <Layers className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-display font-bold text-xl text-white">
            Browse Categories
          </h1>
          <p className="text-xs text-[#A39DC4]">
            Explore verified tools grouped by creative &amp; AI workflow
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {categories.map((cat) => {
          const matchingTools =
            cat.id === 'all'
              ? tools
              : tools.filter((t) => t.category === cat.id);
          const previewTools = matchingTools.slice(0, 3);

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onPickCategory(cat.id)}
              className="group text-left rounded-[22px] bg-[#161327] hover:bg-[#1E1936] border border-white/12 hover:border-[#A78BFA]/50 p-4 transition-all active:scale-[0.98] flex flex-col justify-between gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#251E43] border border-[#C084FC]/25 flex items-center justify-center">
                  <CategoryIcon id={cat.id} active={false} />
                </div>
                <span className="text-xs font-bold text-[#C4B5FD] tabular-nums">
                  {matchingTools.length}{' '}
                  {matchingTools.length === 1 ? 'Tool' : 'Tools'}
                </span>
              </div>

              <div>
                <h2 className="font-display font-bold text-base text-white">
                  {cat.label}
                </h2>
                <p className="mt-1 text-xs text-[#A6A0C4] leading-relaxed">
                  {cat.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/[0.07]">
                <div className="flex items-center -space-x-2">
                  {previewTools.map((tool) => (
                    <div key={tool.id} className="ring-2 ring-[#161327] rounded-[11px]">
                      <BrandAppIcon brand={tool.brand} size="sm" />
                    </div>
                  ))}
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#C084FC] group-hover:translate-x-0.5 transition-transform">
                  Explore <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
