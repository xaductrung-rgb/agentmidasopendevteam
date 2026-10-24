'use client';
import React, { useState, useRef, useMemo } from 'react';

export type DealStage = 'Lead' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Closed Won' | 'Closed Lost';

export interface PipelineDeal {
  id: string;
  companyName: string;
  contactName: string;
  valueUsd: number;
  probabilityPct: number;
  stage: DealStage;
  updatedAtUtc: string;
}

export interface DealPipelineBoardProps {
  storageKey?: string;
  initialDeals?: PipelineDeal[];
  onChange?: (deals: PipelineDeal[]) => void | Promise<void>;
}

const STAGES: DealStage[] = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];

const STAGE_PROBABILITY: Record<DealStage, number> = {
  'Lead': 15,
  'Qualified': 35,
  'Proposal': 60,
  'Negotiation': 80,
  'Closed Won': 100,
  'Closed Lost': 0
};

const DEFAULT_DEALS: PipelineDeal[] = [
  {
    id: 'deal-101',
    companyName: 'Apex Quantum Holdings',
    contactName: 'Elena Vance',
    valueUsd: 24000,
    probabilityPct: 60,
    stage: 'Proposal',
    updatedAtUtc: '2026-10-24T01:00:00Z'
  },
  {
    id: 'deal-102',
    companyName: 'Vanguard FinTech Corp',
    contactName: 'Marcus Sterling',
    valueUsd: 48000,
    probabilityPct: 80,
    stage: 'Negotiation',
    updatedAtUtc: '2026-10-24T01:30:00Z'
  },
  {
    id: 'deal-103',
    companyName: 'Helios Cloud Systems',
    contactName: 'Sora Takahashi',
    valueUsd: 18500,
    probabilityPct: 100,
    stage: 'Closed Won',
    updatedAtUtc: '2026-10-24T02:00:00Z'
  }
];

function isValidDeal(item: unknown): item is PipelineDeal {
  if (!item || typeof item !== 'object') return false;
  const d = item as Record<string, unknown>;
  return (
    typeof d.id === 'string' &&
    typeof d.companyName === 'string' &&
    typeof d.contactName === 'string' &&
    typeof d.valueUsd === 'number' &&
    Number.isFinite(d.valueUsd) &&
    d.valueUsd >= 0 &&
    typeof d.probabilityPct === 'number' &&
    STAGES.includes(d.stage as DealStage)
  );
}

export const DealPipelineBoard: React.FC<DealPipelineBoardProps> = ({
  storageKey = 'agentmidas_deal_pipeline_v1',
  initialDeals = DEFAULT_DEALS,
  onChange
}) => {
  const [deals, setDeals] = useState<PipelineDeal[]>(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.every(isValidDeal)) {
          return parsed;
        }
      }
    } catch {}
    return initialDeals;
  });

  const dealsRef = useRef<PipelineDeal[]>(deals);
  dealsRef.current = deals;
  const saveLockRef = useRef(false);

  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [valueInput, setValueInput] = useState('15000');
  const [stageInput, setStageInput] = useState<DealStage>('Lead');
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<DealStage | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [notice, setNotice] = useState('');

  const persistDeals = async (next: PipelineDeal[], successMsg: string): Promise<boolean> => {
    if (saveLockRef.current) return false;
    saveLockRef.current = true;
    setIsSaving(true);
    const prev = dealsRef.current;
    dealsRef.current = next;
    setDeals(next);
    setErrorMsg('');
    try {
      if (onChange) {
        await onChange(next);
      }
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      }
      setNotice(successMsg);
      return true;
    } catch {
      dealsRef.current = prev;
      setDeals(prev);
      setErrorMsg('Failed to persist deal pipeline changes; rolled back.');
      return false;
    } finally {
      saveLockRef.current = false;
      setIsSaving(false);
    }
  };

  const handleAddDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saveLockRef.current) return;
    const trimmedCompany = companyName.trim();
    const trimmedContact = contactName.trim();
    const rawValue = valueInput.trim();
    const numericVal = Number(rawValue);
    if (!trimmedCompany || !trimmedContact || !rawValue || !Number.isFinite(numericVal) || numericVal <= 0 || numericVal > 1_000_000_000) {
      setErrorMsg('Please enter a valid company name, contact name, and positive deal value.');
      return;
    }
    const created: PipelineDeal = {
      id: `deal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      companyName: trimmedCompany,
      contactName: trimmedContact,
      valueUsd: Math.round(numericVal),
      probabilityPct: STAGE_PROBABILITY[stageInput],
      stage: stageInput,
      updatedAtUtc: new Date().toISOString()
    };
    const ok = await persistDeals([created, ...dealsRef.current], `Added deal "${created.companyName}" to ${created.stage}.`);
    if (ok) {
      setCompanyName('');
      setContactName('');
      setValueInput('15000');
    }
  };

  const moveDealStage = async (id: string, nextStage: DealStage) => {
    if (saveLockRef.current) return;
    const target = dealsRef.current.find(d => d.id === id);
    if (!target || target.stage === nextStage) return;
    const next = dealsRef.current.map(d =>
      d.id === id
        ? {
            ...d,
            stage: nextStage,
            probabilityPct: STAGE_PROBABILITY[nextStage],
            updatedAtUtc: new Date().toISOString()
          }
        : d
    );
    await persistDeals(next, `Moved "${target.companyName}" to ${nextStage}.`);
  };

  const deleteDeal = async (id: string) => {
    if (saveLockRef.current) return;
    const next = dealsRef.current.filter(d => d.id !== id);
    await persistDeals(next, 'Removed deal from pipeline.');
  };

  const filteredDeals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return deals;
    return deals.filter(
      d => d.companyName.toLowerCase().includes(q) || d.contactName.toLowerCase().includes(q)
    );
  }, [deals, searchQuery]);

  const metrics = useMemo(() => {
    const totalPipelineUsd = deals
      .filter(d => d.stage !== 'Closed Lost')
      .reduce((s, d) => s + d.valueUsd, 0);
    const weightedForecastUsd = deals.reduce(
      (s, d) => s + Math.round(d.valueUsd * (d.probabilityPct / 100)),
      0
    );
    const closedWonUsd = deals
      .filter(d => d.stage === 'Closed Won')
      .reduce((s, d) => s + d.valueUsd, 0);
    return { totalPipelineUsd, weightedForecastUsd, closedWonUsd };
  }, [deals]);

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="border-b border-zinc-800 pb-4 flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#D4AF37]">CRM Deal Pipeline Board</h1>
            <p className="text-sm text-zinc-400">Drag-and-drop Kanban stage progression & probability-weighted revenue forecasting</p>
          </div>
          <div className="flex gap-3 text-xs">
            <div className="bg-zinc-900 border border-zinc-800 px-3 py-2 rounded">
              <div className="text-zinc-400">Active Pipeline</div>
              <div className="text-base font-bold text-white">${metrics.totalPipelineUsd.toLocaleString()}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 px-3 py-2 rounded">
              <div className="text-zinc-400">Weighted Forecast</div>
              <div className="text-base font-bold text-[#D4AF37]">${metrics.weightedForecastUsd.toLocaleString()}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 px-3 py-2 rounded">
              <div className="text-zinc-400">Closed Won</div>
              <div className="text-base font-bold text-emerald-400">${metrics.closedWonUsd.toLocaleString()}</div>
            </div>
          </div>
        </header>

        {notice && <div role="status" className="bg-emerald-950/60 border border-emerald-700 text-emerald-200 px-4 py-2 rounded text-sm">{notice}</div>}
        {errorMsg && <div role="alert" className="bg-red-950/60 border border-red-700 text-red-200 px-4 py-2 rounded text-sm">{errorMsg}</div>}

        <form onSubmit={handleAddDeal} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-6 gap-3">
          <input aria-label="Company Name" value={companyName} onChange={e => setCompanyName(e.target.value)} disabled={isSaving} placeholder="Company Name" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
          <input aria-label="Contact Name" value={contactName} onChange={e => setContactName(e.target.value)} disabled={isSaving} placeholder="Primary Contact" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
          <input aria-label="Deal Value USD" type="number" min={1} value={valueInput} onChange={e => setValueInput(e.target.value)} disabled={isSaving} placeholder="Value ($)" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
          <select aria-label="Initial Deal Stage" value={stageInput} onChange={e => setStageInput(e.target.value as DealStage)} disabled={isSaving} className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white">
            {STAGES.map(st => <option key={st} value={st}>{st} ({STAGE_PROBABILITY[st]}%)</option>)}
          </select>
          <input aria-label="Search Deals" type="search" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search company/contact..." className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
          <button type="submit" disabled={isSaving} className="bg-[#D4AF37] text-black font-bold text-xs rounded px-4 py-2 disabled:opacity-50">
            + Add Deal
          </button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {STAGES.map(stage => {
            const stageDeals = filteredDeals.filter(d => d.stage === stage);
            const stageSum = stageDeals.reduce((s, d) => s + d.valueUsd, 0);
            const isDropTarget = dragOverStage === stage;
            return (
              <div
                key={stage}
                onDragOver={e => {
                  e.preventDefault();
                  if (dragOverStage !== stage) setDragOverStage(stage);
                }}
                onDragLeave={() => {
                  if (dragOverStage === stage) setDragOverStage(null);
                }}
                onDrop={e => {
                  e.preventDefault();
                  setDragOverStage(null);
                  const id = e.dataTransfer?.getData('text/plain') || draggedDealId;
                  setDraggedDealId(null);
                  if (id) void moveDealStage(id, stage);
                }}
                className={`bg-zinc-900 border rounded-xl p-3 space-y-3 min-h-[240px] transition ${
                  isDropTarget ? 'border-[#D4AF37] bg-zinc-900/80' : 'border-zinc-800'
                }`}
              >
                <div className="border-b border-zinc-800 pb-2">
                  <div className="text-xs font-bold text-[#D4AF37] uppercase">{stage}</div>
                  <div className="text-xs text-zinc-400">{stageDeals.length} deals · ${stageSum.toLocaleString()}</div>
                </div>
                <div className="space-y-2">
                  {stageDeals.map(deal => (
                    <div
                      key={deal.id}
                      draggable={!isSaving}
                      onDragStart={e => {
                        setDraggedDealId(deal.id);
                        try {
                          e.dataTransfer.setData('text/plain', deal.id);
                        } catch {}
                      }}
                      onDragEnd={() => {
                        setDraggedDealId(null);
                        setDragOverStage(null);
                      }}
                      className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 space-y-2 cursor-grab active:cursor-grabbing"
                    >
                      <div className="font-bold text-xs text-white">{deal.companyName}</div>
                      <div className="text-xs text-zinc-400">{deal.contactName}</div>
                      <div className="text-xs font-mono text-[#D4AF37]">${deal.valueUsd.toLocaleString()} ({deal.probabilityPct}%)</div>
                      <select
                        aria-label={`Move stage for ${deal.companyName}`}
                        value={deal.stage}
                        disabled={isSaving}
                        onChange={e => void moveDealStage(deal.id, e.target.value as DealStage)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-white"
                      >
                        {STAGES.map(st => <option key={st} value={st}>{st}</option>)}
                      </select>
                      <button
                        type="button"
                        aria-label={`Delete deal ${deal.companyName}`}
                        disabled={isSaving}
                        onClick={() => void deleteDeal(deal.id)}
                        className="text-xs text-red-400 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DealPipelineBoard;
