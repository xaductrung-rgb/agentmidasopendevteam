'use client';

import React, { useEffect, useState } from 'react';

export interface ScheduledSocialPost {
  id: string;
  platform: 'X (Twitter)' | 'LinkedIn' | 'Instagram';
  content: string;
  scheduledTime: string;
  impressions: number;
  engagementRate: number;
}

const PLATFORM_LIMITS: Record<ScheduledSocialPost['platform'], number> = {
  'X (Twitter)': 280,
  LinkedIn: 3000,
  Instagram: 2200,
};

const STORAGE_KEY = 'agentmidas_social_posts_v2';

export function SocialMediaScheduler() {
  const [posts, setPosts] = useState<ScheduledSocialPost[]>([
    {
      id: 'sp-1',
      platform: 'X (Twitter)',
      content: 'Shipping zero-dependency apps on the Agent Midas Developer OS Program! #AgentMidas',
      scheduledTime: '2026-10-25T15:00',
      impressions: 12800,
      engagementRate: 6.4,
    },
  ]);
  const [platform, setPlatform] = useState<ScheduledSocialPost['platform']>('X (Twitter)');
  const [content, setContent] = useState<string>('Earn 75% recurring affiliate commissions with Agent Midas.');
  const [scheduledTime, setScheduledTime] = useState<string>('2026-10-26T12:00');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ScheduledSocialPost[];
        if (Array.isArray(parsed) && parsed.length > 0) setPosts(parsed);
      }
    } catch {}
  }, []);

  const charLimit = PLATFORM_LIMITS[platform];
  const isOverLimit = content.length > charLimit;

  const handleSchedulePost = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!content.trim() || isOverLimit) return;
    const created: ScheduledSocialPost = {
      id: `sp-${Date.now().toString().slice(-4)}`,
      platform,
      content: content.trim(),
      scheduledTime,
      impressions: 4500,
      engagementRate: 5.8,
    };
    const next = [created, ...posts];
    setPosts(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
    setContent('');
  };

  return (
    <section aria-label="Social Media Scheduler" className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleSchedulePost} className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-5 space-y-4">
          <h1 className="text-2xl font-bold text-[#D4AF37]">Social Media Scheduler</h1>
          <div>
            <label htmlFor="sm-platform" className="block text-xs text-[#A3A3A3] mb-1">Target Platform</label>
            <select
              id="sm-platform"
              value={platform}
              onChange={e => setPlatform(e.target.value as ScheduledSocialPost['platform'])}
              className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#F5F5F5]"
            >
              <option value="X (Twitter)">X (Twitter) — 280 chars</option>
              <option value="LinkedIn">LinkedIn — 3,000 chars</option>
              <option value="Instagram">Instagram — 2,200 chars</option>
            </select>
          </div>
          <div>
            <label htmlFor="sm-content" className="block text-xs text-[#A3A3A3] mb-1">
              Post Copy ({content.length} / {charLimit} chars)
            </label>
            <textarea
              id="sm-content"
              rows={4}
              required
              value={content}
              onChange={e => setContent(e.target.value)}
              className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#F5F5F5]"
            />
          </div>
          <div>
            <label htmlFor="sm-time" className="block text-xs text-[#A3A3A3] mb-1">Scheduled Publish Time</label>
            <input
              id="sm-time"
              type="datetime-local"
              required
              value={scheduledTime}
              onChange={e => setScheduledTime(e.target.value)}
              className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#F5F5F5]"
            />
          </div>
          <button
            type="submit"
            disabled={isOverLimit}
            className="w-full py-2.5 rounded-lg bg-[#D4AF37] text-[#0A0A0A] font-bold text-sm disabled:opacity-40"
          >
            Schedule Multi-Platform Post
          </button>
        </form>

        <div className="space-y-4">
          <div className="bg-[#0D0D0D] border border-[#D4AF37]/40 rounded-xl p-5">
            <p className="text-xs uppercase text-[#D4AF37] mb-2">Live {platform} Card Preview</p>
            <p className="text-sm whitespace-pre-wrap">{content || 'Start typing to preview your post...'}</p>
          </div>

          <div className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-5 space-y-2">
            <h2 className="text-sm font-semibold text-[#D4AF37]">Scheduled Queue & Analytics ({posts.length})</h2>
            {posts.map(p => (
              <div key={p.id} className="p-3 rounded bg-[#141414] border border-[#262626] text-xs space-y-1">
                <div className="flex justify-between text-[#D4AF37] font-semibold">
                  <span>{p.platform}</span>
                  <span>{p.scheduledTime.replace('T', ' ')}</span>
                </div>
                <p className="text-[#F5F5F5]">{p.content}</p>
                <p className="text-[#22C55E]">Impressions: {p.impressions.toLocaleString()} • Engagement: {p.engagementRate}%</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default SocialMediaScheduler;
