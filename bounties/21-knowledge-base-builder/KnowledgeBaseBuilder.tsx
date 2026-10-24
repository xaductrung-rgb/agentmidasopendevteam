'use client';

import React, { useEffect, useMemo, useState } from 'react';

export interface KBArticle {
  id: string;
  title: string;
  category: 'Getting Started' | 'Affiliate & Billing' | 'API & Security';
  body: string;
  helpfulYes: number;
  helpfulNo: number;
}

const DEFAULT_ARTICLES: KBArticle[] = [
  {
    id: 'kb-1',
    title: 'How the 75% Two-Up Affiliate Commission Works',
    category: 'Affiliate & Billing',
    body: 'Every affiliate passes up their first 2 sales to their sponsor and keeps 75% recurring commissions on sale #3 through infinity.',
    helpfulYes: 48,
    helpfulNo: 2,
  },
  {
    id: 'kb-2',
    title: 'Zero-Dependency Security & CLA Compliance',
    category: 'API & Security',
    body: 'All Agent Midas modules use strict TypeScript and pass the 6-layer security pipeline without third-party runtime packages.',
    helpfulYes: 35,
    helpfulNo: 1,
  },
];

const STORAGE_KEY = 'agentmidas_kb_articles_v2';

export function KnowledgeBaseBuilder() {
  const [articles, setArticles] = useState<KBArticle[]>(DEFAULT_ARTICLES);
  const [search, setSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<KBArticle['category']>('Getting Started');
  const [newBody, setNewBody] = useState<string>('');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as KBArticle[];
        if (Array.isArray(parsed) && parsed.length > 0) setArticles(parsed);
      }
    } catch {}
  }, []);

  const persist = (next: KBArticle[]) => {
    setArticles(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };

  const voteFeedback = (id: string, isHelpful: boolean) => {
    persist(
      articles.map(a =>
        a.id === id
          ? {
              ...a,
              helpfulYes: isHelpful ? a.helpfulYes + 1 : a.helpfulYes,
              helpfulNo: !isHelpful ? a.helpfulNo + 1 : a.helpfulNo,
            }
          : a
      )
    );
  };

  const handleCreateArticle = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newTitle.trim() || !newBody.trim()) return;
    const created: KBArticle = {
      id: `kb-${Date.now().toString().slice(-4)}`,
      title: newTitle.trim(),
      category: newCategory,
      body: newBody.trim(),
      helpfulYes: 1,
      helpfulNo: 0,
    };
    persist([created, ...articles]);
    setNewTitle('');
    setNewBody('');
  };

  const results = useMemo(() => {
    return articles.filter(a => {
      const matchesCat = categoryFilter === 'ALL' || a.category === categoryFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [articles, search, categoryFilter]);

  return (
    <section aria-label="Knowledge Base Builder" className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#262626] pb-4">
          <h1 className="text-2xl font-bold text-[#D4AF37]">Knowledge Base Builder</h1>
          <div className="flex gap-2">
            <label htmlFor="kb-search" className="sr-only">Search Knowledge Base</label>
            <input
              id="kb-search"
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search articles..."
              className="bg-[#0D0D0D] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#F5F5F5]"
            />
            <label htmlFor="kb-cat-filter" className="sr-only">Category Filter</label>
            <select
              id="kb-cat-filter"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="bg-[#0D0D0D] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#F5F5F5]"
            >
              <option value="ALL">All Categories</option>
              <option value="Getting Started">Getting Started</option>
              <option value="Affiliate & Billing">Affiliate & Billing</option>
              <option value="API & Security">API & Security</option>
            </select>
          </div>
        </header>

        <div className="space-y-3">
          {results.map(a => (
            <article key={a.id} className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-5 space-y-2">
              <span className="text-xs text-[#D4AF37] font-semibold">{a.category}</span>
              <h2 className="text-lg font-bold">{a.title}</h2>
              <p className="text-sm text-[#A3A3A3]">{a.body}</p>
              <div className="pt-2 flex items-center gap-3 text-xs">
                <span className="text-[#A3A3A3]">Was this article helpful?</span>
                <button
                  type="button"
                  onClick={() => voteFeedback(a.id, true)}
                  className="px-2.5 py-1 rounded bg-[#1F1F1F] text-[#22C55E]"
                >
                  👍 Yes ({a.helpfulYes})
                </button>
                <button
                  type="button"
                  onClick={() => voteFeedback(a.id, false)}
                  className="px-2.5 py-1 rounded bg-[#1F1F1F] text-[#EF4444]"
                >
                  👎 No ({a.helpfulNo})
                </button>
              </div>
            </article>
          ))}
        </div>

        <form onSubmit={handleCreateArticle} className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-5 space-y-3">
          <h2 className="text-base font-bold text-[#D4AF37]">Publish New Knowledge Base Article</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="kb-new-title" className="block text-xs text-[#A3A3A3] mb-1">Article Title</label>
              <input id="kb-new-title" type="text" required value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label htmlFor="kb-new-cat" className="block text-xs text-[#A3A3A3] mb-1">Category</label>
              <select id="kb-new-cat" value={newCategory} onChange={e => setNewCategory(e.target.value as KBArticle['category'])} className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3 py-2 text-sm">
                <option value="Getting Started">Getting Started</option>
                <option value="Affiliate & Billing">Affiliate & Billing</option>
                <option value="API & Security">API & Security</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="kb-new-body" className="block text-xs text-[#A3A3A3] mb-1">Article Content</label>
            <textarea id="kb-new-body" rows={3} required value={newBody} onChange={e => setNewBody(e.target.value)} className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3 py-2 text-sm" />
          </div>
          <button type="submit" className="px-4 py-2 rounded bg-[#D4AF37] text-[#0A0A0A] font-bold text-xs">
            + Publish Article
          </button>
        </form>
      </div>
    </section>
  );
}

export default KnowledgeBaseBuilder;
