'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';

export type FrenchVariant = 'fr-FR' | 'fr-CA';

export interface FrenchTranslationItem {
  key: string;
  module: 'Navigation' | 'CRM' | 'Affiliate' | 'Billing' | 'Auth';
  englishSource: string;
  translations: Record<FrenchVariant, string>;
}

export interface FrenchLanguagePackProps {
  storageKey?: string;
  initialEntries?: FrenchTranslationItem[];
  onChange?: (entries: FrenchTranslationItem[]) => void | Promise<void>;
}

const VARIANTS: FrenchVariant[] = ['fr-FR', 'fr-CA'];

const DEFAULT_ENTRIES: FrenchTranslationItem[] = [
  {
    key: 'nav.dashboard.greeting',
    module: 'Navigation',
    englishSource: 'Welcome {{name}} — {{count}} active commission stream(s).',
    translations: {
      'fr-FR': 'Bienvenue {{name}} — {{count}} flux de commissions actif(s).',
      'fr-CA': 'Bienvenue {{name}} — {{count}} flux de commissions actif(s).'
    }
  },
  {
    key: 'affiliate.twoup.banner',
    module: 'Affiliate',
    englishSource: '75% Recurring Commission & Two-Up Pass-Up Engine',
    translations: {
      'fr-FR': 'Commission récurrente de 75 % et moteur de remontée Two-Up',
      'fr-CA': 'Commission récurrente de 75 % et système de transfert Two-Up'
    }
  },
  {
    key: 'billing.stripe.settlement',
    module: 'Billing',
    englishSource: 'Instant Stripe Payout & Tax Invoice Export',
    translations: {
      'fr-FR': 'Versement Stripe instantané et exportation de facture fiscale',
      'fr-CA': 'Virement Stripe instantané et téléchargement de facture fiscale'
    }
  },
  {
    key: 'auth.mfa.verify',
    module: 'Auth',
    englishSource: 'Verify Two-Factor Security Code to Continue',
    translations: {
      'fr-FR': 'Vérifiez le code de sécurité à deux facteurs pour continuer',
      'fr-CA': 'Vérifiez le code de validation en deux étapes pour continuer'
    }
  }
];

function detectFrenchVariant(): FrenchVariant {
  if (typeof navigator !== 'undefined') {
    const langs = navigator.languages ? [...navigator.languages] : [navigator.language || ''];
    for (const raw of langs) {
      const lower = String(raw || '').toLowerCase();
      if (lower.startsWith('fr-ca')) return 'fr-CA';
      if (lower.startsWith('fr')) return 'fr-FR';
    }
  }
  return 'fr-FR';
}

function isValidEntry(item: unknown): item is FrenchTranslationItem {
  if (!item || typeof item !== 'object') return false;
  const e = item as Record<string, unknown>;
  if (typeof e.key !== 'string' || typeof e.englishSource !== 'string' || !e.translations || typeof e.translations !== 'object') {
    return false;
  }
  const t = e.translations as Record<string, unknown>;
  return VARIANTS.every(v => typeof t[v] === 'string');
}

function interpolateFrench(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) =>
    vars[k] !== undefined ? String(vars[k]) : `{{${k}}}`
  );
}

export const FrenchLanguagePack: React.FC<FrenchLanguagePackProps> = ({
  storageKey = 'agentmidas_french_pack_v1',
  initialEntries = DEFAULT_ENTRIES,
  onChange
}) => {
  const [entries, setEntries] = useState<FrenchTranslationItem[]>(initialEntries);
  const entriesRef = useRef<FrenchTranslationItem[]>(entries);
  entriesRef.current = entries;
  const saveLockRef = useRef(false);

  const [variant, setVariant] = useState<FrenchVariant>('fr-FR');
  const [detectedBrowserLocale, setDetectedBrowserLocale] = useState<string>('fr-FR');
  const [sampleName, setSampleName] = useState('Camille');
  const [sampleCount, setSampleCount] = useState<number>(4);
  const [newKey, setNewKey] = useState('');
  const [newEnglish, setNewEnglish] = useState('');
  const [newFrench, setNewFrench] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const detected = detectFrenchVariant();
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
    const fr = newFrench.trim();
    if (!k || !en || !fr) {
      setNotice('');
      setErrorMsg('Translation key, English source, and French translation are required.');
      return;
    }
    saveLockRef.current = true;
    setIsSaving(true);
    const prev = entriesRef.current;
    const item: FrenchTranslationItem = {
      key: k,
      module: 'Navigation',
      englishSource: en,
      translations: {
        'fr-FR': fr,
        'fr-CA': fr
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
      setNewFrench('');
      setNotice(`Saved French translation key "${k}".`);
    } catch {
      entriesRef.current = prev;
      setEntries(prev);
      setNotice('');
      setErrorMsg('Failed to persist French language pack; rolled back.');
    } finally {
      saveLockRef.current = false;
      setIsSaving(false);
    }
  };

  // French CLDR plural rule: 0 and 1 use singular ('one'), >= 2 uses plural ('other')
  const pluralPreview = useMemo(() => {
    const isSingular = sampleCount === 0 || sampleCount === 1;
    return isSingular
      ? `${sampleCount} affilié actif qualifié (règle CLDR fr : singulier pour 0 et 1)`
      : `${sampleCount} affiliés actifs qualifiés (règle CLDR fr : pluriel pour ≥ 2)`;
  }, [sampleCount]);

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
            <h1 className="text-2xl font-bold text-[#D4AF37]">French Language Pack (fr-FR / fr-CA)</h1>
            <p className="text-sm text-zinc-400">
              Browser locale: <strong className="text-white">{detectedBrowserLocale}</strong> · Active variant: <strong className="text-[#D4AF37]">{variant}</strong> · {pluralPreview}
            </p>
          </div>
          <select
            aria-label="Select French Regional Variant"
            value={variant}
            onChange={e => setVariant(e.target.value as FrenchVariant)}
            className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-white"
          >
            <option value="fr-FR">Français (France - fr-FR)</option>
            <option value="fr-CA">Français (Canada - fr-CA)</option>
          </select>
        </header>

        {notice && <div role="status" className="bg-emerald-950/60 border border-emerald-700 text-emerald-200 px-4 py-2 rounded text-sm">{notice}</div>}
        {errorMsg && <div role="alert" className="bg-red-950/60 border border-red-700 text-red-200 px-4 py-2 rounded text-sm">{errorMsg}</div>}

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <label className="space-y-1">
            <span className="text-zinc-400">Variable: {'{{name}}'}</span>
            <input aria-label="Sample French User Name" value={sampleName} onChange={e => setSampleName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-white" />
          </label>
          <label className="space-y-1">
            <span className="text-zinc-400">Variable: {'{{count}}'}</span>
            <input aria-label="Sample French Count" type="number" min={0} value={sampleCount} onChange={e => setSampleCount(Math.max(0, Number(e.target.value) || 0))} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-white" />
          </label>
        </div>

        <form onSubmit={handleAddKey} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <input aria-label="French Translation Key" value={newKey} onChange={e => setNewKey(e.target.value)} disabled={isSaving} placeholder="e.g. nav.cta.start" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-white" />
          <input aria-label="English Source Text" value={newEnglish} onChange={e => setNewEnglish(e.target.value)} disabled={isSaving} placeholder="English source" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-white" />
          <input aria-label="French Translation Text" value={newFrench} onChange={e => setNewFrench(e.target.value)} disabled={isSaving} placeholder="Traduction en français" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-white" />
          <button type="submit" disabled={isSaving} className="bg-[#D4AF37] text-black font-bold text-xs rounded px-4 py-2">
            + Add French Key
          </button>
        </form>

        <div className="space-y-2">
          {entries.map(item => (
            <div key={item.key} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-1">
              <div className="flex justify-between text-xs text-zinc-400 font-mono">
                <span className="text-[#D4AF37]">{item.key}</span>
                <span>{item.module}</span>
              </div>
              <div className="text-xs text-zinc-400">EN: {interpolateFrench(item.englishSource, { name: sampleName, count: sampleCount })}</div>
              <div className="text-sm font-bold text-white">
                {variant}: {interpolateFrench(item.translations[variant], { name: sampleName, count: sampleCount })}
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

export default FrenchLanguagePack;
