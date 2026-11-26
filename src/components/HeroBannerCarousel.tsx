import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CategoryId, HeroBannerData } from '../types/store';

interface HeroBannerCarouselProps {
  banners: HeroBannerData[];
  onBannerCta: (targetCategory: CategoryId) => void;
}

export function HeroBannerCarousel({
  banners,
  onBannerCta,
}: HeroBannerCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  useEffect(() => {
    if (paused || banners.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [paused, banners.length]);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % banners.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
    setPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const startX = touchStartXRef.current;
    const endX = e.changedTouches[0]?.clientX ?? null;
    if (startX !== null && endX !== null) {
      const delta = endX - startX;
      if (delta > 40) handlePrev();
      else if (delta < -40) handleNext();
    }
    touchStartXRef.current = null;
    setPaused(false);
  };

  if (banners.length === 0) return null;

  const safeIndex = activeIndex % banners.length;
  const prevIndex = (safeIndex - 1 + banners.length) % banners.length;
  const nextIndex = (safeIndex + 1) % banners.length;
  const activeBanner = banners[safeIndex] ?? banners[0];

  return (
    <section
      aria-label="Featured promotions"
      className="mt-2 lg:mt-0 lg:h-full relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Mobile Slider (< sm): Exact full-width 2:1 card with smooth horizontal slide track & touch swipe */}
      <div
        className="sm:hidden relative overflow-hidden rounded-[22px] border bg-[#120E28]"
        style={{
          borderColor: activeBanner.borderGlow,
          boxShadow:
            '0 12px 32px rgba(10, 6, 28, 0.78), 0 0 22px rgba(124, 58, 237, 0.22)',
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex transition-transform duration-500 ease-out will-change-transform"
          style={{ transform: `translateX(-${safeIndex * 100}%)` }}
        >
          {banners.map((banner) => (
            <button
              key={banner.id}
              type="button"
              onClick={() => onBannerCta(banner.targetCategory)}
              aria-label={banner.alt}
              className="w-full shrink-0 aspect-[2/1] block relative overflow-hidden focus-visible:outline-2 focus-visible:outline-[#C084FC]"
            >
              <img
                src={banner.imageSrc}
                alt={banner.alt}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover block select-none"
                draggable={false}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Tablet Slider (sm to < lg): Peeking Spotlight Slider */}
      <div className="hidden sm:block lg:hidden relative">
        <div className="relative flex items-center justify-center overflow-hidden rounded-[24px]">
          {/* Left Peeking Slide */}
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous promotional banner"
            className="hidden md:block w-[22%] shrink-0 aspect-[2/1] -mr-8 rounded-[20px] overflow-hidden border border-white/10 opacity-45 hover:opacity-70 scale-[0.9] transition-all duration-500 relative z-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#C084FC]"
          >
            <img
              src={banners[prevIndex].imageSrc}
              alt=""
              aria-hidden="true"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover block select-none"
              draggable={false}
            />
            <div className="absolute inset-0 bg-[#090713]/45" />
          </button>

          {/* Active Center Full-Resolution 2:1 Banner */}
          <div
            className="relative z-10 w-full md:w-[66%] shrink-0 rounded-[22px] overflow-hidden border transition-all duration-300"
            style={{
              borderColor: activeBanner.borderGlow,
              boxShadow:
                '0 18px 42px rgba(8, 4, 24, 0.85), 0 0 32px rgba(139, 92, 246, 0.28)',
            }}
          >
            <div
              className="flex transition-transform duration-500 ease-out will-change-transform"
              style={{ transform: `translateX(-${safeIndex * 100}%)` }}
            >
              {banners.map((banner) => (
                <button
                  key={banner.id}
                  type="button"
                  onClick={() => onBannerCta(banner.targetCategory)}
                  aria-label={banner.alt}
                  className="w-full shrink-0 aspect-[2/1] block relative overflow-hidden cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
                >
                  <img
                    src={banner.imageSrc}
                    alt={banner.alt}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover block select-none"
                    draggable={false}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Right Peeking Slide */}
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next promotional banner"
            className="hidden md:block w-[22%] shrink-0 aspect-[2/1] -ml-8 rounded-[20px] overflow-hidden border border-white/10 opacity-45 hover:opacity-70 scale-[0.9] transition-all duration-500 relative z-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#C084FC]"
          >
            <img
              src={banners[nextIndex].imageSrc}
              alt=""
              aria-hidden="true"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover block select-none"
              draggable={false}
            />
            <div className="absolute inset-0 bg-[#090713]/45" />
          </button>

          {/* Floating Glass Prev / Next Controls */}
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous slide"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-[#130E29]/80 hover:bg-[#6D28D9] border border-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-lg transition-all active:scale-95"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next slide"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-[#130E29]/80 hover:bg-[#6D28D9] border border-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-lg transition-all active:scale-95"
          >
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Desktop / Laptop (lg+): Widescreen Sliding Banner Stage + Clickable Slide Rail */}
      <div className="hidden lg:flex h-full items-stretch gap-3">
        {/* Main Full-Resolution 2:1 Sliding Banner */}
        <div
          className="relative flex-1 min-w-0 rounded-[22px] overflow-hidden border bg-[#120E28] transition-all duration-300"
          style={{
            borderColor: activeBanner.borderGlow,
            boxShadow:
              '0 16px 40px rgba(8, 4, 24, 0.8), 0 0 28px rgba(139, 92, 246, 0.22)',
          }}
        >
          <div
            className="flex h-full transition-transform duration-500 ease-out will-change-transform"
            style={{ transform: `translateX(-${safeIndex * 100}%)` }}
          >
            {banners.map((banner) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => onBannerCta(banner.targetCategory)}
                aria-label={banner.alt}
                className="w-full shrink-0 aspect-[2/1] h-full block relative overflow-hidden cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
              >
                <img
                  src={banner.imageSrc}
                  alt={banner.alt}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover block select-none"
                  draggable={false}
                />
              </button>
            ))}
          </div>

          {/* Crisp Glass Prev / Next Controls */}
          {banners.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous slide"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-[#0E0A20]/75 hover:bg-[#7C3AED] border border-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-lg transition-all active:scale-95"
              >
                <ChevronLeft className="w-5 h-5 stroke-[2.4]" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next slide"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-[#0E0A20]/75 hover:bg-[#7C3AED] border border-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-lg transition-all active:scale-95"
              >
                <ChevronRight className="w-5 h-5 stroke-[2.4]" />
              </button>

              {/* Compact Bottom Glass Slide Indicator Bar (1024px–1379px) */}
              <div
                className="min-[1380px]:hidden absolute bottom-3 left-1/2 -translate-x-1/2 z-20 px-2.5 py-1 rounded-full bg-[#0C091B]/75 backdrop-blur-md border border-white/15 flex items-center gap-1.5"
                role="tablist"
                aria-label="Desktop banner slides"
              >
                {banners.map((banner, idx) => {
                  const isCurrent = idx === safeIndex;
                  return (
                    <button
                      key={banner.id}
                      type="button"
                      role="tab"
                      aria-selected={isCurrent}
                      aria-label={`Show banner ${idx + 1}`}
                      onClick={() => setActiveIndex(idx)}
                      className="p-0.5 rounded-full focus-visible:outline-2 focus-visible:outline-[#C084FC]"
                    >
                      <span
                        className={`block h-[6px] rounded-full transition-all duration-300 ${
                          isCurrent
                            ? 'w-6 bg-[#C4B5FD] shadow-[0_0_10px_rgba(196,181,253,0.9)]'
                            : 'w-[6px] bg-white/35 hover:bg-white/65'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Right Vertical Slide Preview Rail (1380px+): Instant visual switcher for all sliding banners */}
        {banners.length > 1 && (
          <div
            className="hidden min-[1380px]:flex flex-col justify-between w-[212px] 2xl:w-[248px] shrink-0 gap-2.5"
            role="tablist"
            aria-label="Banner slide switcher"
          >
            {banners.slice(0, 3).map((banner, idx) => {
              const isCurrent = idx === safeIndex;
              return (
                <button
                  key={banner.id}
                  type="button"
                  role="tab"
                  aria-selected={isCurrent}
                  aria-label={`Show banner ${idx + 1}: ${banner.alt}`}
                  onClick={() => setActiveIndex(idx)}
                  className={`group relative flex-1 w-full rounded-[15px] overflow-hidden border transition-all duration-300 focus-visible:outline-2 focus-visible:outline-[#C084FC] ${
                    isCurrent
                      ? 'border-[#C4B5FD] shadow-[0_0_22px_rgba(139,92,246,0.45)] scale-[1.01]'
                      : 'border-white/12 opacity-60 hover:opacity-95 hover:border-white/30'
                  }`}
                >
                  <img
                    src={banner.imageSrc}
                    alt=""
                    aria-hidden="true"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover block select-none transition-transform duration-300 group-hover:scale-105"
                    draggable={false}
                  />
                  {!isCurrent && (
                    <div className="absolute inset-0 bg-[#090713]/35 group-hover:bg-[#090713]/15 transition-colors" />
                  )}
                  <div
                    className={`absolute bottom-1.5 right-2 w-2 h-2 rounded-full transition-all ${
                      isCurrent
                        ? 'w-5 bg-[#C4B5FD] shadow-[0_0_8px_rgba(196,181,253,0.95)]'
                        : 'bg-white/40'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile & Tablet Pagination Dots (< lg only) */}
      <div
        className="lg:hidden mt-1 flex items-center justify-center gap-1"
        role="tablist"
        aria-label="Banner slides"
      >
        {banners.map((banner, idx) => {
          const isCurrent = idx === safeIndex;
          return (
            <button
              key={banner.id}
              type="button"
              role="tab"
              aria-selected={isCurrent}
              aria-label={`Show banner ${idx + 1}`}
              onClick={() => setActiveIndex(idx)}
              className="px-1 py-0.5 focus-visible:outline-2 focus-visible:outline-[#C084FC] rounded-full"
            >
              <span
                className={`block h-[6px] rounded-full transition-all duration-300 ${
                  isCurrent
                    ? 'w-5 bg-[#B794FF] shadow-[0_0_10px_rgba(183,148,255,0.9)]'
                    : 'w-[6px] bg-white/30 hover:bg-white/55'
                }`}
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}
