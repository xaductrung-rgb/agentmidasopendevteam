'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';

export type SpanishVariant = 'es-ES' | 'es-MX' | 'es-AR';

export interface SpanishTranslationItem {
  key: string;
  module: 'Navigation' | 'CRM' | 'Affiliate' | 'Billing' | 'Auth';
  englishSource: string;
  translations: Record<SpanishVariant, string>;
}

export interface SpanishLanguagePackProps {
  storageKey?: string;
  initialEntries?: SpanishTranslationItem[];
  onChange?: (entries: SpanishTranslationItem[]) => void | Promise<void>;
}

const VARIANTS: SpanishVariant[] = ['es-ES', 'es-MX', 'es-AR'];

const DEFAULT_ENTRIES: SpanishTranslationItem[] = [
  {
    key: 'nav.dashboard.overview',
    module: 'Navigation',
    englishSource: 'Welcome back, {{name}} — you have {{count}} active referrals.',
    translations: {
      'es-ES': 'Bienvenido de nuevo, {{name}} — tienes {{count}} referidos activos.',
      'es-MX': 'Bienvenido de nuevo, {{name}} — tienes {{count}} referidos activos.',
      'es-AR': 'Bienvenido de nuevo, {{name}} — tenés {{count}} referidos activos.'
    }
  },
  {
    key: 'affiliate.twoup.status',
    module: 'Affiliate',
    englishSource: '75% Recurring Commission & Two-Up Pass-Up Qualified',
    translations: {
      'es-ES': '75% de comisión recurrente y calificado para pase Two-Up',
      'es-MX': '75% de comisión recurrente y calificado para pase Two-Up',
      'es-AR': '75% de comisión recurrente y calificado para pase Two-Up'
    }
  },
  {
    key: 'billing.invoice.export',
    module: 'Billing',
    englishSource: 'Download Invoice PDF & Reconcile Stripe Payout',
    translations: {
      'es-ES': 'Descargar factura PDF y conciliar pago de Stripe',
      'es-MX': 'Descargar factura en PDF y conciliar pago de Stripe',
      'es-AR': 'Descargar factura en PDF y conciliar cobro de Stripe'
    }
  },
  {
    key: 'crm.pipeline.action',
    module: 'CRM',
    englishSource: 'Move deal to Closed Won and trigger onboarding sequence',
    translations: {
      'es-ES': 'Mover trato a Cerrado Ganado e iniciar secuencia de incorporación',
      'es-MX': 'Mover oportunidad a Cerrada Ganada e iniciar secuencia de incorporación',
      'es-AR': 'Mover oportunidad a Cerrada Ganada e iniciar secuencia de alta'
    }
  }
];

function detectSpanishVariant(): SpanishVariant {
  if (typeof navigator !== 'undefined') {
    const langs = navigator.languages ? [...navigator.languages] : [navigator.language || ''];
    for (const raw of langs) {
      const lower = String(raw || '').toLowerCase();
      if (lower.startsWith('es-mx')) return 'es-MX';
      if (lower.startsWith('es-ar')) return 'es-AR';
      if (lower.startsWith('es')) return 'es-ES';
    }
  }
  return 'es-ES';
}

function isValidEntry(item: unknown): item is SpanishTranslationItem {
  if (!item || typeof item !== 'object') return false;
  const e = item as Record<string, unknown>;
  if (typeof e.key !== 'string' || typeof e.englishSource !== 'string' || !e.translations || typeof e.translations !== 'object') {
    return false;
  }
  const t = e.translations as Record<string, unknown>;
  return VARIANTS.every(v => typeof t[v] === 'string');
}

function interpolateText(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) =>
    vars[k] !== undefined ? String(vars[k]) : `{{${k}}}`
  );
}

export const SpanishLanguagePack: React.FC<SpanishLanguagePackProps> = ({
  storageKey = 'agentmidas_spanish_pack_v1',
  initialEntries = DEFAULT_ENTRIES,
  onChange
}) => {
  const [entries, setEntries] = useState<SpanishTranslationItem[]>(initialEntries);
  const entriesRef = useRef<SpanishTranslationItem[]>(entries);
  entriesRef.current = entries;
  const saveLockRef = useRef(false);

  const [variant, setVariant] = useState<SpanishVariant>('es-ES');
  const [detectedBrowserLocale, setDetectedBrowserLocale] = useState<string>('es-ES');
  const [sampleName, setSampleName] = useState('Carlos');
  const [sampleCount, setSampleCount] = useState<number>(12);
  const [newKey, setNewKey] = useState('');
  const [newEnglish, setNewEnglish] = useState('');
  const [newSpanish, setNewSpanish] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const detected = detectSpanishVariant();
    setVariant(detected);
    if (typeof navigator !== 'undefined' && navigator.language) {
      setDetectedBrowserLocale(navigator.language);
    }
  }, []);

  useEffect(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(isValidEntry)) {
          entriesRef.current = parsed;
          setEntries(parsed);
          return;
        }
      }
    } catch {}
    entriesRef.current = initialEntries;
    setEntries(initialEntries);
  }, [storageKey, initialEntries]);

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saveLockRef.current) return;
    const k = newKey.trim();
    const en = newEnglish.trim();
    const es = newSpanish.trim();
    if (!k || !en || !es) {
      setNotice('');
      setErrorMsg('Translation key, English source, and Spanish translation are required.');
      return;
    }
    saveLockRef.current = true;
    setIsSaving(true);
    const prev = entriesRef.current;
    const item: SpanishTranslationItem = {
      key: k,
      module: 'Navigation',
      englishSource: en,
      translations: {
        'es-ES': es,
        'es-MX': es,
        'es-AR': es
      }
    };
    const next = [item, ...prev.filter(x => x.key !== k)];
    entriesRef.current = next;
    setEntries(next);
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
      setNewKey('');
      setNewEnglish('');
      setNewSpanish('');
      setNotice(`Saved Spanish translation key "${k}".`);
    } catch {
      entriesRef.current = prev;
      setEntries(prev);
      setNotice('');
      setErrorMsg('Failed to persist Spanish language pack; rolled back.');
    } finally {
      saveLockRef.current = false;
      setIsSaving(false);
    }
  };

  const exportedJson = useMemo(() => {
    const out: Record<string, string> = {};
    for (const item of entries) {
      out[item.key] = item.translations[variant];
    }
    return JSON.stringify({ locale: variant, messages: out }, null, 2);
  }, [entries, variant]);

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 p-6 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="border-b border-zinc-800 pb-4 flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#D4AF37]">Spanish Language Pack (es-ES / es-MX / es-AR)</h1>
            <p className="text-sm text-zinc-400">
              Auto-detected browser locale: <strong className="text-white">{detectedBrowserLocale}</strong> · Active regional variant: <strong className="text-[#D4AF37]">{variant}</strong>
            </p>
          </div>
          <select
            aria-label="Select Spanish Regional Variant"
            value={variant}
            onChange={e => setVariant(e.target.value as SpanishVariant)}
            className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-white"
          >
            <option value="es-ES">Español (España - es-ES)</option>
            <option value="es-MX">Español (México - es-MX)</option>
            <option value="es-AR">Español (Argentina - es-AR)</option>
          </select>
        </header>

        {notice && <div role="status" className="bg-emerald-950/60 border border-emerald-700 text-emerald-200 px-4 py-2 rounded text-sm">{notice}</div>}
        {errorMsg && <div role="alert" className="bg-red-950/60 border border-red-700 text-red-200 px-4 py-2 rounded text-sm">{errorMsg}</div>}

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <label className="space-y-1">
            <span className="text-zinc-400">Interpolation Variable: {'{{name}}'}</span>
            <input aria-label="Sample User Name" value={sampleName} onChange={e => setSampleName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-white" />
          </label>
          <label className="space-y-1">
            <span className="text-zinc-400">Interpolation Variable: {'{{count}}'}</span>
            <input aria-label="Sample Referral Count" type="number" value={sampleCount} onChange={e => setSampleCount(Number(e.target.value) || 0)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-white" />
          </label>
        </div>

        <form onSubmit={handleAddKey} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <input aria-label="Translation Key" value={newKey} onChange={e => setNewKey(e.target.value)} disabled={isSaving} placeholder="e.g. nav.cta.launch" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-white" />
          <input aria-label="English Source String" value={newEnglish} onChange={e => setNewEnglish(e.target.value)} disabled={isSaving} placeholder="English source" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-white" />
          <input aria-label="Spanish Translation String" value={newSpanish} onChange={e => setNewSpanish(e.target.value)} disabled={isSaving} placeholder="Traducción en español" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-white" />
          <button type="submit" disabled={isSaving} className="bg-[#D4AF37] text-black font-bold text-xs rounded px-4 py-2">
            + Add Spanish Key
          </button>
        </form>

        <div className="space-y-2">
          {entries.map(item => (
            <div key={item.key} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-1">
              <div className="flex justify-between text-xs text-zinc-400 font-mono">
                <span className="text-[#D4AF37]">{item.key}</span>
                <span>{item.module}</span>
              </div>
              <div className="text-xs text-zinc-400">EN: {interpolateText(item.englishSource, { name: sampleName, count: sampleCount })}</div>
              <div className="text-sm font-bold text-white">
                {variant}: {interpolateText(item.translations[variant], { name: sampleName, count: sampleCount })}
              </div>
            </div>
          ))}
        </div>

        <pre className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-400 overflow-x-auto">
          {exportedJson}
        </pre>
      </div>
    </div>
  );
};

export default SpanishLanguagePack;
