'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';

export interface FrenchTranslationEntry {
  key: string;
  section: string;
  en: string;
  frFR: string;
  frCA: string;
}

export interface FrenchLanguagePackProps {
  initialEntries?: FrenchTranslationEntry[];
  storageKey?: string;
  onChange?: (entries: FrenchTranslationEntry[]) => void | Promise<void>;
}

const DEFAULT_FRENCH_PACK: FrenchTranslationEntry[] = [
  { key: 'nav.dashboard', section: 'Navigation', en: 'Executive Dashboard', frFR: 'Tableau de bord exécutif', frCA: 'Tableau de bord de direction' },
  { key: 'nav.analytics', section: 'Navigation', en: 'Revenue Analytics', frFR: 'Analytique des revenus', frCA: 'Analyse des revenus' },
  { key: 'nav.settings', section: 'Navigation', en: 'Workspace Settings', frFR: 'Paramètres de l’espace de travail', frCA: 'Paramètres de l’espace de travail' },
  { key: 'nav.billing', section: 'Navigation', en: 'Billing & Subscriptions', frFR: 'Facturation et abonnements', frCA: 'Facturation et abonnements' },
  { key: 'actions.save', section: 'Actions', en: 'Save Changes', frFR: 'Enregistrer les modifications', frCA: 'Sauvegarder les modifications' },
  { key: 'actions.cancel', section: 'Actions', en: 'Cancel Action', frFR: 'Annuler l’action', frCA: 'Annuler l’action' },
  { key: 'actions.export', section: 'Actions', en: 'Download Report', frFR: 'Télécharger le rapport', frCA: 'Télécharger le rapport' },
  { key: 'actions.delete', section: 'Actions', en: 'Delete Record', frFR: 'Supprimer l’enregistrement', frCA: 'Supprimer l’enregistrement' },
  { key: 'auth.login', section: 'Authentication', en: 'Sign in via Email', frFR: 'Connexion par e-mail', frCA: 'Connexion par courriel' },
  { key: 'auth.logout', section: 'Authentication', en: 'Sign out safely', frFR: 'Se déconnecter en toute sécurité', frCA: 'Se déconnecter en toute sécurité' },
  { key: 'auth.resetPassword', section: 'Authentication', en: 'Reset password', frFR: 'Réinitialiser le mot de passe', frCA: 'Réinitialiser le mot de passe' },
  { key: 'billing.invoice', section: 'Billing', en: 'Tax Invoice & Receipt', frFR: 'Facture fiscale et reçu', frCA: 'Facture de taxes et reçu' },
  { key: 'billing.paymentMethod', section: 'Billing', en: 'Update payment card', frFR: 'Mettre à jour la carte bancaire', frCA: 'Mettre à jour la carte de paiement' },
  { key: 'status.welcome', section: 'Onboarding', en: 'Welcome back, {{name}}!', frFR: 'Bon retour, {{name}} !', frCA: 'Bon retour parmi nous, {{name}} !' },
  { key: 'status.loading', section: 'Status', en: 'Loading workspace data...', frFR: 'Chargement des données...', frCA: 'Chargement des données...' },
  { key: 'status.empty', section: 'Status', en: 'No matching records found', frFR: 'Aucun enregistrement correspondant', frCA: 'Aucun dossier correspondant' }
];

function isValidFrenchPack(val: unknown): val is FrenchTranslationEntry[] {
  return (
    Array.isArray(val) &&
    val.every(
      (item) =>
        item &&
        typeof item === 'object' &&
        typeof (item as FrenchTranslationEntry).key === 'string' &&
        typeof (item as FrenchTranslationEntry).section === 'string' &&
        typeof (item as FrenchTranslationEntry).en === 'string' &&
        typeof (item as FrenchTranslationEntry).frFR === 'string' &&
        typeof (item as FrenchTranslationEntry).frCA === 'string'
    )
  );
}

export default function FrenchLanguagePack({
  initialEntries = DEFAULT_FRENCH_PACK,
  storageKey = 'agentmidas_french_pack_v1',
  onChange
}: FrenchLanguagePackProps) {
  const initialEntriesRef = useRef(initialEntries);
  initialEntriesRef.current = initialEntries;
  const activeKeyRef = useRef(storageKey);
  activeKeyRef.current = storageKey;

  const [entries, setEntries] = useState<FrenchTranslationEntry[]>(() =>
    isValidFrenchPack(initialEntries) && initialEntries.length > 0 ? initialEntries : DEFAULT_FRENCH_PACK
  );
  const [variant, setVariant] = useState<'frFR' | 'frCA'>('frFR');
  const [search, setSearch] = useState('');
  const [previewName, setPreviewName] = useState('Camille');
  const [newKey, setNewKey] = useState('');
  const [newEn, setNewEn] = useState('');
  const [newFrFR, setNewFrFR] = useState('');
  const [newFrCA, setNewFrCA] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fallback =
      isValidFrenchPack(initialEntriesRef.current) && initialEntriesRef.current.length > 0
        ? initialEntriesRef.current
        : DEFAULT_FRENCH_PACK;
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isValidFrenchPack(parsed) && parsed.length > 0) {
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
        e.frFR.toLowerCase().includes(q) ||
        e.frCA.toLowerCase().includes(q)
    );
  }, [entries, search]);

  async function handleAddEntry(e: React.FormEvent) {
    e.preventDefault();
    if (isSaving) return;
    const k = newKey.trim();
    const enVal = newEn.trim();
    const frFRVal = newFrFR.trim();
    const frCAVal = newFrCA.trim();
    if (!k || !enVal || !frFRVal || !frCAVal) {
      setError('Key, English source, fr-FR translation, and fr-CA translation are all required.');
      return;
    }
    const updated: FrenchTranslationEntry = {
      key: k,
      section: 'Custom',
      en: enVal,
      frFR: frFRVal,
      frCA: frCAVal
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
      setNewFrFR('');
      setNewFrCA('');
    } catch {
      if (activeKeyRef.current === keyAtStart) {
        setEntries(prev);
      }
      setError('Failed to persist French translation entry.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">French Language Pack (fr-FR / fr-CA)</h2>
          <p className="text-sm text-slate-600">
            Complete French UI localization with typographical non-breaking space rules and regional variants.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            aria-pressed={variant === 'frFR'}
            onClick={() => setVariant('frFR')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              variant === 'frFR' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-300'
            }`}
          >
            France (fr-FR)
          </button>
          <button
            type="button"
            aria-pressed={variant === 'frCA'}
            onClick={() => setVariant('frCA')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              variant === 'frCA' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-300'
            }`}
          >
            Canada (fr-CA)
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
          aria-label="Search French translations"
          placeholder="Search key, English, or French text..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
        />
        <div className="flex items-center gap-2">
          <label htmlFor="fr-preview-name" className="text-xs font-medium text-slate-600">
            Preview Variable (`{{name}}`):
          </label>
          <input
            id="fr-preview-name"
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
              <th className="p-3">Active French ({variant === 'frFR' ? 'fr-FR' : 'fr-CA'})</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filtered.map((item) => {
              const raw = item[variant];
              const rendered = raw.replace(/\{\{name\}\}/g, previewName || 'Utilisateur');
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
          aria-label="France French fr-FR string"
          placeholder="France (fr-FR)"
          value={newFrFR}
          onChange={(e) => setNewFrFR(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
        />
        <input
          type="text"
          aria-label="Canadian French fr-CA string"
          placeholder="Canada (fr-CA)"
          value={newFrCA}
          onChange={(e) => setNewFrCA(e.target.value)}
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
