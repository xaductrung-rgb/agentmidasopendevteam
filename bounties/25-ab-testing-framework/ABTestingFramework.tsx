'use client';
import React, { useState, useRef } from 'react';

export interface ABExperiment {
  id: string;
  name: string;
  visitorsA: number;
  conversionsA: number;
  visitorsB: number;
  conversionsB: number;
}

export interface ABTestingFrameworkProps {
  storageKey?: string;
  initialExperiments?: ABExperiment[];
  onChange?: (experiments: ABExperiment[]) => void | Promise<void>;
}

const DEFAULT_EXPERIMENTS: ABExperiment[] = [
  {
    id: 'exp-1',
    name: 'Checkout Gold CTA vs Standard Button',
    visitorsA: 2400,
    conversionsA: 192,
    visitorsB: 2450,
    conversionsB: 258
  }
];

export const ABTestingFramework: React.FC<ABTestingFrameworkProps> = ({
  storageKey = 'agentmidas_ab_testing_v2',
  initialExperiments = DEFAULT_EXPERIMENTS,
  onChange
}) => {
  const [experiments, setExperiments] = useState<ABExperiment[]>(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return initialExperiments;
  });

  const [name, setName] = useState('');
  const [visitorsA, setVisitorsA] = useState('1000');
  const [conversionsA, setConversionsA] = useState('80');
  const [visitorsB, setVisitorsB] = useState('1000');
  const [conversionsB, setConversionsB] = useState('115');
  const [errorMsg, setErrorMsg] = useState('');
  const saveSeqRef = useRef(0);

  const persistExperiments = async (next: ABExperiment[]) => {
    const seq = ++saveSeqRef.current;
    const prev = experiments;
    setExperiments(next);
    setErrorMsg('');
    try {
      if (onChange) {
        await onChange(next);
      }
      if (seq !== saveSeqRef.current) return;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      }
    } catch {
      if (seq === saveSeqRef.current) {
        setExperiments(prev);
        setErrorMsg('Failed to persist experiments; rolled back.');
      }
    }
  };

  const evaluateStats = (exp: ABExperiment) => {
    const nA = Math.max(1, exp.visitorsA);
    const nB = Math.max(1, exp.visitorsB);
    const cA = Math.min(nA, Math.max(0, exp.conversionsA));
    const cB = Math.min(nB, Math.max(0, exp.conversionsB));

    const pA = cA / nA;
    const pB = cB / nB;
    const diff = pB - pA;

    const seUnpooled = Math.sqrt((pA * (1 - pA)) / nA + (pB * (1 - pB)) / nB);
    const ciLowPct = (diff - 1.96 * seUnpooled) * 100;
    const ciHighPct = (diff + 1.96 * seUnpooled) * 100;

    const relativeLiftLabel =
      pA === 0
        ? pB === 0
          ? '0.00% (Both 0%)'
          : 'Undefined (Baseline A has 0 conversions)'
        : `${(((pB - pA) / pA) * 100).toFixed(2)}%`;

    const sampleSufficient =
      nA >= 30 &&
      nB >= 30 &&
      cA >= 5 &&
      cB >= 5 &&
      nA - cA >= 5 &&
      nB - cB >= 5;

    if (!sampleSufficient) {
      return {
        rateAPct: (pA * 100).toFixed(2),
        rateBPct: (pB * 100).toFixed(2),
        relativeLiftLabel,
        ciLabel: `[${ciLowPct.toFixed(2)}%, ${ciHighPct.toFixed(2)}%]`,
        zScore: 'N/A',
        significanceLabel: 'Insufficient Sample Size (requires ≥30 visitors & ≥5 conversions/non-conversions per variant)'
      };
    }

    const pPool = (cA + cB) / (nA + nB);
    const sePool = Math.sqrt(pPool * (1 - pPool) * (1 / nA + 1 / nB));
    const z = sePool > 0 ? Math.abs(diff / sePool) : 0;

    const significanceLabel =
      z >= 2.576
        ? '99% Confidence (Statistically Significant)'
        : z >= 1.96
        ? '95% Confidence (Statistically Significant)'
        : z >= 1.645
        ? '90% Confidence (Marginal)'
        : 'Inconclusive (<90% Confidence)';

    return {
      rateAPct: (pA * 100).toFixed(2),
      rateBPct: (pB * 100).toFixed(2),
      relativeLiftLabel,
      ciLabel: `[${ciLowPct.toFixed(2)}%, ${ciHighPct.toFixed(2)}%]`,
      zScore: z.toFixed(2),
      significanceLabel
    };
  };

  const handleAddExperiment = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !name.trim() ||
      !visitorsA.trim() ||
      !conversionsA.trim() ||
      !visitorsB.trim() ||
      !conversionsB.trim()
    ) {
      setErrorMsg('All experiment name, visitor, and conversion fields are required.');
      return;
    }
    const vA = Number(visitorsA);
    const cA = Number(conversionsA);
    const vB = Number(visitorsB);
    const cB = Number(conversionsB);
    if (
      [vA, cA, vB, cB].some(n => !Number.isInteger(n) || n < 0) ||
      vA <= 0 ||
      vB <= 0 ||
      cA > vA ||
      cB > vB
    ) {
      setErrorMsg('Visitor and conversion counts must be whole integers with conversions <= visitors.');
      return;
    }
    const created: ABExperiment = {
      id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      visitorsA: vA,
      conversionsA: cA,
      visitorsB: vB,
      conversionsB: cB
    };
    setName('');
    void persistExperiments([created, ...experiments]);
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="border-b border-zinc-800 pb-4">
          <h1 className="text-2xl font-bold text-[#D4AF37]">A/B Split Testing & Statistical Significance Engine</h1>
          <p className="text-sm text-zinc-400">Two-proportion Z-test with sample-size preconditions and 95% confidence intervals</p>
        </header>

        {errorMsg && <div role="alert" className="bg-red-950/60 border border-red-700 text-red-200 px-4 py-2 rounded text-sm">{errorMsg}</div>}

        <form onSubmit={handleAddExperiment} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 grid grid-cols-2 md:grid-cols-6 gap-3">
          <input aria-label="Experiment Name" value={name} onChange={e => setName(e.target.value)} placeholder="Experiment Name" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
          <input aria-label="Control A Visitors" type="number" step="1" value={visitorsA} onChange={e => setVisitorsA(e.target.value)} placeholder="Visitors A" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
          <input aria-label="Control A Conversions" type="number" step="1" value={conversionsA} onChange={e => setConversionsA(e.target.value)} placeholder="Conversions A" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
          <input aria-label="Variant B Visitors" type="number" step="1" value={visitorsB} onChange={e => setVisitorsB(e.target.value)} placeholder="Visitors B" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
          <input aria-label="Variant B Conversions" type="number" step="1" value={conversionsB} onChange={e => setConversionsB(e.target.value)} placeholder="Conversions B" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
          <button type="submit" className="bg-[#D4AF37] text-black font-bold text-xs rounded px-4 py-2">+ Evaluate Test</button>
        </form>

        <div className="space-y-4">
          {experiments.map(exp => {
            const st = evaluateStats(exp);
            return (
              <div key={exp.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
                <div className="flex flex-wrap justify-between items-center">
                  <h2 className="text-lg font-bold text-white">{exp.name}</h2>
                  <span className="text-xs px-3 py-1 rounded bg-zinc-800 text-[#D4AF37] font-bold">
                    {st.significanceLabel}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                  <div className="bg-zinc-950 p-3 rounded border border-zinc-800">
                    <div className="text-zinc-400">Control A Rate</div>
                    <div className="text-base font-bold text-white">{st.rateAPct}% ({exp.conversionsA}/{exp.visitorsA})</div>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded border border-zinc-800">
                    <div className="text-zinc-400">Variant B Rate</div>
                    <div className="text-base font-bold text-[#D4AF37]">{st.rateBPct}% ({exp.conversionsB}/{exp.visitorsB})</div>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded border border-zinc-800">
                    <div className="text-zinc-400">Relative Lift</div>
                    <div className="text-sm font-bold text-emerald-400">{st.relativeLiftLabel}</div>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded border border-zinc-800">
                    <div className="text-zinc-400">95% Diff Confidence Interval</div>
                    <div className="text-sm font-mono text-zinc-200">{st.ciLabel}</div>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded border border-zinc-800">
                    <div className="text-zinc-400">Z-Statistic</div>
                    <div className="text-base font-mono text-white">{st.zScore}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ABTestingFramework;
