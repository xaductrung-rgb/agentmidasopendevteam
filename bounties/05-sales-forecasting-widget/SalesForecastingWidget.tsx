'use client';
import React, { useState, useRef, useMemo } from 'react';

export interface HistoricalMonth {
  id: string;
  monthLabel: string;
  actualRevenueUsd: number;
  pipelineCoverageRatio: number;
}

export interface SalesForecastingWidgetProps {
  storageKey?: string;
  initialHistory?: HistoricalMonth[];
  onChange?: (history: HistoricalMonth[]) => void | Promise<void>;
}

const DEFAULT_HISTORY: HistoricalMonth[] = [
  { id: 'm-1', monthLabel: '2026-06', actualRevenueUsd: 42000, pipelineCoverageRatio: 2.8 },
  { id: 'm-2', monthLabel: '2026-07', actualRevenueUsd: 46500, pipelineCoverageRatio: 3.1 },
  { id: 'm-3', monthLabel: '2026-08', actualRevenueUsd: 51200, pipelineCoverageRatio: 3.2 },
  { id: 'm-4', monthLabel: '2026-09', actualRevenueUsd: 55800, pipelineCoverageRatio: 3.4 },
  { id: 'm-5', monthLabel: '2026-10', actualRevenueUsd: 61400, pipelineCoverageRatio: 3.6 }
];

function parseMonthIndex(label: string): number | null {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(label.trim());
  if (!m) return null;
  return Number(m[1]) * 12 + (Number(m[2]) - 1);
}

function formatMonthIndex(idx: number): string {
  const year = Math.floor(idx / 12);
  const month = (idx % 12) + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}

function isValidMonth(item: unknown): item is HistoricalMonth {
  if (!item || typeof item !== 'object') return false;
  const m = item as Record<string, unknown>;
  return (
    typeof m.id === 'string' &&
    typeof m.monthLabel === 'string' &&
    parseMonthIndex(m.monthLabel) !== null &&
    typeof m.actualRevenueUsd === 'number' &&
    Number.isFinite(m.actualRevenueUsd) &&
    m.actualRevenueUsd >= 0 &&
    typeof m.pipelineCoverageRatio === 'number' &&
    Number.isFinite(m.pipelineCoverageRatio) &&
    m.pipelineCoverageRatio > 0
  );
}

export const SalesForecastingWidget: React.FC<SalesForecastingWidgetProps> = ({
  storageKey = 'agentmidas_sales_forecast_v1',
  initialHistory = DEFAULT_HISTORY,
  onChange
}) => {
  const [history, setHistory] = useState<HistoricalMonth[]>(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 2 && parsed.every(isValidMonth)) {
          return parsed;
        }
      }
    } catch {}
    return initialHistory;
  });

  const historyRef = useRef<HistoricalMonth[]>(history);
  historyRef.current = history;
  const saveLockRef = useRef(false);

  const [monthLabel, setMonthLabel] = useState('2026-11');
  const [revenueInput, setRevenueInput] = useState('66000');
  const [coverageInput, setCoverageInput] = useState('3.5');
  const [horizonMonths, setHorizonMonths] = useState<number>(3);
  const [scenarioMultiplier, setScenarioMultiplier] = useState<number>(1.0);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [notice, setNotice] = useState('');

  const persistHistory = async (next: HistoricalMonth[], msg: string): Promise<boolean> => {
    if (saveLockRef.current) return false;
    saveLockRef.current = true;
    setIsSaving(true);
    const prev = historyRef.current;
    historyRef.current = next;
    setHistory(next);
    setErrorMsg('');
    try {
      if (onChange) {
        await onChange(next);
      }
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      }
      setNotice(msg);
      return true;
    } catch {
      historyRef.current = prev;
      setHistory(prev);
      setErrorMsg('Failed to persist historical sales data; rolled back.');
      return false;
    } finally {
      saveLockRef.current = false;
      setIsSaving(false);
    }
  };

  const handleAddMonth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saveLockRef.current) return;
    const trimmedLabel = monthLabel.trim();
    const mIdx = parseMonthIndex(trimmedLabel);
    const rev = Number(revenueInput.trim());
    const cov = Number(coverageInput.trim());
    if (mIdx === null || !revenueInput.trim() || !coverageInput.trim() || !Number.isFinite(rev) || rev < 0 || rev > 1_000_000_000 || !Number.isFinite(cov) || cov <= 0) {
      setErrorMsg('Enter a valid YYYY-MM month label, non-negative revenue, and positive pipeline coverage.');
      return;
    }
    const created: HistoricalMonth = {
      id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      monthLabel: trimmedLabel,
      actualRevenueUsd: Math.round(rev),
      pipelineCoverageRatio: Number(cov.toFixed(2))
    };
    // Upsert by monthLabel and sort chronologically by calendar month index
    const filtered = historyRef.current.filter(h => h.monthLabel !== trimmedLabel);
    const next = [...filtered, created].sort(
      (a, b) => (parseMonthIndex(a.monthLabel) ?? 0) - (parseMonthIndex(b.monthLabel) ?? 0)
    );
    await persistHistory(next, `Recorded actuals for ${created.monthLabel}.`);
  };

  // Ordinary Least Squares (OLS) using true calendar month spacing + residual standard error 90% prediction interval
  const forecast = useMemo(() => {
    const sorted = [...history]
      .filter(h => parseMonthIndex(h.monthLabel) !== null)
      .sort((a, b) => (parseMonthIndex(a.monthLabel) ?? 0) - (parseMonthIndex(b.monthLabel) ?? 0));
    const n = sorted.length;
    if (n === 0) {
      return { slope: 0, residualStdErr: 0, projections: [] as { step: number; label: string; baseUsd: number; lowUsd: number; highUsd: number }[] };
    }
    const baseMonthIdx = parseMonthIndex(sorted[0].monthLabel) ?? 0;
    const xs = sorted.map(h => (parseMonthIndex(h.monthLabel) ?? baseMonthIdx) - baseMonthIdx);
    const ys = sorted.map(h => h.actualRevenueUsd);
    const meanX = xs.reduce((a, b) => a + b, 0) / n;
    const meanY = ys.reduce((a, b) => a + b, 0) / n;
    let sxx = 0;
    let sxy = 0;
    for (let i = 0; i < n; i++) {
      sxy += (xs[i] - meanX) * (ys[i] - meanY);
      sxx += (xs[i] - meanX) ** 2;
    }
    const slope = sxx > 0 ? sxy / sxx : 0;
    const intercept = meanY - slope * meanX;

    // Residual standard error from historical fit
    let sse = 0;
    for (let i = 0; i < n; i++) {
      const yHat = intercept + slope * xs[i];
      sse += (ys[i] - yHat) ** 2;
    }
    const dof = Math.max(1, n - 2);
    const sigma = n >= 3 ? Math.sqrt(sse / dof) : Math.max(1000, meanY * 0.08);
    const lastAbsMonth = parseMonthIndex(sorted[n - 1].monthLabel) ?? baseMonthIdx;
    const lastRelX = xs[n - 1];

    const projections = [];
    for (let step = 1; step <= horizonMonths; step++) {
      const xFuture = lastRelX + step;
      const rawTrend = Math.max(0, intercept + slope * xFuture);
      const baseUsd = Math.round(rawTrend * scenarioMultiplier);
      const leverage = sxx > 0 ? (xFuture - meanX) ** 2 / sxx : step;
      const predStdErr = sigma * Math.sqrt(1 + 1 / n + leverage);
      const margin90 = Math.round(1.645 * predStdErr * scenarioMultiplier);
      const lowUsd = Math.max(0, baseUsd - margin90);
      const highUsd = baseUsd + margin90;
      projections.push({
        step,
        label: formatMonthIndex(lastAbsMonth + step),
        baseUsd,
        lowUsd,
        highUsd
      });
    }
    return { slope: Math.round(slope), residualStdErr: Math.round(sigma), projections };
  }, [history, horizonMonths, scenarioMultiplier]);

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="border-b border-zinc-800 pb-4 flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#D4AF37]">OLS Sales Forecasting Widget</h1>
            <p className="text-sm text-zinc-400">Calendar-spaced least-squares regression & residual standard error prediction bands</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 px-4 py-2 rounded">
            <div className="text-xs text-zinc-400">Monthly Trend Velocity</div>
            <div className="text-lg font-bold text-emerald-400">
              {forecast.slope >= 0 ? `+$${forecast.slope.toLocaleString()}/mo` : `-$${Math.abs(forecast.slope).toLocaleString()}/mo`}
            </div>
          </div>
        </header>

        {notice && <div role="status" className="bg-emerald-950/60 border border-emerald-700 text-emerald-200 px-4 py-2 rounded text-sm">{notice}</div>}
        {errorMsg && <div role="alert" className="bg-red-950/60 border border-red-700 text-red-200 px-4 py-2 rounded text-sm">{errorMsg}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <form onSubmit={handleAddMonth} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
            <h2 className="text-sm font-bold text-[#D4AF37]">Record / Update Historical Month</h2>
            <div className="grid grid-cols-3 gap-2">
              <input aria-label="Month Label" value={monthLabel} onChange={e => setMonthLabel(e.target.value)} disabled={isSaving} placeholder="YYYY-MM" className="bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-sm text-white" />
              <input aria-label="Actual Revenue USD" type="number" min={0} value={revenueInput} onChange={e => setRevenueInput(e.target.value)} disabled={isSaving} placeholder="Revenue ($)" className="bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-sm text-white" />
              <input aria-label="Pipeline Coverage Ratio" type="number" step="0.1" min={0.1} value={coverageInput} onChange={e => setCoverageInput(e.target.value)} disabled={isSaving} placeholder="Coverage (x)" className="bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-sm text-white" />
            </div>
            <button type="submit" disabled={isSaving} className="bg-[#D4AF37] text-black font-bold text-xs px-4 py-2 rounded">
              + Save Month Actuals
            </button>
          </form>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
            <h2 className="text-sm font-bold text-[#D4AF37]">Scenario Controls (Residual SE: ${forecast.residualStdErr.toLocaleString()})</h2>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="space-y-1">
                <span className="text-zinc-400">Forecast Horizon ({horizonMonths} Months)</span>
                <input aria-label="Forecast Horizon Months" type="range" min={1} max={6} value={horizonMonths} onChange={e => setHorizonMonths(Number(e.target.value))} className="w-full" />
              </label>
              <label className="space-y-1">
                <span className="text-zinc-400">Scenario Multiplier ({(scenarioMultiplier * 100).toFixed(0)}%)</span>
                <select aria-label="Scenario Multiplier" value={scenarioMultiplier} onChange={e => setScenarioMultiplier(Number(e.target.value))} className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-white">
                  <option value={0.85}>Conservative (85%)</option>
                  <option value={1.0}>Baseline OLS Trend (100%)</option>
                  <option value={1.2}>Accelerated Expansion (120%)</option>
                </select>
              </label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {forecast.projections.map(p => (
            <div key={p.step} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-1">
              <div className="text-xs text-zinc-400">{p.label} (+{p.step}m Forecast)</div>
              <div className="text-2xl font-bold text-[#D4AF37]">${p.baseUsd.toLocaleString()}</div>
              <div className="text-xs text-zinc-400">
                90% Prediction Interval: ${p.lowUsd.toLocaleString()} – ${p.highUsd.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SalesForecastingWidget;
