'use client';
import React, { useState, useMemo, useEffect, useRef } from 'react';

export type TicketPriority = 'Critical' | 'High' | 'Medium' | 'Low';
export type TicketStatus = 'Open' | 'In Progress' | 'Waiting on Customer' | 'Resolved' | 'Closed';

export interface TicketReply {
  id: string;
  author: string;
  body: string;
  internal: boolean;
  createdAtIso: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  requesterEmail: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignee: string;
  createdAtMs: number;
  resolvedAtMs?: number;
  slaTargetHours: number;
  replies: TicketReply[];
}

export interface TicketSystemProps {
  storageKey?: string;
  initialTickets?: SupportTicket[];
  nowMs?: number;
  onChange?: (tickets: SupportTicket[]) => void | Promise<void>;
}

const AGENTS = ['Unassigned', 'Avery Chen (Tier 3)', 'Jordan Patel (Billing)', 'Samira Khan (SecOps)'];

const SLA_HOURS_BY_PRIORITY: Record<TicketPriority, number> = {
  Critical: 2,
  High: 8,
  Medium: 24,
  Low: 72
};

const BASE_NOW = 1761264000000;

function isValidTicket(t: any): t is SupportTicket {
  return (
    t &&
    typeof t === 'object' &&
    typeof t.id === 'string' &&
    typeof t.subject === 'string' &&
    typeof t.requesterEmail === 'string' &&
    typeof t.priority === 'string' &&
    typeof t.status === 'string' &&
    typeof t.assignee === 'string' &&
    typeof t.createdAtMs === 'number' &&
    typeof t.slaTargetHours === 'number' &&
    Array.isArray(t.replies)
  );
}

const DEFAULT_TICKETS: SupportTicket[] = [
  {
    id: 'TKT-1041',
    subject: 'Webhook HMAC signature mismatch on Stripe failover',
    requesterEmail: 'devops@fintechpartner.io',
    priority: 'Critical',
    status: 'In Progress',
    assignee: 'Samira Khan (SecOps)',
    createdAtMs: BASE_NOW - 3 * 3600 * 1000,
    slaTargetHours: 2,
    replies: [
      {
        id: 'rep-1',
        author: 'Samira Khan (SecOps)',
        body: 'Investigating raw body middleware buffer encoding on endpoint.',
        internal: false,
        createdAtIso: '2026-10-23T22:15:00Z'
      }
    ]
  },
  {
    id: 'TKT-1042',
    subject: 'Two-Up genealogy pass-up credit adjustment request',
    requesterEmail: 'partner@growthguild.co',
    priority: 'High',
    status: 'Open',
    assignee: 'Jordan Patel (Billing)',
    createdAtMs: BASE_NOW - 2 * 3600 * 1000,
    slaTargetHours: 8,
    replies: []
  },
  {
    id: 'TKT-1043',
    subject: 'Question on exporting 90-day ARR CSV snapshot',
    requesterEmail: 'cfo@saasmetrics.net',
    priority: 'Low',
    status: 'Resolved',
    assignee: 'Avery Chen (Tier 3)',
    createdAtMs: BASE_NOW - 12 * 3600 * 1000,
    resolvedAtMs: BASE_NOW - 8 * 3600 * 1000,
    slaTargetHours: 72,
    replies: []
  }
];

export const TicketSystem: React.FC<TicketSystemProps> = ({
  storageKey = 'agentmidas_ticket_system_v1',
  initialTickets = DEFAULT_TICKETS,
  nowMs,
  onChange
}) => {
  const [tickets, setTickets] = useState<SupportTicket[]>(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter(isValidTicket);
          if (valid.length > 0) return valid;
        }
      }
    } catch {}
    return initialTickets;
  });

  const [currentClockMs, setCurrentClockMs] = useState<number>(() => nowMs ?? Date.now());
  const saveSeqRef = useRef(0);

  useEffect(() => {
    if (nowMs !== undefined) {
      setCurrentClockMs(nowMs);
      return;
    }
    const timer = setInterval(() => {
      setCurrentClockMs(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, [nowMs]);

  const [selectedTicketId, setSelectedTicketId] = useState<string>(tickets[0]?.id || 'TKT-1041');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TicketStatus>('ALL');
  const [subject, setSubject] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('High');
  const [assignee, setAssignee] = useState<string>(AGENTS[1]);
  const [replyText, setReplyText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [notice, setNotice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const persistTickets = async (next: SupportTicket[], msg?: string) => {
    const seq = ++saveSeqRef.current;
    const prev = tickets;
    setTickets(next);
    setErrorMsg('');
    try {
      if (onChange) {
        await onChange(next);
      }
      if (seq !== saveSeqRef.current) return;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      }
      if (msg) setNotice(msg);
    } catch {
      if (seq === saveSeqRef.current) {
        setTickets(prev);
        setErrorMsg('Failed to persist ticket changes; rolled back.');
      }
    }
  };

  const evaluateSla = (t: SupportTicket) => {
    const deadlineMs = t.createdAtMs + t.slaTargetHours * 3600 * 1000;
    if (t.status === 'Resolved' || t.status === 'Closed') {
      const closedTime = t.resolvedAtMs ?? currentClockMs;
      if (closedTime <= deadlineMs) {
        return { state: 'Met' as const, label: 'SLA Met (On Time)' };
      }
      return { state: 'Overdue' as const, label: 'SLA Breached (Resolved Late)' };
    }
    const diffHours = (deadlineMs - currentClockMs) / (3600 * 1000);
    if (diffHours < 0) {
      return {
        state: 'Overdue' as const,
        label: `OVERDUE by ${Math.abs(diffHours).toFixed(1)}h`
      };
    }
    return {
      state: diffHours <= 2 ? ('AtRisk' as const) : ('OnTrack' as const),
      label: `Due in ${diffHours.toFixed(1)}h`
    };
  };

  const filteredTickets = useMemo(
    () => tickets.filter(t => (statusFilter === 'ALL' ? true : t.status === statusFilter)),
    [tickets, statusFilter]
  );

  const activeTicket = useMemo(
    () => tickets.find(t => t.id === selectedTicketId) || tickets[0],
    [tickets, selectedTicketId]
  );

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !requesterEmail.trim()) {
      setErrorMsg('Ticket subject and requester email are required.');
      return;
    }
    const usedIds = new Set(tickets.map(t => t.id));
    let num = 1044 + tickets.length;
    while (usedIds.has(`TKT-${num}`)) num += 1;

    const created: SupportTicket = {
      id: `TKT-${num}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
      subject: subject.trim(),
      requesterEmail: requesterEmail.trim(),
      priority,
      status: 'Open',
      assignee,
      createdAtMs: currentClockMs,
      slaTargetHours: SLA_HOURS_BY_PRIORITY[priority],
      replies: []
    };
    setSubject('');
    setRequesterEmail('');
    setSelectedTicketId(created.id);
    void persistTickets([created, ...tickets], `Created ticket ${created.id} with ${created.slaTargetHours}h SLA.`);
  };

  const updateTicketField = (id: string, patch: Partial<SupportTicket>, msg: string) => {
    const next = tickets.map(t => {
      if (t.id !== id) return t;
      const updated = { ...t, ...patch };
      if (patch.status === 'Resolved' || patch.status === 'Closed') {
        updated.resolvedAtMs = t.resolvedAtMs ?? currentClockMs;
      } else if (patch.status) {
        updated.resolvedAtMs = undefined;
      }
      return updated;
    });
    void persistTickets(next, msg);
  };

  const handleAddReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !replyText.trim()) return;
    const reply: TicketReply = {
      id: `rep-${Date.now()}`,
      author: activeTicket.assignee || 'Support Agent',
      body: replyText.trim(),
      internal: isInternalNote,
      createdAtIso: new Date(currentClockMs).toISOString()
    };
    setReplyText('');
    updateTicketField(
      activeTicket.id,
      { replies: [...activeTicket.replies, reply] },
      isInternalNote ? 'Added internal agent note.' : 'Sent public response to requester.'
    );
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-[#D4AF37]">Agent Midas Help Desk & SLA Ticket System</h1>
          </div>
        </header>

        {notice && <div role="status" className="bg-emerald-950/60 border border-emerald-700 text-emerald-200 px-4 py-2 rounded text-sm">{notice}</div>}
        {errorMsg && <div role="alert" className="bg-red-950/60 border border-red-700 text-red-200 px-4 py-2 rounded text-sm">{errorMsg}</div>}

        <form onSubmit={handleCreateTicket} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
          <input type="text" placeholder="Ticket Subject" value={subject} onChange={e => setSubject(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
          <input type="email" placeholder="Requester Email" value={requesterEmail} onChange={e => setRequesterEmail(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
          <select aria-label="Ticket Priority" value={priority} onChange={e => setPriority(e.target.value as TicketPriority)} className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white">
            {(['Critical', 'High', 'Medium', 'Low'] as const).map(p => (
              <option key={p} value={p}>{p} ({SLA_HOURS_BY_PRIORITY[p]}h SLA)</option>
            ))}
          </select>
          <select aria-label="Initial Assignee" value={assignee} onChange={e => setAssignee(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white">
            {AGENTS.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <button type="submit" className="bg-[#D4AF37] text-black font-bold text-sm rounded px-4 py-2">+ Create Ticket</button>
        </form>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap gap-1.5" role="tablist">
              {(['ALL', 'Open', 'In Progress', 'Waiting on Customer', 'Resolved', 'Closed'] as const).map(st => (
                <button
                  key={st}
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold ${
                    statusFilter === st ? 'bg-[#D4AF37] text-black' : 'bg-zinc-950 text-zinc-400'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {filteredTickets.map(t => {
                const sla = evaluateSla(t);
                const selected = activeTicket?.id === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTicketId(t.id)}
                    className={`w-full text-left p-3 rounded-lg border transition ${
                      selected ? 'bg-zinc-800 border-[#D4AF37]' : 'bg-zinc-950 border-zinc-800'
                    }`}
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-mono font-bold text-[#D4AF37]">{t.id}</span>
                      <span className={sla.state === 'Overdue' ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                        {sla.label}
                      </span>
                    </div>
                    <div className="font-semibold text-sm text-white mt-1">{t.subject}</div>
                    <div className="text-xs text-zinc-400 mt-1">{t.priority} · {t.status} · {t.assignee}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {activeTicket && (
            <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-5">
              <div className="flex flex-wrap justify-between items-start gap-4 border-b border-zinc-800 pb-4">
                <div>
                  <span className="text-xs font-mono text-[#D4AF37]">{activeTicket.id}</span>
                  <h2 className="text-xl font-bold text-white">{activeTicket.subject}</h2>
                  <p className="text-xs text-zinc-400">Requester: {activeTicket.requesterEmail}</p>
                </div>
                <div className="flex gap-3">
                  <select
                    aria-label="Update Ticket Status"
                    value={activeTicket.status}
                    onChange={e => updateTicketField(activeTicket.id, { status: e.target.value as TicketStatus }, `Updated status to ${e.target.value}.`)}
                    className="bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-white"
                  >
                    {(['Open', 'In Progress', 'Waiting on Customer', 'Resolved', 'Closed'] as const).map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                  <select
                    aria-label="Assign Support Agent"
                    value={activeTicket.assignee}
                    onChange={e => updateTicketField(activeTicket.id, { assignee: e.target.value }, `Assigned to ${e.target.value}.`)}
                    className="bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-white"
                  >
                    {AGENTS.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                {activeTicket.replies.map(r => (
                  <div key={r.id} className="p-3 rounded-lg border border-zinc-800 bg-zinc-950 text-sm">
                    <div className="flex justify-between text-xs text-zinc-400 mb-1">
                      <span className="font-bold text-[#D4AF37]">{r.author}</span>
                      <span>{r.createdAtIso}</span>
                    </div>
                    <p>{r.body}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddReply} className="space-y-3 pt-3 border-t border-zinc-800">
                <textarea rows={3} placeholder="Write a reply..." value={replyText} onChange={e => setReplyText(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-sm text-white" />
                <div className="flex justify-between items-center">
                  <label className="flex items-center gap-2 text-xs text-zinc-300">
                    <input type="checkbox" checked={isInternalNote} onChange={e => setIsInternalNote(e.target.checked)} />
                    Internal Agent Note
                  </label>
                  <button type="submit" className="bg-[#D4AF37] text-black font-bold text-xs px-4 py-2 rounded">Post Response</button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketSystem;
