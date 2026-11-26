import React, { useEffect, useState } from 'react';
import {
  Image as ImageIcon,
  Loader2,
  Plus,
  QrCode,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { CurrencyCode, PaymentGateway } from '../../types/store';
import { sanitizeSafeMediaUrl } from '../../utils/supabaseMappers';
import { PaymentGatewayLogo } from '../PaymentGatewayLogo';

const CURRENCY_CHOICES: { code: CurrencyCode; label: string }[] = [
  { code: 'PKR', label: 'PKR (Rs)' },
  { code: 'INR', label: 'INR (₹)' },
  { code: 'USD', label: 'USD ($)' },
];

function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Could not read file.'));
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

interface AdminPaymentsTabProps {
  gateways: PaymentGateway[];
  busy: boolean;
  onCreateGateway: (payload: Partial<PaymentGateway>) => Promise<void>;
  onUpdateGateway: (id: string, payload: Partial<PaymentGateway>) => Promise<void>;
  onDeleteGateway: (id: string) => Promise<void>;
  onUploadMedia: (payload: {
    folder: 'logos' | 'banners' | 'qr';
    filename: string;
    dataBase64: string;
  }) => Promise<string>;
}

export function AdminPaymentsTab({
  gateways,
  busy,
  onCreateGateway,
  onUpdateGateway,
  onDeleteGateway,
  onUploadMedia,
}: AdminPaymentsTabProps) {
  const [newName, setNewName] = useState('');
  const [newCurrency, setNewCurrency] = useState<CurrencyCode>('PKR');
  const [newTitle, setNewTitle] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newInstructions, setNewInstructions] = useState('');
  const [newLogoUrl, setNewLogoUrl] = useState('');
  const [newQrUrl, setNewQrUrl] = useState('');
  const [newIsActive, setNewIsActive] = useState(true);

  const [drafts, setDrafts] = useState<Record<string, PaymentGateway>>({});
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const next: Record<string, PaymentGateway> = {};
    for (const g of gateways) {
      next[g.id] = { ...g };
    }
    setDrafts(next);
  }, [gateways]);

  const handleImageUpload = async (
    file: File | undefined,
    targetKey: 'new' | string,
    kind: 'logo' | 'qr'
  ) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setFormError(
        `${kind === 'logo' ? 'Gateway logo' : 'QR code'} image must be 2 MB or smaller (PNG, JPG, WebP, GIF).`
      );
      return;
    }
    const uploadToken = `${targetKey}:${kind}`;
    setFormError(null);
    setUploadingKey(uploadToken);
    try {
      const dataBase64 = await readImageAsDataUrl(file);
      const url = await onUploadMedia({
        folder: kind === 'logo' ? 'logos' : 'qr',
        filename: file.name,
        dataBase64,
      });
      if (targetKey === 'new') {
        if (kind === 'logo') setNewLogoUrl(url);
        else setNewQrUrl(url);
      } else {
        setDrafts((prev) => {
          const existing = prev[targetKey] || gateways.find((g) => g.id === targetKey);
          if (!existing) return prev;
          return {
            ...prev,
            [targetKey]:
              kind === 'logo'
                ? { ...existing, logoUrl: url }
                : { ...existing, qrCodeUrl: url },
          };
        });
      }
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : `${kind === 'logo' ? 'Logo' : 'QR code'} upload failed.`
      );
    } finally {
      setUploadingKey(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newTitle.trim() || !newNumber.trim()) {
      setFormError('Gateway Name, Account Title, and Account Number / Address are required.');
      return;
    }
    setFormError(null);
    await onCreateGateway({
      name: newName.trim(),
      currency: newCurrency,
      accountTitle: newTitle.trim(),
      accountNumber: newNumber.trim(),
      instructions:
        newInstructions.trim() ||
        'Send the exact amount and upload your payment screenshot + Transaction ID.',
      logoUrl: newLogoUrl.trim() || undefined,
      qrCodeUrl: newQrUrl.trim() || undefined,
      isActive: newIsActive,
    });
    setNewName('');
    setNewTitle('');
    setNewNumber('');
    setNewInstructions('');
    setNewLogoUrl('');
    setNewQrUrl('');
    setNewIsActive(true);
  };

  const safeNewQr = sanitizeSafeMediaUrl(newQrUrl);
  const safeNewLogo = sanitizeSafeMediaUrl(newLogoUrl);

  return (
    <div className="space-y-5">
      {/* Add New Payment Gateway Form */}
      <form
        onSubmit={handleCreate}
        className="rounded-2xl bg-[#141126] border border-white/10 p-4 sm:p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display font-bold text-sm sm:text-base text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#C084FC]" />
              Add Payment Gateway
            </h2>
            <p className="text-xs text-[#9E97BE] mt-0.5">
              Create EasyPaisa, JazzCash, Crypto (USDT), UPI, or Bank methods with custom logos. Customers see active gateways live at checkout.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-white/8 hover:bg-white/15 border border-white/14 text-xs font-bold text-white cursor-pointer transition-colors">
              {uploadingKey === 'new:logo' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ImageIcon className="w-3.5 h-3.5 text-[#C084FC]" />
              )}
              <span>{uploadingKey === 'new:logo' ? 'Uploading Logo...' : 'Upload Logo'}</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                disabled={uploadingKey === 'new:logo'}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  void handleImageUpload(file, 'new', 'logo');
                }}
              />
            </label>

            <label className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-[#7C3AED] hover:bg-[#8B5CF6] text-xs font-bold text-white cursor-pointer transition-colors">
              {uploadingKey === 'new:qr' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <span>{uploadingKey === 'new:qr' ? 'Uploading QR...' : 'Upload QR Code'}</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                disabled={uploadingKey === 'new:qr'}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  void handleImageUpload(file, 'new', 'qr');
                }}
              />
            </label>
          </div>
        </div>

        {formError && (
          <div
            role="alert"
            className="rounded-xl bg-rose-500/15 border border-rose-400/35 px-3 py-2 text-xs text-rose-200"
          >
            {formError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label
              htmlFor="new-gw-name"
              className="block text-[11px] font-semibold text-[#CFC9EA] mb-1"
            >
              Gateway Name
            </label>
            <input
              id="new-gw-name"
              type="text"
              required
              placeholder="e.g. EasyPaisa, USDT TRC20"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[#1C1833] border border-white/12 text-xs text-white focus:outline-none focus:border-[#A855F7]"
            />
          </div>

          <div>
            <label
              htmlFor="new-gw-currency"
              className="block text-[11px] font-semibold text-[#CFC9EA] mb-1"
            >
              Payment Currency
            </label>
            <select
              id="new-gw-currency"
              value={newCurrency}
              onChange={(e) => setNewCurrency(e.target.value as CurrencyCode)}
              className="w-full h-10 px-3 rounded-xl bg-[#1C1833] border border-white/12 text-xs font-semibold text-white focus:outline-none focus:border-[#A855F7]"
            >
              {CURRENCY_CHOICES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="new-gw-title"
              className="block text-[11px] font-semibold text-[#CFC9EA] mb-1"
            >
              Account Title / Holder
            </label>
            <input
              id="new-gw-title"
              type="text"
              required
              placeholder="e.g. ToolBazaar Official"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[#1C1833] border border-white/12 text-xs text-white focus:outline-none focus:border-[#A855F7]"
            />
          </div>

          <div>
            <label
              htmlFor="new-gw-number"
              className="block text-[11px] font-semibold text-[#CFC9EA] mb-1"
            >
              Account Number / Wallet / UPI
            </label>
            <input
              id="new-gw-number"
              type="text"
              required
              placeholder="e.g. 0300-1234567 or TQn9..."
              value={newNumber}
              onChange={(e) => setNewNumber(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[#1C1833] border border-white/12 text-xs font-mono text-white focus:outline-none focus:border-[#A855F7]"
            />
          </div>
        </div>

        {/* Gateway Logo URL + Live Preview */}
        <div className="rounded-xl bg-[#0F0C1E] border border-white/8 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3 shrink-0">
            <PaymentGatewayLogo
              name={newName || 'Gateway'}
              logoUrl={safeNewLogo}
              size="md"
            />
            <div className="text-[11px] text-[#ABA4CC]">
              <div className="font-semibold text-white">Gateway Logo Preview</div>
              <div>{safeNewLogo ? 'Custom logo active' : 'Auto brand icon (or upload custom)'}</div>
            </div>
          </div>

          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              placeholder="Paste Gateway Logo URL (https://...) or click Upload Logo above"
              value={newLogoUrl}
              onChange={(e) => setNewLogoUrl(e.target.value)}
              className="flex-1 h-9 px-3 rounded-xl bg-[#1C1833] border border-white/12 text-xs text-white placeholder:text-[#7E789E] focus:outline-none focus:border-[#A855F7]"
            />
            {newLogoUrl && (
              <button
                type="button"
                onClick={() => setNewLogoUrl('')}
                className="h-9 px-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-[11px] font-semibold text-rose-200 shrink-0"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-start">
          {safeNewQr && (
            <div className="relative w-24 h-24 rounded-xl bg-white p-1.5 shrink-0 border border-white/15">
              <img
                src={safeNewQr}
                alt="New QR code preview"
                className="w-full h-full object-contain"
              />
              <button
                type="button"
                onClick={() => setNewQrUrl('')}
                aria-label="Remove QR preview"
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center shadow"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex-1 w-full space-y-2.5">
            <input
              type="text"
              placeholder="Customer payment instructions (e.g. Send exact amount & upload screenshot with TRX ID)"
              value={newInstructions}
              onChange={(e) => setNewInstructions(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[#1C1833] border border-white/12 text-xs text-white focus:outline-none focus:border-[#A855F7]"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="inline-flex items-center gap-2 text-xs text-[#D5CFF2] cursor-pointer">
                <input
                  type="checkbox"
                  checked={newIsActive}
                  onChange={(e) => setNewIsActive(e.target.checked)}
                  className="rounded accent-[#7C3AED] w-4 h-4"
                />
                <span>Active at Checkout</span>
              </label>

              <button
                type="submit"
                disabled={busy || uploadingKey === 'new:logo' || uploadingKey === 'new:qr'}
                className="inline-flex items-center gap-1.5 h-10 px-5 rounded-xl bg-[#7C3AED] hover:bg-[#8B5CF6] disabled:opacity-60 text-xs font-bold text-white shadow-[0_6px_18px_rgba(124,58,237,0.4)]"
              >
                <Plus className="w-4 h-4" />
                Add Payment Gateway
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Existing Payment Gateways */}
      {gateways.length === 0 ? (
        <div className="rounded-2xl bg-[#141126] border border-white/10 p-8 text-center text-sm text-[#9E97BE]">
          No payment gateways configured yet. Add EasyPaisa, JazzCash, Crypto, or UPI above.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {gateways.map((gw) => {
            const draft = drafts[gw.id] || gw;
            const safeQr = sanitizeSafeMediaUrl(draft.qrCodeUrl);
            const safeLogo = sanitizeSafeMediaUrl(draft.logoUrl);
            const isUploadingLogo = uploadingKey === `${gw.id}:logo`;
            const isUploadingQr = uploadingKey === `${gw.id}:qr`;

            return (
              <div
                key={gw.id}
                className={`rounded-2xl bg-[#141126] border p-4 space-y-3 ${
                  draft.isActive ? 'border-white/12' : 'border-white/6 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <PaymentGatewayLogo
                      name={draft.name}
                      logoUrl={safeLogo}
                      size="md"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display font-bold text-sm text-white truncate">
                          {draft.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-white/8 text-[10px] font-bold text-[#DDD6FE]">
                          {draft.currency}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            draft.isActive
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30'
                              : 'bg-white/6 text-[#9E97BE] border border-white/10'
                          }`}
                        >
                          {draft.isActive ? 'Active' : 'Paused'}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-[#A39DC4] truncate mt-0.5">
                        {draft.accountNumber}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onDeleteGateway(gw.id)}
                    aria-label={`Delete payment gateway ${gw.name}`}
                    className="w-8 h-8 rounded-xl bg-white/6 hover:bg-rose-500/25 flex items-center justify-center text-[#CFC9EA] hover:text-rose-300 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(e) =>
                      setDrafts({
                        ...drafts,
                        [gw.id]: { ...draft, name: e.target.value },
                      })
                    }
                    placeholder="Gateway Name"
                    className="h-9 px-3 rounded-xl bg-[#1C1833] border border-white/12 text-xs font-semibold text-white focus:outline-none focus:border-[#A855F7]"
                  />
                  <select
                    value={draft.currency}
                    onChange={(e) =>
                      setDrafts({
                        ...drafts,
                        [gw.id]: {
                          ...draft,
                          currency: e.target.value as CurrencyCode,
                        },
                      })
                    }
                    className="h-9 px-3 rounded-xl bg-[#1C1833] border border-white/12 text-xs font-semibold text-white focus:outline-none focus:border-[#A855F7]"
                  >
                    {CURRENCY_CHOICES.map((c) => (
                      <option key={c.code} value={c.code}>
                        Currency: {c.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={draft.accountTitle}
                    onChange={(e) =>
                      setDrafts({
                        ...drafts,
                        [gw.id]: { ...draft, accountTitle: e.target.value },
                      })
                    }
                    placeholder="Account Title"
                    className="h-9 px-3 rounded-xl bg-[#1C1833] border border-white/12 text-xs text-white focus:outline-none focus:border-[#A855F7]"
                  />
                  <input
                    type="text"
                    value={draft.accountNumber}
                    onChange={(e) =>
                      setDrafts({
                        ...drafts,
                        [gw.id]: { ...draft, accountNumber: e.target.value },
                      })
                    }
                    placeholder="Account Number / Wallet"
                    className="h-9 px-3 rounded-xl bg-[#1C1833] border border-white/12 text-xs font-mono text-white focus:outline-none focus:border-[#A855F7]"
                  />
                </div>

                {/* Gateway Logo Upload / URL */}
                <div className="rounded-xl bg-[#0F0C1E] border border-white/8 p-2.5 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[11px] text-[#ABA4CC]">
                      <span className="font-semibold text-white">Gateway Logo</span>
                      <span className="ml-1.5 text-[#8F89B0]">
                        {safeLogo ? '(Custom image)' : '(Auto brand logo)'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <label className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/8 hover:bg-white/14 border border-white/12 text-[11px] font-bold text-white cursor-pointer">
                        {isUploadingLogo ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ImageIcon className="w-3.5 h-3.5 text-[#C084FC]" />
                        )}
                        <span>{safeLogo ? 'Change Logo' : 'Upload Logo'}</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          className="hidden"
                          disabled={isUploadingLogo}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = '';
                            void handleImageUpload(file, gw.id, 'logo');
                          }}
                        />
                      </label>
                      {draft.logoUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            setDrafts({
                              ...drafts,
                              [gw.id]: { ...draft, logoUrl: undefined },
                            })
                          }
                          className="h-8 px-2.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-[11px] font-semibold text-rose-200"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    type="text"
                    value={draft.logoUrl || ''}
                    onChange={(e) =>
                      setDrafts({
                        ...drafts,
                        [gw.id]: { ...draft, logoUrl: e.target.value },
                      })
                    }
                    placeholder="Or paste custom Logo Image URL (https://...)"
                    className="w-full h-8 px-2.5 rounded-lg bg-[#1C1833] border border-white/10 text-[11px] text-white placeholder:text-[#787296] focus:outline-none focus:border-[#A855F7]"
                  />
                </div>

                <textarea
                  rows={2}
                  value={draft.instructions}
                  onChange={(e) =>
                    setDrafts({
                      ...drafts,
                      [gw.id]: { ...draft, instructions: e.target.value },
                    })
                  }
                  placeholder="Instructions for customers..."
                  className="w-full p-2.5 rounded-xl bg-[#1C1833] border border-white/12 text-xs text-white focus:outline-none focus:border-[#A855F7]"
                />

                {/* QR Code Upload & Preview */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#0F0C1E] border border-white/8 p-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {safeQr ? (
                      <div className="w-12 h-12 rounded-lg bg-white p-1 shrink-0">
                        <img
                          src={safeQr}
                          alt={`${draft.name} QR code`}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-white/5 border border-dashed border-white/15 flex items-center justify-center text-[#8C85AE] shrink-0">
                        <QrCode className="w-5 h-5" />
                      </div>
                    )}
                    <div className="text-[11px] text-[#ABA4CC]">
                      <div className="font-semibold text-white">QR Code</div>
                      <div>{safeQr ? 'Uploaded & ready' : 'Optional scan-to-pay image'}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <label className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/8 hover:bg-white/14 border border-white/12 text-[11px] font-bold text-white cursor-pointer">
                      {isUploadingQr ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>{safeQr ? 'Change QR' : 'Upload QR'}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        disabled={isUploadingQr}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = '';
                          void handleImageUpload(file, gw.id, 'qr');
                        }}
                      />
                    </label>
                    {safeQr && (
                      <button
                        type="button"
                        onClick={() =>
                          setDrafts({
                            ...drafts,
                            [gw.id]: { ...draft, qrCodeUrl: undefined },
                          })
                        }
                        className="h-8 px-2.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-[11px] font-semibold text-rose-200"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <label className="inline-flex items-center gap-2 text-xs text-[#D5CFF2] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.isActive}
                      onChange={(e) =>
                        setDrafts({
                          ...drafts,
                          [gw.id]: { ...draft, isActive: e.target.checked },
                        })
                      }
                      className="rounded accent-[#7C3AED] w-4 h-4"
                    />
                    <span>Show at Checkout</span>
                  </label>

                  <button
                    type="button"
                    disabled={busy || isUploadingLogo || isUploadingQr}
                    onClick={() => void onUpdateGateway(gw.id, draft)}
                    className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-[#7C3AED] hover:bg-[#8B5CF6] disabled:opacity-60 text-xs font-bold text-white"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Gateway</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
