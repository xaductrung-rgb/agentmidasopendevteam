'use client';

import React, { useState, useMemo, useEffect } from 'react';

export type OnboardingPhase = 'Day 1' | 'Week 1' | 'Month 1';

export interface OnboardingTask {
  id: string;
  title: string;
  phase: OnboardingPhase;
  ownerRole: string;
  completed: boolean;
}

export interface OnboardingChecklistProps {
  initialTasks?: OnboardingTask[];
  storageKey?: string;
  onChange?: (tasks: OnboardingTask[]) => void | Promise<void>;
}

const DEFAULT_TASKS: OnboardingTask[] = [
  {
    id: 'ob-1',
    title: 'Configure SSO, hardware security key, and 1Password vault',
    phase: 'Day 1',
    ownerRole: 'IT & Security',
    completed: true
  },
  {
    id: 'ob-2',
    title: 'Complete local Next.js + Supabase RLS development setup',
    phase: 'Day 1',
    ownerRole: 'Engineering',
    completed: true
  },
  {
    id: 'ob-3',
    title: 'Review Two-Up commission engine architecture and Stripe webhooks',
    phase: 'Week 1',
    ownerRole: 'Product',
    completed: false
  },
  {
    id: 'ob-4',
    title: 'Ship first production PR passing 6-layer security gate',
    phase: 'Month 1',
    ownerRole: 'Engineering',
    completed: false
  }
];

function isValidOnboardingList(val: unknown): val is OnboardingTask[] {
  return (
    Array.isArray(val) &&
    val.every(
      (t) =>
        t &&
        typeof t === 'object' &&
        typeof (t as OnboardingTask).id === 'string' &&
        typeof (t as OnboardingTask).title === 'string' &&
        typeof (t as OnboardingTask).phase === 'string' &&
        typeof (t as OnboardingTask).completed === 'boolean'
    )
  );
}

export function OnboardingChecklist({
  initialTasks = DEFAULT_TASKS,
  storageKey = 'agentmidas_onboarding_v1',
  onChange
}: OnboardingChecklistProps) {
  const [tasks, setTasks] = useState<OnboardingTask[]>(initialTasks);
  const [phaseFilter, setPhaseFilter] = useState<'ALL' | OnboardingPhase>('ALL');
  const [title, setTitle] = useState('');
  const [phase, setPhase] = useState<OnboardingPhase>('Week 1');
  const [ownerRole, setOwnerRole] = useState('Engineering');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (isValidOnboardingList(parsed) && parsed.length > 0) {
          setTasks(parsed);
        }
      }
    } catch {
      // ignore storage errors
    }
  }, [storageKey]);

  const persist = async (next: OnboardingTask[], fallback: OnboardingTask[]) => {
    setTasks(next);
    setError(null);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      await onChange?.(next);
    } catch {
      setTasks(fallback);
      setError('Failed to save onboarding progress. Reverted to previous state.');
    }
  };

  const progressStats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pct };
  }, [tasks]);

  const filteredTasks = useMemo(
    () => tasks.filter((t) => phaseFilter === 'ALL' || t.phase === phaseFilter),
    [tasks, phaseFilter]
  );

  const toggleTask = async (id: string) => {
    const prev = tasks;
    const next = tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
    await persist(next, prev);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !ownerRole.trim()) {
      setError('Task description and owner team are required.');
      return;
    }
    const newTask: OnboardingTask = {
      id: `ob-${Date.now()}`,
      title: title.trim(),
      phase,
      ownerRole: ownerRole.trim(),
      completed: false
    };
    const prev = tasks;
    setTitle('');
    await persist([...tasks, newTask], prev);
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">New Hire Onboarding Checklist</h2>
          <p className="text-sm text-slate-600">
            Track Day 1, Week 1, and Month 1 onboarding milestones with real-time completion progress.
          </p>
        </div>
        <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-sm font-bold text-emerald-800">
          {progressStats.completed} / {progressStats.total} Completed ({progressStats.pct}%)
        </div>
      </div>

      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-indigo-600 transition-all"
          style={{ width: `${progressStats.pct}%` }}
        />
      </div>

      {error && (
        <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        {(['ALL', 'Day 1', 'Week 1', 'Month 1'] as const).map((ph) => (
          <button
            key={ph}
            type="button"
            aria-pressed={phaseFilter === ph}
            onClick={() => setPhaseFilter(ph)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              phaseFilter === ph
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-700 border-slate-300'
            }`}
          >
            {ph}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-2.5">
          {filteredTasks.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 border border-dashed border-slate-300 rounded-xl">
              No onboarding milestones in this phase.
            </div>
          ) : (
            filteredTasks.map((task) => (
              <label
                key={task.id}
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer ${
                  task.completed ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => void toggleTask(task.id)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                  />
                  <div>
                    <div
                      className={`text-sm font-semibold ${
                        task.completed ? 'line-through text-slate-400' : 'text-slate-900'
                      }`}
                    >
                      {task.title}
                    </div>
                    <div className="text-xs text-slate-500">{task.ownerRole}</div>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                  {task.phase}
                </span>
              </label>
            ))
          )}
        </div>

        <form onSubmit={handleAddTask} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Add Milestone</h3>
          <input
            type="text"
            aria-label="Onboarding task title"
            placeholder="Milestone Description"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          />
          <select
            aria-label="Onboarding phase"
            value={phase}
            onChange={(e) => setPhase(e.target.value as OnboardingPhase)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          >
            <option value="Day 1">Day 1</option>
            <option value="Week 1">Week 1</option>
            <option value="Month 1">Month 1</option>
          </select>
          <input
            type="text"
            aria-label="Owner team or role"
            placeholder="Owner Role (e.g. Engineering)"
            value={ownerRole}
            onChange={(e) => setOwnerRole(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          />
          <button
            type="submit"
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm"
          >
            Add Task
          </button>
        </form>
      </div>
    </div>
  );
}

export default OnboardingChecklist;
