'use client';
import React, { useState, useRef, useMemo } from 'react';

export type ReplayEventType = 'click' | 'input' | 'navigation' | 'error';

export interface ReplayEvent {
  id: string;
  timestampMs: number;
  type: ReplayEventType;
  targetSelector: string;
  xPct: number;
  yPct: number;
  maskedValue?: string;
}

export interface RecordedSession {
  id: string;
  visitorId: string;
  pagePath: string;
  durationMs: number;
  piiMasked: boolean;
  events: ReplayEvent[];
}

export interface UserSessionReplayProps {
  storageKey?: string;
  initialSessions?: RecordedSession[];
  onChange?: (sessions: RecordedSession[]) => void | Promise<void>;
}

const DEFAULT_SESSIONS: RecordedSession[] = [
  {
    id: 'ses-101',
    visitorId: 'usr_98a4f2',
    pagePath: '/checkout/enterprise',
    durationMs: 12000,
    piiMasked: true,
    events: [
      { id: 'ev-1', timestampMs: 800, type: 'navigation', targetSelector: 'window.location', xPct: 50, yPct: 12 },
      { id: 'ev-2', timestampMs: 3200, type: 'input', targetSelector: '#billing-email', xPct: 38, yPct: 42, maskedValue: '***@***.com' },
      { id: 'ev-3', timestampMs: 6400, type: 'click', targetSelector: 'button#apply-coupon', xPct: 64, yPct: 58 },
      { id: 'ev-4', timestampMs: 9800, type: 'click', targetSelector: 'button#complete-order', xPct: 52, yPct: 81 }
    ]
  },
  {
    id: 'ses-102',
    visitorId: 'usr_41c9b0',
    pagePath: '/affiliate/onboarding',
    durationMs: 9000,
    piiMasked: true,
    events: [
      { id: 'ev-5', timestampMs: 1100, type: 'click', targetSelector: '#tier-selector', xPct: 28, yPct: 34 },
      { id: 'ev-6', timestampMs: 4900, type: 'error', targetSelector: 'POST /api/webhook/verify', xPct: 72, yPct: 66 }
    ]
  }
];

function isValidSession(item: unknown): item is RecordedSession {
  if (!item || typeof item !== 'object') return false;
  const s = item as Record<string, unknown>;
  return (
    typeof s.id === 'string' &&
    typeof s.visitorId === 'string' &&
    typeof s.pagePath === 'string' &&
    typeof s.durationMs === 'number' &&
    s.durationMs > 0 &&
    Array.isArray(s.events)
  );
}

export const UserSessionReplay: React.FC<UserSessionReplayProps> = ({
  storageKey = 'agentmidas_session_replay_v1',
  initialSessions = DEFAULT_SESSIONS,
  onChange
}) => {
  const [sessions, setSessions] = useState<RecordedSession[]>(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.every(isValidSession)) {
          return parsed;
        }
      }
    } catch {}
    return initialSessions;
  });

  const sessionsRef = useRef<RecordedSession[]>(sessions);
  sessionsRef.current = sessions;
  const saveLockRef = useRef(false);

  const [selectedId, setSelectedId] = useState<string>(sessions[0]?.id || 'ses-101');
  const [playheadMs, setPlayheadMs] = useState<number>(6400);
  const [eventType, setEventType] = useState<ReplayEventType>('click');
  const [targetSelector, setTargetSelector] = useState('button#cta-upgrade');
  const [xInput, setXInput] = useState('50');
  const [yInput, setYInput] = useState('50');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [notice, setNotice] = useState('');

  const persistSessions = async (next: RecordedSession[], msg: string): Promise<boolean> => {
    if (saveLockRef.current) return false;
    saveLockRef.current = true;
    setIsSaving(true);
    const prev = sessionsRef.current;
    sessionsRef.current = next;
    setSessions(next);
    setErrorMsg('');
    try {
      if (onChange) {
        await onChange(next);
      }
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(storageKey, JSON.stringify(next));
        }
      } catch {}
      setNotice(msg);
      return true;
    } catch {
      sessionsRef.current = prev;
      setSessions(prev);
      setErrorMsg('Failed to persist session replay telemetry; rolled back.');
      return false;
    } finally {
      saveLockRef.current = false;
      setIsSaving(false);
    }
  };

  const activeSession = sessions.find(s => s.id === selectedId) || sessions[0];

  const handleRecordEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saveLockRef.current || !activeSession) return;
    const x = Number(xInput.trim());
    const y = Number(yInput.trim());
    if (!targetSelector.trim() || !Number.isFinite(x) || x < 0 || x > 100 || !Number.isFinite(y) || y < 0 || y > 100) {
      setErrorMsg('Target selector and viewport coordinates between 0% and 100% are required.');
      return;
    }
    const newEvent: ReplayEvent = {
      id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      timestampMs: Math.min(activeSession.durationMs, playheadMs),
      type: eventType,
      targetSelector: targetSelector.trim(),
      xPct: Math.round(x),
      yPct: Math.round(y),
      maskedValue: eventType === 'input' ? '***MASKED***' : undefined
    };
    const next = sessionsRef.current.map(s =>
      s.id === activeSession.id
        ? { ...s, events: [...s.events, newEvent].sort((a, b) => a.timestampMs - b.timestampMs) }
        : s
    );
    await persistSessions(next, `Recorded ${newEvent.type} event at ${newEvent.timestampMs}ms.`);
  };

  const visibleEvents = useMemo(() => {
    if (!activeSession) return [];
    return activeSession.events.filter(ev => ev.timestampMs <= playheadMs);
  }, [activeSession, playheadMs]);

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="border-b border-zinc-800 pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-[#D4AF37]">User Session Replay & Click Heatmap Studio</h1>
            <p className="text-sm text-zinc-400">Scrub DOM interaction timelines, inspect click coordinates, and enforce PII masking</p>
          </div>
          <select
            aria-label="Select Recorded Session"
            value={activeSession?.id || ''}
            onChange={e => {
              setSelectedId(e.target.value);
              setPlayheadMs(5000);
            }}
            className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-white"
          >
            {sessions.map(s => (
              <option key={s.id} value={s.id}>
                {s.visitorId} · {s.pagePath} ({s.events.length} events)
              </option>
            ))}
          </select>
        </header>

        {notice && <div role="status" className="bg-emerald-950/60 border border-emerald-700 text-emerald-200 px-4 py-2 rounded text-sm">{notice}</div>}
        {errorMsg && <div role="alert" className="bg-red-950/60 border border-red-700 text-red-200 px-4 py-2 rounded text-sm">{errorMsg}</div>}

        {activeSession && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
              <div className="flex justify-between items-center text-xs text-zinc-400">
                <span>Viewport Replay: <strong className="text-white">{activeSession.pagePath}</strong> · <strong className="text-emerald-400">{activeSession.piiMasked ? 'PII Masked' : 'Unmasked'}</strong></span>
                <span>Playhead: <strong className="text-[#D4AF37]">{playheadMs}ms / {activeSession.durationMs}ms</strong></span>
              </div>

              <svg viewBox="0 0 400 220" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg">
                <rect x="10" y="10" width="380" height="30" rx="4" fill="#18181B" />
                <rect x="10" y="50" width="240" height="155" rx="6" fill="#121215" />
                <rect x="260" y="50" width="130" height="155" rx="6" fill="#18181B" />
                {visibleEvents.map(ev => {
                  const cx = Math.round((ev.xPct / 100) * 380) + 10;
                  const cy = Math.round((ev.yPct / 100) * 190) + 15;
                  return (
                    <g key={ev.id}>
                      <circle cx={cx} cy={cy} r="10" fill={ev.type === 'error' ? 'rgba(239,68,68,0.35)' : 'rgba(212,175,55,0.3)'} />
                      <circle cx={cx} cy={cy} r="4" fill={ev.type === 'error' ? '#EF4444' : '#D4AF37'} />
                    </g>
                  );
                })}
              </svg>

              <label className="block space-y-1 text-xs">
                <span className="text-zinc-400">Timeline Scrubber (ms)</span>
                <input
                  aria-label="Replay Timeline Scrubber"
                  type="range"
                  min={0}
                  max={activeSession.durationMs}
                  step={100}
                  value={playheadMs}
                  onChange={e => setPlayheadMs(Number(e.target.value))}
                  className="w-full"
                />
              </label>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
              <form onSubmit={handleRecordEvent} className="space-y-2 border-b border-zinc-800 pb-4">
                <h2 className="text-xs font-bold text-[#D4AF37] uppercase">Inject Telemetry Event at Playhead</h2>
                <select aria-label="Event Type" value={eventType} onChange={e => setEventType(e.target.value as ReplayEventType)} disabled={isSaving} className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white">
                  <option value="click">click</option>
                  <option value="input">input (PII Masked)</option>
                  <option value="navigation">navigation</option>
                  <option value="error">error</option>
                </select>
                <input aria-label="Target DOM Selector" value={targetSelector} onChange={e => setTargetSelector(e.target.value)} disabled={isSaving} placeholder="CSS Selector" className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white" />
                <div className="grid grid-cols-2 gap-2">
                  <input aria-label="Viewport X Percent" type="number" min={0} max={100} value={xInput} onChange={e => setXInput(e.target.value)} disabled={isSaving} placeholder="X %" className="bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white" />
                  <input aria-label="Viewport Y Percent" type="number" min={0} max={100} value={yInput} onChange={e => setYInput(e.target.value)} disabled={isSaving} placeholder="Y %" className="bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white" />
                </div>
                <button type="submit" disabled={isSaving} className="w-full bg-[#D4AF37] text-black font-bold text-xs py-1.5 rounded">
                  + Log Event at {playheadMs}ms
                </button>
              </form>

              <div className="space-y-2 max-h-56 overflow-y-auto">
                {activeSession.events.map(ev => (
                  <div key={ev.id} className="bg-zinc-950 border border-zinc-800 rounded p-2 text-xs">
                    <div className="flex justify-between text-[#D4AF37] font-mono">
                      <span>{ev.type.toUpperCase()}</span>
                      <span>{ev.timestampMs}ms</span>
                    </div>
                    <div className="text-zinc-300 truncate">{ev.targetSelector} ({ev.xPct}%, {ev.yPct}%) {ev.maskedValue ? `· Value: ${ev.maskedValue}` : ''}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserSessionReplay;
