'use client';
import React, { useState, useMemo, useRef } from 'react';

export type SupportedLocale = 'en-US' | 'es-ES' | 'fr-FR' | 'pt-BR';

export interface TranslationEntry {
  key: string;
  namespace: 'common' | 'dashboard' | 'payouts';
  values: Record<SupportedLocale, string>;
}

export interface I18nFrameworkSetupProps {
  storageKey?: string;
  initialLocale?: SupportedLocale;
  initialEntries?: TranslationEntry[];
  onChange?: (entries: TranslationEntry[]) => void | Promise<void>;
}

const LOCALES: { code: SupportedLocale; label: string }[] = [
  { code: 'en-US', label: 'English (en-US) — Default Fallback' },
  { code: 'es-ES', label: 'Español (es-ES)' },
  { code: 'fr-FR', label: 'Français (fr-FR)' },
  { code: 'pt-BR', label: 'Português (pt-BR)' }
];

function detectBrowserLocale(explicitLocale?: SupportedLocale): SupportedLocale {
  if (explicitLocale) return explicitLocale;
  try {
    if (typeof navigator !== 'undefined' && navigator.language) {
      const lang = navigator.language.toLowerCase();
      if (lang.startsWith('es')) return 'es-ES';
      if (lang.startsWith('fr')) return 'fr-FR';
      if (lang.startsWith('pt')) return 'pt-BR';
    }
  } catch {}
  return 'en-US';
}

const DEFAULT_ENTRIES: TranslationEntry[] = [
  {
    key: 'dashboard.welcome_user',
    namespace: 'dashboard',
    values: {
      'en-US': 'Welcome back, {{name}}! You have {{count}} active affiliate lines.',
      'es-ES': '¡Bienvenido de nuevo, {{name}}! Tienes {{count}} líneas de afiliados activas.',
      'fr-FR': 'Bon retour, {{name}} ! Vous avez {{count}} lignes affiliées actives.',
      'pt-BR': 'Bem-vindo de volta, {{name}}! Você tem {{count}} linhas de afiliados ativas.'
    }
  },
  {
    key: 'payouts.next_settlement',
    namespace: 'payouts',
    values: {
      'en-US': 'Next payout of {{amount}} scheduled via Stripe.',
      'es-ES': 'Próximo pago de {{amount}} programado vía Stripe.',
      'fr-FR': 'Prochain paiement de {{amount}} programmé via Stripe.',
      'pt-BR': 'Próximo pagamento de {{amount}} agendado via Stripe.'
    }
  },
  {
    key: 'common.security_verified',
    namespace: 'common',
    values: {
      'en-US': '6-Layer Security Verification Passed',
      'es-ES': 'Verificación de seguridad de 6 capas aprobada',
      'fr-FR': 'Vérification de sécurité à 6 niveaux réussie',
      'pt-BR': 'Verificação de segurança de 6 camadas aprovada'
    }
  }
];

export const I18nFrameworkSetup: React.FC<I18nFrameworkSetupProps> = ({
  storageKey = 'agentmidas_i18n_framework_v1',
  initialLocale,
  initialEntries = DEFAULT_ENTRIES,
  onChange
}) => {
  const [entries, setEntries] = useState<TranslationEntry[]>(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return initialEntries;
  });

  const [activeLocale, setActiveLocale] = useState<SupportedLocale>(() => detectBrowserLocale(initialLocale));
  const [sampleName, setSampleName] = useState('Avery');
  const [sampleCount, setSampleCount] = useState(12);
  const [sampleAmount, setSampleAmount] = useState('$1,450.00');
  const [newKey, setNewKey] = useState('');
  const [newEnValue, setNewEnValue] = useState('');
  const [notice, setNotice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const saveSeqRef = useRef(0);

  const persistEntries = async (next: TranslationEntry[], msg?: string) => {
    const seq = ++saveSeqRef.current;
    const prev = entries;
    setEntries(next);
    setErrorMsg('');
    try {
      if (onChange) {
        await onChange(next);
      }
      if (seq !== saveSeqRef.current) return;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      }
      if (msg) setNotice(msg);
    } catch {
      if (seq === saveSeqRef.current) {
        setEntries(prev);
        setErrorMsg('Failed to persist i18n catalog; state rolled back.');
      }
    }
  };

  const translate = (key: string, locale: SupportedLocale, vars: Record<string, string | number>) => {
    const found = entries.find(e => e.key === key);
    if (!found) return `[missing:${key}]`;
    const raw = found.values[locale]?.trim() || found.values['en-US'] || key;
    const usedFallback = !found.values[locale]?.trim() && locale !== 'en-US';
    const interpolated = raw.replace(/\{\{(\w+)\}\}/g, (_, k) =>
      vars[k] !== undefined ? String(vars[k]) : `{{${k}}}`
    );
    return usedFallback ? `${interpolated} (fallback: en-US)` : interpolated;
  };

  const updateTranslation = (key: string, locale: SupportedLocale, val: string) => {
    const next = entries.map(e =>
      e.key === key ? { ...e, values: { ...e.values, [locale]: val } } : e
    );
    void persistEntries(next, `Updated [${locale}] translation for "${key}".`);
  };

  const handleAddKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newEnValue.trim()) {
      setErrorMsg('Translation key and default en-US string are required.');
      return;
    }
    if (entries.some(e => e.key === newKey.trim())) {
      setErrorMsg('Translation key already exists.');
      return;
    }
    const created: TranslationEntry = {
      key: newKey.trim(),
      namespace: 'common',
      values: {
        'en-US': newEnValue.trim(),
        'es-ES': '',
        'fr-FR': '',
        'pt-BR': ''
      }
    };
    setNewKey('');
    setNewEnValue('');
    void persistEntries([...entries, created], `Added translation key "${created.key}".`);
  };

  const coverageByLocale = useMemo(() => {
    return LOCALES.map(l => {
      const translated = entries.filter(e => Boolean(e.values[l.code]?.trim())).length;
      return {
        ...l,
        translated,
        total: entries.length,
        pct: entries.length > 0 ? Math.round((translated / entries.length) * 100) : 100
      };
    });
  }, [entries]);

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-[#D4AF37]">Agent Midas i18n Framework & Locale Inspector</h1>
            <p className="text-sm text-zinc-400">
              Dynamic locale switching, browser locale auto-detection, parameter interpolation, and fallback resolution
            </p>
          </div>
          <div className="flex gap-2" role="tablist" aria-label="Active Locale Selector">
            {LOCALES.map(loc => (
              <button
                key={loc.code}
                type="button"
                role="tab"
                aria-selected={activeLocale === loc.code}
                onClick={() => setActiveLocale(loc.code)}
                className={`px-3 py-1.5 rounded text-xs font-bold ${
                  activeLocale === loc.code ? 'bg-[#D4AF37] text-black' : 'bg-zinc-900 text-zinc-300 border border-zinc-800'
                }`}
              >
                {loc.code}
              </button>
            ))}
          </div>
        </header>

        {notice && (
          <div role="status" className="bg-emerald-950/60 border border-emerald-700 text-emerald-200 px-4 py-2 rounded text-sm">
            {notice}
          </div>
        )}
        {errorMsg && (
          <div role="alert" className="bg-red-950/60 border border-red-700 text-red-200 px-4 py-2 rounded text-sm">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {coverageByLocale.map(c => (
            <div key={c.code} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="text-xs text-zinc-400">{c.label}</div>
              <div className="text-xl font-bold text-[#D4AF37] mt-1">{c.pct}% Coverage</div>
              <div className="text-xs text-zinc-500">
                {c.translated} / {c.total} keys translated
              </div>
            </div>
          ))}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          <h2 className="text-base font-bold text-[#D4AF37]">
            Live Interpolation Preview ({activeLocale})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="text-xs text-zinc-400">
              Variable {'{{name}}'}
              <input
                type="text"
                value={sampleName}
                onChange={e => setSampleName(e.target.value)}
                className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-sm text-white"
              />
            </label>
            <label className="text-xs text-zinc-400">
              Variable {'{{count}}'}
              <input
                type="number"
                value={sampleCount}
                onChange={e => setSampleCount(Number(e.target.value))}
                className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-sm text-white"
              />
            </label>
            <label className="text-xs text-zinc-400">
              Variable {'{{amount}}'}
              <input
                type="text"
                value={sampleAmount}
                onChange={e => setSampleAmount(e.target.value)}
                className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-sm text-white"
              />
            </label>
          </div>

          <div className="space-y-2 bg-zinc-950 border border-zinc-800 rounded-lg p-4">
            {entries.map(e => (
              <div key={e.key} className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-zinc-900 pb-2">
                <span className="text-xs font-mono text-[#D4AF37]">{e.key}</span>
                <span className="text-sm text-zinc-100">
                  {translate(e.key, activeLocale, { name: sampleName, count: sampleCount, amount: sampleAmount })}
                </span>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleAddKey} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="New Key (e.g. common.save_changes)"
            value={newKey}
            onChange={e => setNewKey(e.target.value)}
            className="w-64 bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white"
          />
          <input
            type="text"
            placeholder="Default English (en-US) template"
            value={newEnValue}
            onChange={e => setNewEnValue(e.target.value)}
            className="flex-1 min-w-[240px] bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white"
          />
          <button
            type="submit"
            className="bg-[#D4AF37] text-black font-bold text-sm px-4 py-2 rounded hover:opacity-90"
          >
            + Add Translation Key
          </button>
        </form>

        <div className="space-y-3">
          {entries.map(entry => (
            <div key={entry.key} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-mono text-sm font-bold text-[#D4AF37]">{entry.key}</span>
                <span className="text-xs text-zinc-400">Active Locale: {activeLocale}</span>
              </div>
              <input
                type="text"
                aria-label={`Translation for ${entry.key} in ${activeLocale}`}
                value={entry.values[activeLocale] || ''}
                placeholder={`Fallback (en-US): ${entry.values['en-US']}`}
                onChange={e => updateTranslation(entry.key, activeLocale, e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default I18nFrameworkSetup;
