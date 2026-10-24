'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

export interface MonthlyRevenueSnapshot {
  month: string;
  startingMrr: number;
  newMrr: number;
  expansionMrr: number;
  churnedMrr: number;
  activeCustomers: number;
}

export interface RevenueDashboardProps {
  initialSnapshots?: MonthlyRevenueSnapshot[];
  endpointUrl?: string;
  pollIntervalMs?: number;
  onFetchSnapshots?: () => Promise<MonthlyRevenueSnapshot[]>;
  storageKey?: string;
}

const DEFAULT_SNAPSHOTS: MonthlyRevenueSnapshot[] = [
  { month: '2026-07', startingMrr: 44100, newMrr: 18900, expansionMrr: 4400, churnedMrr: 1450, activeCustomers: 230 },
  { month: '2026-08', startingMrr: 65950, newMrr: 24500, expansionMrr: 6200, churnedMrr: 1800, activeCustomers: 294 },
  { month: '2026-09', startingMrr: 94850, newMrr: 31200, expansionMrr: 8500, churnedMrr: 2100, activeCustomers: 368 },
  { month: '2026-10', startingMrr: 132450, newMrr: 39800, expansionMrr: 11400, churnedMrr: 2350, activeCustomers: 452 },
];

export function RevenueDashboard({
  initialSnapshots = DEFAULT_SNAPSHOTS,
  endpointUrl = '/api/revenue/snapshots',
  pollIntervalMs = 30000,
  onFetchSnapshots,
  storageKey = 'agentmidas_revenue_snapshots_v2',
}: RevenueDashboardProps = {}) {
  const [snapshots, setSnapshots] = useState<MonthlyRevenueSnapshot[]>(initialSnapshots);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    initialSnapshots[initialSnapshots.length - 1]?.month ?? '2026-10'
  );
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('Live feed ready');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const syncFromLiveSource = useCallback(async () => {
    setIsSyncing(true);
    try {
      if (onFetchSnapshots) {
        const remote = await onFetchSnapshots();
        if (Array.isArray(remote) && remote.length > 0) {
          setSnapshots(remote);
          setSelectedMonth(remote[remote.length - 1].month);
          window.localStorage.setItem(storageKey, JSON.stringify(remote));
          setLastSyncedAt(new Date().toLocaleTimeString());
          setIsSyncing(false);
          return;
        }
      }
      if (endpointUrl) {
        const res = await fetch(endpointUrl, { headers: { Accept: 'application/json' } });
        if (res.ok) {
          const data = (await res.json()) as MonthlyRevenueSnapshot[];
          if (Array.isArray(data) && data.length > 0) {
            setSnapshots(data);
            setSelectedMonth(data[data.length - 1].month);
            window.localStorage.setItem(storageKey, JSON.stringify(data));
          }
        }
      }
      setLastSyncedAt(new Date().toLocaleTimeString());
    } catch {
      setLastSyncedAt(`Offline cache (${new Date().toLocaleTimeString()})`);
    } finally {
      setIsSyncing(false);
    }
  }, [endpointUrl, onFetchSnapshots, storageKey]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as MonthlyRevenueSnapshot[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSnapshots(parsed);
          setSelectedMonth(parsed[parsed.length - 1].month);
        }
      }
    } catch {}
    void syncFromLiveSource();
    if (pollIntervalMs > 0) {
      const timer = window.setInterval(() => {
        void syncFromLiveSource();
      }, pollIntervalMs);
      return () => window.clearInterval(timer);
    }
    return undefined;
  }, [pollIntervalMs, storageKey, syncFromLiveSource]);

  const current = useMemo(
    () => snapshots.find(s => s.month === selectedMonth) ?? snapshots[snapshots.length - 1],
    [snapshots, selectedMonth]
  );

  const kpis = useMemo(() => {
    const netNewMrr = current.newMrr + current.expansionMrr - current.churnedMrr;
    const endingMrr = current.startingMrr + netNewMrr;
    const arr = endingMrr * 12;
    const grossChurnRateDecimal = current.startingMrr > 0 ? current.churnedMrr / current.startingMrr : 0;
    const grossChurnRatePct = grossChurnRateDecimal * 100;
    const arpu = current.activeCustomers > 0 ? endingMrr / current.activeCustomers : 0;
    const ltv = grossChurnRateDecimal > 0 ? arpu / grossChurnRateDecimal : arpu * 24;

    return {
      startingMrr: current.startingMrr,
      netNewMrr,
      endingMrr,
      arr,
      grossChurnRatePct: grossChurnRatePct.toFixed(2),
      arpu: arpu.toFixed(2),
      ltv: ltv.toFixed(0),
    };
  }, [current]);

  return (
    <section aria-label="Revenue Dashboard" className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#262626] pb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#D4AF37]">Executive Revenue Dashboard</h1>
            <p className="text-sm text-[#A3A3A3]">Live-Polled MRR, ARR, Starting-MRR Churn & Customer LTV ({lastSyncedAt})</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void syncFromLiveSource()}
              disabled={isSyncing}
              className="px-3 py-2 rounded-lg bg-[#D4AF37] text-[#0A0A0A] font-bold text-xs hover:bg-[#E8C547]"
            >
              {isSyncing ? 'Syncing...' : 'Refresh Live Feed'}
            </button>
            <label htmlFor="rev-period-select" className="sr-only">Reporting Period</label>
            <select
              id="rev-period-select"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-[#0D0D0D] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#F5F5F5]"
            >
              {snapshots.map(s => (
                <option key={s.month} value={s.month}>{s.month}</option>
              ))}
            </select>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-4">
            <p className="text-xs uppercase text-[#A3A3A3]">Ending MRR ({current.month})</p>
            <p className="text-2xl font-bold text-[#D4AF37] mt-1">${kpis.endingMrr.toLocaleString()}</p>
            <p className="text-xs text-[#22C55E] mt-1">Net New: +${kpis.netNewMrr.toLocaleString()}</p>
          </div>
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-4">
            <p className="text-xs uppercase text-[#A3A3A3]">Annual Recurring Revenue (ARR)</p>
            <p className="text-2xl font-bold text-[#22C55E] mt-1">${kpis.arr.toLocaleString()}</p>
          </div>
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-4">
            <p className="text-xs uppercase text-[#A3A3A3]">Gross MRR Churn Rate</p>
            <p className="text-2xl font-bold text-[#F59E0B] mt-1">{kpis.grossChurnRatePct}%</p>
          </div>
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-4">
            <p className="text-xs uppercase text-[#A3A3A3]">Customer LTV (ARPU ${kpis.arpu})</p>
            <p className="text-2xl font-bold text-[#3B82F6] mt-1">${Number(kpis.ltv).toLocaleString()}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default RevenueDashboard;
