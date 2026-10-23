'use client';

import React, { useMemo, useState } from 'react';

export interface CohortMetric {
  month: string;
  newMrr: number;
  expansionMrr: number;
  churnedMrr: number;
  activeCustomers: number;
  arpu: number;
}

const COHORTS: CohortMetric[] = [
  { month: '2026-05', newMrr: 14200, expansionMrr: 3100, churnedMrr: 950, activeCustomers: 118, arpu: 138 },
  { month: '2026-06', newMrr: 18400, expansionMrr: 4250, churnedMrr: 1100, activeCustomers: 152, arpu: 142 },
  { month: '2026-07', newMrr: 22900, expansionMrr: 5800, churnedMrr: 1250, activeCustomers: 194, arpu: 148 },
  { month: '2026-08', newMrr: 27500, expansionMrr: 6900, churnedMrr: 1400, activeCustomers: 241, arpu: 155 },
  { month: '2026-09', newMrr: 34200, expansionMrr: 8400, churnedMrr: 1320, activeCustomers: 298, arpu: 162 },
  { month: '2026-10', newMrr: 41800, expansionMrr: 10200, churnedMrr: 1480, activeCustomers: 365, arpu: 168 },
];

export function RevenueDashboard() {
  const [selectedRange, setSelectedRange] = useState<number>(6);

  const visibleCohorts = useMemo(() => COHORTS.slice(-selectedRange), [selectedRange]);

  const summary = useMemo(() => {
    const latest = visibleCohorts[visibleCohorts.length - 1] || COHORTS[COHORTS.length - 1];
    const netMrr = latest.newMrr + latest.expansionMrr - latest.churnedMrr;
    const arr = netMrr * 12;
    const grossRevenue = latest.newMrr + latest.expansionMrr;
    const churnRatePct = grossRevenue > 0 ? (latest.churnedMrr / grossRevenue) * 100 : 0;
    const monthlyChurnDecimal = Math.max(0.005, churnRatePct / 100);
    const ltv = latest.arpu / monthlyChurnDecimal;
    return {
      netMrr,
      arr,
      churnRatePct: churnRatePct.toFixed(2),
      ltv: Math.round(ltv),
      customers: latest.activeCustomers,
    };
  }, [visibleCohorts]);

  return (
    <section className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] py-12 px-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#2A2A2A] pb-6">
          <div>
            <span className="text-xs uppercase tracking-widest text-[#D4AF37] font-mono">Agent Midas • Financial Intelligence</span>
            <h1 className="text-3xl font-bold mt-1">Real-Time MRR, ARR, Churn & LTV Dashboard</h1>
            <p className="text-sm text-[#9CA3AF] mt-1">Executive SaaS revenue telemetry with expansion & contraction waterfall analysis.</p>
          </div>
          <div className="flex gap-2">
            {[3, 6].map(months => (
              <button
                key={months}
                type="button"
                onClick={() => setSelectedRange(months)}
                className={`px-4 py-2 rounded-lg text-xs font-mono border ${selectedRange === months ? 'bg-[#D4AF37] text-[#0A0A0A] border-[#D4AF37]' : 'bg-[#141414] text-[#9CA3AF] border-[#2A2A2A]'}`}
              >
                Last {months}M
              </button>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl p-5">
            <p className="text-xs text-[#9CA3AF] uppercase">Net MRR</p>
            <p className="text-2xl font-bold text-[#D4AF37] mt-2 font-mono">${summary.netMrr.toLocaleString()}</p>
          </div>
          <div className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl p-5">
            <p className="text-xs text-[#9CA3AF] uppercase">Annualized Run Rate (ARR)</p>
            <p className="text-2xl font-bold text-[#E8C547] mt-2 font-mono">${summary.arr.toLocaleString()}</p>
          </div>
          <div className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl p-5">
            <p className="text-xs text-[#9CA3AF] uppercase">Revenue Churn Rate</p>
            <p className="text-2xl font-bold text-[#F5F5F5] mt-2 font-mono">{summary.churnRatePct}%</p>
          </div>
          <div className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl p-5">
            <p className="text-xs text-[#9CA3AF] uppercase">Customer Lifetime Value (LTV)</p>
            <p className="text-2xl font-bold text-[#D4AF37] mt-2 font-mono">${summary.ltv.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Monthly Cohort Revenue Breakdown</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#2A2A2A] text-[#9CA3AF]">
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">New MRR</th>
                  <th className="py-3 px-4">Expansion MRR</th>
                  <th className="py-3 px-4">Churned MRR</th>
                  <th className="py-3 px-4">Net MRR</th>
                  <th className="py-3 px-4">Active Customers</th>
                </tr>
              </thead>
              <tbody>
                {visibleCohorts.map(c => {
                  const net = c.newMrr + c.expansionMrr - c.churnedMrr;
                  return (
                    <tr key={c.month} className="border-b border-[#2A2A2A] hover:bg-[#141414]">
                      <td className="py-3 px-4 font-mono">{c.month}</td>
                      <td className="py-3 px-4 font-mono text-[#F5F5F5]">+${c.newMrr.toLocaleString()}</td>
                      <td className="py-3 px-4 font-mono text-[#E8C547]">+${c.expansionMrr.toLocaleString()}</td>
                      <td className="py-3 px-4 font-mono text-[#9CA3AF]">-${c.churnedMrr.toLocaleString()}</td>
                      <td className="py-3 px-4 font-mono font-bold text-[#D4AF37]">${net.toLocaleString()}</td>
                      <td className="py-3 px-4 font-mono">{c.activeCustomers}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

export default RevenueDashboard;
