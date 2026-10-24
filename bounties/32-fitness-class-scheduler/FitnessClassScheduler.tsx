'use client';
import React, { useState, useRef } from 'react';

export interface FitnessClassSession {
  id: string;
  className: string;
  instructor: string;
  dayOfWeek: string;
  startTime: string;
  capacity: number;
  enrolledMembers: string[];
  waitlistMembers: string[];
}

export interface FitnessClassSchedulerProps {
  storageKey?: string;
  initialClasses?: FitnessClassSession[];
  onChange?: (classes: FitnessClassSession[]) => void | Promise<void>;
}

const DEFAULT_CLASSES: FitnessClassSession[] = [
  {
    id: 'fit-101',
    className: 'HIIT Metabolic Conditioning',
    instructor: 'Coach Kira',
    dayOfWeek: 'Monday',
    startTime: '07:00',
    capacity: 3,
    enrolledMembers: ['Alex Rivera', 'Jordan Lee'],
    waitlistMembers: []
  },
  {
    id: 'fit-102',
    className: 'Power Mobility & Core',
    instructor: 'Coach Dante',
    dayOfWeek: 'Wednesday',
    startTime: '18:00',
    capacity: 2,
    enrolledMembers: ['Samira Khan', 'Chris Evans'],
    waitlistMembers: ['Taylor Morgan']
  }
];

function isValidClass(item: unknown): item is FitnessClassSession {
  if (!item || typeof item !== 'object') return false;
  const c = item as Record<string, unknown>;
  return (
    typeof c.id === 'string' &&
    typeof c.className === 'string' &&
    typeof c.instructor === 'string' &&
    typeof c.capacity === 'number' &&
    c.capacity > 0 &&
    Array.isArray(c.enrolledMembers) &&
    Array.isArray(c.waitlistMembers)
  );
}

export const FitnessClassScheduler: React.FC<FitnessClassSchedulerProps> = ({
  storageKey = 'agentmidas_fitness_classes_v1',
  initialClasses = DEFAULT_CLASSES,
  onChange
}) => {
  const [classes, setClasses] = useState<FitnessClassSession[]>(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.every(isValidClass)) {
          return parsed;
        }
      }
    } catch {}
    return initialClasses;
  });

  const classesRef = useRef<FitnessClassSession[]>(classes);
  classesRef.current = classes;
  const saveLockRef = useRef(false);

  const [memberName, setMemberName] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || 'fit-101');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [notice, setNotice] = useState('');

  const persistClasses = async (next: FitnessClassSession[], msg: string): Promise<boolean> => {
    if (saveLockRef.current) return false;
    saveLockRef.current = true;
    setIsSaving(true);
    const prev = classesRef.current;
    classesRef.current = next;
    setClasses(next);
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
      classesRef.current = prev;
      setClasses(prev);
      setErrorMsg('Failed to persist class roster; rolled back.');
      return false;
    } finally {
      saveLockRef.current = false;
      setIsSaving(false);
    }
  };

  const handleBookMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saveLockRef.current) return;
    const trimmed = memberName.trim();
    if (!trimmed) {
      setErrorMsg('Enter a member name to book or join the waitlist.');
      return;
    }
    const target = classesRef.current.find(c => c.id === selectedClassId);
    if (!target) return;
    if (target.enrolledMembers.includes(trimmed) || target.waitlistMembers.includes(trimmed)) {
      setErrorMsg(`${trimmed} is already registered for ${target.className}.`);
      return;
    }
    const isFull = target.enrolledMembers.length >= target.capacity;
    const next = classesRef.current.map(c => {
      if (c.id !== selectedClassId) return c;
      return isFull
        ? { ...c, waitlistMembers: [...c.waitlistMembers, trimmed] }
        : { ...c, enrolledMembers: [...c.enrolledMembers, trimmed] };
    });
    const ok = await persistClasses(
      next,
      isFull ? `Class full — added ${trimmed} to waitlist.` : `Confirmed spot for ${trimmed} in ${target.className}.`
    );
    if (ok) {
      setMemberName('');
    }
  };

  const cancelBooking = async (classId: string, member: string) => {
    if (saveLockRef.current) return;
    const next = classesRef.current.map(c => {
      if (c.id !== classId) return c;
      const remainingEnrolled = c.enrolledMembers.filter(m => m !== member);
      if (remainingEnrolled.length < c.capacity && c.waitlistMembers.length > 0) {
        const [promoted, ...restWaitlist] = c.waitlistMembers;
        return {
          ...c,
          enrolledMembers: [...remainingEnrolled, promoted],
          waitlistMembers: restWaitlist
        };
      }
      return {
        ...c,
        enrolledMembers: remainingEnrolled,
        waitlistMembers: c.waitlistMembers.filter(m => m !== member)
      };
    });
    await persistClasses(next, `Cancelled booking for ${member} and auto-promoted waitlist.`);
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="border-b border-zinc-800 pb-4">
          <h1 className="text-2xl font-bold text-[#D4AF37]">Fitness Studio Class Scheduler & Waitlist Engine</h1>
          <p className="text-sm text-zinc-400">Manage class capacities, member reservations, and automatic waitlist promotion</p>
        </header>

        {notice && <div role="status" className="bg-emerald-950/60 border border-emerald-700 text-emerald-200 px-4 py-2 rounded text-sm">{notice}</div>}
        {errorMsg && <div role="alert" className="bg-red-950/60 border border-red-700 text-red-200 px-4 py-2 rounded text-sm">{errorMsg}</div>}

        <form onSubmit={handleBookMember} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <select aria-label="Select Fitness Class" value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} disabled={isSaving} className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white">
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                {c.className} ({c.dayOfWeek} {c.startTime}) — {c.enrolledMembers.length}/{c.capacity}
              </option>
            ))}
          </select>
          <input aria-label="Member Name" value={memberName} onChange={e => setMemberName(e.target.value)} disabled={isSaving} placeholder="Member Full Name" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
          <button type="submit" disabled={isSaving} className="bg-[#D4AF37] text-black font-bold text-xs rounded px-4 py-2">
            + Book Spot / Join Waitlist
          </button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {classes.map(c => (
            <div key={c.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-bold text-white">{c.className}</div>
                  <div className="text-xs text-zinc-400">{c.instructor} · {c.dayOfWeek} at {c.startTime}</div>
                </div>
                <span className="text-xs font-mono text-[#D4AF37]">
                  {c.enrolledMembers.length}/{c.capacity} Enrolled · {c.waitlistMembers.length} Waitlisted
                </span>
              </div>
              <div className="space-y-1 text-xs">
                {c.enrolledMembers.map(m => (
                  <div key={m} className="flex justify-between items-center bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1">
                    <span className="text-emerald-300">✓ {m}</span>
                    <button
                      type="button"
                      aria-label={`Cancel booking for ${m}`}
                      disabled={isSaving}
                      onClick={() => void cancelBooking(c.id, m)}
                      className="text-red-400 hover:underline"
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FitnessClassScheduler;
