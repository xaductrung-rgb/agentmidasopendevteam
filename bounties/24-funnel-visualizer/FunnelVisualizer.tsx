import React, { useState, useMemo } from 'react';

export interface FunnelStage {
  id: string;
  name: string;
  count: number;
}

export interface FunnelVisualizerProps {
  storageKey?: string;
  initialStages?: FunnelStage[];
  onChange?: (stages: FunnelStage[]) => void | Promise<void>;
}

const DEFAULT_STAGES: FunnelStage[] = [
  { id: 'stg-1', name: '1. Landing Page Visits', count: 12500 },
  { id: 'stg-2', name: '2. Pricing Calculator Opened', count: 5400 },
  { id: 'stg-3', name: '3. Trial Account Created', count: 2160 },
  { id: 'stg-4', name: '4. SDK Connected', count: 1296 },
  { id: 'stg-5', name: '5. Paid Subscription Activated', count: 648 }
];

export const FunnelVisualizer: React.FC<FunnelVisualizerProps> = ({
  storageKey = 'agentmidas_funnel_visualizer_v1',
  initialStages = DEFAULT_STAGES,
  onChange
}) => {
  const [stages, setStages] = useState<FunnelStage[]>(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return initialStages;
  });

  const [newStageName, setNewStageName] = useState('');
  const [newStageCount, setNewStageCount] = useState('300');
  const [notice, setNotice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const persistStages = async (next: FunnelStage[], msg?: string) => {
    const prev = stages;
    setStages(next);
    setErrorMsg('');
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      }
      if (onChange) {
        await onChange(next);
      }
      if (msg) setNotice(msg);
    } catch {
      setStages(prev);
      setErrorMsg('Failed to persist funnel stages; rolled back.');
    }
  };

  const analyzedStages = useMemo(() => {
    const topCount = stages[0]?.count || 0;
    return stages.map((st, idx) => {
      const prevCount = idx === 0 ? st.count : stages[idx - 1].count;
      const stepConversionPct = idx === 0 ? 100 : prevCount > 0 ? (st.count / prevCount) * 100 : 0;
      const dropOffCount = idx === 0 ? 0 : Math.max(0, prevCount - st.count);
      const dropOffPct = idx === 0 ? 0 : prevCount > 0 ? (dropOffCount / prevCount) * 100 : 0;
      const cumulativePct = topCount > 0 ? (st.count / topCount) * 100 : 0;
      const monotonicWarning = idx > 0 && st.count > prevCount;
      return {
        ...st,
        stepConversionPct,
        dropOffCount,
        dropOffPct,
        cumulativePct,
        monotonicWarning
      };
    });
  }, [stages]);

  const bottleneckStage = useMemo(() => {
    const stepsAfterFirst = analyzedStages.slice(1);
    if (stepsAfterFirst.length === 0) return null;
    return stepsAfterFirst.reduce((worst, curr) => (curr.dropOffPct > worst.dropOffPct ? curr : worst));
  }, [analyzedStages]);

  const overallConversionPct = useMemo(() => {
    if (stages.length < 2 || stages[0].count <= 0) return 0;
    return (stages[stages.length - 1].count / stages[0].count) * 100;
  }, [stages]);

  const handleAddStage = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedCount = Number(newStageCount);
    if (!newStageName.trim() || Number.isNaN(parsedCount) || parsedCount < 0) {
      setErrorMsg('Stage name and a non-negative count are required.');
      return;
    }
    const created: FunnelStage = {
      id: `stg-${Date.now()}`,
      name: newStageName.trim(),
      count: Math.round(parsedCount)
    };
    setNewStageName('');
    void persistStages([...stages, created], `Added funnel stage "${created.name}".`);
  };

  const updateStage = (id: string, patch: Partial<FunnelStage>) => {
    if (patch.count !== undefined && (Number.isNaN(patch.count) || patch.count < 0)) return;
    const next = stages.map(s => (s.id === id ? { ...s, ...patch } : s));
    void persistStages(next, 'Updated funnel stage.');
  };

  const moveStage = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= stages.length) return;
    const copy = [...stages];
    const [item] = copy.splice(index, 1);
    copy.splice(target, 0, item);
    void persistStages(copy, 'Reordered funnel stages.');
  };

  const deleteStage = (id: string) => {
    if (stages.length <= 2) {
      setErrorMsg('A conversion funnel requires at least 2 stages.');
      return;
    }
    void persistStages(stages.filter(s => s.id !== id), 'Removed funnel stage.');
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-[#D4AF37]">Conversion Funnel Visualizer & Drop-Off Analyzer</h1>
            <p className="text-sm text-zinc-400">
              Interactive conversion funnel builder with step-by-step drop-off diagnostics and bottleneck alerts
            </p>
          </div>
          <div className="flex gap-4">
            <div className="bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-lg text-center">
              <div className="text-xs text-zinc-400">End-to-End Conversion</div>
              <div className="text-xl font-bold text-[#D4AF37]">{overallConversionPct.toFixed(2)}%</div>
            </div>
            {bottleneckStage && (
              <div className="bg-red-950/50 border border-red-800 px-4 py-2 rounded-lg">
                <div className="text-xs text-red-300">Primary Bottleneck</div>
                <div className="text-sm font-bold text-red-200">
                  {bottleneckStage.name} (-{bottleneckStage.dropOffPct.toFixed(1)}%)
                </div>
              </div>
            )}
          </div>
        </header>

        {notice && (
          <div role="status" className="bg-emerald-950/60 border border-emerald-700 text-emerald-200 px-4 py-2 rounded text-sm">
            {notice}
          </div>
        )}
        {errorMsg && (
          <div role="alert" className="bg-red-950/60 border border-red-700 text-red-200 px-4 py-2 rounded text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAddStage} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="New Funnel Stage Name"
            value={newStageName}
            onChange={e => setNewStageName(e.target.value)}
            className="flex-1 min-w-[220px] bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white"
          />
          <input
            type="number"
            min={0}
            placeholder="Visitor Count"
            value={newStageCount}
            onChange={e => setNewStageCount(e.target.value)}
            className="w-40 bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white"
          />
          <button
            type="submit"
            className="bg-[#D4AF37] text-black font-bold text-sm px-4 py-2 rounded hover:opacity-90"
          >
            + Add Stage
          </button>
        </form>

        <div className="space-y-4">
          {analyzedStages.map((st, idx) => {
            const barWidth = Math.max(6, Math.min(100, st.cumulativePct));
            return (
              <div key={st.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap justify-between items-center gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                    <input
                      type="text"
                      aria-label={`Stage ${idx + 1} Name`}
                      value={st.name}
                      onChange={e => updateStage(st.id, { name: e.target.value })}
                      className="bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-sm font-bold text-white flex-1"
                    />
                    <input
                      type="number"
                      aria-label={`Stage ${idx + 1} Count`}
                      min={0}
                      value={st.count}
                      onChange={e => updateStage(st.id, { count: Number(e.target.value) })}
                      className="w-28 bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-sm font-mono text-[#D4AF37]"
                    />
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <span>
                      Step Conv: <strong className="text-emerald-400">{st.stepConversionPct.toFixed(1)}%</strong>
                    </span>
                    {idx > 0 && (
                      <span>
                        Drop-off: <strong className="text-red-400">-{st.dropOffCount.toLocaleString()} ({st.dropOffPct.toFixed(1)}%)</strong>
                      </span>
                    )}
                    <span>
                      Cumulative: <strong className="text-[#D4AF37]">{st.cumulativePct.toFixed(1)}%</strong>
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => moveStage(idx, -1)}
                        disabled={idx === 0}
                        className="px-2 py-1 rounded bg-zinc-800 text-zinc-300 disabled:opacity-40"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveStage(idx, 1)}
                        disabled={idx === analyzedStages.length - 1}
                        className="px-2 py-1 rounded bg-zinc-800 text-zinc-300 disabled:opacity-40"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteStage(st.id)}
                        className="px-2 py-1 rounded bg-red-950 text-red-300 border border-red-800"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>

                {/* Funnel Bar */}
                <div className="w-full bg-zinc-950 h-5 rounded-full overflow-hidden border border-zinc-800">
                  <div
                    className="h-full bg-gradient-to-r from-[#D4AF37] to-amber-600 transition-all"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>

                {st.monotonicWarning && (
                  <p className="text-xs text-amber-400">
                    ⚠ Stage count exceeds previous stage count ({stages[idx - 1].count.toLocaleString()}). Check tracking event configuration.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FunnelVisualizer;
