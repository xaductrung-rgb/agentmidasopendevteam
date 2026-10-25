'use client';
import React, { useState, useRef, useMemo } from 'react';

export interface PodcastEpisode {
  id: string;
  episodeNumber: number;
  title: string;
  guestName: string;
  durationSec: number;
  audioUrl: string;
  showNotes: string;
  downloadsCount: number;
  publishedAt: string;
}

export interface PodcastManagerProps {
  storageKey?: string;
  initialEpisodes?: PodcastEpisode[];
  onChange?: (episodes: PodcastEpisode[]) => void | Promise<void>;
}

const DEFAULT_EPISODES: PodcastEpisode[] = [
  {
    id: 'ep-101',
    episodeNumber: 1,
    title: 'Scaling Autonomous AI Revenue Systems in Production',
    guestName: 'Dr. Aris Thorne',
    durationSec: 1840,
    audioUrl: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
    showNotes: 'Deep dive into multi-tier affiliate attribution and zero-latency webhook dispatch.',
    downloadsCount: 4820,
    publishedAt: '2026-10-15'
  },
  {
    id: 'ep-102',
    episodeNumber: 2,
    title: 'High-Conversion Funnel Engineering & Statistical Power',
    guestName: 'Clara Lin',
    durationSec: 2190,
    audioUrl: 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg',
    showNotes: 'How two-proportion z-tests eliminate false positives in SaaS checkout flows.',
    downloadsCount: 3910,
    publishedAt: '2026-10-22'
  }
];

function inferAudioMimeType(url: string): string {
  const clean = url.split('?')[0].split('#')[0].toLowerCase();
  if (clean.endsWith('.mp3')) return 'audio/mpeg';
  if (clean.endsWith('.m4a') || clean.endsWith('.mp4')) return 'audio/mp4';
  if (clean.endsWith('.wav')) return 'audio/wav';
  if (clean.endsWith('.aac')) return 'audio/aac';
  return 'audio/ogg';
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function isValidEpisode(item: unknown): item is PodcastEpisode {
  if (!item || typeof item !== 'object') return false;
  const e = item as Record<string, unknown>;
  return (
    typeof e.id === 'string' &&
    typeof e.episodeNumber === 'number' &&
    typeof e.title === 'string' &&
    typeof e.guestName === 'string' &&
    typeof e.audioUrl === 'string' &&
    e.audioUrl.length > 0 &&
    typeof e.durationSec === 'number' &&
    e.durationSec > 0 &&
    typeof e.downloadsCount === 'number' &&
    e.downloadsCount >= 0
  );
}

export const PodcastManager: React.FC<PodcastManagerProps> = ({
  storageKey = 'agentmidas_podcast_episodes_v1',
  initialEpisodes = DEFAULT_EPISODES,
  onChange
}) => {
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(isValidEpisode)) {
          return parsed;
        }
      }
    } catch {}
    return initialEpisodes;
  });

  const episodesRef = useRef<PodcastEpisode[]>(episodes);
  episodesRef.current = episodes;
  const saveLockRef = useRef(false);

  const [selectedId, setSelectedId] = useState<string>(episodes[0]?.id || 'ep-101');
  const [title, setTitle] = useState('');
  const [guestName, setGuestName] = useState('');
  const [audioUrlInput, setAudioUrlInput] = useState('https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg');
  const [durationInput, setDurationInput] = useState('1800');
  const [showNotes, setShowNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [notice, setNotice] = useState('');

  const persistEpisodes = async (next: PodcastEpisode[], msg: string): Promise<boolean> => {
    if (saveLockRef.current) return false;
    saveLockRef.current = true;
    setIsSaving(true);
    const prev = episodesRef.current;
    episodesRef.current = next;
    setEpisodes(next);
    setErrorMsg('');
    try {
      if (onChange) {
        await onChange(next);
      }
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      }
      setNotice(msg);
      return true;
    } catch {
      episodesRef.current = prev;
      setEpisodes(prev);
      setErrorMsg('Failed to persist podcast catalog; rolled back.');
      return false;
    } finally {
      saveLockRef.current = false;
      setIsSaving(false);
    }
  };

  const handlePublishEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saveLockRef.current) return;
    const dur = Number(durationInput.trim());
    const trimmedAudio = audioUrlInput.trim();
    let validAudioUrl = false;
    try {
      const parsed = new URL(trimmedAudio);
      validAudioUrl = parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {}
    if (!title.trim() || !guestName.trim() || !validAudioUrl || !Number.isInteger(dur) || dur <= 0) {
      setErrorMsg('Episode title, guest name, valid HTTP/HTTPS audio URL, and positive integer duration are required.');
      return;
    }
    const nextNum = episodesRef.current.reduce((m, ep) => Math.max(m, ep.episodeNumber), 0) + 1;
    const created: PodcastEpisode = {
      id: `ep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      episodeNumber: nextNum,
      title: title.trim(),
      guestName: guestName.trim(),
      durationSec: dur,
      audioUrl: trimmedAudio,
      showNotes: showNotes.trim() || 'Episode show notes and transcript summary.',
      downloadsCount: 0,
      publishedAt: new Date().toISOString().slice(0, 10)
    };
    const ok = await persistEpisodes([created, ...episodesRef.current], `Published Episode #${created.episodeNumber}: ${created.title}`);
    if (ok) {
      setTitle('');
      setGuestName('');
      setShowNotes('');
      setSelectedId(created.id);
    }
  };

  const activeEpisode = episodes.find(ep => ep.id === selectedId) || episodes[0];

  const rssXmlPreview = useMemo(() => {
    const items = episodes
      .slice(0, 3)
      .map(
        ep =>
          `  <item>\n    <title>Ep #${ep.episodeNumber}: ${escapeXml(ep.title)}</title>\n    <enclosure url="${escapeXml(ep.audioUrl)}" type="audio/ogg" length="${ep.durationSec * 16000}" />\n    <itunes:duration>${ep.durationSec}</itunes:duration>\n  </item>`
      )
      .join('\n');
    return `<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">\n<channel>\n  <title>Agent Midas Podcast</title>\n${items}\n</channel>\n</rss>`;
  }, [episodes]);

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="border-b border-zinc-800 pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-[#D4AF37]">Podcast Studio & RSS Feed Manager</h1>
            <p className="text-sm text-zinc-400">Manage episodes, HTML5 audio playback, enclosure syndication, and download telemetry</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 px-4 py-2 rounded text-right">
            <div className="text-xs text-zinc-400">Total Downloads</div>
            <div className="text-lg font-bold text-[#D4AF37]">
              {episodes.reduce((s, e) => s + e.downloadsCount, 0).toLocaleString()}
            </div>
          </div>
        </header>

        {notice && <div role="status" className="bg-emerald-950/60 border border-emerald-700 text-emerald-200 px-4 py-2 rounded text-sm">{notice}</div>}
        {errorMsg && <div role="alert" className="bg-red-950/60 border border-red-700 text-red-200 px-4 py-2 rounded text-sm">{errorMsg}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={handlePublishEpisode} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
            <h2 className="text-sm font-bold text-[#D4AF37]">Publish New Episode</h2>
            <input aria-label="Episode Title" value={title} onChange={e => setTitle(e.target.value)} disabled={isSaving} placeholder="Episode Title" className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
            <div className="grid grid-cols-2 gap-2">
              <input aria-label="Guest Name" value={guestName} onChange={e => setGuestName(e.target.value)} disabled={isSaving} placeholder="Featured Guest" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
              <input aria-label="Duration Seconds" type="number" min={1} value={durationInput} onChange={e => setDurationInput(e.target.value)} disabled={isSaving} placeholder="Duration (sec)" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
            </div>
            <input aria-label="Audio Recording URL" value={audioUrlInput} onChange={e => setAudioUrlInput(e.target.value)} disabled={isSaving} placeholder="https://.../episode.ogg" className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
            <textarea aria-label="Episode Show Notes" value={showNotes} onChange={e => setShowNotes(e.target.value)} disabled={isSaving} rows={2} placeholder="Show notes & timestamps..." className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
            <button type="submit" disabled={isSaving} className="bg-[#D4AF37] text-black font-bold text-xs px-4 py-2 rounded">
              + Publish Episode
            </button>
          </form>

          {activeEpisode && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="text-xs text-[#D4AF37] font-bold">NOW PLAYING · EPISODE #{activeEpisode.episodeNumber}</div>
              <h2 className="text-base font-bold text-white">{activeEpisode.title}</h2>
              <p className="text-xs text-zinc-400">Guest: {activeEpisode.guestName} · {Math.round(activeEpisode.durationSec / 60)} mins</p>
              <audio key={activeEpisode.audioUrl} controls src={activeEpisode.audioUrl} className="w-full" />
              <pre className="bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-400 overflow-x-auto">{rssXmlPreview}</pre>
            </div>
          )}
        </div>

        <div className="space-y-2">
          {episodes.map(ep => (
            <div key={ep.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex justify-between items-center">
              <div>
                <div className="font-bold text-sm text-white">Ep #{ep.episodeNumber}: {ep.title}</div>
                <div className="text-xs text-zinc-400">Guest: {ep.guestName} · Published: {ep.publishedAt} · {ep.downloadsCount.toLocaleString()} downloads</div>
              </div>
              <button
                type="button"
                aria-label={`Select episode ${ep.title}`}
                onClick={() => setSelectedId(ep.id)}
                className="px-3 py-1 rounded bg-zinc-800 text-xs text-[#D4AF37] font-bold"
              >
                Load Player
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PodcastManager;
