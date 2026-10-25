'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';

export type PortugueseVariant = 'pt-BR' | 'pt-PT';

export interface PortugueseTranslationItem {
  key: string;
  module: 'Navigation' | 'CRM' | 'Affiliate' | 'Billing' | 'Auth';
  englishSource: string;
  translations: Record<PortugueseVariant, string>;
}

export interface PortugueseLanguagePackProps {
  storageKey?: string;
  initialEntries?: PortugueseTranslationItem[];
  onChange?: (entries: PortugueseTranslationItem[]) => void | Promise<void>;
}

const VARIANTS: PortugueseVariant[] = ['pt-BR', 'pt-PT'];

const DEFAULT_ENTRIES: PortugueseTranslationItem[] = [
  {
    key: 'nav.dashboard.control_panel',
    module: 'Navigation',
    englishSource: 'Welcome {{name}} — Control Panel ({{count}} active leads)',
    translations: {
      'pt-BR': 'Bem-vindo {{name}} — Painel de Controle ({{count}} leads ativos)',
      'pt-PT': 'Bem-vindo {{name}} — Painel de Controlo ({{count}} contactos ativos)'
    }
  },
  {
    key: 'billing.revenue.summary',
    module: 'Billing',
    englishSource: 'Monthly Recurring Billing & Commission Payouts',
    translations: {
      'pt-BR': 'Faturamento Recorrente Mensal e Repasses de Comissão',
      'pt-PT': 'Faturação Recorrente Mensal e Pagamentos de Comissões'
    }
  },
  {
    key: 'affiliate.twoup.tree',
    module: 'Affiliate',
    englishSource: '75% Recurring Commission & Two-Up Genealogy Tree',
    translations: {
      'pt-BR': '75% de Comissão Recorrente e Árvore Genealógica Two-Up',
      'pt-PT': '75% de Comissão Recorrente e Árvore Genealógica Two-Up'
    }
  },
  {
    key: 'crm.team.directory',
    module: 'CRM',
    englishSource: 'Register New Team Member & Assign Permissions',
    translations: {
      'pt-BR': 'Cadastrar Novo Membro da Equipe e Atribuir Permissões',
      'pt-PT': 'Registar Novo Membro da Equipa e Atribuir Permissões'
    }
  }
];

function detectPortugueseVariant(): PortugueseVariant {
  if (typeof navigator !== 'undefined') {
    const langs = navigator.languages ? [...navigator.languages] : [navigator.language || ''];
    for (const raw of langs) {
      const lower = String(raw || '').toLowerCase();
      if (lower.startsWith('pt-pt')) return 'pt-PT';
      if (lower.startsWith('pt')) return 'pt-BR';
    }
  }
  return 'pt-BR';
}

function isValidEntry(item: unknown): item is PortugueseTranslationItem {
  if (!item || typeof item !== 'object') return false;
  const e = item as Record<string, unknown>;
  if (typeof e.key !== 'string' || typeof e.englishSource !== 'string' || !e.translations || typeof e.translations !== 'object') {
    return false;
  }
  const t = e.translations as Record<string, unknown>;
  return VARIANTS.every(v => typeof t[v] === 'string');
}

function interpolatePt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) =>
    vars[k] !== undefined ? String(vars[k]) : `{{${k}}}`
  );
}

export const PortugueseLanguagePack: React.FC<PortugueseLanguagePackProps> = ({
  storageKey = 'agentmidas_portuguese_pack_v1',
  initialEntries = DEFAULT_ENTRIES,
  onChange
}) => {
  const [entries, setEntries] = useState<PortugueseTranslationItem[]>(initialEntries);
  const entriesRef = useRef<PortugueseTranslationItem[]>(entries);
  entriesRef.current = entries;
  const saveLockRef = useRef(false);

  const [variant, setVariant] = useState<PortugueseVariant>('pt-BR');
  const [detectedBrowserLocale, setDetectedBrowserLocale] = useState<string>('pt-BR');
  const [sampleName, setSampleName] = useState('Mateus');
  const [sampleCount, setSampleCount] = useState<number>(9);
  const [newKey, setNewKey] = useState('');
  const [newEnglish, setNewEnglish] = useState('');
  const [newPortuguese, setNewPortuguese] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const detected = detectPortugueseVariant();
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
    const pt = newPortuguese.trim();
    if (!k || !en || !pt) {
      setNotice('');
      setErrorMsg('Translation key, English source, and Portuguese translation are required.');
      return;
    }
    saveLockRef.current = true;
    setIsSaving(true);
    const prev = entriesRef.current;
    const item: PortugueseTranslationItem = {
      key: k,
      module: 'Navigation',
      englishSource: en,
      translations: {
        'pt-BR': pt,
        'pt-PT': pt
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
      setNewPortuguese('');
      setNotice(`Saved Portuguese translation key "${k}".`);
    } catch {
      entriesRef.current = prev;
      setEntries(prev);
      setNotice('');
      setErrorMsg('Failed to persist Portuguese language pack; rolled back.');
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
            <h1 className="text-2xl font-bold text-[#D4AF37]">Portuguese Language Pack (pt-BR / pt-PT)</h1>
            <p className="text-sm text-zinc-400">
              Browser locale: <strong className="text-white">{detectedBrowserLocale}</strong> · Active variant: <strong className="text-[#D4AF37]">{variant}</strong>
            </p>
          </div>
          <select
            aria-label="Select Portuguese Regional Variant"
            value={variant}
            onChange={e => setVariant(e.target.value as PortugueseVariant)}
            className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-white"
          >
            <option value="pt-BR">Português (Brasil - pt-BR)</option>
            <option value="pt-PT">Português (Portugal - pt-PT)</option>
          </select>
        </header>

        {notice && <div role="status" className="bg-emerald-950/60 border border-emerald-700 text-emerald-200 px-4 py-2 rounded text-sm">{notice}</div>}
        {errorMsg && <div role="alert" className="bg-red-950/60 border border-red-700 text-red-200 px-4 py-2 rounded text-sm">{errorMsg}</div>}

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <label className="space-y-1">
            <span className="text-zinc-400">Variable: {'{{name}}'}</span>
            <input aria-label="Sample Portuguese User Name" value={sampleName} onChange={e => setSampleName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-white" />
          </label>
          <label className="space-y-1">
            <span className="text-zinc-400">Variable: {'{{count}}'}</span>
            <input aria-label="Sample Portuguese Count" type="number" min={0} value={sampleCount} onChange={e => setSampleCount(Math.max(0, Number(e.target.value) || 0))} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-white" />
          </label>
        </div>

        <form onSubmit={handleAddKey} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <input aria-label="Portuguese Translation Key" value={newKey} onChange={e => setNewKey(e.target.value)} disabled={isSaving} placeholder="e.g. nav.cta.join" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-white" />
          <input aria-label="English Source String" value={newEnglish} onChange={e => setNewEnglish(e.target.value)} disabled={isSaving} placeholder="English source" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-white" />
          <input aria-label="Portuguese Translation String" value={newPortuguese} onChange={e => setNewPortuguese(e.target.value)} disabled={isSaving} placeholder="Tradução em português" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-white" />
          <button type="submit" disabled={isSaving} className="bg-[#D4AF37] text-black font-bold text-xs rounded px-4 py-2">
            + Add Portuguese Key
          </button>
        </form>

        <div className="space-y-2">
          {entries.map(item => (
            <div key={item.key} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-1">
              <div className="flex justify-between text-xs text-zinc-400 font-mono">
                <span className="text-[#D4AF37]">{item.key}</span>
                <span>{item.module}</span>
              </div>
              <div className="text-xs text-zinc-400">EN: {interpolatePt(item.englishSource, { name: sampleName, count: sampleCount })}</div>
              <div className="text-sm font-bold text-white">
                {variant}: {interpolatePt(item.translations[variant], { name: sampleName, count: sampleCount })}
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

export default PortugueseLanguagePack;
