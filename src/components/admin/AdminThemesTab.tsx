import React, { useEffect, useState } from 'react';
import {
  Check,
  Crown,
  Gift,
  Image as ImageIcon,
  Loader2,
  Palette,
  RotateCcw,
  Save,
  Sliders,
  Sparkles,
  Tag,
  Upload,
} from 'lucide-react';
import type {
  NeonCreatorThemeConfig,
  SiteSettings,
  StoreThemeId,
} from '../../types/store';
import {
  DEFAULT_NEON_CREATOR_CONFIG,
  DEFAULT_NEON_CREATOR_HERO_IMAGE,
  normalizeThemeConfig,
  normalizeThemeId,
  sanitizeSafeMediaUrl,
} from '../../utils/supabaseMappers';

function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Could not read image file.'));
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

interface AdminThemesTabProps {
  settings: SiteSettings;
  busy: boolean;
  onSaveSettings: (next: Partial<SiteSettings>) => Promise<void>;
  onUploadMedia: (payload: {
    folder: 'logos' | 'banners' | 'qr';
    filename: string;
    dataBase64: string;
  }) => Promise<string>;
}

export function AdminThemesTab({
  settings,
  busy,
  onSaveSettings,
  onUploadMedia,
}: AdminThemesTabProps) {
  const activeTheme: StoreThemeId = normalizeThemeId(settings.activeTheme);
  const [customizing, setCustomizing] = useState(activeTheme === 'neon-creator');
  const [config, setConfig] = useState<NeonCreatorThemeConfig>(
    normalizeThemeConfig(settings.themeConfig)
  );
  const [couponCode, setCouponCode] = useState(settings.vipCouponCode || 'BAZAAR20');
  const [couponText, setCouponText] = useState(
    settings.vipCouponText ||
      'Apply BAZAAR20 at checkout for 20% extra discount on all tools.'
  );
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    setConfig(normalizeThemeConfig(settings.themeConfig));
    setCouponCode(settings.vipCouponCode || 'BAZAAR20');
    setCouponText(
      settings.vipCouponText ||
        'Apply BAZAAR20 at checkout for 20% extra discount on all tools.'
    );
  }, [settings]);

  const handleApplyTheme = async (themeId: StoreThemeId) => {
    await onSaveSettings({
      ...settings,
      activeTheme: themeId,
      themeConfig: config,
    });
  };

  const handleUploadHeroImage = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Hero image must be 5 MB or smaller (PNG, JPG, WebP, GIF).');
      return;
    }
    setUploadError(null);
    setUploadingHero(true);
    try {
      const dataBase64 = await readImageAsDataUrl(file);
      const url = await onUploadMedia({
        folder: 'banners',
        filename: file.name,
        dataBase64,
      });
      setConfig((prev) => ({ ...prev, heroImageUrl: url }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Image upload failed.');
    } finally {
      setUploadingHero(false);
    }
  };

  const handleSaveCustomizer = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    await onSaveSettings({
      ...settings,
      vipCouponCode: couponCode.trim().toUpperCase() || 'BAZAAR20',
      vipCouponText: couponText.trim() || settings.vipCouponText,
      activeTheme: 'neon-creator',
      themeConfig: {
        ...config,
        couponDiscountPercent: Math.min(
          90,
          Math.max(1, Math.round(Number(config.couponDiscountPercent) || 20))
        ),
      },
    });
  };

  const previewHeroSrc =
    sanitizeSafeMediaUrl(config.heroImageUrl) || DEFAULT_NEON_CREATOR_HERO_IMAGE;

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="rounded-2xl bg-[#141126] border border-white/10 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-extrabold text-base sm:text-lg text-white flex items-center gap-2">
            <Palette className="w-5 h-5 text-[#C084FC]" />
            Storefront Themes
          </h2>
          <p className="text-xs text-[#A39DC4] mt-0.5">
            Switch your live website theme instantly or customize the Neon Creator hero banner, boy portrait image, and special coupon offers.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/35 text-xs font-bold text-emerald-300">
          <Check className="w-3.5 h-3.5" />
          Active: {activeTheme === 'neon-creator' ? 'Neon Creator' : 'Classic Cosmic'}
        </span>
      </div>

      {/* Two Theme Selector Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Theme 1: Classic Cosmic (Default) */}
        <div
          className={`rounded-2xl border p-4 sm:p-5 flex flex-col justify-between gap-4 transition-all ${
            activeTheme === 'classic'
              ? 'bg-[#191334] border-[#A855F7] shadow-[0_0_26px_rgba(168,85,247,0.28)]'
              : 'bg-[#141126] border-white/10 hover:border-white/20'
          }`}
        >
          <div className="space-y-3.5">
            {/* Mini Visual Preview */}
            <div className="relative h-40 rounded-xl overflow-hidden border border-white/10 bg-gradient-to-br from-[#0F0B22] via-[#1C143D] to-[#0B0818] p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#A855F7]" />
                  <span className="text-[11px] font-display font-extrabold text-white">
                    {settings.siteName}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] text-white/80">
                    USD
                  </span>
                  <span className="w-5 h-5 rounded-full bg-[#7C3AED]/40" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 my-1">
                <div className="col-span-2 h-14 rounded-lg bg-gradient-to-r from-[#5B21B6]/70 to-[#9333EA]/50 border border-white/15 p-2 flex flex-col justify-end">
                  <span className="text-[9px] font-bold text-white/90">
                    Promo Slider Banners
                  </span>
                </div>
                <div className="h-14 rounded-lg bg-[#221A42] border border-white/10 p-2 flex flex-col justify-end">
                  <span className="text-[8px] text-[#C4B5FD]">Filters</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <div className="h-7 rounded-lg bg-white/8 border border-white/10" />
                <div className="h-7 rounded-lg bg-white/8 border border-white/10" />
                <div className="h-7 rounded-lg bg-white/8 border border-white/10" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display font-extrabold text-base text-white">
                  Classic Cosmic (Default)
                </h3>
                {activeTheme === 'classic' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-[10px] font-extrabold text-emerald-300">
                    Active Theme
                  </span>
                )}
              </div>
              <p className="text-xs text-[#A39DC4] mt-1 leading-relaxed">
                Original ToolBazaar layout with full-width header, horizontal banner carousel, category filter pills, and multi-column catalog cards.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              disabled={busy || activeTheme === 'classic'}
              onClick={() => void handleApplyTheme('classic')}
              className={`flex-1 h-10 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                activeTheme === 'classic'
                  ? 'bg-emerald-500/18 border border-emerald-400/35 text-emerald-300 cursor-default'
                  : 'bg-white/10 hover:bg-white/18 text-white'
              }`}
            >
              {activeTheme === 'classic' ? (
                <>
                  <Check className="w-4 h-4" />
                  Currently Applied
                </>
              ) : (
                'Apply Classic Theme'
              )}
            </button>
          </div>
        </div>

        {/* Theme 2: Neon Creator */}
        <div
          className={`rounded-2xl border p-4 sm:p-5 flex flex-col justify-between gap-4 transition-all ${
            activeTheme === 'neon-creator'
              ? 'bg-[#1D123B] border-[#C084FC] shadow-[0_0_28px_rgba(192,132,252,0.34)]'
              : 'bg-[#141126] border-white/10 hover:border-[#A855F7]/45'
          }`}
        >
          <div className="space-y-3.5">
            {/* Live Mini Preview of Neon Creator */}
            <div className="relative h-40 rounded-xl overflow-hidden border border-[#C084FC]/45 bg-[#0C061C] p-3 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1 space-y-1.5 z-10">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#24124A] border border-[#A855F7]/45 text-[8px] font-bold text-[#E9D5FF]">
                  <Crown className="w-2.5 h-2.5 text-amber-400" />
                  {config.heroBadge}
                </span>
                <div className="font-display font-extrabold text-sm leading-tight text-white">
                  {config.heroTitle}{' '}
                  <span className="text-[#C084FC]">{config.heroTitleAccent}</span>
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="px-2 py-0.5 rounded-full bg-[#8B5CF6] text-[8px] font-bold text-white">
                    {config.heroPrimaryCta} →
                  </span>
                  <span className="px-2 py-0.5 rounded-full border border-white/25 text-[8px] font-semibold text-white/90">
                    {config.heroSecondaryCta}
                  </span>
                </div>
              </div>

              <div className="relative w-28 h-32 shrink-0 rounded-xl overflow-hidden border border-[#C084FC]/40">
                <img
                  src={previewHeroSrc}
                  alt="Neon Creator hero preview"
                  className="w-full h-full object-cover object-top"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0C061C] via-transparent to-transparent"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display font-extrabold text-base text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#C084FC]" />
                  Neon Creator
                </h3>
                {activeTheme === 'neon-creator' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-[10px] font-extrabold text-emerald-300">
                    Active Theme
                  </span>
                )}
              </div>
              <p className="text-xs text-[#A39DC4] mt-1 leading-relaxed">
                Vibrant neon-purple marketplace layout with editable creator hero banner &amp; boy portrait, 4-pillar trust bar, Popular Tools cards, 1-click Special Offers global coupon modal, and floating pill navigation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              disabled={busy || activeTheme === 'neon-creator'}
              onClick={() => void handleApplyTheme('neon-creator')}
              className={`flex-1 h-10 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                activeTheme === 'neon-creator'
                  ? 'bg-emerald-500/18 border border-emerald-400/35 text-emerald-300 cursor-default'
                  : 'bg-[#7C3AED] hover:bg-[#8B5CF6] text-white shadow-[0_6px_18px_rgba(124,58,237,0.45)]'
              }`}
            >
              {activeTheme === 'neon-creator' ? (
                <>
                  <Check className="w-4 h-4" />
                  Currently Applied
                </>
              ) : (
                'Apply Neon Creator'
              )}
            </button>

            <button
              type="button"
              onClick={() => setCustomizing((prev) => !prev)}
              className={`h-10 px-4 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-colors ${
                customizing
                  ? 'bg-[#A855F7]/25 border-[#C084FC] text-white'
                  : 'bg-white/6 hover:bg-white/12 border-white/12 text-[#DDD6FE]'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              {customizing ? 'Hide Customizer' : 'Customize'}
            </button>
          </div>
        </div>
      </div>

      {/* Live Neon Creator Customizer */}
      {customizing && (
        <form
          onSubmit={handleSaveCustomizer}
          className="rounded-2xl bg-[#141126] border border-[#A855F7]/35 p-4 sm:p-6 space-y-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div>
              <h3 className="font-display font-extrabold text-base text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#C084FC]" />
                Customize Neon Creator Theme
              </h3>
              <p className="text-xs text-[#A39DC4] mt-0.5">
                Edit hero banner text, upload or replace the hero boy image, and configure Special Offers coupon deals in real time.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setConfig({ ...DEFAULT_NEON_CREATOR_CONFIG })}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white/6 hover:bg-white/12 border border-white/12 text-xs font-bold text-[#DDD6FE]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Defaults
            </button>
          </div>

          {uploadError && (
            <div
              role="alert"
              className="rounded-xl bg-rose-500/15 border border-rose-400/35 px-3 py-2 text-xs text-rose-200"
            >
              {uploadError}
            </div>
          )}

          {/* Hero Boy / Character Image Editor */}
          <div className="rounded-2xl bg-[#0F0B1F] border border-white/10 p-4 flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="relative w-28 h-28 rounded-2xl overflow-hidden border border-[#C084FC]/45 bg-[#120926] shrink-0">
              <img
                src={previewHeroSrc}
                alt="Hero character preview"
                className="w-full h-full object-cover object-top"
              />
            </div>

            <div className="flex-1 w-full space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-[#C084FC]" />
                    Hero Banner Image (Boy Portrait)
                  </div>
                  <p className="text-[11px] text-[#9E97BE]">
                    Upload your own character/creator image or paste an image URL.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-[#7C3AED] hover:bg-[#8B5CF6] text-xs font-bold text-white cursor-pointer">
                    {uploadingHero ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>{uploadingHero ? 'Uploading...' : 'Upload Image'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      disabled={uploadingHero}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        void handleUploadHeroImage(file);
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setConfig((prev) => ({
                        ...prev,
                        heroImageUrl: DEFAULT_NEON_CREATOR_HERO_IMAGE,
                      }))
                    }
                    className="h-9 px-3 rounded-xl bg-white/8 hover:bg-white/14 text-xs font-semibold text-[#DDD6FE]"
                  >
                    Use Default
                  </button>
                </div>
              </div>

              <input
                type="text"
                value={config.heroImageUrl}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, heroImageUrl: e.target.value }))
                }
                placeholder="https://... or /src/assets/images/..."
                className="w-full h-9 px-3 rounded-xl bg-[#1C1833] border border-white/12 text-xs text-white focus:outline-none focus:border-[#A855F7]"
              />
            </div>
          </div>

          {/* Hero Text Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <div>
              <label
                htmlFor="theme-hero-badge"
                className="block text-[11px] font-semibold text-[#CFC9EA] mb-1"
              >
                Top Badge Text
              </label>
              <input
                id="theme-hero-badge"
                type="text"
                value={config.heroBadge}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, heroBadge: e.target.value }))
                }
                className="w-full h-10 px-3 rounded-xl bg-[#1C1833] border border-white/12 text-xs text-white focus:outline-none focus:border-[#A855F7]"
              />
            </div>

            <div>
              <label
                htmlFor="theme-hero-title"
                className="block text-[11px] font-semibold text-[#CFC9EA] mb-1"
              >
                Hero Heading (White Text)
              </label>
              <input
                id="theme-hero-title"
                type="text"
                value={config.heroTitle}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, heroTitle: e.target.value }))
                }
                className="w-full h-10 px-3 rounded-xl bg-[#1C1833] border border-white/12 text-xs text-white focus:outline-none focus:border-[#A855F7]"
              />
            </div>

            <div>
              <label
                htmlFor="theme-hero-accent"
                className="block text-[11px] font-semibold text-[#CFC9EA] mb-1"
              >
                Hero Accent (Purple Text)
              </label>
              <input
                id="theme-hero-accent"
                type="text"
                value={config.heroTitleAccent}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, heroTitleAccent: e.target.value }))
                }
                className="w-full h-10 px-3 rounded-xl bg-[#1C1833] border border-white/12 text-xs text-white focus:outline-none focus:border-[#A855F7]"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label
                htmlFor="theme-hero-subtitle"
                className="block text-[11px] font-semibold text-[#CFC9EA] mb-1"
              >
                Hero Description Text
              </label>
              <textarea
                id="theme-hero-subtitle"
                rows={2}
                value={config.heroSubtitle}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, heroSubtitle: e.target.value }))
                }
                className="w-full p-3 rounded-xl bg-[#1C1833] border border-white/12 text-xs text-white focus:outline-none focus:border-[#A855F7]"
              />
            </div>

            <div>
              <label
                htmlFor="theme-primary-cta"
                className="block text-[11px] font-semibold text-[#CFC9EA] mb-1"
              >
                Primary Button Label
              </label>
              <input
                id="theme-primary-cta"
                type="text"
                value={config.heroPrimaryCta}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, heroPrimaryCta: e.target.value }))
                }
                className="w-full h-10 px-3 rounded-xl bg-[#1C1833] border border-white/12 text-xs text-white focus:outline-none focus:border-[#A855F7]"
              />
            </div>

            <div>
              <label
                htmlFor="theme-secondary-cta"
                className="block text-[11px] font-semibold text-[#CFC9EA] mb-1"
              >
                Secondary Button Label
              </label>
              <input
                id="theme-secondary-cta"
                type="text"
                value={config.heroSecondaryCta}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, heroSecondaryCta: e.target.value }))
                }
                className="w-full h-10 px-3 rounded-xl bg-[#1C1833] border border-white/12 text-xs text-white focus:outline-none focus:border-[#A855F7]"
              />
            </div>
          </div>

          {/* Special Offers & Global Coupon Section */}
          <div className="pt-3 border-t border-white/10 space-y-3">
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <Gift className="w-4 h-4 text-[#C084FC]" />
              Special Offers Banner &amp; 1-Click All-Products Coupon
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor="theme-offer-title"
                  className="block text-[11px] font-semibold text-[#CFC9EA] mb-1"
                >
                  Offer Banner Title
                </label>
                <input
                  id="theme-offer-title"
                  type="text"
                  value={config.offerTitle}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, offerTitle: e.target.value }))
                  }
                  className="w-full h-10 px-3 rounded-xl bg-[#1C1833] border border-white/12 text-xs text-white focus:outline-none focus:border-[#A855F7]"
                />
              </div>

              <div>
                <label
                  htmlFor="theme-offer-subtitle"
                  className="block text-[11px] font-semibold text-[#CFC9EA] mb-1"
                >
                  Offer Banner Subtitle
                </label>
                <input
                  id="theme-offer-subtitle"
                  type="text"
                  value={config.offerSubtitle}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, offerSubtitle: e.target.value }))
                  }
                  className="w-full h-10 px-3 rounded-xl bg-[#1C1833] border border-white/12 text-xs text-white focus:outline-none focus:border-[#A855F7]"
                />
              </div>

              <div>
                <label
                  htmlFor="theme-offer-btn"
                  className="block text-[11px] font-semibold text-[#CFC9EA] mb-1"
                >
                  Offer Button Text
                </label>
                <input
                  id="theme-offer-btn"
                  type="text"
                  value={config.offerButtonText}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, offerButtonText: e.target.value }))
                  }
                  className="w-full h-10 px-3 rounded-xl bg-[#1C1833] border border-white/12 text-xs text-white focus:outline-none focus:border-[#A855F7]"
                />
              </div>

              <div>
                <label
                  htmlFor="theme-coupon-code"
                  className="block text-[11px] font-semibold text-[#CFC9EA] mb-1 flex items-center gap-1"
                >
                  <Tag className="w-3 h-3 text-[#C084FC]" />
                  Store Coupon Code
                </label>
                <input
                  id="theme-coupon-code"
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="w-full h-10 px-3 rounded-xl bg-[#1C1833] border border-white/12 text-xs font-mono font-bold text-white uppercase focus:outline-none focus:border-[#A855F7]"
                />
              </div>

              <div>
                <label
                  htmlFor="theme-coupon-percent"
                  className="block text-[11px] font-semibold text-[#CFC9EA] mb-1"
                >
                  Coupon Discount (%)
                </label>
                <input
                  id="theme-coupon-percent"
                  type="number"
                  min={1}
                  max={90}
                  value={config.couponDiscountPercent}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      couponDiscountPercent: Number(e.target.value) || 20,
                    }))
                  }
                  className="w-full h-10 px-3 rounded-xl bg-[#1C1833] border border-white/12 text-xs font-bold text-white focus:outline-none focus:border-[#A855F7]"
                />
              </div>

              <div>
                <label
                  htmlFor="theme-coupon-desc"
                  className="block text-[11px] font-semibold text-[#CFC9EA] mb-1"
                >
                  Coupon Popup Message
                </label>
                <input
                  id="theme-coupon-desc"
                  type="text"
                  value={couponText}
                  onChange={(e) => setCouponText(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#1C1833] border border-white/12 text-xs text-white focus:outline-none focus:border-[#A855F7]"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
            <button
              type="submit"
              disabled={busy || uploadingHero}
              className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-[#7C3AED] hover:bg-[#8B5CF6] disabled:opacity-60 text-xs sm:text-sm font-extrabold text-white shadow-[0_8px_24px_rgba(124,58,237,0.45)]"
            >
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Save Customization &amp; Apply Theme</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
