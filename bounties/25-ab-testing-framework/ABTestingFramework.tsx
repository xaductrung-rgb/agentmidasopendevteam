'use client';

import React, { useMemo, useState } from 'react';

export function ABTestingFramework() {
  const [experimentName, setExperimentName] = useState<string>('Hero Gold CTA vs. Minimal Dark CTA');
  const [visitorsA, setVisitorsA] = useState<number>(5000);
  const [conversionsA, setConversionsA] = useState<number>(410);
  const [visitorsB, setVisitorsB] = useState<number>(5000);
  const [conversionsB, setConversionsB] = useState<number>(525);

  const stats = useMemo(() => {
    const nA = Math.max(1, visitorsA);
    const nB = Math.max(1, visitorsB);
    const cA = Math.min(nA, Math.max(0, conversionsA));
    const cB = Math.min(nB, Math.max(0, conversionsB));

    const pA = cA / nA;
    const pB = cB / nB;
    const liftPct = pA > 0 ? ((pB - pA) / pA) * 100 : 0;

    const pPool = (cA + cB) / (nA + nB);
    const se = Math.sqrt(pPool * (1 - pPool) * (1 / nA + 1 / nB));
    const zScore = se > 0 ? (pB - pA) / se : 0;
    const absZ = Math.abs(zScore);

    let confidenceLabel = 'Not Statistically Significant (< 90%)';
    if (absZ >= 2.576) confidenceLabel = '99% Confidence (Statistically Significant)';
    else if (absZ >= 1.96) confidenceLabel = '95% Confidence (Statistically Significant)';
    else if (absZ >= 1.645) confidenceLabel = '90% Confidence (Marginal)';

    return {
      rateA: (pA * 100).toFixed(2),
      rateB: (pB * 100).toFixed(2),
      liftPct: liftPct.toFixed(2),
      zScore: zScore.toFixed(3),
      confidenceLabel,
      isSignificant95: absZ >= 1.96,
    };
  }, [visitorsA, conversionsA, visitorsB, conversionsB]);

  return (
    <section aria-label="A/B Testing Framework" className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="border-b border-[#262626] pb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-[#D4AF37]">A/B Testing Framework</h1>
          <p className="text-sm text-[#A3A3A3]">Two-Proportion Z-Score Statistical Significance Calculator — {experimentName}</p>
        </header>

        <div className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-4">
          <label htmlFor="ab-exp-name" className="block text-xs text-[#A3A3A3] mb-1">Experiment Name</label>
          <input
            id="ab-exp-name"
            type="text"
            value={experimentName}
            onChange={e => setExperimentName(e.target.value)}
            className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3 py-2 text-sm text-[#F5F5F5]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-5 space-y-3">
            <h2 className="text-lg font-bold text-[#F5F5F5]">Control (Variant A) — {stats.rateA}% CR</h2>
            <div>
              <label htmlFor="ab-vis-a" className="block text-xs text-[#A3A3A3] mb-1">Sample Size (Visitors A)</label>
              <input id="ab-vis-a" type="number" min={1} value={visitorsA} onChange={e => setVisitorsA(Number(e.target.value) || 1)} className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label htmlFor="ab-conv-a" className="block text-xs text-[#A3A3A3] mb-1">Conversions A</label>
              <input id="ab-conv-a" type="number" min={0} value={conversionsA} onChange={e => setConversionsA(Number(e.target.value) || 0)} className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="bg-[#0D0D0D] border border-[#D4AF37]/50 rounded-xl p-5 space-y-3">
            <h2 className="text-lg font-bold text-[#D4AF37]">Challenger (Variant B) — {stats.rateB}% CR</h2>
            <div>
              <label htmlFor="ab-vis-b" className="block text-xs text-[#A3A3A3] mb-1">Sample Size (Visitors B)</label>
              <input id="ab-vis-b" type="number" min={1} value={visitorsB} onChange={e => setVisitorsB(Number(e.target.value) || 1)} className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label htmlFor="ab-conv-b" className="block text-xs text-[#A3A3A3] mb-1">Conversions B</label>
              <input id="ab-conv-b" type="number" min={0} value={conversionsB} onChange={e => setConversionsB(Number(e.target.value) || 0)} className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3 py-2 text-sm" />
            </div>
          </div>
        </div>

        <div className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs uppercase text-[#A3A3A3]">Relative Conversion Lift</p>
            <p className="text-2xl font-bold text-[#22C55E] mt-1">{stats.liftPct}%</p>
          </div>
          <div>
            <p className="text-xs uppercase text-[#A3A3A3]">Two-Proportion Z-Score</p>
            <p className="text-2xl font-bold text-[#D4AF37] mt-1">Z = {stats.zScore}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-[#A3A3A3]">Statistical Decision</p>
            <p className="text-sm font-bold text-[#F5F5F5] mt-1">{stats.confidenceLabel}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ABTestingFramework;
