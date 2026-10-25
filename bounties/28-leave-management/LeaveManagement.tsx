'use client';
import React, { useState, useRef, useMemo } from 'react';

export type LeaveType = 'Annual PTO' | 'Medical / Sick' | 'Parental Leave' | 'Unpaid Leave';
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

export interface LeaveRequestItem {
  id: string;
  employeeName: string;
  department: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  daysRequested: number;
  status: LeaveStatus;
}

export interface LeaveManagementProps {
  storageKey?: string;
  annualPtoAllowanceDays?: number;
  initialRequests?: LeaveRequestItem[];
  onChange?: (requests: LeaveRequestItem[]) => void | Promise<void>;
}

const LEAVE_TYPES: LeaveType[] = ['Annual PTO', 'Medical / Sick', 'Parental Leave', 'Unpaid Leave'];

const DEFAULT_REQUESTS: LeaveRequestItem[] = [
  {
    id: 'lv-101',
    employeeName: 'Maya Lin',
    department: 'Platform Engineering',
    leaveType: 'Annual PTO',
    startDate: '2026-11-10',
    endDate: '2026-11-14',
    daysRequested: 5,
    status: 'Approved'
  },
  {
    id: 'lv-102',
    employeeName: 'Devon Brooks',
    department: 'Revenue Operations',
    leaveType: 'Medical / Sick',
    startDate: '2026-11-18',
    endDate: '2026-11-19',
    daysRequested: 2,
    status: 'Pending'
  }
];

function getLocalDateIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isValidLeave(item: unknown): item is LeaveRequestItem {
  if (!item || typeof item !== 'object') return false;
  const l = item as Record<string, unknown>;
  return (
    typeof l.id === 'string' &&
    typeof l.employeeName === 'string' &&
    typeof l.department === 'string' &&
    LEAVE_TYPES.includes(l.leaveType as LeaveType) &&
    typeof l.startDate === 'string' &&
    typeof l.endDate === 'string' &&
    typeof l.daysRequested === 'number' &&
    l.daysRequested > 0
  );
}

export const LeaveManagement: React.FC<LeaveManagementProps> = ({
  storageKey = 'agentmidas_leave_requests_v1',
  annualPtoAllowanceDays = 20,
  initialRequests = DEFAULT_REQUESTS,
  onChange
}) => {
  const [requests, setRequests] = useState<LeaveRequestItem[]>(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.every(isValidLeave)) {
          return parsed;
        }
      }
    } catch {}
    return initialRequests;
  });

  const requestsRef = useRef<LeaveRequestItem[]>(requests);
  requestsRef.current = requests;
  const saveLockRef = useRef(false);

  const [employeeName, setEmployeeName] = useState('');
  const [department, setDepartment] = useState('Platform Engineering');
  const [leaveType, setLeaveType] = useState<LeaveType>('Annual PTO');
  const [startDate, setStartDate] = useState(() => getLocalDateIso());
  const [endDate, setEndDate] = useState(() => getLocalDateIso());
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [notice, setNotice] = useState('');

  const persistRequests = async (next: LeaveRequestItem[], msg: string): Promise<boolean> => {
    if (saveLockRef.current) return false;
    saveLockRef.current = true;
    setIsSaving(true);
    const prev = requestsRef.current;
    requestsRef.current = next;
    setRequests(next);
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
      requestsRef.current = prev;
      setRequests(prev);
      setNotice('');
      setErrorMsg('Failed to persist leave requests; rolled back.');
      return false;
    } finally {
      saveLockRef.current = false;
      setIsSaving(false);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saveLockRef.current) return;
    const sTime = Date.parse(startDate);
    const eTime = Date.parse(endDate);
    if (!employeeName.trim() || !department.trim() || Number.isNaN(sTime) || Number.isNaN(eTime) || eTime < sTime) {
      setNotice('');
      setErrorMsg('Employee name, department, and valid date range (end >= start) are required.');
      return;
    }
    const days = Math.max(1, Math.round((eTime - sTime) / 86_400_000) + 1);
    const created: LeaveRequestItem = {
      id: `lv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      employeeName: employeeName.trim(),
      department: department.trim(),
      leaveType,
      startDate,
      endDate,
      daysRequested: days,
      status: 'Pending'
    };
    const ok = await persistRequests([created, ...requestsRef.current], `Submitted ${days}-day leave request for ${created.employeeName}.`);
    if (ok) {
      setEmployeeName('');
    }
  };

  const updateLeaveStatus = async (id: string, status: LeaveStatus) => {
    if (saveLockRef.current) return;
    const next = requestsRef.current.map(r => (r.id === id ? { ...r, status } : r));
    await persistRequests(next, `Updated leave request status to ${status}.`);
  };

  const stats = useMemo(() => {
    const approvedDays = requests
      .filter(r => r.status === 'Approved' && r.leaveType === 'Annual PTO')
      .reduce((s, r) => s + r.daysRequested, 0);
    const pendingCount = requests.filter(r => r.status === 'Pending').length;
    return { approvedDays, pendingCount, remainingAllowance: Math.max(0, annualPtoAllowanceDays - approvedDays) };
  }, [requests, annualPtoAllowanceDays]);

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="border-b border-zinc-800 pb-4 flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#D4AF37]">HR Leave & PTO Accrual Manager</h1>
            <p className="text-sm text-zinc-400">Submit absence requests, track PTO balances, and view team leave calendar</p>
          </div>
          <div className="flex gap-3 text-xs">
            <div className="bg-zinc-900 border border-zinc-800 px-3 py-2 rounded">
              <div className="text-zinc-400">Approved PTO Used</div>
              <div className="text-base font-bold text-white">{stats.approvedDays} days</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 px-3 py-2 rounded">
              <div className="text-zinc-400">Remaining Annual PTO</div>
              <div className="text-base font-bold text-emerald-400">{stats.remainingAllowance} days</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 px-3 py-2 rounded">
              <div className="text-zinc-400">Pending Approvals</div>
              <div className="text-base font-bold text-[#D4AF37]">{stats.pendingCount}</div>
            </div>
          </div>
        </header>

        {notice && <div role="status" className="bg-emerald-950/60 border border-emerald-700 text-emerald-200 px-4 py-2 rounded text-sm">{notice}</div>}
        {errorMsg && <div role="alert" className="bg-red-950/60 border border-red-700 text-red-200 px-4 py-2 rounded text-sm">{errorMsg}</div>}

        <form onSubmit={handleSubmitRequest} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-6 gap-3">
          <input aria-label="Employee Name" value={employeeName} onChange={e => setEmployeeName(e.target.value)} disabled={isSaving} placeholder="Employee Name" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
          <input aria-label="Department" value={department} onChange={e => setDepartment(e.target.value)} disabled={isSaving} placeholder="Department" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
          <select aria-label="Leave Type" value={leaveType} onChange={e => setLeaveType(e.target.value as LeaveType)} disabled={isSaving} className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white">
            {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input aria-label="Start Date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} disabled={isSaving} className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
          <input aria-label="End Date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} disabled={isSaving} className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
          <button type="submit" disabled={isSaving} className="bg-[#D4AF37] text-black font-bold text-xs rounded px-4 py-2">
            + Request Leave
          </button>
        </form>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3" aria-label="Team Leave Calendar View">
          <h2 className="text-xs font-bold text-[#D4AF37] uppercase">Team Leave Schedule Calendar</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
            {requests.map(req => (
              <div key={`cal-${req.id}`} className="bg-zinc-950 border border-zinc-800 rounded p-2.5 text-xs">
                <div className="font-mono text-[#D4AF37]">{req.startDate} → {req.endDate}</div>
                <div className="font-bold text-white mt-0.5">{req.employeeName} ({req.daysRequested}d)</div>
                <div className="text-zinc-400">{req.leaveType} · {req.status}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {requests.map(req => (
            <div key={req.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-wrap justify-between items-center gap-4">
              <div>
                <div className="font-bold text-sm text-white">{req.employeeName} · <span className="text-[#D4AF37]">{req.leaveType}</span></div>
                <div className="text-xs text-zinc-400">
                  {req.department} · {req.startDate} to {req.endDate} ({req.daysRequested} days) · Status: <strong>{req.status}</strong>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  aria-label={`Approve leave for ${req.employeeName}`}
                  disabled={isSaving || req.status === 'Approved'}
                  onClick={() => void updateLeaveStatus(req.id, 'Approved')}
                  className="px-3 py-1 rounded bg-emerald-900/60 border border-emerald-700 text-xs text-emerald-200 font-bold disabled:opacity-40"
                >
                  Approve
                </button>
                <button
                  type="button"
                  aria-label={`Reject leave for ${req.employeeName}`}
                  disabled={isSaving || req.status === 'Rejected'}
                  onClick={() => void updateLeaveStatus(req.id, 'Rejected')}
                  className="px-3 py-1 rounded bg-red-900/60 border border-red-700 text-xs text-red-200 font-bold disabled:opacity-40"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LeaveManagement;
