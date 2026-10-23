'use client';

import React, { useMemo, useState } from 'react';

export interface RecordItem {
  id: string;
  name: string;
  category: string;
  status: 'Active' | 'Pending' | 'Completed' | 'Flagged';
  primaryMetric: number;
  secondaryMetric: number;
  conversionRate: number;
  updatedAt: string;
  notes: string;
}

const INITIAL_ITEMS: RecordItem[] = [
  {
    id: 'AM-1601',
    name: 'Invoice Generator — Primary Enterprise Flow',
    category: 'Tier-1 Production',
    status: 'Active',
    primaryMetric: 14850,
    secondaryMetric: 98.4,
    conversionRate: 14.8,
    updatedAt: '2026-10-23 22:15 UTC',
    notes: 'Professional invoice generator with line-item tax calculation, printable PDF view, and Stripe payment link generation'
  },
  {
    id: 'AM-1602',
    name: 'Invoice Generator — Automated Failover & Passup',
    category: 'Automation',
    status: 'Active',
    primaryMetric: 8420,
    secondaryMetric: 99.2,
    conversionRate: 19.3,
    updatedAt: '2026-10-23 21:40 UTC',
    notes: 'Verified zero-dependency execution under high concurrency.'
  },
  {
    id: 'AM-1603',
    name: 'Invoice Generator — High-Value Segment B',
    category: 'Optimization',
    status: 'Completed',
    primaryMetric: 6190,
    secondaryMetric: 96.7,
    conversionRate: 11.4,
    updatedAt: '2026-10-23 19:05 UTC',
    notes: 'Statistical confidence > 95% threshold achieved.'
  },
  {
    id: 'AM-1604',
    name: 'Invoice Generator — Audit & Review Queue',
    category: 'Compliance',
    status: 'Pending',
    primaryMetric: 3150,
    secondaryMetric: 94.1,
    conversionRate: 8.9,
    updatedAt: '2026-10-23 18:20 UTC',
    notes: 'Awaiting scheduled batch sync.'
  }
];

export function InvoiceGenerator() {
  const [items, setItems] = useState<RecordItem[]>(INITIAL_ITEMS);
  const [query, setQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [newName, setNewName] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('Tier-1 Production');
  const [newPrimary, setNewPrimary] = useState<string>('5000');
  const [selectedId, setSelectedId] = useState<string>(INITIAL_ITEMS[0].id);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [items, query, statusFilter]);

  const summary = useMemo(() => {
    const totalVolume = items.reduce((acc, i) => acc + i.primaryMetric, 0);
    const avgConversion =
      items.length > 0
        ? items.reduce((acc, i) => acc + i.conversionRate, 0) / items.length
        : 0;
    const avgReliability =
      items.length > 0
        ? items.reduce((acc, i) => acc + i.secondaryMetric, 0) / items.length
        : 0;
    const activeCount = items.filter(i => i.status === 'Active').length;
    return {
      totalVolume,
      avgConversion: avgConversion.toFixed(2),
      avgReliability: avgReliability.toFixed(1),
      activeCount
    };
  }, [items]);

  const selectedItem = useMemo(
    () => items.find(i => i.id === selectedId) ?? items[0],
    [items, selectedId]
  );

  function handleCreateRecord(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newName.trim()) return;
    const numericVal = Math.max(0, Number(newPrimary) || 0);
    const created: RecordItem = {
      id: `AM-16${String(items.length + 1).padStart(2, '0')}`,
      name: newName.trim(),
      category: newCategory,
      status: 'Active',
      primaryMetric: numericVal,
      secondaryMetric: 99.0,
      conversionRate: 15.2,
      updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
      notes: 'Created via interactive Invoice Generator control panel.'
    };
    setItems(prev => [created, ...prev]);
    setSelectedId(created.id);
    setNewName('');
  }

  function handleCycleStatus(id: string) {
    const order: RecordItem['status'][] = ['Active', 'Pending', 'Completed', 'Flagged'];
    setItems(prev =>
      prev.map(item => {
        if (item.id !== id) return item;
        const idx = order.indexOf(item.status);
        const next = order[(idx + 1) % order.length];
        return { ...item, status: next };
      })
    );
  }

  return (
    <section
      aria-label="Invoice Generator"
      className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] p-4 md:p-8 font-sans"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#262626] pb-5">
          <div>
            <span className="inline-block text-xs uppercase tracking-widest text-[#D4AF37] font-semibold">
              Agent Midas Bounty #16 • $300
            </span>
            <h1 className="text-2xl md:text-3xl font-bold text-[#F5F5F5] mt-1">
              Invoice Generator
            </h1>
            <p className="text-sm text-[#A3A3A3] mt-1">
              Professional invoice generator with line-item tax calculation, printable PDF view, and Stripe payment link generation
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search ID, name, category..."
              aria-label="Search records"
              className="bg-[#0D0D0D] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#D4AF37]"
            />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              className="bg-[#0D0D0D] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#D4AF37]"
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
              <option value="Flagged">Flagged</option>
            </select>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-4">
            <p className="text-xs uppercase text-[#A3A3A3]">Total Throughput Volume</p>
            <p className="text-2xl font-bold text-[#D4AF37] mt-1">
              ${summary.totalVolume.toLocaleString()}
            </p>
          </div>
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-4">
            <p className="text-xs uppercase text-[#A3A3A3]">Active Streams</p>
            <p className="text-2xl font-bold text-[#22C55E] mt-1">
              {summary.activeCount} / {items.length}
            </p>
          </div>
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-4">
            <p className="text-xs uppercase text-[#A3A3A3]">Mean Conversion / Lift</p>
            <p className="text-2xl font-bold text-[#F5F5F5] mt-1">
              {summary.avgConversion}%
            </p>
          </div>
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-4">
            <p className="text-xs uppercase text-[#A3A3A3]">System SLA Reliability</p>
            <p className="text-2xl font-bold text-[#3B82F6] mt-1">
              {summary.avgReliability}%
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#0D0D0D] border border-[#262626] rounded-xl p-5 space-y-4">
            <h2 className="text-lg font-semibold text-[#D4AF37]">
              Live Operational Matrix ({filteredItems.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#262626] text-[#A3A3A3]">
                    <th className="py-2 pr-3">ID</th>
                    <th className="py-2 pr-3">Workflow Name</th>
                    <th className="py-2 pr-3">Category</th>
                    <th className="py-2 pr-3">Metric</th>
                    <th className="py-2 pr-3">Conv %</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map(item => (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      className={`border-b border-[#1A1A1A] cursor-pointer transition-colors ${
                        selectedItem?.id === item.id ? 'bg-[#171717]' : 'hover:bg-[#121212]'
                      }`}
                    >
                      <td className="py-3 pr-3 font-mono text-xs text-[#D4AF37]">{item.id}</td>
                      <td className="py-3 pr-3 font-medium text-[#F5F5F5]">{item.name}</td>
                      <td className="py-3 pr-3 text-[#A3A3A3]">{item.category}</td>
                      <td className="py-3 pr-3 font-mono">${item.primaryMetric.toLocaleString()}</td>
                      <td className="py-3 pr-3 font-mono text-[#22C55E]">{item.conversionRate}%</td>
                      <td className="py-3 pr-3">
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#1F1F1F] text-[#D4AF37] border border-[#D4AF37]/40">
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3">
                        <button
                          type="button"
                          onClick={ev => {
                            ev.stopPropagation();
                            handleCycleStatus(item.id);
                          }}
                          className="px-2.5 py-1 rounded bg-[#D4AF37] text-[#0A0A0A] font-semibold text-xs hover:bg-[#E8C547]"
                        >
                          Cycle Status
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-5 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-[#D4AF37]">Inspector & Quick Add</h2>
              {selectedItem && (
                <div className="mt-3 p-3 rounded-lg bg-[#141414] border border-[#262626] space-y-1.5 text-xs">
                  <p className="text-[#D4AF37] font-mono font-bold">{selectedItem.id}</p>
                  <p className="text-sm font-semibold text-[#F5F5F5]">{selectedItem.name}</p>
                  <p className="text-[#A3A3A3]">{selectedItem.notes}</p>
                  <p className="text-[#666666]">Updated: {selectedItem.updatedAt}</p>
                </div>
              )}
            </div>

            <form onSubmit={handleCreateRecord} className="space-y-3 border-t border-[#262626] pt-4">
              <h3 className="text-sm font-semibold text-[#F5F5F5]">Create New Entry</h3>
              <div>
                <label className="block text-xs text-[#A3A3A3] mb-1">Entry Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Enter workflow or campaign title..."
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#A3A3A3] mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="Tier-1 Production">Tier-1 Production</option>
                  <option value="Automation">Automation</option>
                  <option value="Optimization">Optimization</option>
                  <option value="Compliance">Compliance</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#A3A3A3] mb-1">Projected Value (USD)</label>
                <input
                  type="number"
                  value={newPrimary}
                  onChange={e => setNewPrimary(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-[#D4AF37] text-[#0A0A0A] font-bold text-sm hover:bg-[#E8C547]"
              >
                + Launch & Persist Entry
              </button>
            </form>
          </aside>
        </div>
      </div>
    </section>
  );
}

export default InvoiceGenerator;
