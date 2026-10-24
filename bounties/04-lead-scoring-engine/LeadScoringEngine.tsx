'use client';
import React, { useState, useMemo, useRef } from 'react';

export interface ScoringRule {
  id: string;
  signalKey: string;
  label: string;
  category: 'Behavioral' | 'Firmographic' | 'Demographic' | 'Decay';
  weightPoints: number;
  enabled: boolean;
}

export interface LeadCandidate {
  id: string;
  name: string;
  email: string;
  company: string;
  activeSignals: string[];
}

export interface LeadScoringConfig {
  mqlThreshold: number;
  sqlThreshold: number;
  rules: ScoringRule[];
  leads: LeadCandidate[];
}

export interface LeadScoringEngineProps {
  storageKey?: string;
  initialConfig?: LeadScoringConfig;
  onChange?: (config: LeadScoringConfig) => void | Promise<void>;
}

const DEFAULT_CONFIG: LeadScoringConfig = {
  mqlThreshold: 45,
  sqlThreshold: 75,
  rules: [
    { id: 'r-1', signalKey: 'demo_requested', label: 'Requested Product Demo', category: 'Behavioral', weightPoints: 35, enabled: true },
    { id: 'r-2', signalKey: 'pricing_visited', label: 'Visited Pricing Page 3+ Times', category: 'Behavioral', weightPoints: 25, enabled: true },
    { id: 'r-3', signalKey: 'enterprise_size', label: 'Company Size > 250 Employees', category: 'Firmographic', weightPoints: 20, enabled: true },
    { id: 'r-4', signalKey: 'c_level_role', label: 'VP / C-Level Decision Maker', category: 'Demographic', weightPoints: 20, enabled: true },
    { id: 'r-5', signalKey: 'webhook_docs', label: 'Read API / Webhook Documentation', category: 'Behavioral', weightPoints: 15, enabled: true },
    { id: 'r-6', signalKey: 'inactive_30d', label: 'No Session Activity in 30 Days', category: 'Decay', weightPoints: -20, enabled: true }
  ],
  leads: [
    {
      id: 'ld-1',
      name: 'Elena Rostova',
      email: 'elena@apexfintech.io',
      company: 'Apex Fintech Corp',
      activeSignals: ['demo_requested', 'pricing_visited', 'enterprise_size', 'c_level_role']
    },
    {
      id: 'ld-2',
      name: 'Marcus Vance',
      email: 'mvance@cloudscale.dev',
      company: 'CloudScale Systems',
      activeSignals: ['pricing_visited', 'enterprise_size', 'webhook_docs']
    }
  ]
};

export const LeadScoringEngine: React.FC<LeadScoringEngineProps> = ({
  storageKey = 'agentmidas_lead_scoring_v1',
  initialConfig = DEFAULT_CONFIG,
  onChange
}) => {
  const [config, setConfig] = useState<LeadScoringConfig>(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.rules) && Array.isArray(parsed.leads)) return parsed;
      }
    } catch {}
    return initialConfig;
  });

  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadEmail, setNewLeadEmail] = useState('');
  const [newLeadCompany, setNewLeadCompany] = useState('');
  const [tierFilter, setTierFilter] = useState<'ALL' | 'SQL' | 'MQL' | 'Nurture'>('ALL');
  const [notice, setNotice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const saveSeqRef = useRef(0);

  const persistConfig = async (next: LeadScoringConfig, msg?: string) => {
    const seq = ++saveSeqRef.current;
    const prev = config;
    setConfig(next);
    setErrorMsg('');
    try {
      if (onChange) {
        await onChange(next);
      }
      if (seq !== saveSeqRef.current) return;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      }
      if (msg) setNotice(msg);
    } catch {
      if (seq === saveSeqRef.current) {
        setConfig(prev);
        setErrorMsg('Failed to save lead scoring configuration; state rolled back.');
      }
    }
  };

  const scoredLeads = useMemo(() => {
    const activeRules = config.rules.filter(r => r.enabled);
    return config.leads.map(lead => {
      const matchedRules = activeRules.filter(r => lead.activeSignals.includes(r.signalKey));
      const rawScore = matchedRules.reduce((sum, r) => sum + r.weightPoints, 0);
      const clampedScore = Math.max(0, Math.min(100, rawScore));
      const midpoint = (config.mqlThreshold + config.sqlThreshold) / 2;
      const conversionProb = 1 / (1 + Math.exp(-(clampedScore - midpoint) / 12));
      const tier: 'SQL' | 'MQL' | 'Nurture' =
        clampedScore >= config.sqlThreshold
          ? 'SQL'
          : clampedScore >= config.mqlThreshold
          ? 'MQL'
          : 'Nurture';
      return {
        ...lead,
        rawScore,
        clampedScore,
        conversionProbPct: Math.round(conversionProb * 100),
        tier,
        matchedRules
      };
    }).sort((a, b) => b.clampedScore - a.clampedScore);
  }, [config]);

  const filteredLeads = useMemo(() => {
    if (tierFilter === 'ALL') return scoredLeads;
    return scoredLeads.filter(l => l.tier === tierFilter);
  }, [scoredLeads, tierFilter]);

  const updateRuleWeight = (ruleId: string, weightPoints: number) => {
    const nextRules = config.rules.map(r => (r.id === ruleId ? { ...r, weightPoints } : r));
    void persistConfig({ ...config, rules: nextRules }, 'Updated rule weight.');
  };

  const toggleRuleEnabled = (ruleId: string) => {
    const nextRules = config.rules.map(r => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r));
    void persistConfig({ ...config, rules: nextRules }, 'Toggled scoring rule.');
  };

  const updateThresholds = (mql: number, sql: number) => {
    if (!Number.isFinite(mql) || !Number.isFinite(sql) || mql < 10 || mql > 90 || sql < 20 || sql > 99 || mql >= sql) {
      setErrorMsg('Thresholds must be valid numbers (10 ≤ MQL < SQL ≤ 99).');
      return;
    }
    void persistConfig({ ...config, mqlThreshold: Math.round(mql), sqlThreshold: Math.round(sql) }, 'Updated MQL/SQL qualification thresholds.');
  };

  const toggleLeadSignal = (leadId: string, signalKey: string) => {
    const nextLeads = config.leads.map(l => {
      if (l.id !== leadId) return l;
      const has = l.activeSignals.includes(signalKey);
      const nextSignals = has
        ? l.activeSignals.filter(s => s !== signalKey)
        : [...l.activeSignals, signalKey];
      return { ...l, activeSignals: nextSignals };
    });
    void persistConfig({ ...config, leads: nextLeads }, 'Updated lead behavioral/demographic signals.');
  };

  const handleAddLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName.trim() || !newLeadEmail.trim()) {
      setErrorMsg('Lead name and email are required.');
      return;
    }
    const created: LeadCandidate = {
      id: `ld-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: newLeadName.trim(),
      email: newLeadEmail.trim(),
      company: newLeadCompany.trim() || 'Independent',
      activeSignals: []
    };
    setNewLeadName('');
    setNewLeadEmail('');
    setNewLeadCompany('');
    void persistConfig({ ...config, leads: [created, ...config.leads] }, `Added lead ${created.name} with 0 initial signals.`);
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-[#D4AF37]">ML Lead Scoring & Qualification Engine</h1>
            <p className="text-sm text-zinc-400">
              Configurable feature weights, logistic conversion probability, and MQL/SQL threshold routing
            </p>
          </div>
          <div className="flex gap-4">
            <div className="bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-lg text-center">
              <div className="text-xs text-zinc-400">SQL (Hot ≥ {config.sqlThreshold})</div>
              <div className="text-lg font-bold text-emerald-400">
                {scoredLeads.filter(l => l.tier === 'SQL').length}
              </div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-lg text-center">
              <div className="text-xs text-zinc-400">MQL (Warm ≥ {config.mqlThreshold})</div>
              <div className="text-lg font-bold text-[#D4AF37]">
                {scoredLeads.filter(l => l.tier === 'MQL').length}
              </div>
            </div>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-5">
            <div>
              <h2 className="text-base font-bold text-[#D4AF37]">Qualification Thresholds</h2>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <label className="text-xs text-zinc-300">
                  MQL Threshold
                  <input
                    type="number"
                    min={10}
                    max={90}
                    value={config.mqlThreshold}
                    onChange={e => updateThresholds(Number(e.target.value), config.sqlThreshold)}
                    className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-sm text-white"
                  />
                </label>
                <label className="text-xs text-zinc-300">
                  SQL Threshold
                  <input
                    type="number"
                    min={20}
                    max={99}
                    value={config.sqlThreshold}
                    onChange={e => updateThresholds(config.mqlThreshold, Number(e.target.value))}
                    className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-sm text-white"
                  />
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-base font-bold text-[#D4AF37]">Feature Signal Weights</h2>
              {config.rules.map(rule => (
                <div key={rule.id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="flex items-center gap-2 text-sm font-medium text-zinc-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={() => toggleRuleEnabled(rule.id)}
                      />
                      {rule.label}
                    </label>
                    <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">{rule.category}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      aria-label={`Weight for ${rule.label}`}
                      min={-50}
                      max={50}
                      value={rule.weightPoints}
                      onChange={e => updateRuleWeight(rule.id, Number(e.target.value))}
                      className="flex-1 accent-[#D4AF37]"
                    />
                    <span className="text-xs font-mono font-bold text-[#D4AF37] w-12 text-right">
                      {rule.weightPoints > 0 ? `+${rule.weightPoints}` : rule.weightPoints} pts
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-5">
            <form onSubmit={handleAddLead} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                type="text"
                placeholder="Lead Full Name"
                value={newLeadName}
                onChange={e => setNewLeadName(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white"
              />
              <input
                type="email"
                placeholder="Work Email"
                value={newLeadEmail}
                onChange={e => setNewLeadEmail(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white"
              />
              <input
                type="text"
                placeholder="Company"
                value={newLeadCompany}
                onChange={e => setNewLeadCompany(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white"
              />
              <button
                type="submit"
                className="bg-[#D4AF37] text-black font-bold text-sm rounded px-4 py-2 hover:opacity-90"
              >
                + Add Lead to Engine
              </button>
            </form>

            <div className="flex gap-2" role="tablist" aria-label="Lead Qualification Tier Filter">
              {(['ALL', 'SQL', 'MQL', 'Nurture'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tierFilter === t}
                  onClick={() => setTierFilter(t)}
                  className={`px-3 py-1.5 rounded text-xs font-bold ${
                    tierFilter === t ? 'bg-[#D4AF37] text-black' : 'bg-zinc-900 text-zinc-300 border border-zinc-800'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {filteredLeads.map(lead => (
                <div key={lead.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
                  <div className="flex flex-wrap justify-between items-start gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">{lead.name}</h3>
                      <p className="text-xs text-zinc-400">
                        {lead.email} · {lead.company}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs text-zinc-400">ML Conversion Prob.</div>
                        <div className="text-sm font-bold text-zinc-200">{lead.conversionProbPct}%</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-zinc-400">Lead Score</div>
                        <div className="text-2xl font-extrabold text-[#D4AF37]">{lead.clampedScore} / 100</div>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          lead.tier === 'SQL'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                            : lead.tier === 'MQL'
                            ? 'bg-amber-950 text-[#D4AF37] border border-[#D4AF37]'
                            : 'bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        {lead.tier}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-800">
                    <div className="text-xs text-zinc-400 mb-2">Observed Behavioral & Firmographic Signals:</div>
                    <div className="flex flex-wrap gap-2">
                      {config.rules.map(rule => {
                        const active = lead.activeSignals.includes(rule.signalKey);
                        return (
                          <button
                            key={rule.id}
                            type="button"
                            onClick={() => toggleLeadSignal(lead.id, rule.signalKey)}
                            className={`px-2.5 py-1 rounded text-xs border transition ${
                              active
                                ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37] font-semibold'
                                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                            }`}
                          >
                            {active ? '✓ ' : '+ '}
                            {rule.label} ({rule.weightPoints > 0 ? `+${rule.weightPoints}` : rule.weightPoints})
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadScoringEngine;
