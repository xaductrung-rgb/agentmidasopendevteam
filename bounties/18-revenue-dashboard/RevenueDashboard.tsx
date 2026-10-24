import React, { useState, useEffect, useMemo, useCallback } from 'react';

export interface RevenueSnapshot {
  id: string;
  periodLabel: string;
  newMrr: number;
  expansionMrr: number;
  churnedMrr: number;
  activeCustomers: number;
  arpu: number;
  grossMarginPct: number;
}

export interface RevenueDashboardProps {
  storageKey?: string;
  initialSnapshots?: RevenueSnapshot[];
  liveEndpoint?: string;
  pollIntervalMs?: number;
  onFetchSnapshots?: () => Promise<RevenueSnapshot[]>;
  onChange?: (snapshots: RevenueSnapshot[]) => void | Promise<void>;
}

const DEFAULT_SNAPSHOTS: RevenueSnapshot[] = [
  { id: 'rev-1', periodLabel: '2026-07', newMrr: 42000, expansionMrr: 8500, churnedMrr: 3100, activeCustomers: 310, arpu: 152, grossMarginPct: 82 },
  { id: 'rev-2', periodLabel: '2026-08', newMrr: 46500, expansionMrr: 9400, churnedMrr: 2900, activeCustomers: 342, arpu: 155, grossMarginPct: 83 },
  { id: 'rev-3', periodLabel: '2026-09', newMrr: 51200, expansionMrr: 11200, churnedMrr: 2700, activeCustomers: 380, arpu: 157, grossMarginPct: 84 },
  { id: 'rev-4', periodLabel: '2026-10', newMrr: 58400, expansionMrr: 13600, churnedMrr: 2400, activeCustomers: 425, arpu: 164, grossMarginPct: 85 }
];

export const RevenueDashboard: React.FC<RevenueDashboardProps> = ({
  storageKey = 'agentmidas_revenue_dashboard_v2',
  initialSnapshots = DEFAULT_SNAPSHOTS,
  liveEndpoint,
  pollIntervalMs = 30000,
  onFetchSnapshots,
  onChange
}) => {
  const [snapshots, setSnapshots] = useState<RevenueSnapshot[]>(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return initialSnapshots.length > 0 ? initialSnapshots : DEFAULT_SNAPSHOTS;
  });

  const [rangeFilter, setRangeFilter] = useState<'ALL' | 'LAST_3' | 'LATEST'>('ALL');
  const [liveSyncEnabled, setLiveSyncEnabled] = useState<boolean>(Boolean(onFetchSnapshots || liveEndpoint));
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('Not synced yet');
  const [syncError, setSyncError] = useState<string>('');
  const [periodLabel, setPeriodLabel] = useState('2026-11');
  const [newMrr, setNewMrr] = useState('62000');
  const [expansionMrr, setExpansionMrr] = useState('14500');
  const [churnedMrr, setChurnedMrr] = useState('2100');
  const [activeCustomers, setActiveCustomers] = useState('460');

  const persistSnapshots = useCallback(async (next: RevenueSnapshot[]) => {
    const safeNext = next.length > 0 ? next : DEFAULT_SNAPSHOTS;
    const prev = snapshots;
    setSnapshots(safeNext);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, JSON.stringify(safeNext));
      }
      if (onChange) {
        await onChange(safeNext);
      }
    } catch {
      setSnapshots(prev);
      setSyncError('Failed to persist snapshots; rolled back to previous state.');
    }
  }, [snapshots, storageKey, onChange]);

  const refreshLiveMetrics = useCallback(async () => {
    setSyncError('');
    let fetched: RevenueSnapshot[] | null = null;
    let callbackFailed = false;

    if (onFetchSnapshots) {
      try {
        const data = await onFetchSnapshots();
        if (Array.isArray(data) && data.length > 0) {
          fetched = data;
        } else {
          callbackFailed = true;
        }
      } catch {
        callbackFailed = true;
      }
    }

    if (!fetched && liveEndpoint) {
      try {
        const res = await fetch(liveEndpoint);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          fetched = data;
        } else {
          throw new Error('Empty payload from liveEndpoint');
        }
      } catch (err: any) {
        setSyncError(`Live refresh failed (${err?.message || 'endpoint error'}).`);
        return;
      }
    }

    if (callbackFailed && !fetched) {
      setSyncError('Live refresh failed: onFetchSnapshots rejected or returned empty data.');
      return;
    }

    if (fetched) {
      await persistSnapshots(fetched);
      setLastSyncedAt(new Date().toISOString().slice(11, 19) + ' UTC');
    } else {
      setSyncError('No live data source (onFetchSnapshots or liveEndpoint) configured.');
    }
  }, [onFetchSnapshots, liveEndpoint, persistSnapshots]);

  useEffect(() => {
    if (!liveSyncEnabled || (!onFetchSnapshots && !liveEndpoint)) return;
    void refreshLiveMetrics();
    const timer = setInterval(() => {
      void refreshLiveMetrics();
    }, Math.max(5000, pollIntervalMs));
    return () => clearInterval(timer);
  }, [liveSyncEnabled, onFetchSnapshots, liveEndpoint, pollIntervalMs, refreshLiveMetrics]);

  const safeSnapshots = snapshots.length > 0 ? snapshots : DEFAULT_SNAPSHOTS;

  const visibleSnapshots = useMemo(() => {
    if (rangeFilter === 'LATEST') return safeSnapshots.slice(-1);
    if (rangeFilter === 'LAST_3') return safeSnapshots.slice(-3);
    return safeSnapshots;
  }, [safeSnapshots, rangeFilter]);

  const kpis = useMemo(() => {
    const current = visibleSnapshots[visibleSnapshots.length - 1] ?? DEFAULT_SNAPSHOTS[0];
    const netMrr = current.newMrr + current.expansionMrr - current.churnedMrr;
    const arr = netMrr * 12;
    const grossPool = Math.max(1, current.newMrr + current.expansionMrr);
    const churnRatePct = (current.churnedMrr / grossPool) * 100;
    const monthlyChurnDecimal = Math.max(0.005, churnRatePct / 100);
    const ltv = (current.arpu * (current.grossMarginPct / 100)) / monthlyChurnDecimal;
    return { netMrr, arr, churnRatePct, ltv, activeCustomers: current.activeCustomers };
  }, [visibleSnapshots]);

  const handleAddSnapshot = (e: React.FormEvent) => {
    e.preventDefault();
    const nMrr = Number(newMrr);
    const eMrr = Number(expansionMrr);
    const cMrr = Number(churnedMrr);
    const cust = Number(activeCustomers);
    if (!periodLabel.trim() || [nMrr, eMrr, cMrr, cust].some(v => Number.isNaN(v) || v < 0) || cust <= 0) {
      setSyncError('Please enter a valid period label and positive numeric values.');
      return;
    }
    const net = nMrr + eMrr - cMrr;
    const created: RevenueSnapshot = {
      id: `rev-${Date.now()}`,
      periodLabel: periodLabel.trim(),
      newMrr: nMrr,
      expansionMrr: eMrr,
      churnedMrr: cMrr,
      activeCustomers: cust,
      arpu: Math.round(net / cust),
      grossMarginPct: 84
    };
    void persistSnapshots([...safeSnapshots, created]);
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-[#D4AF37]">Executive Revenue Dashboard (MRR / ARR / LTV)</h1>
            <p className="text-sm text-zinc-400">Last Verified Sync: {lastSyncedAt}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1" role="tablist" aria-label="Cohort Range Filter">
              {(['ALL', 'LAST_3', 'LATEST'] as const).map(r => (
                <button
                  key={r}
                  type="button"
                  role="tab"
                  aria-selected={rangeFilter === r}
                  onClick={() => setRangeFilter(r)}
                  className={`px-3 py-1 rounded text-xs font-bold ${
                    rangeFilter === r ? 'bg-[#D4AF37] text-black' : 'bg-zinc-900 text-zinc-300 border border-zinc-800'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void refreshLiveMetrics()}
              className="px-3 py-1.5 rounded bg-[#D4AF37] text-black text-xs font-bold"
            >
              Sync Live Source
            </button>
            <label className="flex items-center gap-1.5 text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={liveSyncEnabled}
                onChange={e => setLiveSyncEnabled(e.target.checked)}
              />
              Auto-Poll
            </label>
          </div>
        </header>

        {syncError && (
          <div role="alert" className="bg-red-950/60 border border-red-700 text-red-200 px-4 py-2 rounded text-sm">
            {syncError}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-xs text-zinc-400">Net MRR</div>
            <div className="text-2xl font-bold text-[#D4AF37]">${kpis.netMrr.toLocaleString()}</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-xs text-zinc-400">Annualized ARR</div>
            <div className="text-2xl font-bold text-emerald-400">${kpis.arr.toLocaleString()}</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-xs text-zinc-400">Gross Revenue Churn</div>
            <div className="text-2xl font-bold text-amber-400">{kpis.churnRatePct.toFixed(2)}%</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-xs text-zinc-400">Estimated Customer LTV</div>
            <div className="text-2xl font-bold text-white">${Math.round(kpis.ltv).toLocaleString()}</div>
          </div>
        </div>

        <form onSubmit={handleAddSnapshot} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 grid grid-cols-2 md:grid-cols-6 gap-3">
          <input value={periodLabel} onChange={e => setPeriodLabel(e.target.value)} placeholder="Period (YYYY-MM)" className="bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-sm text-white" />
          <input type="number" value={newMrr} onChange={e => setNewMrr(e.target.value)} placeholder="New MRR" className="bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-sm text-white" />
          <input type="number" value={expansionMrr} onChange={e => setExpansionMrr(e.target.value)} placeholder="Expansion MRR" className="bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-sm text-white" />
          <input type="number" value={churnedMrr} onChange={e => setChurnedMrr(e.target.value)} placeholder="Churned MRR" className="bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-sm text-white" />
          <input type="number" value={activeCustomers} onChange={e => setActiveCustomers(e.target.value)} placeholder="Customers" className="bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-sm text-white" />
          <button type="submit" className="bg-[#D4AF37] text-black font-bold text-xs rounded px-3 py-1.5">+ Record Period</button>
        </form>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-950 text-zinc-400 text-xs uppercase">
              <tr>
                <th className="p-3">Period</th>
                <th className="p-3">New MRR</th>
                <th className="p-3">Expansion</th>
                <th className="p-3">Churned</th>
                <th className="p-3">Net MRR</th>
                <th className="p-3">Customers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {visibleSnapshots.map(s => (
                <tr key={s.id}>
                  <td className="p-3 font-mono text-[#D4AF37]">{s.periodLabel}</td>
                  <td className="p-3">${s.newMrr.toLocaleString()}</td>
                  <td className="p-3 text-emerald-400">+${s.expansionMrr.toLocaleString()}</td>
                  <td className="p-3 text-red-400">-${s.churnedMrr.toLocaleString()}</td>
                  <td className="p-3 font-bold">${(s.newMrr + s.expansionMrr - s.churnedMrr).toLocaleString()}</td>
                  <td className="p-3">{s.activeCustomers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RevenueDashboard;
