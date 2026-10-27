'use client';

import React, { useState, useMemo, useEffect } from 'react';

export interface ScheduledMeeting {
  id: string;
  clientName: string;
  clientEmail: string;
  date: string;
  slot: string;
  durationMinutes: number;
  timezone: string;
  topic: string;
}

export interface MeetingSchedulerProps {
  initialMeetings?: ScheduledMeeting[];
  storageKey?: string;
  onChange?: (meetings: ScheduledMeeting[]) => void | Promise<void>;
}

const TIME_SLOTS = ['09:00', '10:00', '11:00', '13:30', '15:00', '16:30'];

const DEFAULT_MEETINGS: ScheduledMeeting[] = [
  {
    id: 'mtg-1',
    clientName: 'Liam Donovan',
    clientEmail: 'liam@horizonventures.io',
    date: '2026-11-02',
    slot: '10:00',
    durationMinutes: 30,
    timezone: 'UTC-05:00',
    topic: 'Enterprise Two-Up Affiliate Onboarding'
  },
  {
    id: 'mtg-2',
    clientName: 'Nadia Al-Mansoor',
    clientEmail: 'nadia@solarisdigital.ae',
    date: '2026-11-02',
    slot: '15:00',
    durationMinutes: 45,
    timezone: 'UTC+00:00',
    topic: 'Q4 Funnel Conversion Audit'
  }
];

function isValidMeetingList(val: unknown): val is ScheduledMeeting[] {
  return (
    Array.isArray(val) &&
    val.every(
      (m) =>
        m &&
        typeof m === 'object' &&
        typeof (m as ScheduledMeeting).id === 'string' &&
        typeof (m as ScheduledMeeting).clientName === 'string' &&
        typeof (m as ScheduledMeeting).clientEmail === 'string' &&
        typeof (m as ScheduledMeeting).date === 'string' &&
        typeof (m as ScheduledMeeting).slot === 'string' &&
        typeof (m as ScheduledMeeting).durationMinutes === 'number' &&
        typeof (m as ScheduledMeeting).timezone === 'string' &&
        typeof (m as ScheduledMeeting).topic === 'string'
    )
  );
}

function parseUtcOffsetMinutes(tz: string): number {
  const m = tz.match(/^UTC([+-])(\d{2}):(\d{2})$/);
  if (!m) return 0;
  const sign = m[1] === '-' ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3]));
}

function toUtcInterval(date: string, slot: string, durationMinutes: number, tz: string): [number, number] {
  const [hStr, mStr] = slot.split(':');
  const localMins = Number(hStr) * 60 + Number(mStr);
  const offset = parseUtcOffsetMinutes(tz);
  const dayEpochMins = Math.floor(Date.parse(`${date}T00:00:00Z`) / 60000);
  const startUtc = dayEpochMins + localMins - offset;
  return [startUtc, startUtc + durationMinutes];
}

function intervalsOverlap(a: [number, number], b: [number, number]): boolean {
  return a[0] < b[1] && b[0] < a[1];
}

export function MeetingScheduler({
  initialMeetings = DEFAULT_MEETINGS,
  storageKey = 'agentmidas_meetings_v1',
  onChange
}: MeetingSchedulerProps) {
  const [meetings, setMeetings] = useState<ScheduledMeeting[]>(initialMeetings);
  const [selectedDate, setSelectedDate] = useState('2026-11-02');
  const [selectedSlot, setSelectedSlot] = useState('11:00');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [timezone, setTimezone] = useState('UTC-05:00');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [topic, setTopic] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved !== null) {
        const parsed: unknown = JSON.parse(saved);
        if (isValidMeetingList(parsed)) {
          setMeetings(parsed);
          return;
        }
      }
    } catch {
      // ignore storage read errors
    }
    setMeetings(initialMeetings);
  }, [storageKey, initialMeetings]);

  const hasConflict = useMemo(() => {
    return (slot: string) => {
      const candidate = toUtcInterval(selectedDate, slot, durationMinutes, timezone);
      return meetings.some((m) =>
        intervalsOverlap(candidate, toUtcInterval(m.date, m.slot, m.durationMinutes, m.timezone))
      );
    };
  }, [meetings, selectedDate, durationMinutes, timezone]);

  const persistMeetings = async (next: ScheduledMeeting[]): Promise<boolean> => {
    if (isSaving) return false;
    setIsSaving(true);
    try {
      await onChange?.(next);
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      setMeetings(next);
      setError(null);
      return true;
    } catch {
      setError('Could not save meeting update.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = clientName.trim();
    const cleanEmail = clientEmail.trim();
    const cleanTopic = topic.trim() || 'Discovery & Strategy Session';

    if (!cleanName || !cleanEmail.includes('@') || !selectedDate) {
      setError('Please provide a valid client name, email, and meeting date.');
      return;
    }
    const [startUtc] = toUtcInterval(selectedDate, selectedSlot, durationMinutes, timezone);
    if (startUtc < Math.floor(Date.now() / 60000)) {
      setError('Please select a future date and time.');
      return;
    }
    if (hasConflict(selectedSlot)) {
      setError('Selected time slot overlaps an existing booking. Please pick another slot.');
      return;
    }

    const newMeeting: ScheduledMeeting = {
      id: `mtg-${Date.now()}`,
      clientName: cleanName,
      clientEmail: cleanEmail,
      date: selectedDate,
      slot: selectedSlot,
      durationMinutes,
      timezone,
      topic: cleanTopic
    };

    const next = [...meetings, newMeeting];
    if (await persistMeetings(next)) {
      setClientName('');
      setClientEmail('');
      setTopic('');
    }
  };

  const cancelMeeting = async (id: string) => {
    await persistMeetings(meetings.filter((m) => m.id !== id));
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200 max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Client Meeting Scheduler</h2>
        <p className="text-sm text-slate-600">
          Book conflict-free client sessions with UTC interval overlap checks and explicit offset alignment.
        </p>
      </div>

      {error && (
        <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleBook} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Book a Session</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="mtg-date" className="block text-xs font-semibold text-slate-600 mb-1">
                Date
              </label>
              <input
                id="mtg-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              />
            </div>
            <div>
              <label htmlFor="mtg-tz" className="block text-xs font-semibold text-slate-600 mb-1">
                UTC Offset
              </label>
              <select
                id="mtg-tz"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="UTC-05:00">UTC-05:00 (US Eastern)</option>
                <option value="UTC-08:00">UTC-08:00 (US Pacific)</option>
                <option value="UTC+00:00">UTC+00:00 (UTC / GMT)</option>
                <option value="UTC+07:00">UTC+07:00 (ICT)</option>
              </select>
            </div>
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-600 mb-1">Available Time Slots</span>
            <div className="grid grid-cols-3 gap-2">
              {TIME_SLOTS.map((slot) => {
                const isBooked = hasConflict(slot);
                const isSelected = selectedSlot === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={isBooked || isSaving}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedSlot(slot)}
                    className={`py-2 rounded-lg text-xs font-semibold border ${
                      isBooked
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                        : isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {slot} {isBooked ? '(Conflict)' : ''}
                  </button>
                );
              })}
            </div>
          </div>

          <select
            aria-label="Meeting duration in minutes"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          >
            <option value={15}>15 Minutes</option>
            <option value={30}>30 Minutes</option>
            <option value={45}>45 Minutes</option>
            <option value={60}>60 Minutes</option>
          </select>

          <input
            type="text"
            aria-label="Client full name"
            placeholder="Client Full Name"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          />
          <input
            type="email"
            aria-label="Client email address"
            placeholder="Client Email Address"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          />
          <input
            type="text"
            aria-label="Meeting topic"
            placeholder="Agenda / Topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          />
          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-lg text-sm"
          >
            {isSaving ? 'Saving...' : 'Confirm Booking'}
          </button>
        </form>

        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Scheduled Bookings ({meetings.length})</h3>
          {meetings.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 border border-dashed border-slate-300 rounded-xl">
              No meetings scheduled yet.
            </div>
          ) : (
            meetings.map((m) => (
              <div
                key={m.id}
                className="p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="font-bold text-sm text-slate-900">{m.topic}</div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    {m.date} at {m.slot} ({m.durationMinutes}m &bull; {m.timezone})
                  </div>
                  <div className="text-xs text-indigo-700 mt-1">
                    {m.clientName} ({m.clientEmail})
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void cancelMeeting(m.id)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default MeetingScheduler;
