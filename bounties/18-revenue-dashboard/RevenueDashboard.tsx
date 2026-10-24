'use client';

import React, { useEffect, useMemo, useState } from 'react';

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
  storageKey?: string;
}

const DEFAULT_SNAPSHOTS: MonthlyRevenueSnapshot[] = [
  { month: '2026-06', startingMrr: 28000, newMrr: 14200, expansionMrr: 3100, churnedMrr: 1200, activeCustomers: 185 },
  { month: '2026-07', startingMrr: 44100, newMrr: 18900, expansionMrr: 4400, churnedMrr: 1450, activeCustomers: 230 },
  { month: '2026-08', startingMrr: 65950, newMrr: 24500, expansionMrr: 6200, churnedMrr: 1800, activeCustomers: 294 },
  { month: '2026-09', startingMrr: 94850, newMrr: 31200, expansionMrr: 8500, churnedMrr: 2100, activeCustomers: 368 },
  { month: '2026-10', startingMrr: 132450, newMrr: 39800, expansionMrr: 11400, churnedMrr: 2350, activeCustomers: 452 },
];

export function RevenueDashboard({
  initialSnapshots = DEFAULT_SNAPSHOTS,
  storageKey = 'agentmidas_revenue_snapshots_v1',
}: RevenueDashboardProps = {}) {
  const [snapshots, setSnapshots] = useState<MonthlyRevenueSnapshot[]>(initialSnapshots);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    initialSnapshots[initialSnapshots.length - 1]?.month ?? '2026-10'
  );
  const [newMonth, setNewMonth] = useState<string>('2026-11');
  const [newAddedMrr, setNewAddedMrr] = useState<string>('42000');
  const [newExpansion, setNewExpansion] = useState<string>('12500');
  const [newChurned, setNewChurned] = useState<string>('2500');
  const [newCustomers, setNewCustomers] = useState<string>('510');

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
  }, [storageKey]);

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

  const handleAddSnapshot = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newMonth.trim()) return;
    const last = snapshots[snapshots.length - 1];
    const lastEndingMrr = last ? last.startingMrr + last.newMrr + last.expansionMrr - last.churnedMrr : 100000;
    const created: MonthlyRevenueSnapshot = {
      month: newMonth.trim(),
      startingMrr: lastEndingMrr,
      newMrr: Math.max(0, Number(newAddedMrr) || 0),
      expansionMrr: Math.max(0, Number(newExpansion) || 0),
      churnedMrr: Math.max(0, Number(newChurned) || 0),
      activeCustomers: Math.max(1, Number(newCustomers) || 1),
    };
    const next = [...snapshots.filter(s => s.month !== created.month), created];
    setSnapshots(next);
    setSelectedMonth(created.month);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {}
  };

  return (
    <section aria-label="Revenue Dashboard" className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#262626] pb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#D4AF37]">Executive Revenue Dashboard</h1>
            <p className="text-sm text-[#A3A3A3]">Cumulative Ending MRR, Annualized Run-Rate (ARR), Starting-MRR Churn & Cohort LTV</p>
          </div>
          <div>
            <label htmlFor="rev-period-select" className="text-xs text-[#A3A3A3] mr-2">Reporting Period:</label>
            <select
              id="rev-period-select"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-[#0D0D0D] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#D4AF37]"
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
            <p className="text-xs text-[#22C55E] mt-1">Net New MRR: +${kpis.netNewMrr.toLocaleString()}</p>
          </div>
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-4">
            <p className="text-xs uppercase text-[#A3A3A3]">Annual Recurring Revenue (ARR)</p>
            <p className="text-2xl font-bold text-[#22C55E] mt-1">${kpis.arr.toLocaleString()}</p>
            <p className="text-xs text-[#A3A3A3] mt-1">Ending MRR × 12</p>
          </div>
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-4">
            <p className="text-xs uppercase text-[#A3A3A3]">Gross MRR Churn Rate</p>
            <p className="text-2xl font-bold text-[#F59E0B] mt-1">{kpis.grossChurnRatePct}%</p>
            <p className="text-xs text-[#A3A3A3] mt-1">${current.churnedMrr.toLocaleString()} / ${kpis.startingMrr.toLocaleString()} Starting MRR</p>
          </div>
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-4">
            <p className="text-xs uppercase text-[#A3A3A3]">Customer LTV (ARPU ${kpis.arpu})</p>
            <p className="text-2xl font-bold text-[#3B82F6] mt-1">${Number(kpis.ltv).toLocaleString()}</p>
          </div>
        </div>

        <form onSubmit={handleAddSnapshot} className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
          <div>
            <label htmlFor="rev-month" className="block text-xs text-[#A3A3A3] mb-1">Month (YYYY-MM)</label>
            <input id="rev-month" type="text" required value={newMonth} onChange={e => setNewMonth(e.target.value)} className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#F5F5F5]" />
          </div>
          <div>
            <label htmlFor="rev-new-mrr" className="block text-xs text-[#A3A3A3] mb-1">New MRR ($)</label>
            <input id="rev-new-mrr" type="number" value={newAddedMrr} onChange={e => setNewAddedMrr(e.target.value)} className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#F5F5F5]" />
          </div>
          <div>
            <label htmlFor="rev-expansion" className="block text-xs text-[#A3A3A3] mb-1">Expansion ($)</label>
            <input id="rev-expansion" type="number" value={newExpansion} onChange={e => setNewExpansion(e.target.value)} className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#F5F5F5]" />
          </div>
          <div>
            <label htmlFor="rev-churn" className="block text-xs text-[#A3A3A3] mb-1">Churned MRR ($)</label>
            <input id="rev-churn" type="number" value={newChurned} onChange={e => setNewChurned(e.target.value)} className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#F5F5F5]" />
          </div>
          <div>
            <label htmlFor="rev-cust" className="block text-xs text-[#A3A3A3] mb-1">Customers</label>
            <input id="rev-cust" type="number" value={newCustomers} onChange={e => setNewCustomers(e.target.value)} className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#F5F5F5]" />
          </div>
          <button type="submit" className="py-2 px-4 rounded-lg bg-[#D4AF37] text-[#0A0A0A] font-bold text-sm hover:bg-[#E8C547]">
            + Record Period
          </button>
        </form>

        <div className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-5 overflow-x-auto">
          <h2 className="text-lg font-semibold text-[#D4AF37] mb-3">Cohort Revenue Ledger</h2>
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#262626] text-[#A3A3A3]">
                <th className="py-2 pr-4">Month</th>
                <th className="py-2 pr-4">Starting MRR</th>
                <th className="py-2 pr-4">New MRR</th>
                <th className="py-2 pr-4">Expansion</th>
                <th className="py-2 pr-4">Churned</th>
                <th className="py-2 pr-4">Ending MRR</th>
                <th className="py-2">ARR</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map(s => {
                const ending = s.startingMrr + s.newMrr + s.expansionMrr - s.churnedMrr;
                return (
                  <tr key={s.month} className="border-b border-[#1A1A1A]">
                    <td className="py-3 pr-4 font-mono">{s.month}</td>
                    <td className="py-3 pr-4 font-mono">${s.startingMrr.toLocaleString()}</td>
                    <td className="py-3 pr-4 font-mono text-[#22C55E]">+${s.newMrr.toLocaleString()}</td>
                    <td className="py-3 pr-4 font-mono text-[#3B82F6]">+${s.expansionMrr.toLocaleString()}</td>
                    <td className="py-3 pr-4 font-mono text-[#EF4444]">-${s.churnedMrr.toLocaleString()}</td>
                    <td className="py-3 pr-4 font-mono font-bold text-[#D4AF37]">${ending.toLocaleString()}</td>
                    <td className="py-3 font-mono">${(ending * 12).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default RevenueDashboard;
