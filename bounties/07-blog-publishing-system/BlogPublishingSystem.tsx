'use client';

import React, { useState, useMemo, useEffect } from 'react';

export type PostStatus = 'Draft' | 'Scheduled' | 'Published';

export interface BlogPostItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  targetKeyword: string;
  status: PostStatus;
  publishDate: string;
  views: number;
}

export interface BlogPublishingSystemProps {
  initialPosts?: BlogPostItem[];
  storageKey?: string;
  onChange?: (posts: BlogPostItem[]) => void | Promise<void>;
}

const DEFAULT_POSTS: BlogPostItem[] = [
  {
    id: 'post-1',
    title: 'Scaling Two-Up Affiliate Commissions with Automated Payouts',
    slug: 'scaling-two-up-affiliate-commissions',
    excerpt: 'How modern SaaS teams automate pass-up qualification and instant ledger splits.',
    body: 'Two-up affiliate commissions reward top performers while maintaining predictable customer acquisition cost across every partner tier.',
    targetKeyword: 'affiliate commissions',
    status: 'Published',
    publishDate: '2026-10-20',
    views: 1840
  },
  {
    id: 'post-2',
    title: 'Zero-Trust Security Checklist for Multi-Tenant SaaS',
    slug: 'zero-trust-security-checklist-saas',
    excerpt: 'Enforcing row-level security, strict schema validation, and automated audit logs.',
    body: 'Every multi-tenant SaaS platform requires defense-in-depth validation and row-level isolation.',
    targetKeyword: 'row-level security',
    status: 'Scheduled',
    publishDate: '2026-11-05',
    views: 0
  }
];

function isValidPostList(val: unknown): val is BlogPostItem[] {
  return (
    Array.isArray(val) &&
    val.every(
      (p) =>
        p &&
        typeof p === 'object' &&
        typeof (p as BlogPostItem).id === 'string' &&
        typeof (p as BlogPostItem).title === 'string' &&
        typeof (p as BlogPostItem).slug === 'string' &&
        typeof (p as BlogPostItem).body === 'string' &&
        typeof (p as BlogPostItem).status === 'string'
    )
  );
}

function computeSeoScore(title: string, excerpt: string, body: string, keyword: string): number {
  let score = 40;
  const kw = keyword.trim().toLowerCase();
  if (title.trim().length >= 25 && title.trim().length <= 70) score += 20;
  if (excerpt.trim().length >= 50) score += 15;
  if (body.trim().split(/\s+/).length >= 15) score += 10;
  if (kw && title.toLowerCase().includes(kw)) score += 10;
  if (kw && body.toLowerCase().includes(kw)) score += 5;
  return Math.min(100, score);
}

export function BlogPublishingSystem({
  initialPosts = DEFAULT_POSTS,
  storageKey = 'agentmidas_blog_posts_v1',
  onChange
}: BlogPublishingSystemProps) {
  const [posts, setPosts] = useState<BlogPostItem[]>(initialPosts);
  const [statusFilter, setStatusFilter] = useState<'ALL' | PostStatus>('ALL');
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [body, setBody] = useState('');
  const [targetKeyword, setTargetKeyword] = useState('');
  const [status, setStatus] = useState<PostStatus>('Draft');
  const [publishDate, setPublishDate] = useState('2026-11-10');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved !== null) {
        const parsed: unknown = JSON.parse(saved);
        if (isValidPostList(parsed)) {
          setPosts(parsed);
          return;
        }
      }
    } catch {
      // ignore storage read errors
    }
    setPosts(initialPosts);
  }, [storageKey, initialPosts]);

  const liveSeoScore = useMemo(
    () => computeSeoScore(title, excerpt, body, targetKeyword),
    [title, excerpt, body, targetKeyword]
  );

  const filteredPosts = useMemo(
    () => posts.filter((p) => statusFilter === 'ALL' || p.status === statusFilter),
    [posts, statusFilter]
  );

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    const cleanBody = body.trim();
    if (!cleanTitle || !cleanBody) {
      setError('Post title and content body are required.');
      return;
    }

    const slug = cleanTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const nextPost: BlogPostItem = {
      id: `post-${Date.now()}`,
      title: cleanTitle,
      slug: slug || `post-${Date.now()}`,
      excerpt: excerpt.trim() || cleanBody.slice(0, 120),
      body: cleanBody,
      targetKeyword: targetKeyword.trim() || 'saas',
      status,
      publishDate,
      views: 0
    };

    const next = [nextPost, ...posts];
    try {
      await onChange?.(next);
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      setPosts(next);
      setError(null);
      setTitle('');
      setExcerpt('');
      setBody('');
      setTargetKeyword('');
    } catch {
      setError('Failed to save blog post.');
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Blog Publishing System</h2>
          <p className="text-sm text-slate-600">
            Author articles with real-time SEO diagnostics, keyword density checks, and publication scheduling.
          </p>
        </div>
        <div className="flex gap-2">
          {(['ALL', 'Draft', 'Scheduled', 'Published'] as const).map((st) => (
            <button
              key={st}
              type="button"
              aria-pressed={statusFilter === st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-700 border-slate-300'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {filteredPosts.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 border border-dashed border-slate-300 rounded-xl">
              No articles match the selected status filter.
            </div>
          ) : (
            filteredPosts.map((post) => {
              const seo = computeSeoScore(post.title, post.excerpt, post.body, post.targetKeyword);
              const words = post.body.trim().split(/\s+/).filter(Boolean).length;
              const readMins = Math.max(1, Math.ceil(words / 200));
              return (
                <article key={post.id} className="p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                      {post.status} &bull; {post.publishDate}
                    </span>
                    <span className="text-xs font-semibold text-emerald-700">
                      SEO Score: {seo}/100 &bull; {readMins} min read &bull; {post.views.toLocaleString()} views
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{post.title}</h3>
                  <p className="text-xs text-slate-600">{post.excerpt}</p>
                  <div className="text-[11px] text-slate-400">
                    Slug: /{post.slug} &bull; Keyword: &ldquo;{post.targetKeyword}&rdquo;
                  </div>
                </article>
              );
            })
          )}
        </div>

        <form onSubmit={handlePublish} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">New Article</h3>
            <span className="text-xs font-semibold text-indigo-700">Live SEO: {liveSeoScore}/100</span>
          </div>
          <input
            type="text"
            aria-label="Article title"
            placeholder="Article Headline"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          />
          <input
            type="text"
            aria-label="Target SEO keyword"
            placeholder="Target SEO Keyword"
            value={targetKeyword}
            onChange={(e) => setTargetKeyword(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          />
          <input
            type="text"
            aria-label="Meta description excerpt"
            placeholder="Meta Description / Excerpt"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          />
          <textarea
            rows={4}
            aria-label="Article markdown body"
            placeholder="Write MDX / Markdown content..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              aria-label="Publication status"
              value={status}
              onChange={(e) => setStatus(e.target.value as PostStatus)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              <option value="Draft">Draft</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Published">Published</option>
            </select>
            <input
              type="date"
              aria-label="Publish date"
              value={publishDate}
              onChange={(e) => setPublishDate(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm"
          >
            Save Article
          </button>
        </form>
      </div>
    </div>
  );
}

export default BlogPublishingSystem;
