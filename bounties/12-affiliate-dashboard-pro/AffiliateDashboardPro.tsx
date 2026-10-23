'use client';

import React, { useMemo, useState } from 'react';

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

const INITIAL_REFERRALS: AffiliateReferral[] = [
  { id: 'ref-101', name: 'Apex Digital Agency', tier: 'Direct', plan: 'Enterprise', monthlyPrice: 599, commissionRate: 0.75, status: 'Active', joinedDate: '2026-09-12' },
  { id: 'ref-102', name: 'Nova Growth Labs', tier: 'Two-Up Passup', plan: 'Business', monthlyPrice: 199, commissionRate: 0.75, status: 'Active', joinedDate: '2026-09-18' },
  { id: 'ref-103', name: 'Solstice Venture Studio', tier: 'Direct', plan: 'Professional', monthlyPrice: 79, commissionRate: 0.75, status: 'Active', joinedDate: '2026-10-02' },
  { id: 'ref-104', name: 'Vanguard AI Systems', tier: 'Two-Up Passup', plan: 'Enterprise', monthlyPrice: 599, commissionRate: 0.75, status: 'Active', joinedDate: '2026-10-10' },
  { id: 'ref-105', name: 'Crestline Media LLC', tier: 'Direct', plan: 'Starter', monthlyPrice: 29, commissionRate: 0.75, status: 'Trial', joinedDate: '2026-10-19' },
];

export function AffiliateDashboardPro() {
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [referrals] = useState<AffiliateReferral[]>(INITIAL_REFERRALS);

  const filtered = useMemo(() => {
    return referrals.filter(r => {
      const matchesTier = tierFilter === 'ALL' || r.tier === tierFilter;
      const matchesQuery = r.name.toLowerCase().includes(search.trim().toLowerCase()) || r.plan.toLowerCase().includes(search.trim().toLowerCase());
      return matchesTier && matchesQuery;
    });
  }, [referrals, tierFilter, search]);

  const metrics = useMemo(() => {
    const active = referrals.filter(r => r.status === 'Active');
    const monthlyCommission = active.reduce((sum, r) => sum + r.monthlyPrice * r.commissionRate, 0);
    const twoUpVolume = active.filter(r => r.tier === 'Two-Up Passup').reduce((sum, r) => sum + r.monthlyPrice * r.commissionRate, 0);
    return {
      totalReferrals: referrals.length,
      activeCount: active.length,
      monthlyCommission: monthlyCommission.toFixed(2),
      annualProjected: (monthlyCommission * 12).toFixed(2),
      twoUpVolume: twoUpVolume.toFixed(2),
    };
  }, [referrals]);

  return (
    <section className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] py-12 px-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#2A2A2A] pb-6">
          <div>
            <span className="text-xs uppercase tracking-widest text-[#D4AF37] font-mono">Agent Midas • Affiliate OS</span>
            <h1 className="text-3xl font-bold mt-1">Affiliate Dashboard Pro (75% Two-Up Engine)</h1>
            <p className="text-sm text-[#9CA3AF] mt-1">Real-time recurring commissions, Two-Up pass-up tracking, and payout projections.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-4 py-2 rounded-lg bg-[#141414] border border-[#D4AF37] text-[#E8C547] font-mono text-sm">
              75% Commission Tier Unlocked
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl p-5">
            <p className="text-xs text-[#9CA3AF] uppercase">Monthly Recurring Commission</p>
            <p className="text-2xl font-bold text-[#D4AF37] mt-2 font-mono">${metrics.monthlyCommission}/mo</p>
          </div>
          <div className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl p-5">
            <p className="text-xs text-[#9CA3AF] uppercase">Two-Up Passup Earnings</p>
            <p className="text-2xl font-bold text-[#E8C547] mt-2 font-mono">${metrics.twoUpVolume}/mo</p>
          </div>
          <div className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl p-5">
            <p className="text-xs text-[#9CA3AF] uppercase">Projected Annual Payout</p>
            <p className="text-2xl font-bold text-[#F5F5F5] mt-2 font-mono">${metrics.annualProjected}/yr</p>
          </div>
          <div className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl p-5">
            <p className="text-xs text-[#9CA3AF] uppercase">Active Qualified Referrals</p>
            <p className="text-2xl font-bold text-[#F5F5F5] mt-2 font-mono">{metrics.activeCount} / {metrics.totalReferrals}</p>
          </div>
        </div>

        <div className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search partner or subscription tier..."
              className="bg-[#141414] border border-[#2A2A2A] rounded-lg px-4 py-2 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#D4AF37]"
            />
            <div className="flex gap-2 flex-wrap">
              {['ALL', 'Direct', 'Two-Up Passup'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTierFilter(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${tierFilter === t ? 'bg-[#D4AF37] text-[#0A0A0A] border-[#D4AF37]' : 'bg-[#141414] text-[#9CA3AF] border-[#2A2A2A]'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#2A2A2A] text-[#9CA3AF]">
                  <th className="py-3 px-4">Partner</th>
                  <th className="py-3 px-4">Attribution Tier</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Your 75% Cut</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id} className="border-b border-[#2A2A2A] hover:bg-[#141414]">
                    <td className="py-3 px-4 font-medium">{item.name}</td>
                    <td className="py-3 px-4 text-[#E8C547] font-mono text-xs">{item.tier}</td>
                    <td className="py-3 px-4">{item.plan} (${item.monthlyPrice}/mo)</td>
                    <td className="py-3 px-4 font-mono text-[#D4AF37]">${(item.monthlyPrice * item.commissionRate).toFixed(2)}/mo</td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-full text-xs bg-[#141414] border border-[#2A2A2A]">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AffiliateDashboardPro;
