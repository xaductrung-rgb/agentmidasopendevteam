'use client';

import React, { useState, useMemo } from 'react';

export interface VectorAssetItem {
  id: string;
  name: string;
  category: 'Navigation' | 'Commerce' | 'Analytics' | 'Status' | 'Illustrations';
  tags: string[];
  viewBox: string;
  paths: string[];
}

export interface IconIllustrationPackProps {
  assets?: VectorAssetItem[];
}

const DEFAULT_ASSETS: VectorAssetItem[] = [
  {
    id: 'icon-spark',
    name: 'Autonomous Spark',
    category: 'Navigation',
    tags: ['ai', 'agent', 'automation', 'spark'],
    viewBox: '0 0 24 24',
    paths: ['M12 2L14.8 8.5L21.5 9.2L16.3 13.8L17.9 20.5L12 16.9L6.1 20.5L7.7 13.8L2.5 9.2L9.2 8.5L12 2Z']
  },
  {
    id: 'icon-revenue',
    name: 'Revenue Growth Trend',
    category: 'Commerce',
    tags: ['revenue', 'chart', 'finance', 'growth'],
    viewBox: '0 0 24 24',
    paths: ['M3 17L9 11L13 15L21 7', 'M15 7H21V13']
  },
  {
    id: 'icon-funnel',
    name: 'Conversion Funnel',
    category: 'Analytics',
    tags: ['funnel', 'conversion', 'filter', 'pipeline'],
    viewBox: '0 0 24 24',
    paths: ['M3 4H21L14 12.5V19L10 21V12.5L3 4Z']
  },
  {
    id: 'icon-shield',
    name: 'Verified Security Shield',
    category: 'Status',
    tags: ['security', 'audit', 'shield', 'verified'],
    viewBox: '0 0 24 24',
    paths: ['M12 2L4 5.5V11.5C4 16.8 7.4 21.6 12 23C16.6 21.6 20 16.8 20 11.5V5.5L12 2Z', 'M9 12L11 14L15.5 9.5']
  },
  {
    id: 'illus-empty-pipeline',
    name: 'Empty Pipeline Illustration',
    category: 'Illustrations',
    tags: ['illustration', 'empty', 'pipeline', 'onboarding'],
    viewBox: '0 0 24 24',
    paths: ['M4 6H20V18H4V6Z', 'M8 10H16', 'M8 14H13']
  },
  {
    id: 'illus-rocket-launch',
    name: 'Campaign Launch Illustration',
    category: 'Illustrations',
    tags: ['illustration', 'launch', 'campaign', 'rocket'],
    viewBox: '0 0 24 24',
    paths: ['M12 2C15.5 5 17 9.5 17 14L12 17L7 14C7 9.5 8.5 5 12 2Z', 'M9 17L7 21L12 19L17 21L15 17']
  }
];

export default function IconIllustrationPack({ assets = DEFAULT_ASSETS }: IconIllustrationPackProps) {
  const safeAssets = Array.isArray(assets) && assets.length > 0 ? assets : DEFAULT_ASSETS;
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('All');
  const [size, setSize] = useState<number>(32);
  const [strokeWidth, setStrokeWidth] = useState<number>(2);
  const [color, setColor] = useState<string>('#4f46e5');
  const [selectedId, setSelectedId] = useState<string>(safeAssets[0].id);
  const [copiedMode, setCopiedMode] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return safeAssets.filter((a) => {
      if (category !== 'All' && a.category !== category) return false;
      if (!q) return true;
      return a.name.toLowerCase().includes(q) || a.tags.some((t) => t.toLowerCase().includes(q));
    });
  }, [safeAssets, search, category]);

  const selected = useMemo(
    () => filtered.find((a) => a.id === selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId]
  );

  function buildSvgMarkup(asset: VectorAssetItem): string {
    const pathElements = asset.paths
      .map(
        (d) =>
          `  <path d="${d}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" fill="none" />`
      )
      .join('\n');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${asset.viewBox}">\n${pathElements}\n</svg>`;
  }

  function buildJsxSnippet(asset: VectorAssetItem): string {
    const compName = asset.name.replace(/[^a-zA-Z0-9]/g, '');
    const pathElements = asset.paths
      .map(
        (d) =>
          `      <path d="${d}" stroke="${color}" strokeWidth={${strokeWidth}} strokeLinecap="round" strokeLinejoin="round" fill="none" />`
      )
      .join('\n');
    return `export function ${compName}Icon() {\n  return (\n    <svg width={${size}} height={${size}} viewBox="${asset.viewBox}">\n${pathElements}\n    </svg>\n  );\n}`;
  }

  async function copySnippet(mode: 'svg' | 'jsx') {
    if (!selected) return;
    const text = mode === 'svg' ? buildSvgMarkup(selected) : buildJsxSnippet(selected);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
      setCopiedMode(mode.toUpperCase());
      setTimeout(() => setCopiedMode(null), 2000);
    } catch {
      setCopiedMode(null);
    }
  }

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Icon &amp; Illustration Pack</h2>
          <p className="text-sm text-slate-600">
            Customize vector stroke, dimensions, and brand palette with instant SVG &amp; JSX export.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['All', 'Navigation', 'Commerce', 'Analytics', 'Status', 'Illustrations'].map((cat) => (
            <button
              key={cat}
              type="button"
              aria-pressed={category === cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                category === cat ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div>
          <label htmlFor="icon-search" className="block text-xs font-semibold text-slate-600 mb-1">
            Search Assets
          </label>
          <input
            id="icon-search"
            type="search"
            placeholder="Search by name or tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
          />
        </div>
        <div>
          <label htmlFor="icon-size" className="block text-xs font-semibold text-slate-600 mb-1">
            Size ({size}px)
          </label>
          <input
            id="icon-size"
            type="range"
            min="16"
            max="64"
            step="4"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="w-full"
          />
        </div>
        <div>
          <label htmlFor="icon-stroke" className="block text-xs font-semibold text-slate-600 mb-1">
            Stroke Width ({strokeWidth}px)
          </label>
          <input
            id="icon-stroke"
            type="range"
            min="1"
            max="3.5"
            step="0.5"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="w-full"
          />
        </div>
        <div>
          <label htmlFor="icon-color" className="block text-xs font-semibold text-slate-600 mb-1">
            Stroke Color ({color})
          </label>
          <input
            id="icon-color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-full h-9 rounded border border-slate-300 bg-white px-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filtered.length === 0 ? (
            <div className="col-span-full p-8 text-center text-sm text-slate-500 border border-dashed border-slate-300 rounded-xl">
              No icons or illustrations match your filter.
            </div>
          ) : (
            filtered.map((asset) => {
              const isSelected = selected?.id === asset.id;
              return (
                <button
                  key={asset.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedId(asset.id)}
                  className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-3 transition ${
                    isSelected ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <svg width={size} height={size} viewBox={asset.viewBox} aria-hidden="true">
                    {asset.paths.map((d, idx) => (
                      <path
                        key={idx}
                        d={d}
                        stroke={color}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    ))}
                  </svg>
                  <div className="text-center">
                    <div className="text-xs font-semibold text-slate-900">{asset.name}</div>
                    <div className="text-[11px] text-slate-500">{asset.category}</div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="p-4 bg-slate-900 text-slate-100 rounded-xl space-y-3">
          {selected ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">{selected.name}</span>
                <span className="text-xs text-indigo-300">{selected.category}</span>
              </div>
              <pre className="text-xs font-mono bg-slate-950 p-3 rounded-lg overflow-x-auto text-emerald-300">
                {buildSvgMarkup(selected)}
              </pre>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => copySnippet('svg')}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold"
                >
                  {copiedMode === 'SVG' ? 'Copied SVG!' : 'Copy SVG'}
                </button>
                <button
                  type="button"
                  onClick={() => copySnippet('jsx')}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold"
                >
                  {copiedMode === 'JSX' ? 'Copied JSX!' : 'Copy React JSX'}
                </button>
              </div>
            </>
          ) : (
            <div className="p-6 text-center text-xs text-slate-400">
              Select an icon or clear filters to inspect and copy SVG/JSX code.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
