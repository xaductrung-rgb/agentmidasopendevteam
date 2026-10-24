import React, { useState } from 'react';

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
    scheduledAt: '2026-10-28T14:00',
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

  const [name, setName] = useState('');
  const [subjectLine, setSubjectLine] = useState('');
  const [segment, setSegment] = useState('All Subscribers');
  const [htmlBody, setHtmlBody] = useState('<h1>Agent Midas Update</h1><p>Exclusive partner insights.</p>');
  const [scheduledAt, setScheduledAt] = useState('2026-11-01T09:00');
  const [errorMsg, setErrorMsg] = useState('');
  const [notice, setNotice] = useState('');

  const persistCampaigns = async (next: EmailCampaign[], msg?: string) => {
    const prev = campaigns;
    setCampaigns(next);
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
      setCampaigns(prev);
      setErrorMsg('Failed to persist campaign queue; rolled back.');
    }
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

    const created: EmailCampaign = {
      id: `cmp-${Date.now()}`,
      name: name.trim(),
      subjectLine: subjectLine.trim(),
      segment,
      htmlBody,
      scheduledAt: scheduledAt.trim(),
      status: 'Queued',
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
    await persistCampaigns(
      [created, ...campaigns],
      created.status === 'Dispatched'
        ? 'Campaign dispatched via configured ESP handler.'
        : 'Campaign queued locally with 0 initial delivery metrics until dispatched.'
    );
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="border-b border-zinc-800 pb-4">
          <h1 className="text-2xl font-bold text-[#D4AF37]">Email Campaign Template Builder & Schedule Queue</h1>
          <p className="text-sm text-zinc-400">
            {onDispatchCampaign || dispatchEndpoint
              ? 'Connected to Live ESP Dispatch Provider'
              : 'Local Campaign Queue Mode (connect onDispatchCampaign or dispatchEndpoint for live SMTP/ESP delivery)'}
          </p>
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
            Queue / Dispatch Campaign
          </button>
        </form>

        <div className="space-y-3">
          {campaigns.map(c => {
            const safeSchedule = typeof c.scheduledAt === 'string' && c.scheduledAt ? c.scheduledAt.replace('T', ' ') : 'Unscheduled';
            return (
              <div key={c.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <div className="font-bold text-white">{c.name}</div>
                  <div className="text-xs text-zinc-400">
                    Subject: "{c.subjectLine}" · Segment: {c.segment} · Scheduled: {safeSchedule}
                  </div>
                </div>
                <div className="text-xs text-right">
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-[#D4AF37] font-bold">{c.status}</span>
                  <div className="text-zinc-400 mt-1">
                    Sent: {c.sentCount ?? 0} · Opens: {c.openCount ?? 0} · Clicks: {c.clickCount ?? 0}
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
