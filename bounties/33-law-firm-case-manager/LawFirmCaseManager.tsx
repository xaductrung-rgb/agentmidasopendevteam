'use client';

import React, { useEffect, useMemo, useState } from 'react';

export interface CaseDocument {
  id: string;
  title: string;
  category: 'Pleading' | 'Discovery' | 'Contract' | 'Exhibit';
  filedDate: string;
}

export interface LegalCase {
  id: string;
  docketNumber: string;
  matterTitle: string;
  practiceArea: 'Corporate M&A' | 'IP Litigation' | 'Real Estate' | 'Regulatory';
  leadCounsel: string;
  unbilledHours: number;
  invoicedHours: number;
  hourlyRate: number;
  status: 'Discovery' | 'Motion Pending' | 'Trial Prep' | 'Closed';
  documents: CaseDocument[];
}

const INITIAL_CASES: LegalCase[] = [
  {
    id: 'case-1',
    docketNumber: 'CV-2026-8841',
    matterTitle: 'Nakamoto Holdings v. Meridian Clearing',
    practiceArea: 'Corporate M&A',
    leadCounsel: 'V. Sterling, Esq.',
    unbilledHours: 42.5,
    invoicedHours: 80.0,
    hourlyRate: 650,
    status: 'Discovery',
    documents: [
      { id: 'doc-1', title: 'Initial Complaint & Demand for Arbitration.pdf', category: 'Pleading', filedDate: '2026-09-15' },
      { id: 'doc-2', title: 'First Set of Interrogatories.pdf', category: 'Discovery', filedDate: '2026-10-04' },
    ],
  },
  {
    id: 'case-2',
    docketNumber: 'IP-2026-3109',
    matterTitle: 'SupraSignal Patent Defense',
    practiceArea: 'IP Litigation',
    leadCounsel: 'A. Thorne, Esq.',
    unbilledHours: 68.0,
    invoicedHours: 45.0,
    hourlyRate: 725,
    status: 'Motion Pending',
    documents: [
      { id: 'doc-3', title: 'Markman Claim Construction Brief.pdf', category: 'Pleading', filedDate: '2026-10-12' },
    ],
  },
];

const STORAGE_KEY = 'agentmidas_law_cases_v1';

export function LawFirmCaseManager() {
  const [cases, setCases] = useState<LegalCase[]>(INITIAL_CASES);
  const [selectedCaseId, setSelectedCaseId] = useState<string>(INITIAL_CASES[0].id);
  const [newDocTitle, setNewDocTitle] = useState<string>('');
  const [newDocCategory, setNewDocCategory] = useState<CaseDocument['category']>('Discovery');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as LegalCase[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCases(parsed);
        }
      }
    } catch {}
  }, []);

  const persistCases = (next: LegalCase[]) => {
    setCases(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };

  const logBillableHour = (id: string) => {
    persistCases(cases.map(c => (c.id === id ? { ...c, unbilledHours: c.unbilledHours + 1 } : c)));
  };

  const invoiceUnbilledWip = (id: string) => {
    persistCases(
      cases.map(c =>
        c.id === id
          ? { ...c, invoicedHours: c.invoicedHours + c.unbilledHours, unbilledHours: 0 }
          : c
      )
    );
  };

  const handleAddFiling = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newDocTitle.trim()) return;
    const doc: CaseDocument = {
      id: `doc-${Date.now().toString().slice(-4)}`,
      title: newDocTitle.trim(),
      category: newDocCategory,
      filedDate: new Date().toISOString().slice(0, 10),
    };
    persistCases(
      cases.map(c => (c.id === selectedCaseId ? { ...c, documents: [doc, ...c.documents] } : c))
    );
    setNewDocTitle('');
  };

  const totals = useMemo(() => {
    const unbilledWip = cases.reduce((acc, c) => acc + c.unbilledHours * c.hourlyRate, 0);
    const invoicedTotal = cases.reduce((acc, c) => acc + c.invoicedHours * c.hourlyRate, 0);
    const totalDocs = cases.reduce((acc, c) => acc + c.documents.length, 0);
    return { unbilledWip, invoicedTotal, totalDocs };
  }, [cases]);

  const activeCase = useMemo(
    () => cases.find(c => c.id === selectedCaseId) ?? cases[0],
    [cases, selectedCaseId]
  );

  return (
    <section aria-label="Law Firm Case Manager" className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#262626] pb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#D4AF37]">Law Firm Case Manager</h1>
            <p className="text-sm text-[#A3A3A3]">Matter Docket Tracking, Evidence Vault & Unbilled vs. Invoiced Trust Ledger</p>
          </div>
          <div className="flex gap-6 mt-3 sm:mt-0">
            <div className="text-right">
              <p className="text-xs uppercase text-[#A3A3A3]">Unbilled WIP</p>
              <p className="text-xl font-bold text-[#D4AF37]">${totals.unbilledWip.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase text-[#A3A3A3]">Invoiced Fees</p>
              <p className="text-xl font-bold text-[#22C55E]">${totals.invoicedTotal.toLocaleString()}</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {cases.map(c => (
              <div
                key={c.id}
                onClick={() => setSelectedCaseId(c.id)}
                className={`bg-[#0D0D0D] border rounded-xl p-5 space-y-3 cursor-pointer ${
                  activeCase?.id === c.id ? 'border-[#D4AF37]' : 'border-[#262626]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#262626] text-[#D4AF37]">{c.docketNumber}</span>
                  <span className="text-xs text-[#22C55E]">{c.status}</span>
                </div>
                <h2 className="text-lg font-bold text-[#F5F5F5]">{c.matterTitle}</h2>
                <p className="text-xs text-[#A3A3A3]">{c.practiceArea} • Lead: {c.leadCounsel} • {c.documents.length} Indexed Filings</p>
                <div className="pt-3 border-t border-[#262626] flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-[#A3A3A3]">
                      Unbilled: {c.unbilledHours}h (${(c.unbilledHours * c.hourlyRate).toLocaleString()}) • Invoiced: {c.invoicedHours}h (${(c.invoicedHours * c.hourlyRate).toLocaleString()})
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        logBillableHour(c.id);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#D4AF37] text-[#0A0A0A] font-semibold text-xs hover:bg-[#E8C547]"
                    >
                      +1.0h Unbilled
                    </button>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        invoiceUnbilledWip(c.id);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#1F1F1F] border border-[#22C55E]/40 text-[#22C55E] font-semibold text-xs"
                    >
                      Mark WIP Invoiced
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <aside className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-5 space-y-4">
            <h2 className="text-lg font-semibold text-[#D4AF37]">
              Evidence Vault: {activeCase?.docketNumber}
            </h2>
            <ul className="space-y-2 text-xs">
              {activeCase?.documents.map(doc => (
                <li key={doc.id} className="p-2.5 rounded bg-[#141414] border border-[#262626] flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-[#F5F5F5]">{doc.title}</p>
                    <p className="text-[#A3A3A3]">{doc.category} • Filed {doc.filedDate}</p>
                  </div>
                </li>
              ))}
            </ul>
            <form onSubmit={handleAddFiling} className="space-y-3 border-t border-[#262626] pt-4">
              <h3 className="text-sm font-semibold">Index New Filing Document</h3>
              <div>
                <label htmlFor="law-doc-title" className="block text-xs text-[#A3A3A3] mb-1">Document Filename / Title</label>
                <input
                  id="law-doc-title"
                  type="text"
                  required
                  value={newDocTitle}
                  onChange={e => setNewDocTitle(e.target.value)}
                  placeholder="e.g. Summary Judgment Motion.pdf"
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#F5F5F5]"
                />
              </div>
              <div>
                <label htmlFor="law-doc-cat" className="block text-xs text-[#A3A3A3] mb-1">Filing Category</label>
                <select
                  id="law-doc-cat"
                  value={newDocCategory}
                  onChange={e => setNewDocCategory(e.target.value as CaseDocument['category'])}
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#F5F5F5]"
                >
                  <option value="Pleading">Pleading</option>
                  <option value="Discovery">Discovery</option>
                  <option value="Contract">Contract</option>
                  <option value="Exhibit">Exhibit</option>
                </select>
              </div>
              <button type="submit" className="w-full py-2 rounded-lg bg-[#D4AF37] text-[#0A0A0A] font-bold text-xs">
                + Upload to Matter Vault
              </button>
            </form>
          </aside>
        </div>
      </div>
    </section>
  );
}

export default LawFirmCaseManager;
