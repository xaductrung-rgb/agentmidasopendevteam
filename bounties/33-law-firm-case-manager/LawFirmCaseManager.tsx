'use client';

import React, { useMemo, useState } from 'react';

export interface LegalCaseItem {
  id: string;
  docketNumber: string;
  title: string;
  clientName: string;
  practiceArea: 'Corporate M&A' | 'IP Litigation' | 'Real Estate' | 'Employment';
  billableHours: number;
  hourlyRate: number;
  status: 'Discovery' | 'In Trial' | 'Settlement' | 'Closed';
  documentsCount: number;
}

const INITIAL_CASES: LegalCaseItem[] = [
  { id: 'case-1', docketNumber: 'CV-2026-0914', title: 'Helios Biotech IP Patent Defense', clientName: 'Helios Bio Corp', practiceArea: 'IP Litigation', billableHours: 42.5, hourlyRate: 450, status: 'Discovery', documentsCount: 18 },
  { id: 'case-2', docketNumber: 'MA-2026-0442', title: 'Series B Acquisition & Escrow Structuring', clientName: 'Aether Cloud Inc', practiceArea: 'Corporate M&A', billableHours: 64.0, hourlyRate: 520, status: 'Settlement', documentsCount: 31 },
  { id: 'case-3', docketNumber: 'RE-2026-0119', title: 'Harborview Commercial Lease Arbitration', clientName: 'Meridian Holdings', practiceArea: 'Real Estate', billableHours: 19.5, hourlyRate: 380, status: 'In Trial', documentsCount: 12 },
];

export function LawFirmCaseManager() {
  const [cases, setCases] = useState<LegalCaseItem[]>(INITIAL_CASES);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filtered = useMemo(() => {
    return cases.filter(c => statusFilter === 'ALL' || c.status === statusFilter);
  }, [cases, statusFilter]);

  const totals = useMemo(() => {
    const totalHours = cases.reduce((s, c) => s + c.billableHours, 0);
    const totalUnbilledUsd = cases.reduce((s, c) => s + c.billableHours * c.hourlyRate, 0);
    return { totalHours, totalUnbilledUsd };
  }, [cases]);

  function logBillableHour(id: string) {
    setCases(prev => prev.map(c => c.id === id ? { ...c, billableHours: c.billableHours + 1 } : c));
  }

  return (
    <section className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] py-12 px-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#2A2A2A] pb-6">
          <div>
            <span className="text-xs uppercase tracking-widest text-[#D4AF37] font-mono">Agent Midas • Legal Practice OS</span>
            <h1 className="text-3xl font-bold mt-1">Law Firm Matter, Docket & Time Billing Manager</h1>
            <p className="text-sm text-[#9CA3AF] mt-1">Track active litigation dockets, evidence vaults, and real-time billable trust balances.</p>
          </div>
          <div className="bg-[#141414] border border-[#D4AF37] rounded-xl px-4 py-2.5 font-mono text-sm text-[#E8C547]">
            Unbilled WIP: ${totals.totalUnbilledUsd.toLocaleString()} ({totals.totalHours} hrs)
          </div>
        </header>

        <div className="flex gap-2 flex-wrap">
          {['ALL', 'Discovery', 'In Trial', 'Settlement', 'Closed'].map(st => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-4 py-2 rounded-lg text-xs font-medium border ${statusFilter === st ? 'bg-[#D4AF37] text-[#0A0A0A] border-[#D4AF37]' : 'bg-[#141414] text-[#9CA3AF] border-[#2A2A2A]'}`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filtered.map(matter => (
            <div key={matter.id} className="bg-[#0D0D0D] border border-[#2A2A2A] hover:border-[#D4AF37] rounded-xl p-6 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs font-mono text-[#D4AF37]">
                  <span>{matter.docketNumber}</span>
                  <span>{matter.status}</span>
                </div>
                <h2 className="text-lg font-bold mt-2">{matter.title}</h2>
                <p className="text-xs text-[#9CA3AF] mt-1">Client: {matter.clientName} • {matter.practiceArea}</p>
                <div className="mt-4 pt-4 border-t border-[#2A2A2A] space-y-1 text-xs font-mono">
                  <p>Billable Logged: <span className="text-[#E8C547]">{matter.billableHours} hrs @ ${matter.hourlyRate}/hr</span></p>
                  <p>Matter Value: <span className="text-[#D4AF37] font-bold">${(matter.billableHours * matter.hourlyRate).toLocaleString()}</span></p>
                  <p>Indexed Filings: {matter.documentsCount} PDFs</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => logBillableHour(matter.id)}
                className="w-full py-2 rounded-lg bg-[#141414] border border-[#D4AF37] text-[#E8C547] text-xs font-mono hover:bg-[#D4AF37] hover:text-[#0A0A0A]"
              >
                + Log 1.0 Billable Hour (+${matter.hourlyRate})
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default LawFirmCaseManager;
