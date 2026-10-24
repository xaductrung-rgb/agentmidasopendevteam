'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';

export interface EmailBlock {
  id: string;
  type: 'header' | 'paragraph' | 'cta' | 'footer';
  text: string;
  ctaUrl?: string;
}

export interface EmailCampaign {
  id: string;
  name: string;
  subjectLine: string;
  segment: string;
  blocks: EmailBlock[];
  scheduledAt: string;
  status: 'Queued' | 'Ready (Awaiting ESP)' | 'Dispatched';
  sentCount: number;
  openCount: number;
  clickCount: number;
}

export interface EmailCampaignBuilderProps {
  storageKey?: string;
  dispatchEndpoint?: string;
  onDispatchCampaign?: (campaign: EmailCampaign) => Promise<{ sentCount?: number }>;
  onChange?: (campaigns: EmailCampaign[]) => void | Promise<void>;
}

const DEFAULT_BLOCKS: EmailBlock[] = [
  { id: 'b-1', type: 'header', text: 'Unlock 50% Two-Up Commissions This Quarter' },
  { id: 'b-2', type: 'paragraph', text: 'Your partner dashboard now includes real-time genealogy pass-up analytics.' },
  { id: 'b-3', type: 'cta', text: 'Open Affiliate Dashboard', ctaUrl: 'https://app.agentmidas.dev/dashboard' },
  { id: 'b-4', type: 'footer', text: 'Agent Midas Inc. · Unsubscribe anytime' }
];

const DEFAULT_CAMPAIGNS: EmailCampaign[] = [
  {
    id: 'cmp-101',
    name: 'October Affiliate Tier Upgrade Announcement',
    subjectLine: 'Unlock 50% Two-Up Commissions This Quarter',
    segment: 'Active Affiliates',
    blocks: DEFAULT_BLOCKS,
    scheduledAt: '2026-10-20T14:00',
    status: 'Dispatched',
    sentCount: 1420,
    openCount: 610,
    clickCount: 195
  }
];

export const EmailCampaignBuilder: React.FC<EmailCampaignBuilderProps> = ({
  storageKey = 'agentmidas_email_campaigns_v3',
  dispatchEndpoint,
  onDispatchCampaign,
  onChange
}) => {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_CAMPAIGNS;
  });

  const campaignsRef = useRef<EmailCampaign[]>(campaigns);
  campaignsRef.current = campaigns;
  const saveSeqRef = useRef(0);

  const [name, setName] = useState('');
  const [subjectLine, setSubjectLine] = useState('');
  const [segment, setSegment] = useState('All Subscribers');
  const [blocks, setBlocks] = useState<EmailBlock[]>(DEFAULT_BLOCKS);
  const [scheduledAt, setScheduledAt] = useState('2026-12-01T09:00');
  const [errorMsg, setErrorMsg] = useState('');
  const [notice, setNotice] = useState('');

  const persistList = async (next: EmailCampaign[], msg?: string) => {
    const seq = ++saveSeqRef.current;
    const prev = campaignsRef.current;
    campaignsRef.current = next;
    setCampaigns(next);
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
        campaignsRef.current = prev;
        setCampaigns(prev);
        setErrorMsg('Failed to persist campaign queue; rolled back.');
      }
    }
  };

  // Scheduler loop: only dispatches when scheduledAt <= Date.now(), and never fabricates sentCount when no ESP is wired
  useEffect(() => {
    const timer = setInterval(async () => {
      const now = Date.now();
      const curr = campaignsRef.current;
      const dueCampaigns = curr.filter(
        c => c.status === 'Queued' && typeof c.scheduledAt === 'string' && Date.parse(c.scheduledAt) <= now
      );
      if (dueCampaigns.length === 0) return;

      const updated: EmailCampaign[] = [];
      for (const c of curr) {
        if (c.status === 'Queued' && typeof c.scheduledAt === 'string' && Date.parse(c.scheduledAt) <= now) {
          if (onDispatchCampaign) {
            try {
              const res = await onDispatchCampaign(c);
              updated.push({ ...c, status: 'Dispatched', sentCount: res?.sentCount ?? c.sentCount });
              continue;
            } catch {}
          } else if (dispatchEndpoint) {
            try {
              const resp = await fetch(dispatchEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(c)
              });
              if (resp.ok) {
                updated.push({ ...c, status: 'Dispatched' });
                continue;
              }
            } catch {}
          }
          // No live ESP configured: mark Ready without fabricating sentCount
          updated.push({ ...c, status: 'Ready (Awaiting ESP)' });
        } else {
          updated.push(c);
        }
      }
      await persistList(updated, 'Processed due scheduled campaigns.');
    }, 5000);
    return () => clearInterval(timer);
  }, [onDispatchCampaign, dispatchEndpoint]);

  const addBlock = (type: EmailBlock['type']) => {
    const created: EmailBlock = {
      id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      type,
      text: type === 'cta' ? 'Claim Your Bonus' : `New ${type} block`,
      ctaUrl: type === 'cta' ? 'https://app.agentmidas.dev' : undefined
    };
    setBlocks(curr => [...curr, created]);
  };

  const updateBlockText = (id: string, text: string) => {
    setBlocks(curr => curr.map(b => (b.id === id ? { ...b, text } : b)));
  };

  const removeBlock = (id: string) => {
    setBlocks(curr => (curr.length > 1 ? curr.filter(b => b.id !== id) : curr));
  };

  const aggregateAnalytics = useMemo(() => {
    const totalSent = campaigns.reduce((s, c) => s + (c.sentCount || 0), 0);
    const totalOpens = campaigns.reduce((s, c) => s + (c.openCount || 0), 0);
    const totalClicks = campaigns.reduce((s, c) => s + (c.clickCount || 0), 0);
    const openRatePct = totalSent > 0 ? (totalOpens / totalSent) * 100 : 0;
    const ctrPct = totalSent > 0 ? (totalClicks / totalSent) * 100 : 0;
    const ctorPct = totalOpens > 0 ? (totalClicks / totalOpens) * 100 : 0;
    return { totalSent, totalOpens, totalClicks, openRatePct, ctrPct, ctorPct };
  }, [campaigns]);

  const handleScheduleCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !subjectLine.trim() || !scheduledAt.trim()) {
      setErrorMsg('Campaign name, subject line, and schedule timestamp are required.');
      return;
    }
    const parsedTime = Date.parse(scheduledAt);
    if (Number.isNaN(parsedTime)) {
      setErrorMsg('Invalid schedule date/time format.');
      return;
    }

    const isDueNow = parsedTime <= Date.now();
    const created: EmailCampaign = {
      id: `cmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      subjectLine: subjectLine.trim(),
      segment,
      blocks: [...blocks],
      scheduledAt: scheduledAt.trim(),
      status: 'Queued',
      sentCount: 0,
      openCount: 0,
      clickCount: 0
    };

    // Only dispatch immediately if scheduled time is already due now
    if (isDueNow) {
      if (onDispatchCampaign) {
        try {
          const res = await onDispatchCampaign(created);
          created.status = 'Dispatched';
          created.sentCount = res?.sentCount ?? 0;
        } catch {
          setErrorMsg('Live ESP dispatch callback failed.');
          return;
        }
      } else if (dispatchEndpoint) {
        try {
          const resp = await fetch(dispatchEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(created)
          });
          if (!resp.ok) throw new Error('ESP HTTP error');
          created.status = 'Dispatched';
        } catch {
          setErrorMsg('Live ESP dispatch endpoint failed.');
          return;
        }
      } else {
        created.status = 'Ready (Awaiting ESP)';
      }
    }

    setName('');
    setSubjectLine('');
    await persistList([created, ...campaignsRef.current], `Saved campaign "${created.name}" (${created.status}).`);
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="border-b border-zinc-800 pb-4 flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#D4AF37]">Visual Email Campaign Builder, Scheduler & Attribution</h1>
            <p className="text-sm text-zinc-400">Drag-and-drop block editor, scheduled ESP dispatch, and Open/CTR/CTOR analytics</p>
          </div>
          <div className="flex gap-3 text-xs">
            <div className="bg-zinc-900 border border-zinc-800 px-3 py-2 rounded">
              <div className="text-zinc-400">Open Rate</div>
              <div className="text-base font-bold text-emerald-400">{aggregateAnalytics.openRatePct.toFixed(1)}%</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 px-3 py-2 rounded">
              <div className="text-zinc-400">Click Rate (CTR)</div>
              <div className="text-base font-bold text-[#D4AF37]">{aggregateAnalytics.ctrPct.toFixed(1)}%</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 px-3 py-2 rounded">
              <div className="text-zinc-400">Click-to-Open (CTOR)</div>
              <div className="text-base font-bold text-white">{aggregateAnalytics.ctorPct.toFixed(1)}%</div>
            </div>
          </div>
        </header>

        {notice && <div role="status" className="bg-emerald-950/60 border border-emerald-700 text-emerald-200 px-4 py-2 rounded text-sm">{notice}</div>}
        {errorMsg && <div role="alert" className="bg-red-950/60 border border-red-700 text-red-200 px-4 py-2 rounded text-sm">{errorMsg}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Visual Block Editor & Campaign Scheduler */}
          <form onSubmit={handleScheduleCampaign} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
            <h2 className="text-base font-bold text-[#D4AF37]">1. Campaign Metadata & Visual Blocks</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input aria-label="Campaign Name" value={name} onChange={e => setName(e.target.value)} placeholder="Campaign Name" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
              <input aria-label="Email Subject Line" value={subjectLine} onChange={e => setSubjectLine(e.target.value)} placeholder="Email Subject Line" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
              <select aria-label="Recipient Segment" value={segment} onChange={e => setSegment(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white">
                <option value="All Subscribers">All Subscribers</option>
                <option value="Active Affiliates">Active Affiliates</option>
                <option value="Enterprise Leads">Enterprise Leads</option>
              </select>
              <input aria-label="Schedule Timestamp" type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
            </div>

            <div className="flex flex-wrap gap-2">
              {(['header', 'paragraph', 'cta', 'footer'] as const).map(t => (
                <button key={t} type="button" onClick={() => addBlock(t)} className="px-2.5 py-1 rounded bg-zinc-800 text-xs text-[#D4AF37] font-bold">
                  + Add {t.toUpperCase()} Block
                </button>
              ))}
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {blocks.map(b => (
                <div key={b.id} className="flex gap-2 items-center bg-zinc-950 border border-zinc-800 rounded p-2">
                  <span className="text-xs font-mono text-[#D4AF37] w-20 uppercase">{b.type}</span>
                  <input
                    aria-label={`Edit ${b.type} block text`}
                    value={b.text}
                    onChange={e => updateBlockText(b.id, e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-white"
                  />
                  <button type="button" onClick={() => removeBlock(b.id)} className="text-xs text-red-400 px-2">✕</button>
                </div>
              ))}
            </div>

            <button type="submit" className="bg-[#D4AF37] text-black font-bold text-sm px-5 py-2 rounded">
              Queue / Schedule Campaign
            </button>
          </form>

          {/* Rendered Visual Email Preview */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
            <h2 className="text-base font-bold text-[#D4AF37]">2. Live Visual Email Template Preview</h2>
            <div className="bg-white text-zinc-900 rounded-lg p-6 space-y-4">
              {blocks.map(b => {
                if (b.type === 'header') return <h3 key={b.id} className="text-xl font-bold text-zinc-900">{b.text}</h3>;
                if (b.type === 'cta') {
                  return (
                    <div key={b.id} className="py-2">
                      <span className="inline-block bg-[#D4AF37] text-black font-bold text-xs px-4 py-2 rounded">
                        {b.text}
                      </span>
                    </div>
                  );
                }
                if (b.type === 'footer') return <p key={b.id} className="text-xs text-zinc-500 border-t pt-3">{b.text}</p>;
                return <p key={b.id} className="text-sm text-zinc-700">{b.text}</p>;
              })}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {campaigns.map(c => {
            const safeSchedule = typeof c.scheduledAt === 'string' && c.scheduledAt ? c.scheduledAt.replace('T', ' ') : 'Unscheduled';
            const openPct = c.sentCount > 0 ? ((c.openCount / c.sentCount) * 100).toFixed(1) : '0.0';
            const clickPct = c.sentCount > 0 ? ((c.clickCount / c.sentCount) * 100).toFixed(1) : '0.0';
            return (
              <div key={c.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-wrap justify-between items-center gap-4">
                <div>
                  <div className="font-bold text-white">{c.name}</div>
                  <div className="text-xs text-zinc-400">
                    Subject: "{c.subjectLine}" · Segment: {c.segment} · Scheduled: {safeSchedule}
                  </div>
                </div>
                <div className="text-xs text-right">
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-[#D4AF37] font-bold">{c.status}</span>
                  <div className="text-zinc-400 mt-1">
                    Sent: {c.sentCount ?? 0} · Opens: {c.openCount ?? 0} ({openPct}%) · Clicks: {c.clickCount ?? 0} ({clickPct}%)
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

export default EmailCampaignBuilder;
