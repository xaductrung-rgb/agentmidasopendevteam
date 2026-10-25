'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';

export interface CommissionScenario {
  id: string;
  label: string;
  planPriceUsd: number;
  commissionRatePct: number;
  directReferralsPerMonth: number;
  avgTeamReferralsEach: number;
  retentionRatePct: number;
}

export interface CommissionCalculatorWidgetProps {
  storageKey?: string;
  initialScenarios?: CommissionScenario[];
  onChange?: (scenarios: CommissionScenario[]) => void | Promise<void>;
}

const DEFAULT_SCENARIOS: CommissionScenario[] = [
  {
    id: 'sc-starter',
    label: 'Creator Part-Time ($79 Pro Plan)',
    planPriceUsd: 79,
    commissionRatePct: 75,
    directReferralsPerMonth: 6,
    avgTeamReferralsEach: 2,
    retentionRatePct: 90
  },
  {
    id: 'sc-agency',
    label: 'Agency Builder ($199 Business Plan)',
    planPriceUsd: 199,
    commissionRatePct: 75,
    directReferralsPerMonth: 12,
    avgTeamReferralsEach: 4,
    retentionRatePct: 92
  }
];

function isValidScenario(item: unknown): item is CommissionScenario {
  if (!item || typeof item !== 'object') return false;
  const s = item as Record<string, unknown>;
  return (
    typeof s.id === 'string' &&
    typeof s.label === 'string' &&
    typeof s.planPriceUsd === 'number' &&
    Number.isFinite(s.planPriceUsd) &&
    s.planPriceUsd > 0 &&
    typeof s.commissionRatePct === 'number' &&
    s.commissionRatePct > 0 &&
    s.commissionRatePct <= 100 &&
    typeof s.directReferralsPerMonth === 'number' &&
    s.directReferralsPerMonth >= 0 &&
    typeof s.avgTeamReferralsEach === 'number' &&
    s.avgTeamReferralsEach >= 0 &&
    typeof s.retentionRatePct === 'number' &&
    s.retentionRatePct > 0 &&
    s.retentionRatePct <= 100
  );
}

export const CommissionCalculatorWidget: React.FC<CommissionCalculatorWidgetProps> = ({
  storageKey = 'agentmidas_commission_calc_v1',
  initialScenarios = DEFAULT_SCENARIOS,
  onChange
}) => {
  const [scenarios, setScenarios] = useState<CommissionScenario[]>(initialScenarios);
  const scenariosRef = useRef<CommissionScenario[]>(scenarios);
  scenariosRef.current = scenarios;
  const saveLockRef = useRef(false);

  const [labelInput, setLabelInput] = useState('Custom Growth Plan');
  const [planPriceUsd, setPlanPriceUsd] = useState<number>(199);
  const [commissionRatePct, setCommissionRatePct] = useState<number>(75);
  const [directReferrals, setDirectReferrals] = useState<number>(8);
  const [avgTeamSales, setAvgTeamSales] = useState<number>(3);
  const [retentionRatePct, setRetentionRatePct] = useState<number>(90);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.every(isValidScenario)) {
          scenariosRef.current = parsed;
          setScenarios(parsed);
          return;
        }
      }
    } catch {}
    scenariosRef.current = initialScenarios;
    setScenarios(initialScenarios);
  }, [storageKey, initialScenarios]);

  const estimate = useMemo(() => {
    const unitCommission = planPriceUsd * (commissionRatePct / 100);
    // In Two-Up: sales #2 and #4 are passed up to sponsor
    const passedUpToSponsor = (directReferrals >= 2 ? 1 : 0) + (directReferrals >= 4 ? 1 : 0);
    const retainedDirectCount = Math.max(0, directReferrals - passedUpToSponsor);
    // Each retained direct affiliate passes up their #2 and #4 sale to you
    const passUpsPerRecruit = (avgTeamSales >= 2 ? 1 : 0) + (avgTeamSales >= 4 ? 1 : 0);
    const receivedPassUpCount = retainedDirectCount * passUpsPerRecruit;
    const totalActiveMonth1 = retainedDirectCount + receivedPassUpCount;
    const monthlyCommissionMonth1 = totalActiveMonth1 * unitCommission;

    // 12-month compounding recurring projection with monthly cohorts & retention
    const retention = retentionRatePct / 100;
    let activeSubsMonth12 = 0;
    let cumulativeAnnualUsd = 0;
    for (let m = 1; m <= 12; m++) {
      activeSubsMonth12 = activeSubsMonth12 * retention + totalActiveMonth1;
      cumulativeAnnualUsd += activeSubsMonth12 * unitCommission;
    }

    return {
      unitCommission,
      passedUpToSponsor,
      retainedDirectCount,
      receivedPassUpCount,
      monthlyCommissionMonth1: Math.round(monthlyCommissionMonth1),
      month12RecurringUsd: Math.round(activeSubsMonth12 * unitCommission),
      cumulativeAnnualUsd: Math.round(cumulativeAnnualUsd)
    };
  }, [planPriceUsd, commissionRatePct, directReferrals, avgTeamSales, retentionRatePct]);

  const handleSavePreset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saveLockRef.current) return;
    const trimmed = labelInput.trim();
    if (!trimmed || planPriceUsd <= 0 || commissionRatePct <= 0 || commissionRatePct > 100) {
      setNotice('');
      setErrorMsg('Enter a valid scenario name, positive plan price, and commission rate (1-100%).');
      return;
    }
    saveLockRef.current = true;
    setIsSaving(true);
    const prev = scenariosRef.current;
    const created: CommissionScenario = {
      id: `sc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      label: trimmed,
      planPriceUsd,
      commissionRatePct,
      directReferralsPerMonth: directReferrals,
      avgTeamReferralsEach: avgTeamSales,
      retentionRatePct
    };
    const next = [created, ...prev];
    scenariosRef.current = next;
    setScenarios(next);
    setErrorMsg('');
    try {
      if (onChange) {
        await onChange(next.map(s => ({ ...s })));
      }
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(storageKey, JSON.stringify(next));
        }
      } catch {}
      setNotice(`Saved scenario "${created.label}".`);
    } catch {
      scenariosRef.current = prev;
      setScenarios(prev);
      setNotice('');
      setErrorMsg('Failed to save commission preset; rolled back.');
    } finally {
      saveLockRef.current = false;
      setIsSaving(false);
    }
  };

  const applyPreset = (sc: CommissionScenario) => {
    setLabelInput(sc.label);
    setPlanPriceUsd(sc.planPriceUsd);
    setCommissionRatePct(sc.commissionRatePct);
    setDirectReferrals(sc.directReferralsPerMonth);
    setAvgTeamSales(sc.avgTeamReferralsEach);
    setRetentionRatePct(sc.retentionRatePct);
    setNotice(`Loaded preset "${sc.label}".`);
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 p-6 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="border-b border-zinc-800 pb-4">
          <h1 className="text-2xl font-bold text-[#D4AF37]">Affiliate Two-Up Commission Calculator</h1>
          <p className="text-sm text-zinc-400">Interactive recurring revenue & Two-Up pass-up estimator for affiliate recruitment</p>
        </header>

        {notice && <div role="status" className="bg-emerald-950/60 border border-emerald-700 text-emerald-200 px-4 py-2 rounded text-sm">{notice}</div>}
        {errorMsg && <div role="alert" className="bg-red-950/60 border border-red-700 text-red-200 px-4 py-2 rounded text-sm">{errorMsg}</div>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-xs text-zinc-400">Month 1 Net Commission</div>
            <div className="text-2xl font-bold text-white">${estimate.monthlyCommissionMonth1.toLocaleString()}/mo</div>
            <div className="text-[11px] text-zinc-400 mt-1">
              {estimate.retainedDirectCount} Retained Direct + {estimate.receivedPassUpCount} Team Pass-Ups ({estimate.passedUpToSponsor} passed to sponsor)
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-xs text-zinc-400">Month 12 Recurring Run-Rate</div>
            <div className="text-2xl font-bold text-[#D4AF37]">${estimate.month12RecurringUsd.toLocaleString()}/mo</div>
            <div className="text-[11px] text-zinc-400 mt-1">Compounded at {retentionRatePct}% monthly retention</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-xs text-zinc-400">Estimated Year-1 Total Earnings</div>
            <div className="text-2xl font-bold text-emerald-400">${estimate.cumulativeAnnualUsd.toLocaleString()}</div>
            <div className="text-[11px] text-zinc-400 mt-1">${estimate.unitCommission.toFixed(2)} commission per active seat</div>
          </div>
        </div>

        <form onSubmit={handleSavePreset} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <label className="space-y-1">
              <span className="text-zinc-400">Subscription Tier Price (${planPriceUsd}/mo)</span>
              <input aria-label="Subscription Plan Price USD" type="number" min={1} max={5000} value={planPriceUsd} onChange={e => setPlanPriceUsd(Math.max(1, Number(e.target.value) || 1))} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white" />
            </label>
            <label className="space-y-1">
              <span className="text-zinc-400">Commission Rate ({commissionRatePct}%)</span>
              <input aria-label="Commission Rate Percentage" type="range" min={10} max={90} value={commissionRatePct} onChange={e => setCommissionRatePct(Number(e.target.value))} className="w-full" />
            </label>
            <label className="space-y-1">
              <span className="text-zinc-400">Direct Referrals / Month ({directReferrals})</span>
              <input aria-label="Direct Referrals Per Month" type="range" min={0} max={50} value={directReferrals} onChange={e => setDirectReferrals(Number(e.target.value))} className="w-full" />
            </label>
            <label className="space-y-1">
              <span className="text-zinc-400">Avg Sales Per Direct Recruit ({avgTeamSales})</span>
              <input aria-label="Average Sales Per Direct Recruit" type="range" min={0} max={10} value={avgTeamSales} onChange={e => setAvgTeamSales(Number(e.target.value))} className="w-full" />
            </label>
            <label className="space-y-1">
              <span className="text-zinc-400">Monthly Subscriber Retention ({retentionRatePct}%)</span>
              <input aria-label="Monthly Retention Percentage" type="range" min={50} max={99} value={retentionRatePct} onChange={e => setRetentionRatePct(Number(e.target.value))} className="w-full" />
            </label>
            <label className="space-y-1">
              <span className="text-zinc-400">Scenario Preset Name</span>
              <input aria-label="Scenario Preset Label" value={labelInput} onChange={e => setLabelInput(e.target.value)} disabled={isSaving} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white" />
            </label>
          </div>
          <button type="submit" disabled={isSaving} className="bg-[#D4AF37] text-black font-bold text-xs px-4 py-2 rounded">
            + Save Scenario Preset
          </button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {scenarios.map(sc => (
            <div key={sc.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex justify-between items-center">
              <div className="text-xs">
                <div className="font-bold text-white">{sc.label}</div>
                <div className="text-zinc-400">
                  ${sc.planPriceUsd}/mo · {sc.commissionRatePct}% comm · {sc.directReferralsPerMonth} direct/mo
                </div>
              </div>
              <button
                type="button"
                aria-label={`Load scenario ${sc.label}`}
                onClick={() => applyPreset(sc)}
                className="px-3 py-1.5 rounded bg-zinc-800 text-xs text-[#D4AF37] font-bold"
              >
                Load Preset
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CommissionCalculatorWidget;
