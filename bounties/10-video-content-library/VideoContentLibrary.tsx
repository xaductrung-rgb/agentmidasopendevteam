'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';

export interface VideoAsset {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  durationSec: number;
  tags: string[];
  views: number;
  uploadedAt: string;
}

export interface VideoContentLibraryProps {
  storageKey?: string;
  initialVideos?: VideoAsset[];
  onChange?: (videos: VideoAsset[]) => void | Promise<void>;
}

const DEFAULT_VIDEOS: VideoAsset[] = [
  {
    id: 'vid-101',
    title: 'Two-Up Commission Engine Architecture Deep Dive',
    description: 'Walkthrough of pass-up qualification rules, Stripe Connect splits, and real-time ledger reconciliation.',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    durationSec: 15,
    tags: ['affiliate', 'architecture', 'stripe'],
    views: 1420,
    uploadedAt: '2026-10-18'
  },
  {
    id: 'vid-102',
    title: 'High-Converting Funnel Setup in 10 Minutes',
    description: 'Step-by-step guide to launching mobile-first landing pages with UTM attribution and A/B split testing.',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    durationSec: 15,
    tags: ['funnels', 'conversion', 'onboarding'],
    views: 980,
    uploadedAt: '2026-10-21'
  }
];

function isValidHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidVideo(item: unknown): item is VideoAsset {
  if (!item || typeof item !== 'object') return false;
  const v = item as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.title === 'string' &&
    typeof v.description === 'string' &&
    typeof v.videoUrl === 'string' &&
    isValidHttpUrl(v.videoUrl) &&
    typeof v.durationSec === 'number' &&
    Number.isFinite(v.durationSec) &&
    v.durationSec > 0 &&
    Array.isArray(v.tags) &&
    v.tags.every(t => typeof t === 'string') &&
    typeof v.views === 'number' &&
    Number.isFinite(v.views) &&
    v.views >= 0 &&
    typeof v.uploadedAt === 'string'
  );
}

function formatDuration(sec: number): string {
  const total = Math.max(0, Math.round(sec));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function getLocalDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const VideoContentLibrary: React.FC<VideoContentLibraryProps> = ({
  storageKey = 'agentmidas_video_library_v1',
  initialVideos = DEFAULT_VIDEOS,
  onChange
}) => {
  const [videos, setVideos] = useState<VideoAsset[]>(initialVideos);
  const videosRef = useRef<VideoAsset[]>(videos);
  videosRef.current = videos;
  const saveLockRef = useRef(false);

  const [selectedVideoId, setSelectedVideoId] = useState<string>(initialVideos[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [titleInput, setTitleInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [urlInput, setUrlInput] = useState('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4');
  const [durationInput, setDurationInput] = useState('60');
  const [tagsInput, setTagsInput] = useState('training, product');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.every(isValidVideo)) {
          videosRef.current = parsed;
          setVideos(parsed);
          setSelectedVideoId(parsed[0]?.id || '');
          return;
        }
      }
    } catch {}
    videosRef.current = initialVideos;
    setVideos(initialVideos);
    setSelectedVideoId(initialVideos[0]?.id || '');
  }, [storageKey, initialVideos]);

  const persistVideos = async (next: VideoAsset[], msg: string): Promise<boolean> => {
    if (saveLockRef.current) return false;
    saveLockRef.current = true;
    setIsSaving(true);
    const prev = videosRef.current;
    videosRef.current = next;
    setVideos(next);
    setErrorMsg('');
    try {
      if (onChange) {
        await onChange(next.map(v => ({ ...v, tags: [...v.tags] })));
      }
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(storageKey, JSON.stringify(next));
        }
      } catch {}
      setNotice(msg);
      return true;
    } catch {
      videosRef.current = prev;
      setVideos(prev);
      setNotice('');
      setErrorMsg('Failed to persist video library changes; rolled back.');
      return false;
    } finally {
      saveLockRef.current = false;
      setIsSaving(false);
    }
  };

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const v of videos) {
      for (const t of v.tags) set.add(t);
    }
    return ['ALL', ...Array.from(set).sort()];
  }, [videos]);

  const filteredVideos = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return videos.filter(v => {
      const matchesTag = selectedTag === 'ALL' || v.tags.includes(selectedTag);
      if (!matchesTag) return false;
      if (!q) return true;
      return (
        v.title.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q) ||
        v.tags.some(t => t.toLowerCase().includes(q))
      );
    });
  }, [videos, searchQuery, selectedTag]);

  const activeVideo = useMemo(() => {
    return filteredVideos.find(v => v.id === selectedVideoId) || filteredVideos[0] || null;
  }, [filteredVideos, selectedVideoId]);

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saveLockRef.current) return;
    const trimmedTitle = titleInput.trim();
    const trimmedDesc = descInput.trim();
    const trimmedUrl = urlInput.trim();
    const dur = Number(durationInput.trim());
    const parsedTags = Array.from(
      new Set(
        tagsInput
          .split(',')
          .map(t => t.trim().toLowerCase())
          .filter(Boolean)
      )
    );
    if (!trimmedTitle || !isValidHttpUrl(trimmedUrl) || !Number.isFinite(dur) || dur <= 0 || parsedTags.length === 0) {
      setNotice('');
      setErrorMsg('Provide a valid title, HTTP/HTTPS video URL, positive duration (seconds), and at least one tag.');
      return;
    }
    const created: VideoAsset = {
      id: `vid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: trimmedTitle,
      description: trimmedDesc || 'No description provided.',
      videoUrl: trimmedUrl,
      durationSec: Math.round(dur),
      tags: parsedTags,
      views: 0,
      uploadedAt: getLocalDateString()
    };
    const next = [created, ...videosRef.current];
    const ok = await persistVideos(next, `Added video "${created.title}" to library.`);
    if (ok) {
      setTitleInput('');
      setDescInput('');
      setSelectedVideoId(created.id);
    }
  };

  const handleRecordView = async (id: string) => {
    if (saveLockRef.current) return;
    const next = videosRef.current.map(v => (v.id === id ? { ...v, views: v.views + 1 } : v));
    await persistVideos(next, 'Incremented video view count.');
  };

  const handleDeleteVideo = async (id: string) => {
    if (saveLockRef.current) return;
    const target = videosRef.current.find(v => v.id === id);
    if (!target) return;
    const next = videosRef.current.filter(v => v.id !== id);
    const ok = await persistVideos(next, `Removed "${target.title}" from library.`);
    if (ok && selectedTag !== 'ALL' && !next.some(v => v.tags.includes(selectedTag))) {
      setSelectedTag('ALL');
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="border-b border-zinc-800 pb-4 flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#D4AF37]">Video Content Library & Hosting Hub</h1>
            <p className="text-sm text-zinc-400">Search, tag, preview, and manage hosted training and marketing videos</p>
          </div>
          <div className="flex gap-3 text-xs">
            <div className="bg-zinc-900 border border-zinc-800 px-3 py-2 rounded">
              <div className="text-zinc-400">Hosted Videos</div>
              <div className="text-base font-bold text-white">{videos.length}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 px-3 py-2 rounded">
              <div className="text-zinc-400">Total Views</div>
              <div className="text-base font-bold text-[#D4AF37]">{videos.reduce((s, v) => s + v.views, 0).toLocaleString()}</div>
            </div>
          </div>
        </header>

        {notice && <div role="status" className="bg-emerald-950/60 border border-emerald-700 text-emerald-200 px-4 py-2 rounded text-sm">{notice}</div>}
        {errorMsg && <div role="alert" className="bg-red-950/60 border border-red-700 text-red-200 px-4 py-2 rounded text-sm">{errorMsg}</div>}

        <form onSubmit={handleAddVideo} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-6 gap-3">
          <input aria-label="Video Title" value={titleInput} onChange={e => setTitleInput(e.target.value)} disabled={isSaving} placeholder="Video Title" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-white" />
          <input aria-label="Video Description" value={descInput} onChange={e => setDescInput(e.target.value)} disabled={isSaving} placeholder="Description" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-white" />
          <input aria-label="Video Stream URL" value={urlInput} onChange={e => setUrlInput(e.target.value)} disabled={isSaving} placeholder="https://.../video.mp4" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-white" />
          <input aria-label="Duration in Seconds" type="number" min={1} value={durationInput} onChange={e => setDurationInput(e.target.value)} disabled={isSaving} placeholder="Duration (sec)" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-white" />
          <input aria-label="Comma Separated Tags" value={tagsInput} onChange={e => setTagsInput(e.target.value)} disabled={isSaving} placeholder="tag1, tag2" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-white" />
          <button type="submit" disabled={isSaving} className="bg-[#D4AF37] text-black font-bold text-xs rounded px-4 py-2 disabled:opacity-50">
            + Upload Video
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            aria-label="Search Videos by Title Description or Tag"
            type="search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by title, description, or #tag..."
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white w-full md:w-72"
          />
          <div className="flex flex-wrap gap-1.5">
            {allTags.map(tag => (
              <button
                key={tag}
                type="button"
                aria-label={`Filter by tag ${tag}`}
                onClick={() => setSelectedTag(tag)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                  selectedTag === tag
                    ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                    : 'bg-zinc-900 text-zinc-300 border-zinc-800'
                }`}
              >
                {tag === 'ALL' ? 'All Tags' : `#${tag}`}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
            {activeVideo ? (
              <>
                <video
                  key={activeVideo.videoUrl}
                  src={activeVideo.videoUrl}
                  controls
                  className="w-full rounded-lg bg-black aspect-video"
                />
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-white">{activeVideo.title}</h2>
                    <p className="text-xs text-zinc-400 mt-1">{activeVideo.description}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {activeVideo.tags.map(t => (
                        <span key={t} className="text-[11px] bg-zinc-950 border border-zinc-800 text-[#D4AF37] px-2 py-0.5 rounded">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <div className="text-xs text-zinc-400">
                      {formatDuration(activeVideo.durationSec)} · {activeVideo.views.toLocaleString()} views · {activeVideo.uploadedAt}
                    </div>
                    <button
                      type="button"
                      aria-label={`Log view for ${activeVideo.title}`}
                      disabled={isSaving}
                      onClick={() => void handleRecordView(activeVideo.id)}
                      className="px-3 py-1 rounded bg-zinc-800 text-xs text-[#D4AF37] font-bold"
                    >
                      +1 Count View
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-sm text-zinc-400">No videos match the current search or tag filter.</div>
            )}
          </div>

          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {filteredVideos.map(v => (
              <div
                key={v.id}
                className={`p-3 rounded-xl border transition ${
                  activeVideo?.id === v.id ? 'bg-zinc-900 border-[#D4AF37]' : 'bg-zinc-900/60 border-zinc-800'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <button
                    type="button"
                    aria-label={`Select video ${v.title}`}
                    onClick={() => setSelectedVideoId(v.id)}
                    className="text-left font-bold text-xs text-white hover:text-[#D4AF37]"
                  >
                    {v.title}
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete video ${v.title}`}
                    disabled={isSaving}
                    onClick={() => void handleDeleteVideo(v.id)}
                    className="text-xs text-red-400 hover:underline"
                  >
                    Delete
                  </button>
                </div>
                <div className="text-[11px] text-zinc-400 mt-1">
                  {formatDuration(v.durationSec)} · {v.views.toLocaleString()} views
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoContentLibrary;
