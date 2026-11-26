import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Flame,
  KeyRound,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
  Zap,
  Clock,
} from 'lucide-react';
import type {
  BrandKey,
  CategoryId,
  CurrencyCode,
  DeliveryField,
  DeliveryMode,
  PlanOption,
  ProductAccountItem,
  ToolProduct,
} from '../../types/store';
import { calculateDiscountPercent, formatCurrency } from '../../utils/storeLogic';
import { sanitizeSafeMediaUrl } from '../../utils/supabaseMappers';
import { BrandAppIcon } from '../BrandIcons';

export interface AccountUploadDraft {
  tempId: string;
  planId: string;
  fileName: string;
  accountContent: string;
  accountFields: DeliveryField[];
}

interface AdminToolsTabProps {
  tools: ToolProduct[];
  currency: CurrencyCode;
  busy: boolean;
  onCreateTool: (payload: Partial<ToolProduct>) => Promise<ToolProduct>;
  onUpdateTool: (id: string, payload: Partial<ToolProduct>) => Promise<void>;
  onDeleteTool: (id: string) => Promise<void>;
  onUploadMedia: (payload: {
    folder: 'logos' | 'banners';
    filename: string;
    dataBase64: string;
  }) => Promise<string>;
  onFetchAccounts: (toolId: string) => Promise<ProductAccountItem[]>;
  onAddAccounts: (
    toolId: string,
    planId: string,
    accounts: {
      fileName: string;
      accountContent: string;
      accountFields?: DeliveryField[];
    }[]
  ) => Promise<ProductAccountItem[]>;
  onDeleteAccount: (accountId: string) => Promise<void>;
}

const TOOL_CATEGORIES: { id: Exclude<CategoryId, 'all'>; label: string }[] = [
  { id: 'ai', label: 'AI Tools' },
  { id: 'video', label: 'Video Tools' },
  { id: 'design', label: 'Design Tools' },
  { id: 'productivity', label: 'Productivity' },
  { id: 'more', label: 'More' },
];

const BRAND_KEYS: BrandKey[] = [
  'chatgpt',
  'capcut',
  'canva',
  'adobe',
  'midjourney',
  'claude',
  'premiere',
  'figma',
  'notion',
  'grammarly',
  'perplexity',
  'envato',
];

interface ToolFormState {
  name: string;
  badgeText: string;
  subtitle: string;
  description: string;
  category: Exclude<CategoryId, 'all'>;
  brand: BrandKey;
  logoUrl: string;
  originalPrice: string;
  price: string;
  available: string;
  sold: string;
  trending: boolean;
  deliveryType: string;
  featuresText: string;
}

interface PlanDraft {
  id: string;
  label: string;
  months: string;
  price: string;
  originalPrice: string;
  description: string;
  deliveryMode: DeliveryMode;
}

function createFormState(tool?: ToolProduct | null): ToolFormState {
  if (!tool) {
    return {
      name: '',
      badgeText: 'Premium',
      subtitle: 'Official Pro Access',
      description: 'Official verified digital subscription with instant delivery.',
      category: 'ai',
      brand: 'chatgpt',
      logoUrl: '',
      originalPrice: '1999',
      price: '999',
      available: '50',
      sold: '0',
      trending: true,
      deliveryType: 'Instant Delivery',
      featuresText:
        'Official verified account\nInstant delivery\nFull warranty support',
    };
  }

  return {
    name: tool.name,
    badgeText: tool.badgeText,
    subtitle: tool.subtitle,
    description: tool.description,
    category: tool.category,
    brand: tool.brand,
    logoUrl: tool.logoUrl || '',
    originalPrice: String(tool.originalPrice),
    price: String(tool.price),
    available: String(tool.available),
    sold: String(tool.sold),
    trending: tool.trending,
    deliveryType: tool.deliveryType,
    featuresText: tool.features.join('\n'),
  };
}

function createPlanDrafts(tool?: ToolProduct | null): PlanDraft[] {
  if (tool && tool.plans.length > 0) {
    return tool.plans.map((p) => ({
      id: p.id,
      label: p.label,
      months: String(p.months),
      price: String(p.price),
      originalPrice: String(p.originalPrice),
      description: p.description || '',
      deliveryMode: p.deliveryMode === 'manual' ? 'manual' : 'automatic',
    }));
  }

  return [
    {
      id: '1m',
      label: '1 Month',
      months: '1',
      price: '999',
      originalPrice: '1999',
      description: 'Standard monthly subscription',
      deliveryMode: 'automatic',
    },
    {
      id: '3m',
      label: '3 Months',
      months: '3',
      price: '2699',
      originalPrice: '5997',
      description: 'Save extra with 3-month access',
      deliveryMode: 'automatic',
    },
  ];
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Could not read file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

export function AdminToolsTab({
  tools,
  currency,
  busy,
  onCreateTool,
  onUpdateTool,
  onDeleteTool,
  onUploadMedia,
  onFetchAccounts,
  onAddAccounts,
  onDeleteAccount,
}: AdminToolsTabProps) {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [editingTool, setEditingTool] = useState<ToolProduct | null>(null);
  const [form, setForm] = useState<ToolFormState>(() => createFormState(null));
  const [plans, setPlans] = useState<PlanDraft[]>(() => createPlanDrafts(null));
  const [selectedPlanId, setSelectedPlanId] = useState<string>('1m');

  const [logoUploading, setLogoUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Account delivery pool state (Step 2)
  const [existingAccounts, setExistingAccounts] = useState<ProductAccountItem[]>([]);
  const [queuedAccounts, setQueuedAccounts] = useState<AccountUploadDraft[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountNotice, setAccountNotice] = useState<string | null>(null);

  // Manual account entry inside Step 2
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualFileName, setManualFileName] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [manualFields, setManualFields] = useState<DeliveryField[]>([
    { label: 'Email', value: '' },
    { label: 'Password', value: '' },
  ]);

  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const txtInputRef = useRef<HTMLInputElement | null>(null);

  const filteredTools = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tools;
    return tools.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.subtitle.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
    );
  }, [tools, search]);

  useEffect(() => {
    if (!modalOpen || !editingTool) return;
    let cancelled = false;
    setAccountsLoading(true);
    void onFetchAccounts(editingTool.id)
      .then((rows) => {
        if (!cancelled) setExistingAccounts(rows);
      })
      .catch(() => {
        if (!cancelled) setExistingAccounts([]);
      })
      .finally(() => {
        if (!cancelled) setAccountsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [modalOpen, editingTool, onFetchAccounts]);

  const openAddModal = () => {
    const initialPlans = createPlanDrafts(null);
    setEditingTool(null);
    setForm(createFormState(null));
    setPlans(initialPlans);
    setSelectedPlanId(initialPlans[0].id);
    setExistingAccounts([]);
    setQueuedAccounts([]);
    setWizardStep(1);
    setFormError(null);
    setAccountNotice(null);
    setShowManualForm(false);
    setModalOpen(true);
  };

  const openEditModal = (tool: ToolProduct) => {
    const initialPlans = createPlanDrafts(tool);
    setEditingTool(tool);
    setForm(createFormState(tool));
    setPlans(initialPlans);
    setSelectedPlanId(initialPlans[0].id);
    setExistingAccounts([]);
    setQueuedAccounts([]);
    setWizardStep(1);
    setFormError(null);
    setAccountNotice(null);
    setShowManualForm(false);
    setModalOpen(true);
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setFormError('Logo image must be 2 MB or smaller (PNG, JPG, WebP, GIF).');
      return;
    }

    setLogoUploading(true);
    setFormError(null);
    try {
      const dataBase64 = await readFileAsDataUrl(file);
      const url = await onUploadMedia({
        folder: 'logos',
        filename: file.name,
        dataBase64,
      });
      setForm((prev) => ({ ...prev, logoUrl: url }));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Logo upload failed.');
    } finally {
      setLogoUploading(false);
    }
  };

  const validateStep1 = (): boolean => {
    setFormError(null);
    if (!form.name.trim()) {
      setFormError('Product name is required before continuing.');
      return false;
    }
    const rawLogo = form.logoUrl.trim();
    if (rawLogo && !sanitizeSafeMediaUrl(rawLogo)) {
      setFormError('Logo URL must start with https:// or /');
      return false;
    }
    return true;
  };

  const handleGoToStep2 = () => {
    if (!validateStep1()) return;
    // Sync base price into Plan 1 if adding a brand-new product and still using default values
    if (!editingTool && plans.length > 0) {
      const basePrice = Math.max(0, Math.round(Number(form.price) || 0));
      const baseOrig = Math.max(0, Math.round(Number(form.originalPrice) || 0));
      setPlans((prev) =>
        prev.map((p, idx) =>
          idx === 0
            ? {
                ...p,
                price: String(basePrice),
                originalPrice: String(Math.max(baseOrig, basePrice)),
              }
            : p
        )
      );
    }
    setWizardStep(2);
  };

  const handleAddPlan = () => {
    const idx = plans.length + 1;
    const basePrice = Math.max(0, Math.round(Number(form.price) || 999));
    const baseOrig = Math.max(
      basePrice,
      Math.round(Number(form.originalPrice) || 1999)
    );
    const id = `plan-${Date.now().toString(36)}-${idx}`;
    const newPlan: PlanDraft = {
      id,
      label: idx === 3 ? '6 Months' : idx === 4 ? '1 Year' : `Plan ${idx}`,
      months: idx === 3 ? '6' : idx === 4 ? '12' : '1',
      price: String(basePrice),
      originalPrice: String(baseOrig),
      description: '',
      deliveryMode: 'automatic',
    };
    setPlans((prev) => [...prev, newPlan]);
    setSelectedPlanId(id);
  };

  const handleRemovePlan = (planId: string) => {
    if (plans.length <= 1) return;
    const next = plans.filter((p) => p.id !== planId);
    setPlans(next);
    if (selectedPlanId === planId && next[0]) {
      setSelectedPlanId(next[0].id);
    }
    setQueuedAccounts((prev) => prev.filter((q) => q.planId !== planId));
  };

  const handleUpdatePlanField = <K extends keyof PlanDraft>(
    planId: string,
    key: K,
    value: PlanDraft[K]
  ) => {
    setPlans((prev) =>
      prev.map((p) => (p.id === planId ? { ...p, [key]: value } : p))
    );
  };

  const handleTxtFilesSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    setFormError(null);
    setAccountNotice(null);

    const parsed: {
      fileName: string;
      accountContent: string;
      accountFields: DeliveryField[];
    }[] = [];

    for (const file of files) {
      if (file.size > 128 * 1024) {
        setFormError(`${file.name} is too large (max 128 KB per .txt file).`);
        continue;
      }
      const text = (await file.text()).trim();
      if (!text) continue;
      parsed.push({
        fileName: file.name,
        accountContent: text,
        accountFields: [],
      });
    }

    if (parsed.length === 0) {
      setFormError('No readable text content found in the selected .txt files.');
      return;
    }

    if (editingTool) {
      setAccountBusy(true);
      try {
        const created = await onAddAccounts(
          editingTool.id,
          selectedPlanId,
          parsed
        );
        setExistingAccounts((prev) => [...created, ...prev]);
        setAccountNotice(
          `Uploaded ${created.length} .txt account${created.length === 1 ? '' : 's'} to pool!`
        );
      } catch (err) {
        setFormError(
          err instanceof Error ? err.message : 'Failed to upload .txt accounts.'
        );
      } finally {
        setAccountBusy(false);
      }
    } else {
      const drafts: AccountUploadDraft[] = parsed.map((p, i) => ({
        tempId: `q-${Date.now()}-${i}`,
        planId: selectedPlanId,
        fileName: p.fileName,
        accountContent: p.accountContent,
        accountFields: [],
      }));
      setQueuedAccounts((prev) => [...drafts, ...prev]);
      setAccountNotice(
        `Queued ${drafts.length} .txt account${drafts.length === 1 ? '' : 's'} — will save when you create the product.`
      );
    }
  };

  const handleAddManualAccount = async () => {
    setFormError(null);
    setAccountNotice(null);

    const cleanedFields = manualFields
      .map((f) => ({ label: f.label.trim(), value: f.value.trim() }))
      .filter((f) => f.label && f.value);
    const trimmedContent = manualContent.trim();

    if (!trimmedContent && cleanedFields.length === 0) {
      setFormError(
        'Enter account details text or at least one Label & Value field.'
      );
      return;
    }

    const composedContent =
      trimmedContent ||
      cleanedFields.map((f) => `${f.label}: ${f.value}`).join('\n');
    const fileName =
      manualFileName.trim() || `account-${selectedPlanId}.txt`;

    if (editingTool) {
      setAccountBusy(true);
      try {
        const created = await onAddAccounts(editingTool.id, selectedPlanId, [
          {
            fileName,
            accountContent: composedContent,
            accountFields: cleanedFields,
          },
        ]);
        setExistingAccounts((prev) => [...created, ...prev]);
        setAccountNotice('Account added to delivery pool!');
      } catch (err) {
        setFormError(
          err instanceof Error ? err.message : 'Failed to add account.'
        );
      } finally {
        setAccountBusy(false);
      }
    } else {
      setQueuedAccounts((prev) => [
        {
          tempId: `q-${Date.now()}`,
          planId: selectedPlanId,
          fileName,
          accountContent: composedContent,
          accountFields: cleanedFields,
        },
        ...prev,
      ]);
      setAccountNotice('Account queued — will save with the new product.');
    }

    setManualFileName('');
    setManualContent('');
    setManualFields([
      { label: 'Email', value: '' },
      { label: 'Password', value: '' },
    ]);
    setShowManualForm(false);
  };

  const handleDeleteExistingAccount = async (accountId: string) => {
    setAccountBusy(true);
    setFormError(null);
    try {
      await onDeleteAccount(accountId);
      setExistingAccounts((prev) => prev.filter((a) => a.id !== accountId));
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to delete account.'
      );
    } finally {
      setAccountBusy(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1()) {
      setWizardStep(1);
      return;
    }

    const normalizedPlans: PlanOption[] = plans
      .map((p, idx) => {
        const sale = Math.max(0, Math.round(Number(p.price) || 0));
        const orig = Math.max(sale, Math.round(Number(p.originalPrice) || sale));
        return {
          id: p.id.trim() || `plan-${idx + 1}`,
          label: p.label.trim() || `Plan ${idx + 1}`,
          months: Math.max(1, Math.round(Number(p.months) || 1)),
          price: sale,
          originalPrice: orig,
          description: p.description.trim() || undefined,
          deliveryMode: p.deliveryMode,
        };
      })
      .filter((p) => p.label.length > 0);

    if (normalizedPlans.length === 0) {
      setFormError('At least one subscription plan is required.');
      setWizardStep(2);
      return;
    }

    const primaryPlan = normalizedPlans[0];
    const originalPrice =
      wizardStep === 2
        ? primaryPlan.originalPrice
        : Math.max(0, Math.round(Number(form.originalPrice) || 0));
    const price =
      wizardStep === 2
        ? primaryPlan.price
        : Math.max(0, Math.round(Number(form.price) || 0));
    const available = Math.max(0, Math.round(Number(form.available) || 0));
    const sold = Math.max(0, Math.round(Number(form.sold) || 0));
    const discountPercent = calculateDiscountPercent(originalPrice, price);

    const rawLogo = form.logoUrl.trim();
    const features = form.featuresText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const hasAutomaticPlan = normalizedPlans.some(
      (p) => p.deliveryMode !== 'manual'
    );

    const payload: Partial<ToolProduct> = {
      name: form.name.trim(),
      badgeText: form.badgeText.trim() || 'Premium',
      subtitle: form.subtitle.trim() || 'Official Access',
      description: form.description.trim() || form.subtitle.trim(),
      category: form.category,
      brand: form.brand,
      logoUrl: rawLogo || undefined,
      originalPrice,
      price,
      discountPercent,
      available,
      sold,
      trending: form.trending,
      deliveryType: hasAutomaticPlan ? 'Instant Delivery' : 'Manual Delivery',
      features: features.length > 0 ? features : ['Official verified access'],
      plans: normalizedPlans,
    };

    try {
      if (editingTool) {
        await onUpdateTool(editingTool.id, payload);
      } else {
        const createdTool = await onCreateTool(payload);
        // Upload any queued .txt / manual accounts grouped by planId
        if (queuedAccounts.length > 0 && createdTool?.id) {
          const byPlan = new Map<string, AccountUploadDraft[]>();
          for (const acc of queuedAccounts) {
            const list = byPlan.get(acc.planId) || [];
            list.push(acc);
            byPlan.set(acc.planId, list);
          }
          for (const [planId, items] of byPlan.entries()) {
            await onAddAccounts(
              createdTool.id,
              planId,
              items.map((item) => ({
                fileName: item.fileName,
                accountContent: item.accountContent,
                accountFields: item.accountFields,
              }))
            );
          }
        }
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save tool.');
    }
  };

  const previewLogoUrl = sanitizeSafeMediaUrl(form.logoUrl);
  const activePlanDraft =
    plans.find((p) => p.id === selectedPlanId) || plans[0];

  const activeExistingAccounts = existingAccounts.filter(
    (a) => a.planId === activePlanDraft?.id
  );
  const activeQueuedAccounts = queuedAccounts.filter(
    (a) => a.planId === activePlanDraft?.id
  );
  const availablePoolCount =
    activeExistingAccounts.filter((a) => a.status === 'available').length +
    activeQueuedAccounts.length;
  const assignedPoolCount = activeExistingAccounts.filter(
    (a) => a.status === 'assigned'
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#9A93BA] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by name or category..."
            className="w-full h-10 pl-10 pr-3.5 rounded-2xl bg-[#151228] border border-white/10 text-sm text-white placeholder:text-[#847DA6] focus:outline-none focus:border-[#A855F7]"
          />
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-2xl bg-[#7C3AED] hover:bg-[#8B5CF6] text-xs sm:text-sm font-bold text-white shadow-[0_6px_20px_rgba(124,58,237,0.4)] transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add New Product
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredTools.map((tool) => {
          const outOfStock = tool.available <= 0;
          return (
            <div
              key={tool.id}
              className="rounded-2xl bg-[#141126] border border-white/10 p-4 flex items-start justify-between gap-3 hover:border-[#A855F7]/40 transition-colors"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="shrink-0 mt-0.5">
                  <BrandAppIcon
                    brand={tool.brand}
                    logoUrl={tool.logoUrl}
                    size="sm"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display font-bold text-sm text-white truncate">
                      {tool.name}
                    </h3>
                    <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md bg-white/8 text-[#C4B5FD]">
                      {tool.category}
                    </span>
                    {outOfStock && (
                      <span className="text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-400/40 text-rose-300">
                        Out of Stock
                      </span>
                    )}
                    {tool.trending && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-300">
                        <Flame className="w-3 h-3" />
                        Trending
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#9E97BE] truncate mt-0.5">
                    {tool.subtitle}
                  </p>
                  <div className="mt-2 flex items-center flex-wrap gap-x-3 gap-y-1 text-xs tabular-nums">
                    <span className="font-bold text-white">
                      {formatCurrency(tool.price, currency)}
                    </span>
                    <span className="text-[#8B84AD] line-through">
                      {formatCurrency(tool.originalPrice, currency)}
                    </span>
                    <span
                      className={`font-semibold ${
                        outOfStock ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      Stock: {tool.available}
                    </span>
                    <span className="text-orange-300">Sold: {tool.sold}</span>
                    <span className="text-[#C4B5FD]">
                      {tool.plans.length} {tool.plans.length === 1 ? 'plan' : 'plans'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => openEditModal(tool)}
                  aria-label={`Edit ${tool.name}`}
                  className="w-9 h-9 rounded-xl bg-white/6 hover:bg-[#7C3AED]/30 border border-white/10 flex items-center justify-center text-[#DDD6FE] hover:text-white transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>

                {confirmDeleteId === tool.id ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      void onDeleteTool(tool.id).then(() =>
                        setConfirmDeleteId(null)
                      );
                    }}
                    className="h-9 px-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-[11px] font-bold text-white"
                  >
                    Confirm
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(tool.id)}
                    aria-label={`Delete ${tool.name}`}
                    className="w-9 h-9 rounded-xl bg-white/6 hover:bg-rose-500/25 border border-white/10 flex items-center justify-center text-[#CFC9EA] hover:text-rose-300 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 2-Step Product Wizard Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-5 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label={editingTool ? 'Edit product' : 'Add new product'}
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-[26px] bg-[#141126] border border-white/15 p-4 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-white/10">
              <div>
                <h2 className="font-display font-bold text-base sm:text-lg text-white">
                  {editingTool ? `Edit ${editingTool.name}` : 'Add New Product'}
                </h2>
                <p className="text-[11px] text-[#9E97BE]">
                  {wizardStep === 1
                    ? 'Step 1 of 2 — Basic Product Details & Logo Upload'
                    : 'Step 2 of 2 — Subscription Plans & Account Delivery (.txt / Manual)'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close product form"
                className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center text-white shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step Indicator Switcher */}
            <div className="mt-3.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setWizardStep(1)}
                className={`flex items-center justify-center gap-2 h-10 rounded-xl border text-xs font-bold transition-all ${
                  wizardStep === 1
                    ? 'bg-[#7C3AED] border-[#C4B5FD]/60 text-white shadow-[0_4px_14px_rgba(124,58,237,0.35)]'
                    : 'bg-[#1B1732] border-white/10 text-[#BFB8DE] hover:text-white'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center text-[11px]">
                  1
                </span>
                <span>Basic Details &amp; Logo</span>
              </button>
              <button
                type="button"
                onClick={handleGoToStep2}
                className={`flex items-center justify-center gap-2 h-10 rounded-xl border text-xs font-bold transition-all ${
                  wizardStep === 2
                    ? 'bg-[#7C3AED] border-[#C4B5FD]/60 text-white shadow-[0_4px_14px_rgba(124,58,237,0.35)]'
                    : 'bg-[#1B1732] border-white/10 text-[#BFB8DE] hover:text-white'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center text-[11px]">
                  2
                </span>
                <span>Plans &amp; Accounts ({plans.length})</span>
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              {wizardStep === 1 ? (
                <>
                  {/* Direct Product Logo Upload Card */}
                  <div className="rounded-2xl bg-[#1A1631] border border-white/10 p-3.5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="shrink-0">
                          <BrandAppIcon
                            brand={form.brand}
                            logoUrl={previewLogoUrl || undefined}
                            size="md"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white">
                            Product Logo Picture
                          </div>
                          <p className="text-[11px] text-[#9E97BE]">
                            Upload PNG, JPG, WebP, or GIF (max 2MB). Appears on product card &amp; detail popup.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          onChange={handleLogoFileChange}
                          className="hidden"
                          aria-label="Upload product logo image"
                        />
                        <button
                          type="button"
                          disabled={logoUploading}
                          onClick={() => logoInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-[#7C3AED] hover:bg-[#8B5CF6] disabled:opacity-60 text-xs font-bold text-white transition-colors"
                        >
                          {logoUploading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Upload className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {logoUploading ? 'Uploading...' : 'Upload Logo'}
                          </span>
                        </button>
                        {form.logoUrl && (
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, logoUrl: '' })}
                            className="h-9 px-2.5 rounded-xl bg-white/8 hover:bg-rose-500/25 text-xs font-semibold text-[#DDD6FE] hover:text-rose-200"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label
                          htmlFor="tool-logo-url"
                          className="block text-[11px] font-semibold text-[#B4AED1] mb-1"
                        >
                          Or Paste Logo Image URL (Optional)
                        </label>
                        <input
                          id="tool-logo-url"
                          type="text"
                          value={form.logoUrl}
                          onChange={(e) =>
                            setForm({ ...form, logoUrl: e.target.value })
                          }
                          placeholder="/uploads/... or https://..."
                          className="w-full h-9 px-3 rounded-xl bg-[#131024] border border-white/12 text-xs text-white focus:outline-none focus:border-[#A855F7]"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="tool-brand-icon"
                          className="block text-[11px] font-semibold text-[#B4AED1] mb-1"
                        >
                          Fallback Built-in Brand Icon
                        </label>
                        <select
                          id="tool-brand-icon"
                          value={form.brand}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              brand: e.target.value as BrandKey,
                            })
                          }
                          className="w-full h-9 px-3 rounded-xl bg-[#131024] border border-white/12 text-xs text-white focus:outline-none focus:border-[#A855F7]"
                        >
                          {BRAND_KEYS.map((b) => (
                            <option key={b} value={b}>
                              {b}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Basic Info Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="tool-name-input"
                        className="block text-xs font-semibold text-[#CFC9EA] mb-1"
                      >
                        Product Name *
                      </label>
                      <input
                        id="tool-name-input"
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) =>
                          setForm({ ...form, name: e.target.value })
                        }
                        placeholder="e.g. ChatGPT Plus"
                        className="w-full h-10 px-3 rounded-xl bg-[#1C1833] border border-white/12 text-sm text-white focus:outline-none focus:border-[#A855F7]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="tool-category-select"
                        className="block text-xs font-semibold text-[#CFC9EA] mb-1"
                      >
                        Category
                      </label>
                      <select
                        id="tool-category-select"
                        value={form.category}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            category: e.target.value as Exclude<
                              CategoryId,
                              'all'
                            >,
                          })
                        }
                        className="w-full h-10 px-3 rounded-xl bg-[#1C1833] border border-white/12 text-sm text-white focus:outline-none focus:border-[#A855F7]"
                      >
                        {TOOL_CATEGORIES.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="tool-badge-input"
                        className="block text-xs font-semibold text-[#CFC9EA] mb-1"
                      >
                        Badge Label
                      </label>
                      <input
                        id="tool-badge-input"
                        type="text"
                        value={form.badgeText}
                        onChange={(e) =>
                          setForm({ ...form, badgeText: e.target.value })
                        }
                        placeholder="Premium"
                        className="w-full h-10 px-3 rounded-xl bg-[#1C1833] border border-white/12 text-sm text-white focus:outline-none focus:border-[#A855F7]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="tool-subtitle-input"
                        className="block text-xs font-semibold text-[#CFC9EA] mb-1"
                      >
                        Short Subtitle
                      </label>
                      <input
                        id="tool-subtitle-input"
                        type="text"
                        value={form.subtitle}
                        onChange={(e) =>
                          setForm({ ...form, subtitle: e.target.value })
                        }
                        placeholder="Official GPT-4o Access"
                        className="w-full h-10 px-3 rounded-xl bg-[#1C1833] border border-white/12 text-sm text-white focus:outline-none focus:border-[#A855F7]"
                      />
                    </div>
                  </div>

                  {/* Pricing & Stock */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label
                        htmlFor="tool-orig-price"
                        className="block text-xs font-semibold text-[#CFC9EA] mb-1"
                      >
                        Original (INR)
                      </label>
                      <input
                        id="tool-orig-price"
                        type="number"
                        min={0}
                        required
                        value={form.originalPrice}
                        onChange={(e) =>
                          setForm({ ...form, originalPrice: e.target.value })
                        }
                        className="w-full h-10 px-3 rounded-xl bg-[#1C1833] border border-white/12 text-sm text-white tabular-nums focus:outline-none focus:border-[#A855F7]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="tool-sale-price"
                        className="block text-xs font-semibold text-[#CFC9EA] mb-1"
                      >
                        Sale Price (INR)
                      </label>
                      <input
                        id="tool-sale-price"
                        type="number"
                        min={0}
                        required
                        value={form.price}
                        onChange={(e) =>
                          setForm({ ...form, price: e.target.value })
                        }
                        className="w-full h-10 px-3 rounded-xl bg-[#1C1833] border border-white/12 text-sm text-white tabular-nums focus:outline-none focus:border-[#A855F7]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="tool-stock"
                        className="block text-xs font-semibold text-[#CFC9EA] mb-1"
                      >
                        Available Stock
                      </label>
                      <input
                        id="tool-stock"
                        type="number"
                        min={0}
                        required
                        value={form.available}
                        onChange={(e) =>
                          setForm({ ...form, available: e.target.value })
                        }
                        className="w-full h-10 px-3 rounded-xl bg-[#1C1833] border border-white/12 text-sm text-white tabular-nums focus:outline-none focus:border-[#A855F7]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="tool-sold"
                        className="block text-xs font-semibold text-[#CFC9EA] mb-1"
                      >
                        Sold Count
                      </label>
                      <input
                        id="tool-sold"
                        type="number"
                        min={0}
                        required
                        value={form.sold}
                        onChange={(e) =>
                          setForm({ ...form, sold: e.target.value })
                        }
                        className="w-full h-10 px-3 rounded-xl bg-[#1C1833] border border-white/12 text-sm text-white tabular-nums focus:outline-none focus:border-[#A855F7]"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-[#9A93BA] -mt-2">
                    When Available Stock reaches 0, the product stays visible on the storefront with an OUT OF STOCK badge.
                  </p>

                  <div>
                    <label
                      htmlFor="tool-description"
                      className="block text-xs font-semibold text-[#CFC9EA] mb-1"
                    >
                      Description
                    </label>
                    <textarea
                      id="tool-description"
                      rows={2}
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                      className="w-full p-3 rounded-xl bg-[#1C1833] border border-white/12 text-sm text-white focus:outline-none focus:border-[#A855F7]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="tool-features"
                      className="block text-xs font-semibold text-[#CFC9EA] mb-1"
                    >
                      Key Features (one per line)
                    </label>
                    <textarea
                      id="tool-features"
                      rows={2}
                      value={form.featuresText}
                      onChange={(e) =>
                        setForm({ ...form, featuresText: e.target.value })
                      }
                      className="w-full p-3 rounded-xl bg-[#1C1833] border border-white/12 text-sm text-white focus:outline-none focus:border-[#A855F7]"
                    />
                  </div>

                  <label className="inline-flex items-center gap-2.5 text-xs font-semibold text-[#DDD6FE] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.trending}
                      onChange={(e) =>
                        setForm({ ...form, trending: e.target.checked })
                      }
                      className="w-4 h-4 rounded accent-[#7C3AED]"
                    />
                    Feature in Trending Premium Tools
                  </label>
                </>
              ) : (
                /* ================= STEP 2: PLANS & ACCOUNTS ================= */
                <div className="space-y-4">
                  {/* Subscription Plans Manager */}
                  <div className="rounded-2xl bg-[#1A1631] border border-white/10 p-3.5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#C084FC]" />
                        <h3 className="font-display font-bold text-sm text-white">
                          Subscription Plans
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddPlan}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl bg-[#7C3AED] hover:bg-[#8B5CF6] text-xs font-bold text-white"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Plan
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {plans.map((plan) => {
                        const isSelected = plan.id === activePlanDraft?.id;
                        return (
                          <div
                            key={plan.id}
                            className={`rounded-xl p-3 border transition-colors space-y-2.5 ${
                              isSelected
                                ? 'bg-[#221B42] border-[#A855F7]/70'
                                : 'bg-[#131024] border-white/10'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedPlanId(plan.id)}
                                className="text-left text-xs font-bold text-[#DDD6FE] hover:text-white flex items-center gap-1.5"
                              >
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    isSelected
                                      ? 'bg-[#C084FC]'
                                      : 'bg-white/25'
                                  }`}
                                />
                                <span>
                                  {plan.label || 'Untitled Plan'}
                                </span>
                              </button>

                              <div className="flex items-center gap-1.5">
                                {/* Delivery Mode Toggle */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdatePlanField(
                                      plan.id,
                                      'deliveryMode',
                                      plan.deliveryMode === 'automatic'
                                        ? 'manual'
                                        : 'automatic'
                                    )
                                  }
                                  className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11px] font-bold border transition-colors ${
                                    plan.deliveryMode === 'automatic'
                                      ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                                      : 'bg-amber-500/15 border-amber-400/40 text-amber-300'
                                  }`}
                                >
                                  {plan.deliveryMode === 'automatic' ? (
                                    <>
                                      <Zap className="w-3 h-3" />
                                      <span>Automatic (.txt)</span>
                                    </>
                                  ) : (
                                    <>
                                      <Clock className="w-3 h-3" />
                                      <span>Manual (Pending)</span>
                                    </>
                                  )}
                                </button>

                                {plans.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePlan(plan.id)}
                                    aria-label={`Remove plan ${plan.label}`}
                                    className="w-7 h-7 rounded-lg bg-white/6 hover:bg-rose-500/25 flex items-center justify-center text-[#CFC9EA] hover:text-rose-300"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <div>
                                <label className="block text-[10px] text-[#A49DC4] mb-0.5">
                                  Plan Title
                                </label>
                                <input
                                  type="text"
                                  value={plan.label}
                                  onChange={(e) =>
                                    handleUpdatePlanField(
                                      plan.id,
                                      'label',
                                      e.target.value
                                    )
                                  }
                                  placeholder="Plus 1 Month"
                                  className="w-full h-8 px-2.5 rounded-lg bg-[#100D1E] border border-white/12 text-xs text-white focus:outline-none focus:border-[#A855F7]"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-[#A49DC4] mb-0.5">
                                  Months
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  value={plan.months}
                                  onChange={(e) =>
                                    handleUpdatePlanField(
                                      plan.id,
                                      'months',
                                      e.target.value
                                    )
                                  }
                                  className="w-full h-8 px-2.5 rounded-lg bg-[#100D1E] border border-white/12 text-xs text-white tabular-nums focus:outline-none focus:border-[#A855F7]"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-[#A49DC4] mb-0.5">
                                  Sale Price (INR)
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  value={plan.price}
                                  onChange={(e) =>
                                    handleUpdatePlanField(
                                      plan.id,
                                      'price',
                                      e.target.value
                                    )
                                  }
                                  className="w-full h-8 px-2.5 rounded-lg bg-[#100D1E] border border-white/12 text-xs text-white tabular-nums focus:outline-none focus:border-[#A855F7]"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-[#A49DC4] mb-0.5">
                                  Original (INR)
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  value={plan.originalPrice}
                                  onChange={(e) =>
                                    handleUpdatePlanField(
                                      plan.id,
                                      'originalPrice',
                                      e.target.value
                                    )
                                  }
                                  className="w-full h-8 px-2.5 rounded-lg bg-[#100D1E] border border-white/12 text-xs text-white tabular-nums focus:outline-none focus:border-[#A855F7]"
                                />
                              </div>
                            </div>

                            <input
                              type="text"
                              value={plan.description}
                              onChange={(e) =>
                                handleUpdatePlanField(
                                  plan.id,
                                  'description',
                                  e.target.value
                                )
                              }
                              placeholder="Optional plan note (e.g. Private account · Instant .txt delivery)"
                              className="w-full h-8 px-2.5 rounded-lg bg-[#100D1E] border border-white/12 text-xs text-[#DDD6FE] placeholder:text-[#7D769F] focus:outline-none focus:border-[#A855F7]"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Account Delivery Pool (.txt Multi-Upload & Manual Fields) */}
                  {activePlanDraft && (
                    <div className="rounded-2xl bg-[#1A1631] border border-white/10 p-3.5 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <KeyRound className="w-4 h-4 text-[#C084FC]" />
                            <h3 className="font-display font-bold text-sm text-white">
                              Account Delivery Pool — {activePlanDraft.label}
                            </h3>
                          </div>
                          <p className="text-[11px] text-[#9E97BE] mt-0.5">
                            {activePlanDraft.deliveryMode === 'automatic'
                              ? 'Upload .txt files (1 file = 1 auto-delivered account). If pool runs empty, orders move to Pending.'
                              : 'Manual mode active: orders stay Pending until you approve & deliver from Orders tab.'}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] font-bold tabular-nums shrink-0">
                          <span className="px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-300">
                            Available: {availablePoolCount}
                          </span>
                          <span className="px-2 py-1 rounded-lg bg-white/8 text-[#C4B5FD]">
                            Assigned: {assignedPoolCount}
                          </span>
                        </div>
                      </div>

                      {/* Plan Switcher Pills */}
                      {plans.length > 1 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {plans.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setSelectedPlanId(p.id)}
                              className={`h-7 px-2.5 rounded-lg text-[11px] font-bold transition-colors ${
                                p.id === activePlanDraft.id
                                  ? 'bg-[#7C3AED] text-white'
                                  : 'bg-[#120F23] text-[#B6B0D4] hover:text-white border border-white/10'
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Action Buttons: Upload .txt Files OR Add Manual Fields */}
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          ref={txtInputRef}
                          type="file"
                          accept=".txt,text/plain"
                          multiple
                          onChange={handleTxtFilesSelected}
                          className="hidden"
                          aria-label="Upload .txt account files"
                        />
                        <button
                          type="button"
                          disabled={accountBusy}
                          onClick={() => txtInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-[#7C3AED] hover:bg-[#8B5CF6] disabled:opacity-60 text-xs font-bold text-white"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>
                            {accountBusy ? 'Uploading...' : 'Upload .txt Files'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowManualForm((prev) => !prev)}
                          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-white/8 hover:bg-white/14 border border-white/12 text-xs font-bold text-white"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>
                            {showManualForm
                              ? 'Hide Manual Entry'
                              : 'Add Account Text / Fields'}
                          </span>
                        </button>
                      </div>

                      {/* Inline Manual Account Entry Form */}
                      {showManualForm && (
                        <div className="rounded-xl bg-[#110E22] border border-[#A855F7]/35 p-3 space-y-2.5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={manualFileName}
                              onChange={(e) =>
                                setManualFileName(e.target.value)
                              }
                              placeholder="Filename (e.g. account-01.txt)"
                              className="h-9 px-3 rounded-lg bg-[#1A1631] border border-white/12 text-xs text-white focus:outline-none focus:border-[#A855F7]"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setManualFields((prev) => [
                                  ...prev,
                                  { label: '', value: '' },
                                ])
                              }
                              className="h-9 px-3 rounded-lg bg-white/8 hover:bg-white/14 text-xs font-semibold text-[#DDD6FE]"
                            >
                              + Add Key/Value Field
                            </button>
                          </div>

                          <div className="space-y-1.5">
                            {manualFields.map((field, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-1.5"
                              >
                                <input
                                  type="text"
                                  value={field.label}
                                  onChange={(e) =>
                                    setManualFields((prev) =>
                                      prev.map((f, i) =>
                                        i === idx
                                          ? { ...f, label: e.target.value }
                                          : f
                                      )
                                    )
                                  }
                                  placeholder="Label (e.g. Email)"
                                  className="w-1/3 h-8 px-2.5 rounded-lg bg-[#1A1631] border border-white/12 text-xs text-white focus:outline-none focus:border-[#A855F7]"
                                />
                                <input
                                  type="text"
                                  value={field.value}
                                  onChange={(e) =>
                                    setManualFields((prev) =>
                                      prev.map((f, i) =>
                                        i === idx
                                          ? { ...f, value: e.target.value }
                                          : f
                                      )
                                    )
                                  }
                                  placeholder="Value"
                                  className="flex-1 h-8 px-2.5 rounded-lg bg-[#1A1631] border border-white/12 text-xs text-white focus:outline-none focus:border-[#A855F7]"
                                />
                                {manualFields.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setManualFields((prev) =>
                                        prev.filter((_, i) => i !== idx)
                                      )
                                    }
                                    aria-label="Remove field"
                                    className="w-8 h-8 rounded-lg bg-white/6 hover:bg-rose-500/20 flex items-center justify-center text-[#CFC9EA]"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>

                          <textarea
                            rows={2}
                            value={manualContent}
                            onChange={(e) => setManualContent(e.target.value)}
                            placeholder="Optional full account instructions / credentials text..."
                            className="w-full p-2.5 rounded-lg bg-[#1A1631] border border-white/12 text-xs text-white focus:outline-none focus:border-[#A855F7]"
                          />

                          <div className="flex justify-end">
                            <button
                              type="button"
                              disabled={accountBusy}
                              onClick={() => void handleAddManualAccount()}
                              className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Add to Pool
                            </button>
                          </div>
                        </div>
                      )}

                      {accountNotice && (
                        <div className="rounded-xl bg-emerald-500/15 border border-emerald-400/30 px-3 py-2 text-xs text-emerald-200">
                          {accountNotice}
                        </div>
                      )}

                      {/* Pool List */}
                      {accountsLoading ? (
                        <div className="text-xs text-[#9E97BE] py-2">
                          Loading accounts pool...
                        </div>
                      ) : activeQueuedAccounts.length === 0 &&
                        activeExistingAccounts.length === 0 ? (
                        <div className="rounded-xl bg-[#120F23] border border-dashed border-white/12 p-3 text-center text-xs text-[#9A93BA]">
                          No accounts uploaded for {activePlanDraft.label} yet.
                        </div>
                      ) : (
                        <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                          {activeQueuedAccounts.map((acc) => (
                            <div
                              key={acc.tempId}
                              className="rounded-xl bg-[#120F23] border border-[#A855F7]/30 px-3 py-2 flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <FileText className="w-3.5 h-3.5 text-[#C084FC] shrink-0" />
                                  <span className="text-xs font-bold text-white truncate">
                                    {acc.fileName}
                                  </span>
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#7C3AED]/30 text-[#DDD6FE]">
                                    Queued
                                  </span>
                                </div>
                                <p className="text-[11px] text-[#9E97BE] truncate mt-0.5">
                                  {acc.accountContent.slice(0, 80)}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setQueuedAccounts((prev) =>
                                    prev.filter((q) => q.tempId !== acc.tempId)
                                  )
                                }
                                aria-label={`Remove queued ${acc.fileName}`}
                                className="w-7 h-7 rounded-lg bg-white/6 hover:bg-rose-500/25 flex items-center justify-center text-[#CFC9EA] hover:text-rose-300 shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}

                          {activeExistingAccounts.map((acc) => (
                            <div
                              key={acc.id}
                              className="rounded-xl bg-[#120F23] border border-white/10 px-3 py-2 flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <FileText className="w-3.5 h-3.5 text-[#C084FC] shrink-0" />
                                  <span className="text-xs font-bold text-white truncate">
                                    {acc.fileName}
                                  </span>
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                      acc.status === 'assigned'
                                        ? 'bg-amber-500/20 text-amber-300'
                                        : 'bg-emerald-500/20 text-emerald-300'
                                    }`}
                                  >
                                    {acc.status === 'assigned'
                                      ? `Assigned (${acc.assignedOrderId || 'Order'})`
                                      : 'Available'}
                                  </span>
                                </div>
                                <p className="text-[11px] text-[#9E97BE] truncate mt-0.5">
                                  {acc.accountContent.slice(0, 80)}
                                </p>
                              </div>
                              {acc.status !== 'assigned' && (
                                <button
                                  type="button"
                                  disabled={accountBusy}
                                  onClick={() =>
                                    void handleDeleteExistingAccount(acc.id)
                                  }
                                  aria-label={`Delete account ${acc.fileName}`}
                                  className="w-7 h-7 rounded-lg bg-white/6 hover:bg-rose-500/25 flex items-center justify-center text-[#CFC9EA] hover:text-rose-300 shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {formError && (
                <div className="rounded-xl bg-rose-500/15 border border-rose-400/35 px-3 py-2 text-xs text-rose-200">
                  {formError}
                </div>
              )}

              {/* Wizard Footer Actions */}
              <div className="flex items-center justify-between gap-2.5 pt-2 border-t border-white/10">
                <div>
                  {wizardStep === 2 ? (
                    <button
                      type="button"
                      onClick={() => setWizardStep(1)}
                      className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-white/8 hover:bg-white/14 text-xs font-semibold text-white"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back to Details
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="h-10 px-4 rounded-xl bg-white/8 hover:bg-white/14 text-xs font-semibold text-white"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {wizardStep === 1 ? (
                    <>
                      {editingTool && (
                        <button
                          type="submit"
                          disabled={busy || logoUploading}
                          className="h-10 px-4 rounded-xl bg-white/10 hover:bg-white/16 disabled:opacity-60 text-xs font-bold text-white"
                        >
                          {busy ? 'Saving...' : 'Save Now'}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={logoUploading}
                        onClick={handleGoToStep2}
                        className="inline-flex items-center gap-1.5 h-10 px-5 rounded-xl bg-[#7C3AED] hover:bg-[#8B5CF6] disabled:opacity-60 text-xs font-bold text-white"
                      >
                        <span>Next: Plans &amp; Accounts</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="submit"
                      disabled={busy || accountBusy}
                      className="h-10 px-5 rounded-xl bg-[#7C3AED] hover:bg-[#8B5CF6] disabled:opacity-60 text-xs font-bold text-white shadow-[0_6px_18px_rgba(124,58,237,0.4)]"
                    >
                      {busy
                        ? 'Saving...'
                        : editingTool
                          ? 'Save Product & Plans'
                          : 'Create Product'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
