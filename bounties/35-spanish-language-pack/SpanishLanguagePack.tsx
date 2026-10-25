'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';

export interface SpanishTranslationEntry {
  key: string;
  section: string;
  en: string;
  esES: string;
  es419: string;
}

export interface SpanishLanguagePackProps {
  initialEntries?: SpanishTranslationEntry[];
  storageKey?: string;
  onChange?: (entries: SpanishTranslationEntry[]) => void | Promise<void>;
}

const DEFAULT_SPANISH_PACK: SpanishTranslationEntry[] = [
  { key: 'nav.dashboard', section: 'Navigation', en: 'Executive Dashboard', esES: 'Panel de control ejecutivo', es419: 'Tablero ejecutivo' },
  { key: 'nav.analytics', section: 'Navigation', en: 'Revenue Analytics', esES: 'Analítica de ingresos', es419: 'Análisis de ingresos' },
  { key: 'nav.settings', section: 'Navigation', en: 'Workspace Settings', esES: 'Ajustes del espacio de trabajo', es419: 'Configuración del espacio de trabajo' },
  { key: 'nav.billing', section: 'Navigation', en: 'Billing & Subscriptions', esES: 'Facturación y suscripciones', es419: 'Facturación y suscripciones' },
  { key: 'actions.save', section: 'Actions', en: 'Save Changes', esES: 'Guardar cambios', es419: 'Guardar cambios' },
  { key: 'actions.cancel', section: 'Actions', en: 'Cancel Action', esES: 'Cancelar acción', es419: 'Cancelar acción' },
  { key: 'actions.export', section: 'Actions', en: 'Download Report', esES: 'Descargar informe', es419: 'Descargar reporte' },
  { key: 'actions.delete', section: 'Actions', en: 'Delete Record', esES: 'Eliminar registro', es419: 'Eliminar registro' },
  { key: 'auth.login', section: 'Authentication', en: 'Sign in to your account', esES: 'Inicia sesión en tu cuenta', es419: 'Inicia sesión en tu cuenta' },
  { key: 'auth.logout', section: 'Authentication', en: 'Sign out safely', esES: 'Cerrar sesión de forma segura', es419: 'Cerrar sesión de forma segura' },
  { key: 'auth.resetPassword', section: 'Authentication', en: 'Reset password', esES: 'Restablecer contraseña', es419: 'Restablecer contraseña' },
  { key: 'billing.invoice', section: 'Billing', en: 'Tax Invoice & Receipt', esES: 'Factura fiscal y recibo', es419: 'Comprobante fiscal y recibo' },
  { key: 'billing.paymentMethod', section: 'Billing', en: 'Update payment card', esES: 'Actualizar tarjeta de pago', es419: 'Actualizar tarjeta de pago' },
  { key: 'status.welcome', section: 'Onboarding', en: 'Welcome back, {{name}}!', esES: '¡Bienvenido de nuevo, {{name}}!', es419: '¡Qué gusto verte de nuevo, {{name}}!' },
  { key: 'status.loading', section: 'Status', en: 'Loading workspace data...', esES: 'Cargando datos del espacio...', es419: 'Cargando datos del espacio...' },
  { key: 'status.empty', section: 'Status', en: 'No matching records found', esES: 'No se encontraron registros coincidentes', es419: 'No se encontraron registros coincidentes' }
];

function isValidPack(val: unknown): val is SpanishTranslationEntry[] {
  return (
    Array.isArray(val) &&
    val.every(
      (item) =>
        item &&
        typeof item === 'object' &&
        typeof (item as SpanishTranslationEntry).key === 'string' &&
        typeof (item as SpanishTranslationEntry).section === 'string' &&
        typeof (item as SpanishTranslationEntry).en === 'string' &&
        typeof (item as SpanishTranslationEntry).esES === 'string' &&
        typeof (item as SpanishTranslationEntry).es419 === 'string'
    )
  );
}

export default function SpanishLanguagePack({
  initialEntries = DEFAULT_SPANISH_PACK,
  storageKey = 'agentmidas_spanish_pack_v1',
  onChange
}: SpanishLanguagePackProps) {
  const initialEntriesRef = useRef(initialEntries);
  initialEntriesRef.current = initialEntries;
  const activeKeyRef = useRef(storageKey);
  activeKeyRef.current = storageKey;

  const [entries, setEntries] = useState<SpanishTranslationEntry[]>(() =>
    isValidPack(initialEntries) && initialEntries.length > 0 ? initialEntries : DEFAULT_SPANISH_PACK
  );
  const [variant, setVariant] = useState<'esES' | 'es419'>('es419');
  const [search, setSearch] = useState('');
  const [previewName, setPreviewName] = useState('Carlos');
  const [newKey, setNewKey] = useState('');
  const [newEn, setNewEn] = useState('');
  const [newEsES, setNewEsES] = useState('');
  const [newEs419, setNewEs419] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fallback =
      isValidPack(initialEntriesRef.current) && initialEntriesRef.current.length > 0
        ? initialEntriesRef.current
        : DEFAULT_SPANISH_PACK;
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isValidPack(parsed) && parsed.length > 0) {
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
        e.esES.toLowerCase().includes(q) ||
        e.es419.toLowerCase().includes(q)
    );
  }, [entries, search]);

  async function handleAddEntry(e: React.FormEvent) {
    e.preventDefault();
    if (isSaving) return;
    const k = newKey.trim();
    const enVal = newEn.trim();
    const esEsVal = newEsES.trim();
    const es419Val = newEs419.trim();
    if (!k || !enVal || !esEsVal || !es419Val) {
      setError('Key, English source, es-ES translation, and es-419 translation are all required.');
      return;
    }
    const updated: SpanishTranslationEntry = {
      key: k,
      section: 'Custom',
      en: enVal,
      esES: esEsVal,
      es419: es419Val
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
      setNewEsES('');
      setNewEs419('');
    } catch {
      if (activeKeyRef.current === keyAtStart) {
        setEntries(prev);
      }
      setError('Failed to persist Spanish translation entry.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Spanish Language Pack (es-ES / es-419)</h2>
          <p className="text-sm text-slate-600">
            Complete Spanish UI localization bundle with regional dialect switching and variable interpolation.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            aria-pressed={variant === 'es419'}
            onClick={() => setVariant('es419')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              variant === 'es419' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-300'
            }`}
          >
            Latin America (es-419)
          </button>
          <button
            type="button"
            aria-pressed={variant === 'esES'}
            onClick={() => setVariant('esES')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              variant === 'esES' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-300'
            }`}
          >
            Spain (es-ES)
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
          aria-label="Search Spanish translations"
          placeholder="Search key, English, or Spanish text..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
        />
        <div className="flex items-center gap-2">
          <label htmlFor="es-preview-name" className="text-xs font-medium text-slate-600">
            Preview Variable (`{{name}}`):
          </label>
          <input
            id="es-preview-name"
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
              <th className="p-3">Active Spanish ({variant === 'es419' ? 'es-419' : 'es-ES'})</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filtered.map((item) => {
              const raw = item[variant];
              const rendered = raw.replace(/\{\{name\}\}/g, previewName || 'Usuario');
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
          placeholder="Key (e.g.cta.upgrade)"
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
          aria-label="Spain Spanish es-ES string"
          placeholder="Spain (es-ES)"
          value={newEsES}
          onChange={(e) => setNewEsES(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
        />
        <input
          type="text"
          aria-label="Latin America Spanish es-419 string"
          placeholder="LatAm (es-419)"
          value={newEs419}
          onChange={(e) => setNewEs419(e.target.value)}
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
