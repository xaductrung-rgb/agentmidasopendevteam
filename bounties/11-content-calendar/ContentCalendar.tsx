'use client';

import React, { useState, useMemo, useEffect } from 'react';

export type CalendarStage = 'Idea' | 'Drafting' | 'Review' | 'Scheduled';

export interface ContentCalendarItem {
  id: string;
  title: string;
  channel: 'Blog' | 'YouTube' | 'LinkedIn' | 'Newsletter';
  assignee: string;
  dueDate: string;
  stage: CalendarStage;
}

export interface ContentCalendarProps {
  initialItems?: ContentCalendarItem[];
  storageKey?: string;
  onChange?: (items: ContentCalendarItem[]) => void | Promise<void>;
}

const STAGES: CalendarStage[] = ['Idea', 'Drafting', 'Review', 'Scheduled'];

const DEFAULT_ITEMS: ContentCalendarItem[] = [
  {
    id: 'cal-1',
    title: 'Two-Up Commission Launch Playbook',
    channel: 'YouTube',
    assignee: 'Aria Montgomery',
    dueDate: '2026-11-03',
    stage: 'Review'
  },
  {
    id: 'cal-2',
    title: 'Enterprise Security Benchmark Report',
    channel: 'LinkedIn',
    assignee: 'Devon Brooks',
    dueDate: '2026-11-06',
    stage: 'Drafting'
  },
  {
    id: 'cal-3',
    title: 'Weekly Partner Digest #42',
    channel: 'Newsletter',
    assignee: 'Elena Vance',
    dueDate: '2026-11-08',
    stage: 'Scheduled'
  }
];

function isValidCalendarList(val: unknown): val is ContentCalendarItem[] {
  return (
    Array.isArray(val) &&
    val.every(
      (i) =>
        i &&
        typeof i === 'object' &&
        typeof (i as ContentCalendarItem).id === 'string' &&
        typeof (i as ContentCalendarItem).title === 'string' &&
        typeof (i as ContentCalendarItem).assignee === 'string' &&
        typeof (i as ContentCalendarItem).stage === 'string'
    )
  );
}

export function ContentCalendar({
  initialItems = DEFAULT_ITEMS,
  storageKey = 'agentmidas_content_calendar_v1',
  onChange
}: ContentCalendarProps) {
  const [items, setItems] = useState<ContentCalendarItem[]>(initialItems);
  const [channelFilter, setChannelFilter] = useState<string>('ALL');
  const [title, setTitle] = useState('');
  const [channel, setChannel] = useState<ContentCalendarItem['channel']>('Blog');
  const [assignee, setAssignee] = useState('');
  const [dueDate, setDueDate] = useState('2026-11-12');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (isValidCalendarList(parsed) && parsed.length > 0) {
          setItems(parsed);
        }
      }
    } catch {
      // ignore storage errors
    }
  }, [storageKey]);

  const persist = async (next: ContentCalendarItem[], fallback: ContentCalendarItem[]) => {
    setItems(next);
    setError(null);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      await onChange?.(next);
    } catch {
      setItems(fallback);
      setError('Unable to save content calendar update. Reverted changes.');
    }
  };

  const filtered = useMemo(
    () => items.filter((i) => channelFilter === 'ALL' || i.channel === channelFilter),
    [items, channelFilter]
  );

  const advanceStage = async (id: string, nextStage: CalendarStage) => {
    const prev = items;
    const next = items.map((i) => (i.id === id ? { ...i, stage: nextStage } : i));
    await persist(next, prev);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !assignee.trim()) {
      setError('Content title and team assignee are required.');
      return;
    }
    const newItem: ContentCalendarItem = {
      id: `cal-${Date.now()}`,
      title: title.trim(),
      channel,
      assignee: assignee.trim(),
      dueDate,
      stage: 'Idea'
    };
    const prev = items;
    setTitle('');
    setAssignee('');
    await persist([newItem, ...items], prev);
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Editorial Content Calendar</h2>
          <p className="text-sm text-slate-600">
            Coordinate multi-channel campaigns across workflow stages with team assignments.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['ALL', 'Blog', 'YouTube', 'LinkedIn', 'Newsletter'].map((ch) => (
            <button
              key={ch}
              type="button"
              aria-pressed={channelFilter === ch}
              onClick={() => setChannelFilter(ch)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                channelFilter === ch
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-700 border-slate-300'
              }`}
            >
              {ch}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <input
          type="text"
          aria-label="Content item title"
          placeholder="Campaign or Content Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
        />
        <select
          aria-label="Distribution channel"
          value={channel}
          onChange={(e) => setChannel(e.target.value as ContentCalendarItem['channel'])}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
        >
          <option value="Blog">Blog</option>
          <option value="YouTube">YouTube</option>
          <option value="LinkedIn">LinkedIn</option>
          <option value="Newsletter">Newsletter</option>
        </select>
        <input
          type="text"
          aria-label="Team member assignee"
          placeholder="Assignee Name"
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
        />
        <input
          type="date"
          aria-label="Target due date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
        />
        <button
          type="submit"
          className="py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm"
        >
          Add to Calendar
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {STAGES.map((stage) => {
          const columnItems = filtered.filter((i) => i.stage === stage);
          return (
            <div key={stage} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">{stage}</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                  {columnItems.length}
                </span>
              </div>
              {columnItems.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                  No items in {stage}
                </div>
              ) : (
                columnItems.map((item) => (
                  <div key={item.id} className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm space-y-2">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                      {item.channel}
                    </span>
                    <div className="text-xs font-bold text-slate-900">{item.title}</div>
                    <div className="text-[11px] text-slate-500">
                      {item.assignee} &bull; Due {item.dueDate}
                    </div>
                    <select
                      aria-label={`Move ${item.title} to stage`}
                      value={item.stage}
                      onChange={(e) => void advanceStage(item.id, e.target.value as CalendarStage)}
                      className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                    >
                      {STAGES.map((s) => (
                        <option key={s} value={s}>
                          Stage: {s}
                        </option>
                      ))}
                    </select>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ContentCalendar;
