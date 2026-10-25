'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';

export interface PortugueseTranslationEntry {
  key: string;
  section: string;
  en: string;
  ptBR: string;
  ptPT: string;
}

export interface PortugueseLanguagePackProps {
  initialEntries?: PortugueseTranslationEntry[];
  storageKey?: string;
  onChange?: (entries: PortugueseTranslationEntry[]) => void | Promise<void>;
}

const DEFAULT_PORTUGUESE_PACK: PortugueseTranslationEntry[] = [
  { key: 'nav.dashboard', section: 'Navigation', en: 'Executive Dashboard', ptBR: 'Painel executivo', ptPT: 'Painel de controlo executivo' },
  { key: 'nav.analytics', section: 'Navigation', en: 'Revenue Analytics', ptBR: 'Análise de receita', ptPT: 'Analítica de receitas' },
  { key: 'nav.settings', section: 'Navigation', en: 'Workspace Settings', ptBR: 'Configurações do espaço', ptPT: 'Definições do espaço de trabalho' },
  { key: 'nav.billing', section: 'Navigation', en: 'Billing & Subscriptions', ptBR: 'Faturamento e assinaturas', ptPT: 'Faturação e subscrições' },
  { key: 'actions.save', section: 'Actions', en: 'Save Changes', ptBR: 'Salvar alterações', ptPT: 'Guardar alterações' },
  { key: 'actions.cancel', section: 'Actions', en: 'Cancel Action', ptBR: 'Cancelar ação', ptPT: 'Cancelar ação' },
  { key: 'actions.export', section: 'Actions', en: 'Download Report', ptBR: 'Baixar relatório', ptPT: 'Transferir relatório' },
  { key: 'actions.delete', section: 'Actions', en: 'Delete Record', ptBR: 'Excluir registro', ptPT: 'Eliminar registo' },
  { key: 'auth.login', section: 'Authentication', en: 'Sign in to your account', ptBR: 'Entrar na sua conta', ptPT: 'Iniciar sessão na sua conta' },
  { key: 'auth.logout', section: 'Authentication', en: 'Sign out safely', ptBR: 'Sair com segurança', ptPT: 'Terminar sessão com segurança' },
  { key: 'auth.resetPassword', section: 'Authentication', en: 'Reset password', ptBR: 'Redefinir senha', ptPT: 'Repor palavra-passe' },
  { key: 'billing.invoice', section: 'Billing', en: 'Tax Invoice & Receipt', ptBR: 'Nota fiscal e recibo', ptPT: 'Fatura fiscal e recibo' },
  { key: 'billing.paymentMethod', section: 'Billing', en: 'Update payment card', ptBR: 'Atualizar cartão de crédito', ptPT: 'Atualizar cartão de pagamento' },
  { key: 'status.welcome', section: 'Onboarding', en: 'Welcome back, {{name}}!', ptBR: 'Bem-vindo de volta, {{name}}!', ptPT: 'Bem-vindo novamente, {{name}}!' },
  { key: 'status.loading', section: 'Status', en: 'Loading workspace data...', ptBR: 'Carregando dados...', ptPT: 'A carregar dados...' },
  { key: 'status.empty', section: 'Status', en: 'No matching records found', ptBR: 'Nenhum registro encontrado', ptPT: 'Nenhum registo correspondente' }
];

function isValidPortuguesePack(val: unknown): val is PortugueseTranslationEntry[] {
  return (
    Array.isArray(val) &&
    val.every(
      (item) =>
        item &&
        typeof item === 'object' &&
        typeof (item as PortugueseTranslationEntry).key === 'string' &&
        typeof (item as PortugueseTranslationEntry).section === 'string' &&
        typeof (item as PortugueseTranslationEntry).en === 'string' &&
        typeof (item as PortugueseTranslationEntry).ptBR === 'string' &&
        typeof (item as PortugueseTranslationEntry).ptPT === 'string'
    )
  );
}

export default function PortugueseLanguagePack({
  initialEntries = DEFAULT_PORTUGUESE_PACK,
  storageKey = 'agentmidas_portuguese_pack_v1',
  onChange
}: PortugueseLanguagePackProps) {
  const initialEntriesRef = useRef(initialEntries);
  initialEntriesRef.current = initialEntries;
  const activeKeyRef = useRef(storageKey);
  activeKeyRef.current = storageKey;

  const [entries, setEntries] = useState<PortugueseTranslationEntry[]>(() =>
    isValidPortuguesePack(initialEntries) && initialEntries.length > 0 ? initialEntries : DEFAULT_PORTUGUESE_PACK
  );
  const [variant, setVariant] = useState<'ptBR' | 'ptPT'>('ptBR');
  const [search, setSearch] = useState('');
  const [previewName, setPreviewName] = useState('Mateus');
  const [newKey, setNewKey] = useState('');
  const [newEn, setNewEn] = useState('');
  const [newPtBR, setNewPtBR] = useState('');
  const [newPtPT, setNewPtPT] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fallback =
      isValidPortuguesePack(initialEntriesRef.current) && initialEntriesRef.current.length > 0
        ? initialEntriesRef.current
        : DEFAULT_PORTUGUESE_PACK;
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isValidPortuguesePack(parsed) && parsed.length > 0) {
          setEntries(parsed);
          return;
        }
      }
    } catch {
      // ignore read errors
    }
    setEntries(fallback);
  }, [storageKey]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.key.toLowerCase().includes(q) ||
        e.en.toLowerCase().includes(q) ||
        e.ptBR.toLowerCase().includes(q) ||
        e.ptPT.toLowerCase().includes(q)
    );
  }, [entries, search]);

  async function handleAddEntry(e: React.FormEvent) {
    e.preventDefault();
    if (isSaving) return;
    const k = newKey.trim();
    const enVal = newEn.trim();
    const ptBRVal = newPtBR.trim();
    const ptPTVal = newPtPT.trim();
    if (!k || !enVal || !ptBRVal || !ptPTVal) {
      setError('Key, English source, pt-BR translation, and pt-PT translation are all required.');
      return;
    }
    const updated: PortugueseTranslationEntry = {
      key: k,
      section: 'Custom',
      en: enVal,
      ptBR: ptBRVal,
      ptPT: ptPTVal
    };
    const keyAtStart = storageKey;
    const prev = entries;
    const next = [updated, ...entries.filter((item) => item.key !== k)];
    setIsSaving(true);
    setError(null);
    setEntries(next);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(keyAtStart, JSON.stringify(next));
      }
      await onChange?.(next);
      setNewKey('');
      setNewEn('');
      setNewPtBR('');
      setNewPtPT('');
    } catch {
      if (activeKeyRef.current === keyAtStart) {
        setEntries(prev);
      }
      setError('Failed to persist Portuguese translation entry.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Portuguese Language Pack (pt-BR / pt-PT)</h2>
          <p className="text-sm text-slate-600">
            Complete Portuguese UI localization bundle supporting Brazilian and European Portuguese variants.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            aria-pressed={variant === 'ptBR'}
            onClick={() => setVariant('ptBR')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              variant === 'ptBR' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-300'
            }`}
          >
            Brazil (pt-BR)
          </button>
          <button
            type="button"
            aria-pressed={variant === 'ptPT'}
            onClick={() => setVariant('ptPT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              variant === 'ptPT' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-300'
            }`}
          >
            Portugal (pt-PT)
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <input
          type="search"
          aria-label="Search Portuguese translations"
          placeholder="Search key, English, or Portuguese text..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
        />
        <div className="flex items-center gap-2">
          <label htmlFor="pt-preview-name" className="text-xs font-medium text-slate-600">
            Preview Variable (`{{name}}`):
          </label>
          <input
            id="pt-preview-name"
            type="text"
            value={previewName}
            onChange={(e) => setPreviewName(e.target.value)}
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-lg mb-6">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th className="p-3">Key</th>
              <th className="p-3">English Source</th>
              <th className="p-3">Active Portuguese ({variant === 'ptBR' ? 'pt-BR' : 'pt-PT'})</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filtered.map((item) => {
              const raw = item[variant];
              const rendered = raw.replace(/\{\{name\}\}/g, previewName || 'Utilizador');
              return (
                <tr key={item.key}>
                  <td className="p-3 font-mono text-xs text-indigo-700">{item.key}</td>
                  <td className="p-3 text-slate-600">{item.en}</td>
                  <td className="p-3 font-medium text-slate-900">{rendered}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <form onSubmit={handleAddEntry} className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-4 border-t border-slate-200">
        <input
          type="text"
          aria-label="Translation key"
          placeholder="Key (e.g. cta.upgrade)"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
        />
        <input
          type="text"
          aria-label="English source string"
          placeholder="English text"
          value={newEn}
          onChange={(e) => setNewEn(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
        />
        <input
          type="text"
          aria-label="Brazilian Portuguese pt-BR string"
          placeholder="Brazil (pt-BR)"
          value={newPtBR}
          onChange={(e) => setNewPtBR(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
        />
        <input
          type="text"
          aria-label="European Portuguese pt-PT string"
          placeholder="Portugal (pt-PT)"
          value={newPtPT}
          onChange={(e) => setNewPtPT(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
        />
        <button
          type="submit"
          disabled={isSaving}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Add / Update Key'}
        </button>
      </form>
    </div>
  );
}
