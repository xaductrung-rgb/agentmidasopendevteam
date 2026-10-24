'use client';
import React, { useState, useRef } from 'react';

export type SocialPlatform = 'X' | 'LinkedIn' | 'Instagram' | 'YouTube';

export interface ScheduledSocialPost {
  id: string;
  platforms: SocialPlatform[];
  content: string;
  scheduledAt: string;
  status: 'Scheduled' | 'Published';
  impressions: number;
  engagementRatePct: number;
}

export interface SocialMediaSchedulerProps {
  storageKey?: string;
  initialPosts?: ScheduledSocialPost[];
  nowMs?: number;
  onChange?: (posts: ScheduledSocialPost[]) => void | Promise<void>;
}

const ALL_PLATFORMS: SocialPlatform[] = ['X', 'LinkedIn', 'Instagram', 'YouTube'];

const PLATFORM_CHAR_LIMITS: Record<SocialPlatform, number> = {
  X: 280,
  LinkedIn: 3000,
  Instagram: 2200,
  YouTube: 5000
};

const DEFAULT_POSTS: ScheduledSocialPost[] = [
  {
    id: 'post-1',
    platforms: ['X', 'LinkedIn'],
    content: 'Agent Midas v2.4 SDK is live with zero-latency webhook verification.',
    scheduledAt: '2026-11-15T15:00',
    status: 'Scheduled',
    impressions: 0,
    engagementRatePct: 0
  }
];

export const SocialMediaScheduler: React.FC<SocialMediaSchedulerProps> = ({
  storageKey = 'agentmidas_social_scheduler_v2',
  initialPosts = DEFAULT_POSTS,
  nowMs = Date.now(),
  onChange
}) => {
  const [posts, setPosts] = useState<ScheduledSocialPost[]>(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return initialPosts;
  });

  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>(['X', 'LinkedIn']);
  const [content, setContent] = useState('Launching our new affiliate analytics suite today! #AgentMidas');
  const [scheduledAt, setScheduledAt] = useState('2026-12-01T14:00');
  const [errorMsg, setErrorMsg] = useState('');
  const [notice, setNotice] = useState('');
  const saveSeqRef = useRef(0);

  const togglePlatform = (p: SocialPlatform) => {
    setSelectedPlatforms(curr =>
      curr.includes(p) ? curr.filter(item => item !== p) : [...curr, p]
    );
  };

  const handleSchedulePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setNotice('');

    if (selectedPlatforms.length === 0) {
      setErrorMsg('Select at least one target social platform.');
      return;
    }
    if (!content.trim()) {
      setErrorMsg('Post content cannot be empty.');
      return;
    }
    const overLimit = selectedPlatforms.find(p => content.trim().length > PLATFORM_CHAR_LIMITS[p]);
    if (overLimit) {
      setErrorMsg(`Content exceeds ${overLimit} character limit (${PLATFORM_CHAR_LIMITS[overLimit]} chars).`);
      return;
    }
    const parsedTime = Date.parse(scheduledAt);
    if (Number.isNaN(parsedTime) || parsedTime <= nowMs) {
      setErrorMsg('Schedule time must be a valid future timestamp.');
      return;
    }

    const created: ScheduledSocialPost = {
      id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      platforms: [...selectedPlatforms],
      content: content.trim(),
      scheduledAt,
      status: 'Scheduled',
      impressions: 0,
      engagementRatePct: 0
    };

    const seq = ++saveSeqRef.current;
    const prev = posts;
    const next = [created, ...posts];
    setPosts(next);
    try {
      if (onChange) {
        await onChange(next);
      }
      if (seq !== saveSeqRef.current) return;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      }
      setContent('');
      setNotice(`Scheduled post across ${created.platforms.join(', ')} for ${scheduledAt.replace('T', ' ')}.`);
    } catch {
      if (seq === saveSeqRef.current) {
        setPosts(prev);
        setErrorMsg('Failed to save scheduled post to storage; changes rolled back.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="border-b border-zinc-800 pb-4">
          <h1 className="text-2xl font-bold text-[#D4AF37]">Multi-Platform Social Media Scheduler & Live Preview</h1>
          <p className="text-sm text-zinc-400">Cross-post scheduling and real-time card previews across X, LinkedIn, Instagram, and YouTube</p>
        </header>

        {notice && <div role="status" className="bg-emerald-950/60 border border-emerald-700 text-emerald-200 px-4 py-2 rounded text-sm">{notice}</div>}
        {errorMsg && <div role="alert" className="bg-red-950/60 border border-red-700 text-red-200 px-4 py-2 rounded text-sm">{errorMsg}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={handleSchedulePost} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap gap-3 items-center">
              <span className="text-xs text-zinc-400 font-bold uppercase">Target Platforms:</span>
              {ALL_PLATFORMS.map(p => (
                <label key={p} className="flex items-center gap-1.5 text-sm text-zinc-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedPlatforms.includes(p)}
                    onChange={() => togglePlatform(p)}
                  />
                  {p}
                </label>
              ))}
            </div>

            <textarea
              rows={4}
              placeholder="Write your multi-platform post..."
              value={content}
              onChange={e => setContent(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-sm text-white"
            />

            <div className="flex flex-wrap justify-between items-center gap-3">
              <input
                type="datetime-local"
                aria-label="Scheduled Publish Time"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white"
              />
              <button type="submit" className="bg-[#D4AF37] text-black font-bold text-sm px-5 py-2 rounded">
                Schedule Multi-Platform Post
              </button>
            </div>
          </form>

          {/* Live Multi-Platform Post Preview Panel */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3" aria-label="Live Post Preview">
            <h2 className="text-sm font-bold text-[#D4AF37] uppercase tracking-wider">
              Live Multi-Platform Preview ({selectedPlatforms.length} selected)
            </h2>
            {selectedPlatforms.length === 0 ? (
              <p className="text-xs text-zinc-500">Select at least one platform to preview formatting.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedPlatforms.map(plat => {
                  const limit = PLATFORM_CHAR_LIMITS[plat];
                  const len = content.trim().length;
                  return (
                    <div key={plat} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-[#D4AF37]">{plat} Feed Preview</span>
                        <span className={len > limit ? 'text-red-400 font-bold' : 'text-zinc-400'}>
                          {len} / {limit} chars
                        </span>
                      </div>
                      <p className="text-xs text-zinc-200 whitespace-pre-wrap break-words">
                        {content.trim() || 'Draft post content will appear here...'}
                      </p>
                      <div className="text-[11px] text-zinc-500">
                        Scheduled: {scheduledAt ? scheduledAt.replace('T', ' ') : 'Unscheduled'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {posts.map(p => (
            <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex justify-between items-center">
              <div>
                <div className="flex gap-1.5 mb-1">
                  {(Array.isArray(p.platforms) ? p.platforms : []).map(plat => (
                    <span key={plat} className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-[#D4AF37] font-bold">
                      {plat}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-white">{p.content}</p>
                <div className="text-xs text-zinc-400 mt-1">
                  Scheduled: {typeof p.scheduledAt === 'string' ? p.scheduledAt.replace('T', ' ') : ''}
                </div>
              </div>
              <div className="text-xs text-right text-zinc-400">
                <div className="font-bold text-[#D4AF37]">{p.status}</div>
                <div>
                  {p.status === 'Published'
                    ? `${p.impressions.toLocaleString()} impressions (${p.engagementRatePct}%)`
                    : 'Pending publish (0 impressions)'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SocialMediaScheduler;
