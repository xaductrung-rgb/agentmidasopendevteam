'use client';

import React, { useEffect, useMemo, useState } from 'react';

export interface AffiliateReferral {
  id: string;
  name: string;
  tier: 'Direct' | 'Two-Up Passup' | 'Tier-2 Override';
  plan: 'Starter' | 'Professional' | 'Business' | 'Enterprise';
  monthlyPrice: number;
  commissionRate: number;
  status: 'Active' | 'Trial' | 'Churned';
  joinedDate: string;
}

export interface AffiliateDashboardProProps {
  initialReferrals?: AffiliateReferral[];
  storageKey?: string;
}

const PLAN_PRICES: Record<AffiliateReferral['plan'], number> = {
  Starter: 29,
  Professional: 79,
  Business: 199,
  Enterprise: 599,
};

const DEFAULT_REFERRALS: AffiliateReferral[] = [
  { id: 'ref-101', name: 'Apex Digital Agency', tier: 'Direct', plan: 'Enterprise', monthlyPrice: 599, commissionRate: 0.75, status: 'Active', joinedDate: '2026-09-12' },
  { id: 'ref-102', name: 'Nova Growth Labs', tier: 'Two-Up Passup', plan: 'Business', monthlyPrice: 199, commissionRate: 0.75, status: 'Active', joinedDate: '2026-09-18' },
  { id: 'ref-103', name: 'Solstice Venture Studio', tier: 'Direct', plan: 'Professional', monthlyPrice: 79, commissionRate: 0.75, status: 'Active', joinedDate: '2026-10-02' },
  { id: 'ref-104', name: 'Vanguard AI Systems', tier: 'Two-Up Passup', plan: 'Enterprise', monthlyPrice: 599, commissionRate: 0.75, status: 'Active', joinedDate: '2026-10-10' },
  { id: 'ref-105', name: 'Crestline Media LLC', tier: 'Direct', plan: 'Starter', monthlyPrice: 29, commissionRate: 0.75, status: 'Trial', joinedDate: '2026-10-19' },
];

export function AffiliateDashboardPro({
  initialReferrals = DEFAULT_REFERRALS,
  storageKey = 'agentmidas_affiliate_referrals_v1',
}: AffiliateDashboardProProps = {}) {
  const [referrals, setReferrals] = useState<AffiliateReferral[]>(initialReferrals);
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [newTier, setNewTier] = useState<AffiliateReferral['tier']>('Direct');
  const [newPlan, setNewPlan] = useState<AffiliateReferral['plan']>('Professional');
  const [newStatus, setNewStatus] = useState<AffiliateReferral['status']>('Active');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as AffiliateReferral[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setReferrals(parsed);
        }
      }
    } catch {}
  }, [storageKey]);

  const persistReferrals = (next: AffiliateReferral[]) => {
    setReferrals(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {}
  };

  const filtered = useMemo(() => {
    return referrals.filter(r => {
      const matchesTier = tierFilter === 'ALL' || r.tier === tierFilter;
      const q = search.trim().toLowerCase();
      const matchesQuery = !q || r.name.toLowerCase().includes(q) || r.plan.toLowerCase().includes(q);
      return matchesTier && matchesQuery;
    });
  }, [referrals, tierFilter, search]);

  const metrics = useMemo(() => {
    const active = referrals.filter(r => r.status === 'Active');
    const trials = referrals.filter(r => r.status === 'Trial');
    const monthlyCommission = active.reduce((sum, r) => sum + r.monthlyPrice * r.commissionRate, 0);
    const pendingTrialCommission = trials.reduce((sum, r) => sum + r.monthlyPrice * r.commissionRate, 0);
    const twoUpVolume = active.filter(r => r.tier === 'Two-Up Passup').reduce((sum, r) => sum + r.monthlyPrice * r.commissionRate, 0);
    return {
      totalReferrals: referrals.length,
      activeCount: active.length,
      monthlyCommission: monthlyCommission.toFixed(2),
      pendingTrialCommission: pendingTrialCommission.toFixed(2),
      annualProjected: (monthlyCommission * 12).toFixed(2),
      twoUpVolume: twoUpVolume.toFixed(2),
    };
  }, [referrals]);

  const handleAddReferral = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const item: AffiliateReferral = {
      id: `ref-${Date.now().toString().slice(-5)}`,
      name: newName.trim(),
      tier: newTier,
      plan: newPlan,
      monthlyPrice: PLAN_PRICES[newPlan],
      commissionRate: 0.75,
      status: newStatus,
      joinedDate: new Date().toISOString().slice(0, 10),
    };
    persistReferrals([item, ...referrals]);
    setNewName('');
  };

  const toggleReferralStatus = (id: string) => {
    const order: AffiliateReferral['status'][] = ['Active', 'Trial', 'Churned'];
    persistReferrals(
      referrals.map(r => {
        if (r.id !== id) return r;
        const nextStatus = order[(order.indexOf(r.status) + 1) % order.length];
        return { ...r, status: nextStatus };
      })
    );
  };

  return (
    <section aria-label="Affiliate Dashboard Pro" className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#262626] pb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#D4AF37]">Affiliate Dashboard Pro</h1>
            <p className="text-sm text-[#A3A3A3]">75% Recurring Commission Engine & Two-Up Passup Attribution</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label htmlFor="aff-search" className="sr-only">Search referrals</label>
            <input
              id="aff-search"
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search partner or plan..."
              className="bg-[#0D0D0D] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#D4AF37]"
            />
            <label htmlFor="aff-tier-filter" className="sr-only">Filter by tier</label>
            <select
              id="aff-tier-filter"
              value={tierFilter}
              onChange={e => setTierFilter(e.target.value)}
              className="bg-[#0D0D0D] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#D4AF37]"
            >
              <option value="ALL">All Attribution Tiers</option>
              <option value="Direct">Direct (75%)</option>
              <option value="Two-Up Passup">Two-Up Passup</option>
            </select>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-4">
            <p className="text-xs uppercase text-[#A3A3A3]">Monthly Recurring Commission (Active)</p>
            <p className="text-2xl font-bold text-[#D4AF37] mt-1">${metrics.monthlyCommission}</p>
            <p className="text-xs text-[#A3A3A3] mt-1">Pending Trial Cut: ${metrics.pendingTrialCommission}/mo</p>
          </div>
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-4">
            <p className="text-xs uppercase text-[#A3A3A3]">Two-Up Passup Volume</p>
            <p className="text-2xl font-bold text-[#22C55E] mt-1">${metrics.twoUpVolume}/mo</p>
          </div>
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-4">
            <p className="text-xs uppercase text-[#A3A3A3]">Annualized Run-Rate</p>
            <p className="text-2xl font-bold text-[#F5F5F5] mt-1">${metrics.annualProjected}/yr</p>
          </div>
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-4">
            <p className="text-xs uppercase text-[#A3A3A3]">Active Accounts</p>
            <p className="text-2xl font-bold text-[#3B82F6] mt-1">{metrics.activeCount} / {metrics.totalReferrals}</p>
          </div>
        </div>

        <form onSubmit={handleAddReferral} className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
          <div className="sm:col-span-2">
            <label htmlFor="ref-partner-name" className="block text-xs text-[#A3A3A3] mb-1">Partner / Account Name</label>
            <input
              id="ref-partner-name"
              type="text"
              required
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. Quantum SaaS Group"
              className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#F5F5F5]"
            />
          </div>
          <div>
            <label htmlFor="ref-tier" className="block text-xs text-[#A3A3A3] mb-1">Attribution Tier</label>
            <select id="ref-tier" value={newTier} onChange={e => setNewTier(e.target.value as AffiliateReferral['tier'])} className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#F5F5F5]">
              <option value="Direct">Direct</option>
              <option value="Two-Up Passup">Two-Up Passup</option>
            </select>
          </div>
          <div>
            <label htmlFor="ref-plan" className="block text-xs text-[#A3A3A3] mb-1">Subscription Plan</label>
            <select id="ref-plan" value={newPlan} onChange={e => setNewPlan(e.target.value as AffiliateReferral['plan'])} className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#F5F5F5]">
              <option value="Starter">Starter ($29)</option>
              <option value="Professional">Professional ($79)</option>
              <option value="Business">Business ($199)</option>
              <option value="Enterprise">Enterprise ($599)</option>
            </select>
          </div>
          <button type="submit" className="py-2 px-4 rounded-lg bg-[#D4AF37] text-[#0A0A0A] font-bold text-sm hover:bg-[#E8C547]">
            + Record Referral
          </button>
        </form>

        <div className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-5 overflow-x-auto">
          <h2 className="text-lg font-semibold text-[#D4AF37] mb-3">Referral & Passup Ledger</h2>
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#262626] text-[#A3A3A3]">
                <th className="py-2 pr-4">Account</th>
                <th className="py-2 pr-4">Attribution Tier</th>
                <th className="py-2 pr-4">Plan</th>
                <th className="py-2 pr-4">Plan MRR</th>
                <th className="py-2 pr-4">Earned 75% Cut/mo</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const earnedCut = r.status === 'Active' ? (r.monthlyPrice * r.commissionRate).toFixed(2) : '0.00';
                const pendingCut = (r.monthlyPrice * r.commissionRate).toFixed(2);
                return (
                  <tr key={r.id} className="border-b border-[#1A1A1A]">
                    <td className="py-3 pr-4 font-medium">{r.name}</td>
                    <td className="py-3 pr-4 text-[#D4AF37]">{r.tier}</td>
                    <td className="py-3 pr-4">{r.plan}</td>
                    <td className="py-3 pr-4 font-mono">${r.monthlyPrice}/mo</td>
                    <td className="py-3 pr-4 font-mono">
                      {r.status === 'Active' ? (
                        <span className="text-[#22C55E] font-semibold">${earnedCut}</span>
                      ) : r.status === 'Trial' ? (
                        <span className="text-[#F59E0B]">$0.00 (Pending ${pendingCut} on conversion)</span>
                      ) : (
                        <span className="text-[#EF4444]">$0.00 (Churned)</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">{r.status}</td>
                    <td className="py-3">
                      <button
                        type="button"
                        onClick={() => toggleReferralStatus(r.id)}
                        className="px-2.5 py-1 rounded bg-[#1F1F1F] border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-semibold"
                      >
                        Cycle Status
                      </button>
                    </td>
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

export default AffiliateDashboardPro;
