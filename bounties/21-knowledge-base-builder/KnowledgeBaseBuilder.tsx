'use client';
import React, { useState, useMemo, useRef } from 'react';

export interface KBArticle {
  id: string;
  title: string;
  parentCategory: string;
  subCategory: string;
  tags: string[];
  body: string;
  helpfulYes: number;
  helpfulNo: number;
}

export interface KnowledgeBaseBuilderProps {
  storageKey?: string;
  initialArticles?: KBArticle[];
  onChange?: (articles: KBArticle[]) => void | Promise<void>;
}

const SYNONYM_MAP: Record<string, string[]> = {
  payout: ['stripe', 'commission', 'settlement', 'withdrawal', 'payment'],
  webhook: ['hmac', 'signature', 'callback', 'event'],
  auth: ['key', 'token', 'jwt', 'login', 'permission']
};

const DEFAULT_ARTICLES: KBArticle[] = [
  {
    id: 'KB-101',
    title: 'Configuring Two-Up Commission Pass-Up Rules',
    parentCategory: 'Billing & Payouts',
    subCategory: 'Two-Up Commissions',
    tags: ['payout', 'genealogy', 'commission'],
    body: 'Learn how sales #1 and #2 pass up to the qualified sponsor and unlock direct team lines.',
    helpfulYes: 28,
    helpfulNo: 2
  },
  {
    id: 'KB-102',
    title: 'Verifying Webhook HMAC-SHA256 Signatures',
    parentCategory: 'SDK & API',
    subCategory: 'Webhooks & Security',
    tags: ['webhook', 'hmac', 'security'],
    body: 'Validate X-Midas-Signature headers using your webhook signing secret to prevent replay attacks.',
    helpfulYes: 41,
    helpfulNo: 1
  }
];

function normalizeUniqueArticles(list: any[]): KBArticle[] {
  const seen = new Set<string>();
  const out: KBArticle[] = [];
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (!item || typeof item !== 'object' || typeof item.title !== 'string' || typeof item.body !== 'string') continue;
    let id = typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `KB-${101 + i}`;
    while (seen.has(id)) {
      id = `${id}-${i + 1}`;
    }
    seen.add(id);
    out.push({
      id,
      title: item.title,
      parentCategory: typeof item.parentCategory === 'string' && item.parentCategory ? item.parentCategory : 'General',
      subCategory: typeof item.subCategory === 'string' && item.subCategory ? item.subCategory : 'Overview',
      tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
      body: item.body,
      helpfulYes: typeof item.helpfulYes === 'number' ? item.helpfulYes : 0,
      helpfulNo: typeof item.helpfulNo === 'number' ? item.helpfulNo : 0
    });
  }
  return out;
}

export const KnowledgeBaseBuilder: React.FC<KnowledgeBaseBuilderProps> = ({
  storageKey = 'agentmidas_kb_builder_v2',
  initialArticles = DEFAULT_ARTICLES,
  onChange
}) => {
  const [articles, setArticles] = useState<KBArticle[]>(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const valid = normalizeUniqueArticles(parsed);
          if (valid.length > 0) return valid;
        }
      }
    } catch {}
    return normalizeUniqueArticles(initialArticles);
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedParentCat, setSelectedParentCat] = useState<string>('ALL');
  const [selectedSubCat, setSelectedSubCat] = useState<string>('ALL');
  const [title, setTitle] = useState('');
  const [parentCategory, setParentCategory] = useState('SDK & API');
  const [subCategory, setSubCategory] = useState('Authentication');
  const [tagsInput, setTagsInput] = useState('auth, token, sdk');
  const [body, setBody] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [notice, setNotice] = useState('');
  const saveSeqRef = useRef(0);

  const persistArticles = async (next: KBArticle[]): Promise<boolean> => {
    const seq = ++saveSeqRef.current;
    const deduped = normalizeUniqueArticles(next);
    const prev = articles;
    setArticles(deduped);
    setErrorMsg('');
    try {
      if (onChange) {
        await onChange(deduped);
      }
      if (seq !== saveSeqRef.current) return true;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, JSON.stringify(deduped));
      }
      return true;
    } catch {
      if (seq === saveSeqRef.current) {
        setArticles(prev);
        setErrorMsg('Storage or callback write failed. Changes rolled back and form content preserved.');
      }
      return false;
    }
  };

  const generateCollisionFreeId = (existing: KBArticle[]): string => {
    const used = new Set(existing.map(a => a.id));
    let n = 101 + existing.length;
    let candidate = `KB-${n}`;
    while (used.has(candidate)) {
      n += 1;
      candidate = `KB-${n}`;
    }
    return candidate;
  };

  const parentCategories = useMemo(
    () => Array.from(new Set(articles.map(a => a.parentCategory))),
    [articles]
  );

  const subCategories = useMemo(() => {
    const base = selectedParentCat === 'ALL' ? articles : articles.filter(a => a.parentCategory === selectedParentCat);
    return Array.from(new Set(base.map(a => a.subCategory)));
  }, [articles, selectedParentCat]);

  const rankedArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const queryTokens = q ? q.split(/\s+/) : [];
    const expandedTokens = new Set<string>(queryTokens);
    for (const tok of queryTokens) {
      for (const [root, syns] of Object.entries(SYNONYM_MAP)) {
        if (tok.includes(root) || syns.some(s => tok.includes(s))) {
          expandedTokens.add(root);
          syns.forEach(s => expandedTokens.add(s));
        }
      }
    }

    return articles
      .filter(a => {
        if (selectedParentCat !== 'ALL' && a.parentCategory !== selectedParentCat) return false;
        if (selectedSubCat !== 'ALL' && a.subCategory !== selectedSubCat) return false;
        return true;
      })
      .map(a => {
        if (expandedTokens.size === 0) return { article: a, score: 1 };
        const haystack = `${a.id} ${a.title} ${a.parentCategory} ${a.subCategory} ${(a.tags || []).join(' ')} ${a.body}`.toLowerCase();
        let score = 0;
        if (a.id.toLowerCase().includes(q)) score += 10;
        if (a.title.toLowerCase().includes(q)) score += 8;
        if (a.parentCategory.toLowerCase().includes(q) || a.subCategory.toLowerCase().includes(q)) score += 6;
        for (const tok of expandedTokens) {
          if (haystack.includes(tok)) score += 3;
        }
        return { article: a, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.article);
  }, [articles, searchQuery, selectedParentCat, selectedSubCat]);

  const handleCreateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    const submittedTitle = title;
    const submittedBody = body;
    if (!submittedTitle.trim() || !parentCategory.trim() || !subCategory.trim() || !submittedBody.trim()) {
      setErrorMsg('Title, parent category, sub-category, and article body are required.');
      return;
    }
    const created: KBArticle = {
      id: generateCollisionFreeId(articles),
      title: submittedTitle.trim(),
      parentCategory: parentCategory.trim(),
      subCategory: subCategory.trim(),
      tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
      body: submittedBody.trim(),
      helpfulYes: 0,
      helpfulNo: 0
    };
    const ok = await persistArticles([created, ...articles]);
    if (ok) {
      // Only clear if the user hasn't started typing a newer draft while persistence was pending
      setTitle(curr => (curr === submittedTitle ? '' : curr));
      setBody(curr => (curr === submittedBody ? '' : curr));
      setNotice(`Published article ${created.id} under ${created.parentCategory} > ${created.subCategory}.`);
    }
  };

  const voteHelpful = (id: string, isYes: boolean) => {
    let updatedOne = false;
    const next = articles.map(a => {
      if (!updatedOne && a.id === id) {
        updatedOne = true;
        return { ...a, helpfulYes: a.helpfulYes + (isYes ? 1 : 0), helpfulNo: a.helpfulNo + (isYes ? 0 : 1) };
      }
      return a;
    });
    void persistArticles(next);
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="border-b border-zinc-800 pb-4">
          <h1 className="text-2xl font-bold text-[#D4AF37]">Hierarchical Knowledge Base & Semantic Search</h1>
          <p className="text-sm text-zinc-400">Matches article IDs, parent/child category trees, tags, synonyms, and full text</p>
        </header>

        {notice && <div role="status" className="bg-emerald-950/60 border border-emerald-700 text-emerald-200 px-4 py-2 rounded text-sm">{notice}</div>}
        {errorMsg && <div role="alert" className="bg-red-950/60 border border-red-700 text-red-200 px-4 py-2 rounded text-sm">{errorMsg}</div>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input aria-label="Search Knowledge Base" type="search" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by ID (KB-101), category, synonym, or topic..." className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
          <select aria-label="Parent Category Filter" value={selectedParentCat} onChange={e => { setSelectedParentCat(e.target.value); setSelectedSubCat('ALL'); }} className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-white">
            <option value="ALL">All Parent Categories</option>
            {parentCategories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select aria-label="Sub-Category Filter" value={selectedSubCat} onChange={e => setSelectedSubCat(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-white">
            <option value="ALL">All Sub-Categories</option>
            {subCategories.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <form onSubmit={handleCreateArticle} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input aria-label="Article Title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Article Title" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
            <input aria-label="Parent Category" value={parentCategory} onChange={e => setParentCategory(e.target.value)} placeholder="Parent Category" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
            <input aria-label="Child Sub-Category" value={subCategory} onChange={e => setSubCategory(e.target.value)} placeholder="Child Sub-Category" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
            <input aria-label="Article Tags" value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="Comma-separated tags" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
          </div>
          <textarea aria-label="Article Body" rows={3} value={body} onChange={e => setBody(e.target.value)} placeholder="Article markdown/body..." className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-sm text-white" />
          <button type="submit" className="bg-[#D4AF37] text-black font-bold text-xs px-4 py-2 rounded">+ Publish KB Article</button>
        </form>

        <div className="space-y-3">
          {rankedArticles.map(a => (
            <div key={a.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-2">
              <div className="flex justify-between items-center text-xs text-[#D4AF37]">
                <span className="font-mono font-bold">{a.id} · {a.parentCategory} &gt; {a.subCategory}</span>
                <span>{(a.tags || []).map(t => `#${t}`).join(' ')}</span>
              </div>
              <h3 className="text-lg font-bold text-white">{a.title}</h3>
              <p className="text-sm text-zinc-300">{a.body}</p>
              <div className="flex items-center gap-3 pt-2 text-xs text-zinc-400">
                <button type="button" onClick={() => voteHelpful(a.id, true)} className="px-2.5 py-1 rounded bg-zinc-800 text-emerald-300">
                  👍 Helpful ({a.helpfulYes})
                </button>
                <button type="button" onClick={() => voteHelpful(a.id, false)} className="px-2.5 py-1 rounded bg-zinc-800 text-red-300">
                  👎 Not Helpful ({a.helpfulNo})
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBaseBuilder;
