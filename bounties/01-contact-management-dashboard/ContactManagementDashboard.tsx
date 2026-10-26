'use client';

import React, { useState, useMemo, useEffect } from 'react';

export type ContactStage = 'Lead' | 'Prospect' | 'Customer' | 'Partner';

export interface ContactRecord {
  id: string;
  fullName: string;
  email: string;
  company: string;
  stage: ContactStage;
  tags: string[];
  lifetimeValueUsd: number;
}

export interface ContactManagementDashboardProps {
  initialContacts?: ContactRecord[];
  storageKey?: string;
  onChange?: (contacts: ContactRecord[]) => void | Promise<void>;
}

const DEFAULT_CONTACTS: ContactRecord[] = [
  {
    id: 'ct-1',
    fullName: 'Elena Vance',
    email: 'elena.vance@apexcloud.io',
    company: 'ApexCloud Systems',
    stage: 'Customer',
    tags: ['enterprise', 'annual'],
    lifetimeValueUsd: 24500
  },
  {
    id: 'ct-2',
    fullName: 'Marcus Sterling',
    email: 'm.sterling@quantumpay.co',
    company: 'QuantumPay FinTech',
    stage: 'Prospect',
    tags: ['q4-target', 'stripe'],
    lifetimeValueUsd: 12000
  },
  {
    id: 'ct-3',
    fullName: 'Sophia Chen',
    email: 'schen@growthpartner.org',
    company: 'GrowthPartner Media',
    stage: 'Partner',
    tags: ['affiliate', 'two-up'],
    lifetimeValueUsd: 38900
  }
];

function isValidContactList(val: unknown): val is ContactRecord[] {
  return (
    Array.isArray(val) &&
    val.every(
      (c) =>
        c &&
        typeof c === 'object' &&
        typeof (c as ContactRecord).id === 'string' &&
        typeof (c as ContactRecord).fullName === 'string' &&
        typeof (c as ContactRecord).email === 'string' &&
        typeof (c as ContactRecord).company === 'string' &&
        typeof (c as ContactRecord).stage === 'string' &&
        Array.isArray((c as ContactRecord).tags) &&
        typeof (c as ContactRecord).lifetimeValueUsd === 'number' &&
        Number.isFinite((c as ContactRecord).lifetimeValueUsd)
    )
  );
}

export function ContactManagementDashboard({
  initialContacts = DEFAULT_CONTACTS,
  storageKey = 'agentmidas_contacts_v1',
  onChange
}: ContactManagementDashboardProps) {
  const [contacts, setContacts] = useState<ContactRecord[]>(initialContacts);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<'ALL' | ContactStage>('ALL');
  const [tagFilter, setTagFilter] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [stage, setStage] = useState<ContactStage>('Lead');
  const [tagsText, setTagsText] = useState('inbound');
  const [ltvInput, setLtvInput] = useState('5000');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved !== null) {
        const parsed: unknown = JSON.parse(saved);
        if (isValidContactList(parsed)) {
          setContacts(parsed);
          return;
        }
      }
    } catch {
      // ignore storage read errors
    }
    setContacts(initialContacts);
  }, [storageKey, initialContacts]);

  const commitContacts = async (next: ContactRecord[]): Promise<boolean> => {
    try {
      await onChange?.(next);
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      setContacts(next);
      setError(null);
      return true;
    } catch {
      setError('Failed to persist contact changes.');
      return false;
    }
  };

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const tf = tagFilter.trim().toLowerCase();
    return contacts.filter((c) => {
      if (stageFilter !== 'ALL' && c.stage !== stageFilter) return false;
      if (tf && !c.tags.some((t) => t.toLowerCase().includes(tf))) return false;
      if (!q) return true;
      return (
        c.fullName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q)
      );
    });
  }, [contacts, search, stageFilter, tagFilter]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = fullName.trim();
    const cleanEmail = email.trim();
    const cleanCompany = company.trim();
    const ltv = Number(ltvInput);

    if (!cleanName || !cleanEmail.includes('@') || !cleanCompany) {
      setError('Please enter a valid full name, email address, and company.');
      return;
    }
    if (!Number.isFinite(ltv) || ltv < 0) {
      setError('Lifetime value must be a non-negative number.');
      return;
    }

    const parsedTags = tagsText
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const record: ContactRecord = {
      id: editingId ?? `ct-${Date.now()}`,
      fullName: cleanName,
      email: cleanEmail,
      company: cleanCompany,
      stage,
      tags: parsedTags.length > 0 ? parsedTags : ['general'],
      lifetimeValueUsd: Math.round(ltv)
    };

    const next = editingId
      ? contacts.map((item) => (item.id === editingId ? record : item))
      : [record, ...contacts];

    if (await commitContacts(next)) {
      setFullName('');
      setEmail('');
      setCompany('');
      setEditingId(null);
    }
  };

  const startEdit = (c: ContactRecord) => {
    setEditingId(c.id);
    setFullName(c.fullName);
    setEmail(c.email);
    setCompany(c.company);
    setStage(c.stage);
    setTagsText(c.tags.join(', '));
    setLtvInput(String(c.lifetimeValueUsd));
    setError(null);
  };

  const deleteContact = async (id: string) => {
    const next = contacts.filter((c) => c.id !== id);
    await commitContacts(next);
  };

  const totalPipelineUsd = useMemo(
    () => filteredContacts.reduce((acc, c) => acc + c.lifetimeValueUsd, 0),
    [filteredContacts]
  );

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Contact Management Dashboard</h2>
          <p className="text-sm text-slate-600">
            Manage CRM contacts with stage segmentation, tag filtering, and pipeline value tracking.
          </p>
        </div>
        <div className="px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-sm font-semibold text-indigo-900">
          Filtered Pipeline: ${totalPipelineUsd.toLocaleString()} ({filteredContacts.length} contacts)
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <input
          type="search"
          aria-label="Search contacts by name, email, or company"
          placeholder="Search name, email, company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
        />
        <select
          aria-label="Filter contacts by stage"
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value as 'ALL' | ContactStage)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
        >
          <option value="ALL">All Stages</option>
          <option value="Lead">Lead</option>
          <option value="Prospect">Prospect</option>
          <option value="Customer">Customer</option>
          <option value="Partner">Partner</option>
        </select>
        <input
          type="search"
          aria-label="Filter contacts by tag"
          placeholder="Filter by tag (e.g. enterprise)..."
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {filteredContacts.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 border border-dashed border-slate-300 rounded-xl">
              No contacts match your current search and filter criteria.
            </div>
          ) : (
            filteredContacts.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{c.fullName}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                      {c.stage}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    {c.email} &bull; {c.company} &bull; LTV: ${c.lifetimeValueUsd.toLocaleString()}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {c.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(c)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteContact(c.id)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSave} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <h3 className="text-sm font-bold text-slate-900">
            {editingId ? 'Edit Contact Record' : 'Add New Contact'}
          </h3>
          <input
            type="text"
            aria-label="Contact full name"
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          />
          <input
            type="email"
            aria-label="Contact email address"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          />
          <input
            type="text"
            aria-label="Contact company name"
            placeholder="Company Name"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          />
          <select
            aria-label="Contact stage"
            value={stage}
            onChange={(e) => setStage(e.target.value as ContactStage)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          >
            <option value="Lead">Lead</option>
            <option value="Prospect">Prospect</option>
            <option value="Customer">Customer</option>
            <option value="Partner">Partner</option>
          </select>
          <input
            type="text"
            aria-label="Comma-separated tags"
            placeholder="Tags (comma-separated)"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          />
          <input
            type="number"
            min="0"
            aria-label="Estimated lifetime value USD"
            placeholder="Lifetime Value (USD)"
            value={ltvInput}
            onChange={(e) => setLtvInput(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          />
          <button
            type="submit"
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm"
          >
            {editingId ? 'Update Contact' : 'Create Contact'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ContactManagementDashboard;
