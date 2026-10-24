'use client';
import React, { useState, useRef, useMemo } from 'react';

export interface LandingSectionConfig {
  id: string;
  sectionType: 'Hero' | 'ValueGrid' | 'Pricing' | 'FAQ';
  headline: string;
  subheadline: string;
  ctaLabel: string;
  enabled: boolean;
}

export interface LandingPageTemplateKitProps {
  storageKey?: string;
  initialSections?: LandingSectionConfig[];
  onChange?: (sections: LandingSectionConfig[]) => void | Promise<void>;
}

const DEFAULT_SECTIONS: LandingSectionConfig[] = [
  {
    id: 'sec-hero',
    sectionType: 'Hero',
    headline: 'Automate Multi-Tier Affiliate Revenue at Scale',
    subheadline: 'Deploy high-converting funnels, real-time two-up pass-ups, and instant Stripe payouts.',
    ctaLabel: 'Launch Your Portal Free',
    enabled: true
  },
  {
    id: 'sec-pricing',
    sectionType: 'Pricing',
    headline: 'Transparent Growth & Enterprise Licensing',
    subheadline: 'Zero hidden transaction fees with instant webhook telemetry.',
    ctaLabel: 'Claim Enterprise Access',
    enabled: true
  }
];

function isValidSection(item: unknown): item is LandingSectionConfig {
  if (!item || typeof item !== 'object') return false;
  const s = item as Record<string, unknown>;
  return (
    typeof s.id === 'string' &&
    typeof s.headline === 'string' &&
    typeof s.subheadline === 'string' &&
    typeof s.ctaLabel === 'string' &&
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

  const sectionsRef = useRef<LandingSectionConfig[]>(sections);
  sectionsRef.current = sections;
  const saveLockRef = useRef(false);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [notice, setNotice] = useState('');

  const persistSections = async (next: LandingSectionConfig[], msg: string) => {
    if (saveLockRef.current) return;
    saveLockRef.current = true;
    setIsSaving(true);
    const prev = sectionsRef.current;
    sectionsRef.current = next;
    setSections(next);
    setErrorMsg('');
    try {
      if (onChange) {
        await onChange(next);
      }
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      }
      setNotice(msg);
    } catch {
      sectionsRef.current = prev;
      setSections(prev);
      setErrorMsg('Failed to persist landing page configuration; rolled back.');
    } finally {
      saveLockRef.current = false;
      setIsSaving(false);
    }
  };

  const updateSection = (id: string, field: 'headline' | 'subheadline' | 'ctaLabel', value: string) => {
    const next = sectionsRef.current.map(s => (s.id === id ? { ...s, [field]: value } : s));
    void persistSections(next, 'Updated landing page copy.');
  };

  const toggleSection = (id: string) => {
    const next = sectionsRef.current.map(s => (s.id === id ? { ...s, enabled: !s.enabled } : s));
    void persistSections(next, 'Toggled section visibility.');
  };

  const exportedHtml = useMemo(() => {
    return sections
      .filter(s => s.enabled)
      .map(
        s =>
          `<section data-section="${s.sectionType}">\n  <h2>${s.headline}</h2>\n  <p>${s.subheadline}</p>\n  <button>${s.ctaLabel}</button>\n</section>`
      )
      .join('\n\n');
  }, [sections]);

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="border-b border-zinc-800 pb-4">
          <h1 className="text-2xl font-bold text-[#D4AF37]">SaaS Landing Page Template Kit & Exporter</h1>
          <p className="text-sm text-zinc-400">Customize conversion blocks, preview live Black/Gold sections, and export semantic markup</p>
        </header>

        {notice && <div role="status" className="bg-emerald-950/60 border border-emerald-700 text-emerald-200 px-4 py-2 rounded text-sm">{notice}</div>}
        {errorMsg && <div role="alert" className="bg-red-950/60 border border-red-700 text-red-200 px-4 py-2 rounded text-sm">{errorMsg}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {sections.map(sec => (
              <div key={sec.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[#D4AF37] uppercase">{sec.sectionType} Block</span>
                  <label className="flex items-center gap-1.5 text-xs text-zinc-300">
                    <input
                      aria-label={`Enable ${sec.sectionType} section`}
                      type="checkbox"
                      checked={sec.enabled}
                      disabled={isSaving}
                      onChange={() => toggleSection(sec.id)}
                    />
                    Visible
                  </label>
                </div>
                <input
                  aria-label={`Headline for ${sec.sectionType}`}
                  value={sec.headline}
                  disabled={isSaving}
                  onChange={e => updateSection(sec.id, 'headline', e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-sm text-white"
                />
                <input
                  aria-label={`Subheadline for ${sec.sectionType}`}
                  value={sec.subheadline}
                  disabled={isSaving}
                  onChange={e => updateSection(sec.id, 'subheadline', e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-xs text-zinc-300"
                />
                <input
                  aria-label={`CTA Label for ${sec.sectionType}`}
                  value={sec.ctaLabel}
                  disabled={isSaving}
                  onChange={e => updateSection(sec.id, 'ctaLabel', e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-xs text-[#D4AF37]"
                />
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
              <div className="text-xs font-bold text-[#D4AF37] uppercase">Live Rendered Landing Preview</div>
              {sections.filter(s => s.enabled).map(sec => (
                <div key={sec.id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 space-y-2">
                  <h2 className="text-lg font-bold text-white">{sec.headline}</h2>
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
