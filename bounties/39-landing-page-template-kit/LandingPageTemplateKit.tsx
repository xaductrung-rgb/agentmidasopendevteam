'use client';
import React, { useState, useRef, useMemo } from 'react';

export interface LandingSectionConfig {
  id: string;
  templateId: string;
  sectionType: 'Hero' | 'ValueGrid' | 'Pricing' | 'FAQ';
  headline: string;
  subheadline: string;
  ctaLabel: string;
  tierName: string;
  monthlyPriceUsd: number;
  enabled: boolean;
}

export interface LandingPageTemplateKitProps {
  storageKey?: string;
  initialSections?: LandingSectionConfig[];
  onChange?: (sections: LandingSectionConfig[]) => void | Promise<void>;
}

const TEMPLATE_PRESETS: { id: string; label: string }[] = [
  { id: 'tpl-saas', label: '1. SaaS Affiliate Growth' },
  { id: 'tpl-ai', label: '2. Autonomous AI Agent Studio' },
  { id: 'tpl-fintech', label: '3. FinTech Stripe Checkout' },
  { id: 'tpl-summit', label: '4. Partner Launch Summit' },
  { id: 'tpl-security', label: '5. Enterprise Security Cloud' }
];

const DEFAULT_SECTIONS: LandingSectionConfig[] = [
  {
    id: 'sec-saas-hero',
    templateId: 'tpl-saas',
    sectionType: 'Hero',
    headline: 'Automate Multi-Tier Affiliate Revenue at Scale',
    subheadline: 'Deploy high-converting funnels, real-time two-up pass-ups, and instant Stripe payouts.',
    ctaLabel: 'Launch Your Portal Free',
    tierName: 'Pro Growth',
    monthlyPriceUsd: 79,
    enabled: true
  },
  {
    id: 'sec-ai-hero',
    templateId: 'tpl-ai',
    sectionType: 'Hero',
    headline: 'Deploy 24/7 Autonomous Revenue Agents',
    subheadline: 'Self-optimizing conversion flows powered by real-time telemetry.',
    ctaLabel: 'Deploy AI Agent',
    tierName: 'AI Architect',
    monthlyPriceUsd: 199,
    enabled: true
  },
  {
    id: 'sec-fintech-pricing',
    templateId: 'tpl-fintech',
    sectionType: 'Pricing',
    headline: 'Zero-Latency Global Payout Infrastructure',
    subheadline: 'Instant multi-currency settlement with automated ledger reconciliation.',
    ctaLabel: 'Connect Stripe Account',
    tierName: 'FinTech Scale',
    monthlyPriceUsd: 299,
    enabled: true
  },
  {
    id: 'sec-summit-hero',
    templateId: 'tpl-summit',
    sectionType: 'ValueGrid',
    headline: 'Global Partner & Creator Virtual Summit',
    subheadline: 'Master high-ticket funnel architecture with top 1% affiliate leaders.',
    ctaLabel: 'Reserve VIP Seat',
    tierName: 'VIP Pass',
    monthlyPriceUsd: 149,
    enabled: true
  },
  {
    id: 'sec-security-faq',
    templateId: 'tpl-security',
    sectionType: 'FAQ',
    headline: '6-Layer Zero-Trust Security & Compliance',
    subheadline: 'Row-level security, OWASP static verification, and immutable audit trails.',
    ctaLabel: 'Request Security Brief',
    tierName: 'Enterprise Shield',
    monthlyPriceUsd: 599,
    enabled: true
  }
];

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isValidSection(item: unknown): item is LandingSectionConfig {
  if (!item || typeof item !== 'object') return false;
  const s = item as Record<string, unknown>;
  return (
    typeof s.id === 'string' &&
    typeof s.templateId === 'string' &&
    typeof s.headline === 'string' &&
    typeof s.subheadline === 'string' &&
    typeof s.ctaLabel === 'string' &&
    typeof s.tierName === 'string' &&
    typeof s.monthlyPriceUsd === 'number' &&
    Number.isFinite(s.monthlyPriceUsd) &&
    s.monthlyPriceUsd >= 0 &&
    typeof s.enabled === 'boolean'
  );
}

export const LandingPageTemplateKit: React.FC<LandingPageTemplateKitProps> = ({
  storageKey = 'agentmidas_landing_kit_v1',
  initialSections = DEFAULT_SECTIONS,
  onChange
}) => {
  const [sections, setSections] = useState<LandingSectionConfig[]>(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(isValidSection)) {
          return parsed;
        }
      }
    } catch {}
    return initialSections;
  });

  const committedRef = useRef<LandingSectionConfig[]>(sections);
  const saveLockRef = useRef(false);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('ALL');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [notice, setNotice] = useState('');

  const persistSections = async (next: LandingSectionConfig[], msg: string) => {
    if (saveLockRef.current) return;
    saveLockRef.current = true;
    setIsSaving(true);
    const prev = committedRef.current;
    setErrorMsg('');
    try {
      if (onChange) {
        await onChange(next);
      }
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(storageKey, JSON.stringify(next));
        }
      } catch {}
      committedRef.current = next;
      setSections(next);
      setNotice(msg);
    } catch {
      setSections(prev);
      setNotice('');
      setErrorMsg('Failed to persist landing page configuration; rolled back.');
    } finally {
      saveLockRef.current = false;
      setIsSaving(false);
    }
  };

  const updateDraftField = (
    id: string,
    field: 'headline' | 'subheadline' | 'ctaLabel' | 'tierName' | 'monthlyPriceUsd',
    value: string | number
  ) => {
    setSections(curr => curr.map(s => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const toggleSection = (id: string) => {
    const next = sections.map(s => (s.id === id ? { ...s, enabled: !s.enabled } : s));
    void persistSections(next, 'Toggled section visibility.');
  };

  const visibleSections = useMemo(() => {
    if (selectedTemplateId === 'ALL') return sections;
    return sections.filter(s => s.templateId === selectedTemplateId);
  }, [sections, selectedTemplateId]);

  const exportedHtml = useMemo(() => {
    return visibleSections
      .filter(s => s.enabled)
      .map(
        s =>
          `<section data-template="${escapeHtml(s.templateId)}" data-section="${escapeHtml(s.sectionType)}">\n  <h2>${escapeHtml(s.headline)}</h2>\n  <p>${escapeHtml(s.subheadline)}</p>\n  <div data-tier="${escapeHtml(s.tierName)}">$${s.monthlyPriceUsd}/mo</div>\n  <button>${escapeHtml(s.ctaLabel)}</button>\n</section>`
      )
      .join('\n\n');
  }, [visibleSections]);

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="border-b border-zinc-800 pb-4 flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#D4AF37]">5-in-1 SaaS Landing Page Template Kit & Exporter</h1>
            <p className="text-sm text-zinc-400">Select from 5 conversion templates, configure pricing tiers, and export escaped HTML</p>
          </div>
          <div className="flex gap-2">
            <select
              aria-label="Select Landing Page Template"
              value={selectedTemplateId}
              onChange={e => setSelectedTemplateId(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-white"
            >
              <option value="ALL">All 5 Templates</option>
              {TEMPLATE_PRESETS.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => void persistSections(sections, 'Saved landing page template & pricing tier settings.')}
              className="bg-[#D4AF37] text-black font-bold text-xs px-4 py-2 rounded disabled:opacity-50"
            >
              Save Template Changes
            </button>
          </div>
        </header>

        {notice && <div role="status" className="bg-emerald-950/60 border border-emerald-700 text-emerald-200 px-4 py-2 rounded text-sm">{notice}</div>}
        {errorMsg && <div role="alert" className="bg-red-950/60 border border-red-700 text-red-200 px-4 py-2 rounded text-sm">{errorMsg}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {visibleSections.map(sec => (
              <div key={sec.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[#D4AF37] uppercase">
                    {sec.templateId} · {sec.sectionType} Block
                  </span>
                  <label className="flex items-center gap-1.5 text-xs text-zinc-300">
                    <input
                      aria-label={`Enable ${sec.sectionType} section for ${sec.templateId}`}
                      type="checkbox"
                      checked={sec.enabled}
                      disabled={isSaving}
                      onChange={() => toggleSection(sec.id)}
                    />
                    Visible
                  </label>
                </div>
                <input
                  aria-label={`Headline for ${sec.id}`}
                  value={sec.headline}
                  onChange={e => updateDraftField(sec.id, 'headline', e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-sm text-white"
                />
                <input
                  aria-label={`Subheadline for ${sec.id}`}
                  value={sec.subheadline}
                  onChange={e => updateDraftField(sec.id, 'subheadline', e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-xs text-zinc-300"
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    aria-label={`Pricing Tier Name for ${sec.id}`}
                    value={sec.tierName}
                    onChange={e => updateDraftField(sec.id, 'tierName', e.target.value)}
                    placeholder="Tier Name"
                    className="bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                  <input
                    aria-label={`Monthly Price USD for ${sec.id}`}
                    type="number"
                    min={0}
                    value={sec.monthlyPriceUsd}
                    onChange={e => updateDraftField(sec.id, 'monthlyPriceUsd', Math.max(0, Number(e.target.value) || 0))}
                    placeholder="Price ($)"
                    className="bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-emerald-400"
                  />
                  <input
                    aria-label={`CTA Label for ${sec.id}`}
                    value={sec.ctaLabel}
                    onChange={e => updateDraftField(sec.id, 'ctaLabel', e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-[#D4AF37]"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
              <div className="text-xs font-bold text-[#D4AF37] uppercase">Live Rendered Landing Preview</div>
              {visibleSections.filter(s => s.enabled).map(sec => (
                <div key={sec.id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <h2 className="text-base font-bold text-white">{sec.headline}</h2>
                    <span className="text-xs font-mono text-emerald-400">{sec.tierName}: ${sec.monthlyPriceUsd}/mo</span>
                  </div>
                  <p className="text-xs text-zinc-400">{sec.subheadline}</p>
                  <span className="inline-block bg-[#D4AF37] text-black font-bold text-xs px-4 py-1.5 rounded">
                    {sec.ctaLabel}
                  </span>
                </div>
              ))}
            </div>

            <pre className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-400 overflow-x-auto">
              {exportedHtml}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPageTemplateKit;
