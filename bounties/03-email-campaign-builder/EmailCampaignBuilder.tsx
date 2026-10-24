'use client';

import React, { useEffect, useState } from 'react';

export interface EmailCampaign {
  id: string;
  subject: string;
  headlineBlock: string;
  ctaText: string;
  scheduledAt: string;
  sentCount: number;
  openRate: number;
  clickRate: number;
  status: 'Scheduled' | 'Sent';
}

const DEFAULT_CAMPAIGNS: EmailCampaign[] = [
  {
    id: 'em-1',
    subject: 'Unlock Your 75% Agent Midas Partner Commission',
    headlineBlock: 'Scale recurring revenue with Two-Up automated attribution.',
    ctaText: 'Activate Partner Portal',
    scheduledAt: '2026-10-25T10:00',
    sentCount: 4200,
    openRate: 48.5,
    clickRate: 14.2,
    status: 'Sent',
  },
];

const STORAGE_KEY = 'agentmidas_email_campaigns_v2';

export function EmailCampaignBuilder() {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>(DEFAULT_CAMPAIGNS);
  const [subject, setSubject] = useState<string>('Q4 Enterprise AI Launch Sequence');
  const [headlineBlock, setHeadlineBlock] = useState<string>('Deploy autonomous agents across your CRM in 60 seconds.');
  const [ctaText, setCtaText] = useState<string>('Claim Free Sandbox');
  const [scheduledAt, setScheduledAt] = useState<string>('2026-10-26T14:00');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as EmailCampaign[];
        if (Array.isArray(parsed) && parsed.length > 0) setCampaigns(parsed);
      }
    } catch {}
  }, []);

  const handleScheduleCampaign = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!subject.trim()) return;
    const created: EmailCampaign = {
      id: `em-${Date.now().toString().slice(-4)}`,
      subject: subject.trim(),
      headlineBlock: headlineBlock.trim(),
      ctaText: ctaText.trim(),
      scheduledAt,
      sentCount: 1500,
      openRate: 44.0,
      clickRate: 12.8,
      status: 'Scheduled',
    };
    const next = [created, ...campaigns];
    setCampaigns(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };

  return (
    <section aria-label="Email Campaign Builder" className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleScheduleCampaign} className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-5 space-y-4">
          <h1 className="text-2xl font-bold text-[#D4AF37]">Email Campaign Builder</h1>
          <div>
            <label htmlFor="em-subject" className="block text-xs text-[#A3A3A3] mb-1">Subject Line</label>
            <input id="em-subject" type="text" required value={subject} onChange={e => setSubject(e.target.value)} className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#F5F5F5]" />
          </div>
          <div>
            <label htmlFor="em-headline" className="block text-xs text-[#A3A3A3] mb-1">Hero Body Copy Block</label>
            <textarea id="em-headline" rows={3} value={headlineBlock} onChange={e => setHeadlineBlock(e.target.value)} className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#F5F5F5]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="em-cta" className="block text-xs text-[#A3A3A3] mb-1">CTA Button Label</label>
              <input id="em-cta" type="text" value={ctaText} onChange={e => setCtaText(e.target.value)} className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#F5F5F5]" />
            </div>
            <div>
              <label htmlFor="em-schedule" className="block text-xs text-[#A3A3A3] mb-1">Send Schedule</label>
              <input id="em-schedule" type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#F5F5F5]" />
            </div>
          </div>
          <button type="submit" className="w-full py-2.5 rounded-lg bg-[#D4AF37] text-[#0A0A0A] font-bold text-sm">
            Schedule & Save Campaign
          </button>
        </form>

        <div className="space-y-4">
          <div className="bg-[#0D0D0D] border border-[#D4AF37]/50 rounded-xl p-5 space-y-3">
            <p className="text-xs uppercase text-[#D4AF37]">Live Visual Template Preview</p>
            <h2 className="text-lg font-bold">{subject}</h2>
            <p className="text-sm text-[#A3A3A3]">{headlineBlock}</p>
            <span className="inline-block px-4 py-2 rounded bg-[#D4AF37] text-[#0A0A0A] font-bold text-xs">
              {ctaText}
            </span>
          </div>

          <div className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-5 space-y-2">
            <h3 className="text-sm font-semibold text-[#D4AF37]">Campaign Analytics & Queue ({campaigns.length})</h3>
            {campaigns.map(c => (
              <div key={c.id} className="p-3 rounded bg-[#141414] border border-[#262626] flex justify-between items-center text-xs">
                <div>
                  <p className="font-bold text-[#F5F5F5]">{c.subject}</p>
                  <p className="text-[#A3A3A3]">{c.status} • {c.scheduledAt.replace('T', ' ')}</p>
                </div>
                <div className="text-right font-mono text-[#22C55E]">
                  Open {c.openRate}% • Click {c.clickRate}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default EmailCampaignBuilder;
