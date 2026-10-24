'use client';

import React, { useEffect, useMemo, useState } from 'react';

export interface RecordItem {
  id: string;
  parentId: string | null;
  depth: number;
  name: string;
  category: string;
  status: 'Active' | 'Pending' | 'Completed' | 'Compressed';
  primaryMetric: number;
  sampleSize: number;
  conversions: number;
  retryAttempts: number;
  passupRecipient: string;
  updatedAt: string;
  notes: string;
}

export interface RealEstateListingPortalProps {
  initialItems?: RecordItem[];
  storageKey?: string;
}

const DEFAULT_ITEMS: RecordItem[] = [
  {
    id: 'AM-3101',
    parentId: null,
    depth: 0,
    name: 'Real Estate Listing Portal — Root Sponsor / Control Node',
    category: 'Tier-1 Production',
    status: 'Active',
    primaryMetric: 14850,
    sampleSize: 2400,
    conversions: 356,
    retryAttempts: 0,
    passupRecipient: 'Root Sponsor (Direct 75%)',
    updatedAt: '2026-10-24 06:15 UTC',
    notes: 'Property listing management portal with interactive coordinate grid map, mortgage calculator, and virtual tour viewer'
  },
  {
    id: 'AM-3102',
    parentId: 'AM-3101',
    depth: 1,
    name: 'Real Estate Listing Portal — Sale #1 (Two-Up Passup to Root)',
    category: 'Automation',
    status: 'Active',
    primaryMetric: 8420,
    sampleSize: 2350,
    conversions: 452,
    retryAttempts: 1,
    passupRecipient: 'AM-3101 (Two-Up Passup #1)',
    updatedAt: '2026-10-24 06:40 UTC',
    notes: 'First qualifying sale passed up to upline sponsor under Two-Up rules.'
  },
  {
    id: 'AM-3103',
    parentId: 'AM-3101',
    depth: 1,
    name: 'Real Estate Listing Portal — Inactive Node (Dynamic Compression)',
    category: 'Optimization',
    status: 'Compressed',
    primaryMetric: 0,
    sampleSize: 1800,
    conversions: 210,
    retryAttempts: 2,
    passupRecipient: 'Compressed to AM-3101',
    updatedAt: '2026-10-24 07:05 UTC',
    notes: 'Inactive node automatically compressed so child volume rolls up without depth loss.'
  },
  {
    id: 'AM-3104',
    parentId: 'AM-3103',
    depth: 2,
    name: 'Real Estate Listing Portal — Sale #3 (Retained Direct 75% Stream)',
    category: 'Compliance',
    status: 'Active',
    primaryMetric: 6190,
    sampleSize: 1950,
    conversions: 312,
    retryAttempts: 0,
    passupRecipient: 'Retained by Direct Qualifier (Effective Depth 1 after Compression)',
    updatedAt: '2026-10-24 07:10 UTC',
    notes: 'Third and subsequent referrals remain permanently on direct sponsor leg.'
  }
];

export function RealEstateListingPortal({
  initialItems = DEFAULT_ITEMS,
  storageKey = 'agentmidas_bounty_31_v2',
}: RealEstateListingPortalProps = {}) {
  const [items, setItems] = useState<RecordItem[]>(initialItems);
  const [query, setQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [enableCompression, setEnableCompression] = useState<boolean>(true);
  const [newName, setNewName] = useState<string>('');
  const [newParentId, setNewParentId] = useState<string>('AM-3101');
  const [newCategory, setNewCategory] = useState<string>('Tier-1 Production');
  const [newPrimary, setNewPrimary] = useState<string>('5000');
  const [selectedId, setSelectedId] = useState<string>(initialItems[0]?.id ?? 'AM-3101');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as RecordItem[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItems(parsed);
          setSelectedId(parsed[0].id);
        }
      }
    } catch {}
  }, [storageKey]);

  const persistItems = (next: RecordItem[]) => {
    setItems(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {}
  };

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
    const activeItems = items.filter(i => i.status === 'Active');
    const totalVolume = activeItems.reduce((acc, i) => acc + i.primaryMetric, 0);
    const totalSamples = items.reduce((acc, i) => acc + i.sampleSize, 0);
    const totalConv = items.reduce((acc, i) => acc + i.conversions, 0);
    const convRate = totalSamples > 0 ? (totalConv / totalSamples) * 100 : 0;

    // Two-proportion Z-score calculation between first two cohorts
    const a = items[0];
    const b = items[1];
    let zScore = 0;
    if (a && b && a.sampleSize > 0 && b.sampleSize > 0) {
      const p1 = a.conversions / a.sampleSize;
      const p2 = b.conversions / b.sampleSize;
      const pPool = (a.conversions + b.conversions) / (a.sampleSize + b.sampleSize);
      const se = Math.sqrt(pPool * (1 - pPool) * (1 / a.sampleSize + 1 / b.sampleSize));
      zScore = se > 0 ? Math.abs(p2 - p1) / se : 0;
    }

    return {
      totalVolume,
      convRate: convRate.toFixed(2),
      zScore: zScore.toFixed(2),
      isSignificant: zScore >= 1.96,
      activeCount: activeItems.length,
    };
  }, [items]);

  const selectedItem = useMemo(
    () => items.find(i => i.id === selectedId) ?? items[0],
    [items, selectedId]
  );

  function handleCreateRecord(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newName.trim()) return;
    const parentNode = items.find(i => i.id === newParentId) ?? null;
    const siblingCount = items.filter(i => i.parentId === newParentId).length;
    const isTwoUpPassup = siblingCount < 2 && parentNode !== null;

    const created: RecordItem = {
      id: `AM-31${String(items.length + 1).padStart(2, '0')}`,
      parentId: parentNode ? parentNode.id : null,
      depth: parentNode ? parentNode.depth + 1 : 0,
      name: newName.trim(),
      category: newCategory,
      status: 'Active',
      primaryMetric: Math.max(0, Number(newPrimary) || 0),
      sampleSize: 1000,
      conversions: 165,
      retryAttempts: 0,
      passupRecipient: isTwoUpPassup
        ? `Passed Up to ${parentNode?.parentId ?? parentNode?.id} (Two-Up Sale #${siblingCount + 1})`
        : `Retained by ${parentNode?.id ?? 'Root'} (Direct 75%)`,
      updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
      notes: 'Persisted to localStorage with Two-Up passup & dynamic compression evaluation.',
    };
    persistItems([created, ...items]);
    setSelectedId(created.id);
    setNewName('');
  }

  function handleCycleStatus(id: string) {
    const order: RecordItem['status'][] = ['Active', 'Pending', 'Completed', 'Compressed'];
    persistItems(
      items.map(item => {
        if (item.id !== id) return item;
        const idx = order.indexOf(item.status);
        const next = order[(idx + 1) % order.length];
        return { ...item, status: next };
      })
    );
  }

  return (
    <section
      aria-label="Real Estate Listing Portal"
      className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] p-4 md:p-8 font-sans"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#262626] pb-5">
          <div>
            <span className="inline-block text-xs uppercase tracking-widest text-[#D4AF37] font-semibold">
              Agent Midas Bounty #31 • $350
            </span>
            <h1 className="text-2xl md:text-3xl font-bold text-[#F5F5F5] mt-1">
              Real Estate Listing Portal
            </h1>
            <p className="text-sm text-[#A3A3A3] mt-1">
              Property listing management portal with interactive coordinate grid map, mortgage calculator, and virtual tour viewer
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="search-input-31" className="sr-only">Search records</label>
            <input
              id="search-input-31"
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search ID, name, category..."
              className="bg-[#0D0D0D] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#D4AF37]"
            />
            <label htmlFor="status-filter-31" className="sr-only">Filter by status</label>
            <select
              id="status-filter-31"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-[#0D0D0D] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#D4AF37]"
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
              <option value="Compressed">Compressed</option>
            </select>
            <label htmlFor="compression-toggle-31" className="flex items-center gap-2 text-xs text-[#D4AF37] cursor-pointer">
              <input
                id="compression-toggle-31"
                type="checkbox"
                checked={enableCompression}
                onChange={e => setEnableCompression(e.target.checked)}
                className="accent-[#D4AF37]"
              />
              Dynamic Compression
            </label>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-4">
            <p className="text-xs uppercase text-[#A3A3A3]">Active Volume (Persisted)</p>
            <p className="text-2xl font-bold text-[#D4AF37] mt-1">
              ${summary.totalVolume.toLocaleString()}
            </p>
          </div>
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-4">
            <p className="text-xs uppercase text-[#A3A3A3]">Active Nodes / Streams</p>
            <p className="text-2xl font-bold text-[#22C55E] mt-1">
              {summary.activeCount} / {items.length}
            </p>
          </div>
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-4">
            <p className="text-xs uppercase text-[#A3A3A3]">Aggregate Conversion Rate</p>
            <p className="text-2xl font-bold text-[#F5F5F5] mt-1">
              {summary.convRate}%
            </p>
          </div>
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-4">
            <p className="text-xs uppercase text-[#A3A3A3]">Z-Score Significance</p>
            <p className="text-2xl font-bold text-[#3B82F6] mt-1">
              Z = {summary.zScore} ({summary.isSignificant ? '95%+ Conf.' : 'Collecting'})
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#0D0D0D] border border-[#262626] rounded-xl p-5 space-y-4">
            <h2 className="text-lg font-semibold text-[#D4AF37]">
              Hierarchical Matrix & Pass-Up Routing ({filteredItems.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#262626] text-[#A3A3A3]">
                    <th className="py-2 pr-3">Node / Depth</th>
                    <th className="py-2 pr-3">Name & Parent Link</th>
                    <th className="py-2 pr-3">Pass-Up / Routing</th>
                    <th className="py-2 pr-3">Volume</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map(item => {
                    const effectiveDepth =
                      enableCompression && item.parentId
                        ? Math.max(0, item.depth - (items.find(p => p.id === item.parentId)?.status === 'Compressed' ? 1 : 0))
                        : item.depth;
                    const rate = item.sampleSize > 0 ? ((item.conversions / item.sampleSize) * 100).toFixed(1) : '0.0';
                    return (
                      <tr
                        key={item.id}
                        tabIndex={0}
                        role="button"
                        aria-pressed={selectedItem?.id === item.id}
                        onClick={() => setSelectedId(item.id)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedId(item.id);
                          }
                        }}
                        className={`border-b border-[#1A1A1A] cursor-pointer transition-colors focus:outline-none focus:ring-1 focus:ring-[#D4AF37] ${
                          selectedItem?.id === item.id ? 'bg-[#171717]' : 'hover:bg-[#121212]'
                        }`}
                      >
                        <td className="py-3 pr-3 font-mono text-xs text-[#D4AF37]">
                          <span style={{ paddingLeft: `${effectiveDepth * 12}px` }}>
                            {effectiveDepth > 0 ? '└─ ' : ''}{item.id} (L{effectiveDepth})
                          </span>
                        </td>
                        <td className="py-3 pr-3">
                          <p className="font-medium text-[#F5F5F5]">{item.name}</p>
                          <p className="text-xs text-[#A3A3A3]">
                            Parent: {item.parentId ?? 'ROOT'} • Conv: {rate}% (Retry #{item.retryAttempts})
                          </p>
                        </td>
                        <td className="py-3 pr-3 text-xs text-[#A3A3A3]">{item.passupRecipient}</td>
                        <td className="py-3 pr-3 font-mono">${item.primaryMetric.toLocaleString()}</td>
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-5 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-[#D4AF37]">Node Inspector & Persistent Creator</h2>
              {selectedItem && (
                <div className="mt-3 p-3 rounded-lg bg-[#141414] border border-[#262626] space-y-1.5 text-xs">
                  <p className="text-[#D4AF37] font-mono font-bold">
                    {selectedItem.id} (Parent: {selectedItem.parentId ?? 'ROOT'})
                  </p>
                  <p className="text-sm font-semibold text-[#F5F5F5]">{selectedItem.name}</p>
                  <p className="text-[#22C55E]">Routing: {selectedItem.passupRecipient}</p>
                  <p className="text-[#A3A3A3]">{selectedItem.notes}</p>
                  <p className="text-[#666666]">Updated: {selectedItem.updatedAt}</p>
                </div>
              )}
            </div>

            <form onSubmit={handleCreateRecord} className="space-y-3 border-t border-[#262626] pt-4">
              <h3 className="text-sm font-semibold text-[#F5F5F5]">Add Child Node / Entry</h3>
              <div>
                <label htmlFor="entry-name-31" className="block text-xs text-[#A3A3A3] mb-1">
                  Entry / Node Name
                </label>
                <input
                  id="entry-name-31"
                  type="text"
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Enter node or workflow title..."
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
              <div>
                <label htmlFor="parent-node-31" className="block text-xs text-[#A3A3A3] mb-1">
                  Parent Sponsor / Upstream Node
                </label>
                <select
                  id="parent-node-31"
                  value={newParentId}
                  onChange={e => setNewParentId(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#D4AF37]"
                >
                  {items.map(i => (
                    <option key={i.id} value={i.id}>{i.id} — {i.name.slice(0, 28)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="entry-cat-31" className="block text-xs text-[#A3A3A3] mb-1">
                  Category
                </label>
                <select
                  id="entry-cat-31"
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
                <label htmlFor="entry-val-31" className="block text-xs text-[#A3A3A3] mb-1">
                  Projected Value (USD)
                </label>
                <input
                  id="entry-val-31"
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

export default RealEstateListingPortal;
