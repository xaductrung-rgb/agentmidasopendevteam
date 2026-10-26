'use client';

import React, { useState, useMemo, useEffect } from 'react';

export interface FaqEntry {
  id: string;
  question: string;
  answer: string;
  category: 'Billing' | 'Affiliates' | 'Security' | 'Platform';
  helpfulCount: number;
}

export interface FaqManagerProps {
  initialFaqs?: FaqEntry[];
  storageKey?: string;
  onChange?: (faqs: FaqEntry[]) => void | Promise<void>;
}

const DEFAULT_FAQS: FaqEntry[] = [
  {
    id: 'faq-1',
    question: 'How does the Two-Up commission pass-up qualification work?',
    answer: 'Your first two qualified referrals pass up to your sponsor to unlock unlimited direct commissions on your third sale onward.',
    category: 'Affiliates',
    helpfulCount: 48
  },
  {
    id: 'faq-2',
    question: 'When are Stripe Connect affiliate payouts disbursed?',
    answer: 'Verified commissions are settled automatically every Friday after the 14-day refund protection window clears.',
    category: 'Billing',
    helpfulCount: 35
  },
  {
    id: 'faq-3',
    question: 'How is tenant customer data isolated in the database?',
    answer: 'Every table enforces PostgreSQL Row-Level Security (RLS) policies scoped to the authenticated organization JWT.',
    category: 'Security',
    helpfulCount: 29
  }
];

function isValidFaqList(val: unknown): val is FaqEntry[] {
  return (
    Array.isArray(val) &&
    val.every(
      (f) =>
        f &&
        typeof f === 'object' &&
        typeof (f as FaqEntry).id === 'string' &&
        typeof (f as FaqEntry).question === 'string' &&
        typeof (f as FaqEntry).answer === 'string' &&
        typeof (f as FaqEntry).category === 'string' &&
        typeof (f as FaqEntry).helpfulCount === 'number'
    )
  );
}

export function FaqManager({
  initialFaqs = DEFAULT_FAQS,
  storageKey = 'agentmidas_faqs_v1',
  onChange
}: FaqManagerProps) {
  const [faqs, setFaqs] = useState<FaqEntry[]>(initialFaqs);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(DEFAULT_FAQS[0].id);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [newCategory, setNewCategory] = useState<FaqEntry['category']>('Platform');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (isValidFaqList(parsed) && parsed.length > 0) {
          setFaqs(parsed);
        }
      }
    } catch {
      // ignore storage errors
    }
  }, [storageKey]);

  const persist = async (next: FaqEntry[], fallback: FaqEntry[]) => {
    setFaqs(next);
    setError(null);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      await onChange?.(next);
    } catch {
      setFaqs(fallback);
      setError('Failed to save FAQ changes. Reverted to previous state.');
    }
  };

  const filteredFaqs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return faqs.filter((f) => {
      if (category !== 'ALL' && f.category !== category) return false;
      if (!q) return true;
      return f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q);
    });
  }, [faqs, search, category]);

  const voteHelpful = async (id: string) => {
    const prev = faqs;
    const next = faqs.map((f) => (f.id === id ? { ...f, helpfulCount: f.helpfulCount + 1 } : f));
    await persist(next, prev);
  };

  const handleAddFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) {
      setError('Both a question and an answer are required.');
      return;
    }
    const entry: FaqEntry = {
      id: `faq-${Date.now()}`,
      question: question.trim(),
      answer: answer.trim(),
      category: newCategory,
      helpfulCount: 0
    };
    const prev = faqs;
    setQuestion('');
    setAnswer('');
    await persist([entry, ...faqs], prev);
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dynamic FAQ Manager</h2>
          <p className="text-sm text-slate-600">
            Searchable knowledge base questions with category filtering and helpfulness feedback.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['ALL', 'Affiliates', 'Billing', 'Security', 'Platform'].map((cat) => (
            <button
              key={cat}
              type="button"
              aria-pressed={category === cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                category === cat
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-700 border-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="mb-6">
        <input
          type="search"
          aria-label="Search FAQ questions and answers"
          placeholder="Search questions or keywords..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {filteredFaqs.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 border border-dashed border-slate-300 rounded-xl">
              No FAQ entries match your search query.
            </div>
          ) : (
            filteredFaqs.map((item) => {
              const isOpen = expandedId === item.id;
              return (
                <div key={item.id} className="rounded-xl border border-slate-200 overflow-hidden">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setExpandedId(isOpen ? null : item.id)}
                    className="w-full p-4 text-left flex items-center justify-between gap-3 bg-slate-50 hover:bg-slate-100"
                  >
                    <span className="font-bold text-sm text-slate-900">{item.question}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold">
                      {item.category}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="p-4 bg-white space-y-3">
                      <p className="text-sm text-slate-700">{item.answer}</p>
                      <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                        <span>{item.helpfulCount} people found this helpful</span>
                        <button
                          type="button"
                          onClick={() => void voteHelpful(item.id)}
                          className="px-2.5 py-1 rounded border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
                        >
                          Helpful (+1)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={handleAddFaq} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Add FAQ Item</h3>
          <input
            type="text"
            aria-label="FAQ question"
            placeholder="Question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          />
          <select
            aria-label="FAQ category"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as FaqEntry['category'])}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          >
            <option value="Platform">Platform</option>
            <option value="Affiliates">Affiliates</option>
            <option value="Billing">Billing</option>
            <option value="Security">Security</option>
          </select>
          <textarea
            rows={4}
            aria-label="FAQ answer"
            placeholder="Detailed Answer..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          />
          <button
            type="submit"
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm"
          >
            Publish FAQ
          </button>
        </form>
      </div>
    </div>
  );
}

export default FaqManager;
