'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';

export interface CommissionTier {
  id: string;
  name: string;
  minRevenue: number;
  ratePercent: number;
  recurringMonths: number;
}

export interface SavedCommissionScenario {
  id: string;
  label: string;
  monthlyDealValue: number;
  referralCount: number;
  estimatedCommission: number;
}

export interface CommissionCalculatorWidgetProps {
  tiers?: CommissionTier[];
  storageKey?: string;
  onChange?: (scenarios: SavedCommissionScenario[]) => void | Promise<void>;
}

const DEFAULT_TIERS: CommissionTier[] = [
  { id: 'tier-bronze', name: 'Bronze Partner', minRevenue: 0, ratePercent: 15, recurringMonths: 6 },
  { id: 'tier-silver', name: 'Silver Partner', minRevenue: 5000, ratePercent: 20, recurringMonths: 12 },
  { id: 'tier-gold', name: 'Gold Partner', minRevenue: 15000, ratePercent: 25, recurringMonths: 12 },
  { id: 'tier-elite', name: 'Elite Partner', minRevenue: 40000, ratePercent: 30, recurringMonths: 24 }
];

function isValidScenarios(val: unknown): val is SavedCommissionScenario[] {
  return (
    Array.isArray(val) &&
    val.every(
      (s) =>
        s &&
        typeof s === 'object' &&
        typeof (s as SavedCommissionScenario).id === 'string' &&
        typeof (s as SavedCommissionScenario).label === 'string' &&
        typeof (s as SavedCommissionScenario).monthlyDealValue === 'number' &&
        Number.isFinite((s as SavedCommissionScenario).monthlyDealValue) &&
        (s as SavedCommissionScenario).monthlyDealValue >= 0 &&
        typeof (s as SavedCommissionScenario).referralCount === 'number' &&
        Number.isFinite((s as SavedCommissionScenario).referralCount) &&
        (s as SavedCommissionScenario).referralCount >= 0 &&
        typeof (s as SavedCommissionScenario).estimatedCommission === 'number' &&
        Number.isFinite((s as SavedCommissionScenario).estimatedCommission)
    )
  );
}

export default function CommissionCalculatorWidget({
  tiers = DEFAULT_TIERS,
  storageKey = 'agentmidas_commission_scenarios_v1',
  onChange
}: CommissionCalculatorWidgetProps) {
  const safeTiers = useMemo(() => {
    const valid = Array.isArray(tiers) && tiers.length > 0 ? tiers : DEFAULT_TIERS;
    return [...valid].sort((a, b) => a.minRevenue - b.minRevenue);
  }, [tiers]);

  const activeKeyRef = useRef(storageKey);
  activeKeyRef.current = storageKey;

  const [monthlyDealValue, setMonthlyDealValue] = useState<string>('800');
  const [referralCount, setReferralCount] = useState<string>('10');
  const [scenarioLabel, setScenarioLabel] = useState<string>('');
  const [scenarios, setScenarios] = useState<SavedCommissionScenario[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isValidScenarios(parsed)) {
          setScenarios(parsed);
          return;
        }
      }
    } catch {
      // ignore read errors
    }
    setScenarios([]);
  }, [storageKey]);

  const calculation = useMemo(() => {
    const dealVal = Number(monthlyDealValue);
    const refs = Number(referralCount);
    const validDeal = Number.isFinite(dealVal) && dealVal >= 0 ? dealVal : 0;
    const validRefs = Number.isFinite(refs) && refs >= 0 ? Math.floor(refs) : 0;
    const monthlyReferredRevenue = validDeal * validRefs;

    let activeTier = safeTiers[0];
    for (const tier of safeTiers) {
      if (monthlyReferredRevenue >= tier.minRevenue) {
        activeTier = tier;
      }
    }

    const monthlyCommission = (monthlyReferredRevenue * activeTier.ratePercent) / 100;
    const totalRecurringCommission = monthlyCommission * activeTier.recurringMonths;

    return {
      validDeal,
      validRefs,
      monthlyReferredRevenue,
      activeTier,
      monthlyCommission,
      totalRecurringCommission
    };
  }, [monthlyDealValue, referralCount, safeTiers]);

  async function handleSaveScenario(e: React.FormEvent) {
    e.preventDefault();
    if (isSaving) return;
    const trimmed = scenarioLabel.trim();
    if (!trimmed) {
      setError('Please enter a scenario label to save.');
      return;
    }
    const dealNum = Number(monthlyDealValue);
    const refNum = Number(referralCount);
    if (!Number.isFinite(dealNum) || dealNum <= 0 || !Number.isFinite(refNum) || refNum <= 0) {
      setError('Deal value and referral count must be positive finite numbers.');
      return;
    }
    const created: SavedCommissionScenario = {
      id: `scen-${Date.now()}`,
      label: trimmed,
      monthlyDealValue: dealNum,
      referralCount: Math.floor(refNum),
      estimatedCommission: Math.round(calculation.totalRecurringCommission * 100) / 100
    };
    const keyAtStart = storageKey;
    const prev = scenarios;
    const next = [created, ...scenarios];
    setIsSaving(true);
    setError(null);
    setScenarios(next);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(keyAtStart, JSON.stringify(next));
      }
      await onChange?.(next);
      setScenarioLabel('');
    } catch {
      if (activeKeyRef.current === keyAtStart) {
        setScenarios(prev);
      }
      setError('Failed to save commission scenario.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Affiliate Commission Calculator</h2>
        <p className="text-sm text-slate-600">
          Estimate your monthly and total recurring partner commissions across volume tiers.
        </p>
      </div>

      {error && (
        <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="comm-deal-value" className="block text-sm font-medium text-slate-700 mb-1">
              Average Monthly Deal Value ($ USD)
            </label>
            <input
              id="comm-deal-value"
              type="number"
              min="0"
              step="50"
              value={monthlyDealValue}
              onChange={(e) => setMonthlyDealValue(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label htmlFor="comm-ref-count" className="block text-sm font-medium text-slate-700 mb-1">
              Active Referred Customers
            </label>
            <input
              id="comm-ref-count"
              type="number"
              min="0"
              step="1"
              value={referralCount}
              onChange={(e) => setReferralCount(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="pt-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Commission Tiers</h3>
            <div className="space-y-1.5">
              {safeTiers.map((tier) => {
                const isCurrent = tier.id === calculation.activeTier.id;
                return (
                  <div
                    key={tier.id}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs ${
                      isCurrent ? 'border-emerald-600 bg-emerald-50 font-semibold text-emerald-950' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <span>{tier.name} (≥ ${tier.minRevenue.toLocaleString()}/mo)</span>
                    <span>{tier.ratePercent}% for {tier.recurringMonths} mos</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-500">Qualified Tier</span>
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
                {calculation.activeTier.name} ({calculation.activeTier.ratePercent}%)
              </span>
            </div>

            <div className="border-t border-slate-200 pt-3">
              <div className="text-xs text-slate-500">Monthly Referred Revenue</div>
              <div className="text-xl font-bold text-slate-900">
                ${calculation.monthlyReferredRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500">Monthly Partner Payout</div>
              <div className="text-2xl font-bold text-emerald-700">
                ${calculation.monthlyCommission.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo
              </div>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <div className="text-xs text-slate-500">
                Total Projected Payout ({calculation.activeTier.recurringMonths} Months)
              </div>
              <div className="text-3xl font-extrabold text-slate-900">
                ${calculation.totalRecurringCommission.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveScenario} className="mt-6 pt-4 border-t border-slate-200 flex gap-2">
            <input
              type="text"
              aria-label="Scenario label"
              placeholder="Save preset (e.g. Q3 Target)"
              value={scenarioLabel}
              onChange={(e) => setScenarioLabel(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            />
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </form>
        </div>
      </div>

      {scenarios.length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-200">
          <h3 className="text-sm font-semibold text-slate-800 mb-2">Saved Commission Presets</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {scenarios.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setMonthlyDealValue(String(s.monthlyDealValue));
                  setReferralCount(String(s.referralCount));
                }}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-left text-xs"
              >
                <div>
                  <div className="font-semibold text-slate-900">{s.label}</div>
                  <div className="text-slate-500">{s.referralCount} referrals × ${s.monthlyDealValue}/mo</div>
                </div>
                <div className="font-bold text-emerald-700">${s.estimatedCommission.toLocaleString()}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
