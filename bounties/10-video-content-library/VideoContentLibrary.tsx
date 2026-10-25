'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';

export interface VideoChapter {
  id: string;
  title: string;
  startSeconds: number;
}

export interface VideoTranscriptCue {
  id: string;
  startSeconds: number;
  endSeconds: number;
  text: string;
}

export interface VideoItem {
  id: string;
  title: string;
  category: string;
  durationSeconds: number;
  videoUrl: string;
  chapters: VideoChapter[];
  transcript: VideoTranscriptCue[];
  views: number;
}

export interface VideoContentLibraryProps {
  initialVideos?: VideoItem[];
  storageKey?: string;
  onChange?: (videos: VideoItem[]) => void | Promise<void>;
}

const DEFAULT_VIDEOS: VideoItem[] = [
  {
    id: 'vid-1',
    title: 'Getting Started with Autonomous Workflows',
    category: 'Onboarding',
    durationSeconds: 180,
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    views: 142,
    chapters: [
      { id: 'ch-1', title: 'Overview & Setup', startSeconds: 0 },
      { id: 'ch-2', title: 'Configuring Agents', startSeconds: 45 },
      { id: 'ch-3', title: 'Live Deployment', startSeconds: 110 }
    ],
    transcript: [
      { id: 'tr-1', startSeconds: 0, endSeconds: 44, text: 'Welcome to the autonomous workflow onboarding guide and environment setup.' },
      { id: 'tr-2', startSeconds: 45, endSeconds: 109, text: 'Configure your agent triggers, retry policies, and webhook secrets.' },
      { id: 'tr-3', startSeconds: 110, endSeconds: 180, text: 'Verify live telemetry and audit logs in the production dashboard.' }
    ]
  },
  {
    id: 'vid-2',
    title: 'Advanced Revenue & Funnel Attribution',
    category: 'Analytics',
    durationSeconds: 240,
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    views: 89,
    chapters: [
      { id: 'ch-21', title: 'Multi-Touch Models', startSeconds: 0 },
      { id: 'ch-22', title: 'Cohort Retention', startSeconds: 95 }
    ],
    transcript: [
      { id: 'tr-21', startSeconds: 0, endSeconds: 94, text: 'Compare first-touch, linear, and time-decay attribution across channels.' },
      { id: 'tr-22', startSeconds: 95, endSeconds: 240, text: 'Analyze net dollar retention and expansion revenue by customer cohort.' }
    ]
  }
];

function isValidVideoList(val: unknown): val is VideoItem[] {
  return (
    Array.isArray(val) &&
    val.every(
      (v) =>
        v &&
        typeof v === 'object' &&
        typeof (v as VideoItem).id === 'string' &&
        typeof (v as VideoItem).title === 'string' &&
        typeof (v as VideoItem).category === 'string' &&
        typeof (v as VideoItem).videoUrl === 'string' &&
        typeof (v as VideoItem).durationSeconds === 'number' &&
        Number.isFinite((v as VideoItem).durationSeconds) &&
        typeof (v as VideoItem).views === 'number' &&
        Number.isFinite((v as VideoItem).views) &&
        Array.isArray((v as VideoItem).chapters) &&
        Array.isArray((v as VideoItem).transcript)
    )
  );
}

function formatTime(sec: number): string {
  const safe = Math.max(0, Math.floor(Number.isFinite(sec) ? sec : 0));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function VideoContentLibrary({
  initialVideos = DEFAULT_VIDEOS,
  storageKey = 'agentmidas_video_content_library_v1',
  onChange
}: VideoContentLibraryProps) {
  const initialVideosRef = useRef(initialVideos);
  initialVideosRef.current = initialVideos;
  const activeKeyRef = useRef(storageKey);
  activeKeyRef.current = storageKey;

  const [videos, setVideos] = useState<VideoItem[]>(() =>
    isValidVideoList(initialVideos) && initialVideos.length > 0 ? initialVideos : DEFAULT_VIDEOS
  );
  const [selectedVideoId, setSelectedVideoId] = useState<string>(videos[0]?.id ?? '');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Tutorials');
  const [newUrl, setNewUrl] = useState('');
  const [newTranscriptText, setNewTranscriptText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const fallback =
      isValidVideoList(initialVideosRef.current) && initialVideosRef.current.length > 0
        ? initialVideosRef.current
        : DEFAULT_VIDEOS;
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isValidVideoList(parsed) && parsed.length > 0) {
          setVideos(parsed);
          setSelectedVideoId(parsed[0].id);
          return;
        }
      }
    } catch {
      // ignore read errors
    }
    setVideos(fallback);
    setSelectedVideoId(fallback[0]?.id ?? '');
  }, [storageKey]);

  const categories = useMemo(() => {
    const set = new Set<string>(['All']);
    videos.forEach((v) => set.add(v.category));
    return Array.from(set);
  }, [videos]);

  const filteredVideos = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return videos.filter((v) => {
      const catMatch = selectedCategory === 'All' || v.category === selectedCategory;
      if (!catMatch) return false;
      if (!q) return true;
      const inTitle = v.title.toLowerCase().includes(q);
      const inTranscript = v.transcript.some((t) => t.text.toLowerCase().includes(q));
      const inChapters = v.chapters.some((c) => c.title.toLowerCase().includes(q));
      return inTitle || inTranscript || inChapters;
    });
  }, [videos, searchQuery, selectedCategory]);

  const activeVideo = useMemo(() => {
    return filteredVideos.find((v) => v.id === selectedVideoId) ?? filteredVideos[0] ?? null;
  }, [filteredVideos, selectedVideoId]);

  const vttDataUri = useMemo(() => {
    if (!activeVideo) return '';
    const lines = ['WEBVTT', ''];
    activeVideo.transcript.forEach((cue) => {
      const startH = String(Math.floor(cue.startSeconds / 3600)).padStart(2, '0');
      const startM = String(Math.floor((cue.startSeconds % 3600) / 60)).padStart(2, '0');
      const startS = String(Math.floor(cue.startSeconds % 60)).padStart(2, '0');
      const endH = String(Math.floor(cue.endSeconds / 3600)).padStart(2, '0');
      const endM = String(Math.floor((cue.endSeconds % 3600) / 60)).padStart(2, '0');
      const endS = String(Math.floor(cue.endSeconds % 60)).padStart(2, '0');
      lines.push(`${startH}:${startM}:${startS}.000 --> ${endH}:${endM}:${endS}.000`);
      lines.push(cue.text);
      lines.push('');
    });
    return `data:text/vtt;charset=utf-8,${encodeURIComponent(lines.join('\n'))}`;
  }, [activeVideo]);

  async function persist(next: VideoItem[], prev: VideoItem[]): Promise<boolean> {
    const keyAtStart = storageKey;
    setIsSaving(true);
    setError(null);
    setVideos(next);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(keyAtStart, JSON.stringify(next));
      }
      await onChange?.(next);
      return true;
    } catch {
      if (activeKeyRef.current === keyAtStart) {
        setVideos(prev);
      }
      setError('Failed to save video library changes.');
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  function seekTo(seconds: number) {
    const clamped = Math.max(0, seconds);
    setCurrentTime(clamped);
    if (videoRef.current) {
      videoRef.current.currentTime = clamped;
    }
  }

  async function handleAddVideo(e: React.FormEvent) {
    e.preventDefault();
    if (isSaving) return;
    const trimmedTitle = newTitle.trim();
    const trimmedUrl = newUrl.trim();
    if (!trimmedTitle) {
      setError('Video title is required.');
      return;
    }
    try {
      const parsed = new URL(trimmedUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        setError('Video URL must use http:// or https://.');
        return;
      }
    } catch {
      setError('Please enter a valid video URL.');
      return;
    }
    const cueText = newTranscriptText.trim() || `Overview transcript for ${trimmedTitle}.`;
    const created: VideoItem = {
      id: `vid-${Date.now()}`,
      title: trimmedTitle,
      category: newCategory.trim() || 'Tutorials',
      durationSeconds: 120,
      videoUrl: trimmedUrl,
      views: 1,
      chapters: [{ id: `ch-${Date.now()}`, title: 'Introduction', startSeconds: 0 }],
      transcript: [{ id: `tr-${Date.now()}`, startSeconds: 0, endSeconds: 120, text: cueText }]
    };
    const prev = videos;
    const next = [created, ...videos];
    const ok = await persist(next, prev);
    if (ok) {
      setSelectedVideoId(created.id);
      setNewTitle('');
      setNewUrl('');
      setNewTranscriptText('');
    }
  }

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Video Content Library</h2>
          <p className="text-sm text-slate-600">
            Browse categorized training videos, jump to chapters, and search synchronized transcripts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="search"
            aria-label="Search videos and transcripts"
            placeholder="Search title, chapters, or transcript..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          <select
            aria-label="Filter by category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Videos ({filteredVideos.length})
          </h3>
          {filteredVideos.length === 0 ? (
            <p className="text-sm text-slate-500">No videos match your filter.</p>
          ) : (
            filteredVideos.map((vid) => {
              const isSelected = activeVideo?.id === vid.id;
              return (
                <button
                  key={vid.id}
                  type="button"
                  onClick={() => {
                    setSelectedVideoId(vid.id);
                    setCurrentTime(0);
                  }}
                  className={`w-full text-left p-3 rounded-lg border transition ${
                    isSelected ? 'border-indigo-600 bg-indigo-50/60' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-semibold text-slate-900 text-sm">{vid.title}</div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                    <span>{vid.category}</span>
                    <span>{formatTime(vid.durationSeconds)} • {vid.views} views</span>
                  </div>
                </button>
              );
            })
          )}

          <form onSubmit={handleAddVideo} className="pt-4 border-t border-slate-200 space-y-2">
            <h4 className="text-xs font-semibold uppercase text-slate-500">Add Video to Library</h4>
            <input
              type="text"
              aria-label="New video title"
              placeholder="Video title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm"
            />
            <input
              type="text"
              aria-label="New video category"
              placeholder="Category"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm"
            />
            <input
              type="url"
              aria-label="New video URL"
              placeholder="https://example.com/video.mp4"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm"
            />
            <input
              type="text"
              aria-label="Initial transcript cue"
              placeholder="Opening transcript text"
              value={newTranscriptText}
              onChange={(e) => setNewTranscriptText(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm"
            />
            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-2 bg-indigo-600 text-white rounded text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Add Video'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2">
          {activeVideo ? (
            <div className="space-y-4">
              <div className="bg-slate-900 rounded-xl overflow-hidden">
                <video
                  ref={videoRef}
                  key={activeVideo.id}
                  controls
                  src={activeVideo.videoUrl}
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                  className="w-full max-h-80"
                >
                  <track kind="captions" srcLang="en" label="English" src={vttDataUri} default />
                </video>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{activeVideo.title}</h3>
                  <p className="text-xs text-slate-500">
                    Category: {activeVideo.category} • Current Timestamp: {formatTime(currentTime)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <h4 className="text-sm font-semibold text-slate-800 mb-2">Chapters</h4>
                  <ul className="space-y-1.5">
                    {activeVideo.chapters.map((ch) => (
                      <li key={ch.id}>
                        <button
                          type="button"
                          onClick={() => seekTo(ch.startSeconds)}
                          className="w-full flex items-center justify-between text-left text-xs px-2.5 py-1.5 rounded hover:bg-indigo-50 text-slate-700"
                        >
                          <span>{ch.title}</span>
                          <span className="font-mono text-indigo-600">{formatTime(ch.startSeconds)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <h4 className="text-sm font-semibold text-slate-800 mb-2">Interactive Transcript</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {activeVideo.transcript.map((cue) => {
                      const active = currentTime >= cue.startSeconds && currentTime <= cue.endSeconds;
                      return (
                        <button
                          key={cue.id}
                          type="button"
                          onClick={() => seekTo(cue.startSeconds)}
                          className={`w-full text-left p-2 rounded text-xs transition ${
                            active ? 'bg-indigo-100 text-indigo-950 font-medium' : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <span className="font-mono text-indigo-600 mr-2">[{formatTime(cue.startSeconds)}]</span>
                          <span>{cue.text}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 border border-dashed border-slate-300 rounded-xl">
              Select a video or clear your search filter to begin playback.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
