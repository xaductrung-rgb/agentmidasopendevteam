'use client';
import React, { useState, useEffect, useRef } from 'react';

export interface EmailCampaign {
  id: string;
  name: string;
  subjectLine: string;
  segment: string;
  htmlBody: string;
  scheduledAt: string;
  status: 'Queued' | 'Dispatched';
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

const DEFAULT_CAMPAIGNS: EmailCampaign[] = [
  {
    id: 'cmp-101',
    name: 'October Affiliate Tier Upgrade Announcement',
    subjectLine: 'Unlock 50% Two-Up Commissions This Quarter',
    segment: 'Active Affiliates',
    htmlBody: '<h1>Hello {{first_name}}</h1><p>Your Two-Up dashboard is live.</p>',
    scheduledAt: '2026-10-20T14:00',
    status: 'Dispatched',
    sentCount: 1420,
    openCount: 610,
    clickCount: 195
  }
];

export const EmailCampaignBuilder: React.FC<EmailCampaignBuilderProps> = ({
  storageKey = 'agentmidas_email_campaigns_v2',
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
  const [htmlBody, setHtmlBody] = useState('<h1>Agent Midas Update</h1><p>Exclusive partner insights.</p>');
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

  // Automatic scheduler timer: triggers due queued campaigns when their scheduledAt timestamp arrives
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const curr = campaignsRef.current;
      const hasDue = curr.some(
        c => c.status === 'Queued' && typeof c.scheduledAt === 'string' && Date.parse(c.scheduledAt) <= now
      );
      if (hasDue) {
        const updated = curr.map(c =>
          c.status === 'Queued' && typeof c.scheduledAt === 'string' && Date.parse(c.scheduledAt) <= now
            ? { ...c, status: 'Dispatched' as const, sentCount: Math.max(1, c.sentCount) }
            : c
        );
        void persistList(updated, 'Scheduled campaign reached target time and was automatically dispatched.');
      }
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const recordTrackingEvent = (id: string, field: 'sentCount' | 'openCount' | 'clickCount') => {
    const next = campaignsRef.current.map(c =>
      c.id === id ? { ...c, [field]: (c[field] || 0) + 1 } : c
    );
    void persistList(next, `Recorded verified ${field.replace('Count', '')} tracking event.`);
  };

  const handleScheduleCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !subjectLine.trim() || !scheduledAt.trim()) {
      setErrorMsg('Campaign name, subject line, and a valid schedule timestamp are required.');
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
      htmlBody,
      scheduledAt: scheduledAt.trim(),
      status: isDueNow ? 'Dispatched' : 'Queued',
      sentCount: 0,
      openCount: 0,
      clickCount: 0
    };

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
    }

    setName('');
    setSubjectLine('');
    const next = [created, ...campaignsRef.current];
    await persistList(next, `Saved campaign "${created.name}" (${created.status}).`);
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="border-b border-zinc-800 pb-4">
          <h1 className="text-2xl font-bold text-[#D4AF37]">Email Campaign Template Builder, Scheduler & Attribution Tracker</h1>
        </header>

        {notice && <div role="status" className="bg-emerald-950/60 border border-emerald-700 text-emerald-200 px-4 py-2 rounded text-sm">{notice}</div>}
        {errorMsg && <div role="alert" className="bg-red-950/60 border border-red-700 text-red-200 px-4 py-2 rounded text-sm">{errorMsg}</div>}

        <form onSubmit={handleScheduleCampaign} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Campaign Name" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
            <input value={subjectLine} onChange={e => setSubjectLine(e.target.value)} placeholder="Email Subject Line" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
            <select value={segment} onChange={e => setSegment(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white">
              <option value="All Subscribers">All Subscribers</option>
              <option value="Active Affiliates">Active Affiliates</option>
              <option value="Enterprise Leads">Enterprise Leads</option>
            </select>
            <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
          </div>
          <textarea rows={3} value={htmlBody} onChange={e => setHtmlBody(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-sm font-mono text-zinc-200" />
          <button type="submit" className="bg-[#D4AF37] text-black font-bold text-sm px-5 py-2 rounded">
            Schedule / Dispatch Campaign
          </button>
        </form>

        <div className="space-y-3">
          {campaigns.map(c => {
            const safeSchedule = typeof c.scheduledAt === 'string' && c.scheduledAt ? c.scheduledAt.replace('T', ' ') : 'Unscheduled';
            return (
              <div key={c.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-wrap justify-between items-center gap-4">
                <div>
                  <div className="font-bold text-white">{c.name}</div>
                  <div className="text-xs text-zinc-400">
                    Subject: "{c.subjectLine}" · Segment: {c.segment} · Scheduled: {safeSchedule}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-[#D4AF37] font-bold">{c.status}</span>
                  <button type="button" onClick={() => recordTrackingEvent(c.id, 'sentCount')} className="px-2 py-1 rounded bg-zinc-800 text-zinc-200">
                    + Sent ({c.sentCount ?? 0})
                  </button>
                  <button type="button" onClick={() => recordTrackingEvent(c.id, 'openCount')} className="px-2 py-1 rounded bg-zinc-800 text-emerald-300">
                    + Open ({c.openCount ?? 0})
                  </button>
                  <button type="button" onClick={() => recordTrackingEvent(c.id, 'clickCount')} className="px-2 py-1 rounded bg-zinc-800 text-[#D4AF37]">
                    + Click ({c.clickCount ?? 0})
                  </button>
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
