'use client';
import React, { useState, useMemo } from 'react';

export type AssetCategory = 'CRM & Sales' | 'Affiliate & FinTech' | 'AI & Automation' | 'Security & DevOps' | 'Brand Illustrations';

export interface VectorBrandAsset {
  id: string;
  name: string;
  category: AssetCategory;
  paths: string[];
  isIllustration?: boolean;
}

const ASSETS: VectorBrandAsset[] = [
  // CRM & Sales (11)
  { id: 'ic-01', name: 'Crown Midas', category: 'CRM & Sales', paths: ['M3 18h18', 'M4 15l3-8 5 5 5-5 3 8H4z'] },
  { id: 'ic-02', name: 'Deal Funnel', category: 'CRM & Sales', paths: ['M3 4h18l-7 8v6l-4 2v-8L3 4z'] },
  { id: 'ic-03', name: 'Lead Target', category: 'CRM & Sales', paths: ['M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z', 'M12 6a6 6 0 1 0 6 6 6 6 0 0 0-6-6z', 'M12 10a2 2 0 1 0 2 2 2 2 0 0 0-2-2z'] },
  { id: 'ic-04', name: 'Kanban Columns', category: 'CRM & Sales', paths: ['M4 4h4v16H4z', 'M10 4h4v12h-4z', 'M16 4h4v14h-4z'] },
  { id: 'ic-05', name: 'Contact Badge', category: 'CRM & Sales', paths: ['M12 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4z', 'M5 20a7 7 0 0 1 14 0'] },
  { id: 'ic-06', name: 'Revenue Trend Up', category: 'CRM & Sales', paths: ['M3 17l6-6 4 4 8-8', 'M14 7h7v7'] },
  { id: 'ic-07', name: 'Calendar Booking', category: 'CRM & Sales', paths: ['M4 6h16v14H4z', 'M8 3v3', 'M16 3v3', 'M4 10h16'] },
  { id: 'ic-08', name: 'Email Dispatch', category: 'CRM & Sales', paths: ['M3 6h18v12H3z', 'M3 6l9 7 9-7'] },
  { id: 'ic-09', name: 'Handshake Close', category: 'CRM & Sales', paths: ['M3 11l5-5 4 4 4-4 5 5', 'M7 15l5 4 5-4'] },
  { id: 'ic-10', name: 'Star VIP Tier', category: 'CRM & Sales', paths: ['M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21 7 14.2 2 9.3l6.9-1z'] },
  { id: 'ic-11', name: 'Phone Outreach', category: 'CRM & Sales', paths: ['M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2'] },
  // Affiliate & FinTech (11)
  { id: 'ic-12', name: 'Two-Up Passup Node', category: 'Affiliate & FinTech', paths: ['M12 4a3 3 0 1 0 3 3 3 3 0 0 0-3-3z', 'M6 16a3 3 0 1 0 3 3 3 3 0 0 0-3-3z', 'M18 16a3 3 0 1 0 3 3 3 3 0 0 0-3-3z', 'M12 10v3', 'M9 14l3-1 3 1'] },
  { id: 'ic-13', name: 'Commission Coin', category: 'Affiliate & FinTech', paths: ['M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z', 'M12 6v12', 'M15 9.5c0-1.4-1.3-2.5-3-2.5s-3 1.1-3 2.5 1.3 2.5 3 2.5 3 1.1 3 2.5-1.3 2.5-3 2.5-3-1.1-3-2.5'] },
  { id: 'ic-14', name: 'Referral Link Chain', category: 'Affiliate & FinTech', paths: ['M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7.1-7.1l-1.7 1.7', 'M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7.1 7.1l1.7-1.7'] },
  { id: 'ic-15', name: 'QR Matrix Code', category: 'Affiliate & FinTech', paths: ['M4 4h6v6H4z', 'M14 4h6v6h-6z', 'M4 14h6v6H4z', 'M14 14h3v3h-3z', 'M17 17h3v3h-3z'] },
  { id: 'ic-16', name: 'Invoice Ledger', category: 'Affiliate & FinTech', paths: ['M6 2h12v20l-3-2-3 2-3-2-3 2V2z', 'M9 7h6', 'M9 11h6', 'M9 15h4'] },
  { id: 'ic-17', name: 'Gateway Switch', category: 'Affiliate & FinTech', paths: ['M4 8h16', 'M16 4l4 4-4 4', 'M20 16H4', 'M8 12l-4 4 4 4'] },
  { id: 'ic-18', name: 'Vault Safe', category: 'Affiliate & FinTech', paths: ['M4 4h16v16H4z', 'M12 9a3 3 0 1 0 3 3 3 3 0 0 0-3-3z', 'M12 6v3', 'M12 15v3'] },
  { id: 'ic-19', name: 'Wallet Card', category: 'Affiliate & FinTech', paths: ['M3 6h18v12H3z', 'M3 10h18', 'M7 15h4'] },
  { id: 'ic-20', name: 'Payout Rocket', category: 'Affiliate & FinTech', paths: ['M12 2c4 2 6 6 6 11l-6 6-6-6c0-5 2-9 6-11z', 'M12 9a2 2 0 1 0 2 2 2 2 0 0 0-2-2z'] },
  { id: 'ic-21', name: 'Tax Shield Receipt', category: 'Affiliate & FinTech', paths: ['M12 3l8 4v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V7l8-4z', 'M9 12h6', 'M12 9v6'] },
  { id: 'ic-22', name: 'Split Share', category: 'Affiliate & FinTech', paths: ['M12 20v-8', 'M12 12L6 6', 'M12 12l6-6', 'M6 10V6h4', 'M18 10V6h-4'] },
  // AI & Automation (10)
  { id: 'ic-23', name: 'Midas Prime Brain', category: 'AI & Automation', paths: ['M9 4a3 3 0 0 0-3 3v10a3 3 0 0 0 6 0V7a3 3 0 0 0-3-3z', 'M15 4a3 3 0 0 1 3 3v10a3 3 0 0 1-6 0V7a3 3 0 0 1 3-3z'] },
  { id: 'ic-24', name: 'Agent Forge Spark', category: 'AI & Automation', paths: ['M13 2L3 14h8l-1 8 10-12h-8l1-8z'] },
  { id: 'ic-25', name: 'Vector Embedding Cube', category: 'AI & Automation', paths: ['M12 2l9 5v10l-9 5-9-5V7l9-5z', 'M12 22V12', 'M21 7l-9 5-9-5'] },
  { id: 'ic-26', name: 'Workflow Bot', category: 'AI & Automation', paths: ['M5 8h14v11H5z', 'M12 4v4', 'M9 13h.01', 'M15 13h.01', 'M9 17h6'] },
  { id: 'ic-27', name: 'Prompt Terminal', category: 'AI & Automation', paths: ['M4 5h16v14H4z', 'M8 10l3 2-3 2', 'M13 14h3'] },
  { id: 'ic-28', name: 'Auto-Scale Pulse', category: 'AI & Automation', paths: ['M2 12h4l3-7 4 14 3-7h6'] },
  { id: 'ic-29', name: 'Knowledge Search', category: 'AI & Automation', paths: ['M11 4a7 7 0 1 0 7 7 7 7 0 0 0-7-7z', 'M20 20l-4.3-4.3'] },
  { id: 'ic-30', name: 'Webhook Trigger', category: 'AI & Automation', paths: ['M12 6a3 3 0 1 0-3-3', 'M6 18a3 3 0 1 0 3 3', 'M18 18a3 3 0 1 0-3 3', 'M12 6v6l-5 5', 'M12 12l5 5'] },
  { id: 'ic-31', name: 'AB Split Test', category: 'AI & Automation', paths: ['M4 6h6v12H4z', 'M14 6h6v12h-6z', 'M7 10h0', 'M17 14h0'] },
  { id: 'ic-32', name: 'Neural Mesh', category: 'AI & Automation', paths: ['M6 6h12v12H6z', 'M6 6l12 12', 'M18 6L6 18'] },
  // Security & DevOps (10)
  { id: 'ic-33', name: 'Captain OWASP Shield', category: 'Security & DevOps', paths: ['M12 2l8 4v6c0 5.5-3.8 9.7-8 11-4.2-1.3-8-5.5-8-11V6l8-4z', 'M9 12l2 2 4-4'] },
  { id: 'ic-34', name: 'RLS Row Lock', category: 'Security & DevOps', paths: ['M5 11h14v9H5z', 'M8 11V7a4 4 0 0 1 8 0v4'] },
  { id: 'ic-35', name: 'Zero Dependency Seal', category: 'Security & DevOps', paths: ['M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9z', 'M9 12l2 2 4-4'] },
  { id: 'ic-36', name: 'API Key Token', category: 'Security & DevOps', paths: ['M8 15a5 5 0 1 1 4.6-6.9L21 8v4h-3v3h-3l-2.4.1A5 5 0 0 1 8 15z'] },
  { id: 'ic-37', name: 'Audit Log Scroll', category: 'Security & DevOps', paths: ['M5 4h14v16H5z', 'M8 8h8', 'M8 12h8', 'M8 16h5'] },
  { id: 'ic-38', name: 'CI Pipeline Check', category: 'Security & DevOps', paths: ['M4 12h16', 'M8 8l-4 4 4 4', 'M16 8l4 4-4 4'] },
  { id: 'ic-39', name: 'Server Cluster', category: 'Security & DevOps', paths: ['M4 5h16v5H4z', 'M4 14h16v5H4z', 'M7 7.5h.01', 'M7 16.5h.01'] },
  { id: 'ic-40', name: 'PII Mask Eye', category: 'Security & DevOps', paths: ['M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z', 'M4 4l16 16'] },
  { id: 'ic-41', name: 'SLA Clock', category: 'Security & DevOps', paths: ['M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9z', 'M12 7v5l3 3'] },
  { id: 'ic-42', name: 'Firewall Gate', category: 'Security & DevOps', paths: ['M3 6h18', 'M3 12h18', 'M3 18h18', 'M8 6v6', 'M16 6v6', 'M12 12v6'] },
  // Brand Illustrations (10)
  { id: 'il-43', name: 'Midas Gold Throne Crest', category: 'Brand Illustrations', isIllustration: true, paths: ['M2 20h20', 'M4 20V8l4 4 4-6 4 6 4-4v12H4z', 'M9 16h6'] },
  { id: 'il-44', name: 'Two-Up Passup Constellation', category: 'Brand Illustrations', isIllustration: true, paths: ['M12 3l8 6-3 10H7L4 9l8-6z', 'M12 3v16', 'M4 9h16'] },
  { id: 'il-45', name: 'Autonomous Agent Triad', category: 'Brand Illustrations', isIllustration: true, paths: ['M12 4l8 14H4L12 4z', 'M12 9v5', 'M12 16h.01'] },
  { id: 'il-46', name: 'Global Affiliate Network Globe', category: 'Brand Illustrations', isIllustration: true, paths: ['M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z', 'M2 12h20', 'M12 2c3 3 3 17 0 20', 'M12 2c-3 3-3 17 0 20'] },
  { id: 'il-47', name: 'Six-Layer Security Fortress', category: 'Brand Illustrations', isIllustration: true, paths: ['M12 2l9 4v6c0 6-4 10-9 11-5-1-9-5-9-11V6l9-4z', 'M12 6l5 2.5v3.5c0 3.5-2.2 6-5 6.8-2.8-.8-5-3.3-5-6.8V8.5L12 6z'] },
  { id: 'il-48', name: 'Revenue Flywheel Dynamo', category: 'Brand Illustrations', isIllustration: true, paths: ['M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9z', 'M12 8a4 4 0 1 0 4 4 4 4 0 0 0-4-4z', 'M12 3v5', 'M12 16v5', 'M3 12h5', 'M16 12h5'] },
  { id: 'il-49', name: 'Principal Enterprise Badge', category: 'Brand Illustrations', isIllustration: true, paths: ['M12 2l4 4h5v5l4 4-4 4v5h-5l-4 4-4-4H3v-5l-4-4 4-4V6h5l4-4z', 'M9 12l2 2 4-4'] },
  { id: 'il-50', name: 'SaaS Conversion Rocket Banner', category: 'Brand Illustrations', isIllustration: true, paths: ['M12 2c5 3 7 8 7 14l-7 6-7-6c0-6 2-11 7-14z', 'M9 14l3-3 3 3'] },
  { id: 'il-51', name: 'Zero-Trust Vault Architecture', category: 'Brand Illustrations', isIllustration: true, paths: ['M3 4h18v16H3z', 'M7 8h10v8H7z', 'M12 10v4'] },
  { id: 'il-52', name: 'Diamond Tier Trophy', category: 'Brand Illustrations', isIllustration: true, paths: ['M6 4h12v5a6 6 0 0 1-12 0V4z', 'M12 15v5', 'M8 20h8', 'M4 5h2v3H4z', 'M18 5h2v3h-2z'] }
];

const CATEGORIES: ('ALL' | AssetCategory)[] = [
  'ALL',
  'CRM & Sales',
  'Affiliate & FinTech',
  'AI & Automation',
  'Security & DevOps',
  'Brand Illustrations'
];

export const IconIllustrationPack: React.FC = () => {
  const [category, setCategory] = useState<'ALL' | AssetCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [strokeColor, setStrokeColor] = useState('#D4AF37');
  const [strokeWidth, setStrokeWidth] = useState<number>(1.8);
  const [iconSize, setIconSize] = useState<number>(28);
  const [selectedAssetId, setSelectedAssetId] = useState<string>(ASSETS[0].id);
  const [notice, setNotice] = useState('');

  const filteredAssets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ASSETS.filter(a => {
      if (category !== 'ALL' && a.category !== category) return false;
      if (!q) return true;
      return a.name.toLowerCase().includes(q) || a.category.toLowerCase().includes(q);
    });
  }, [category, searchQuery]);

  const activeAsset = useMemo(() => {
    return filteredAssets.find(a => a.id === selectedAssetId) || filteredAssets[0] || ASSETS[0];
  }, [filteredAssets, selectedAssetId]);

  const exportedSvg = useMemo(() => {
    const pathNodes = activeAsset.paths
      .map(d => `  <path d="${d}" />`)
      .join('\n');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">\n${pathNodes}\n</svg>`;
  }, [activeAsset, iconSize, strokeColor, strokeWidth]);

  const copyCode = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(exportedSvg);
      }
      setNotice(`Copied SVG markup for "${activeAsset.name}".`);
    } catch {
      setNotice(`Selected "${activeAsset.name}" SVG markup below.`);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="border-b border-zinc-800 pb-4 flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#D4AF37]">Agent Midas Icon & Illustration Pack ({ASSETS.length} Vector Assets)</h1>
            <p className="text-sm text-zinc-400">52 bespoke Black/Gold (#0A0A0A / #D4AF37) vector icons and brand illustrations with live SVG export</p>
          </div>
          <div className="flex gap-2 text-xs">
            <select
              aria-label="Brand Color Preset"
              value={strokeColor}
              onChange={e => setStrokeColor(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white"
            >
              <option value="#D4AF37">Midas Gold (#D4AF37)</option>
              <option value="#F4F4F5">Platinum White (#F4F4F5)</option>
              <option value="#10B981">Emerald Signal (#10B981)</option>
            </select>
          </div>
        </header>

        {notice && <div role="status" className="bg-emerald-950/60 border border-emerald-700 text-emerald-200 px-4 py-2 rounded text-sm">{notice}</div>}

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <input
            aria-label="Search Icons and Illustrations"
            type="search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search 52 icons & illustrations..."
            className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white"
          />
          <label className="space-y-1">
            <span className="text-zinc-400">Stroke Width ({strokeWidth}px)</span>
            <input aria-label="SVG Stroke Width" type="range" min={1} max={3} step={0.2} value={strokeWidth} onChange={e => setStrokeWidth(Number(e.target.value))} className="w-full" />
          </label>
          <label className="space-y-1">
            <span className="text-zinc-400">Render Size ({iconSize}px)</span>
            <input aria-label="SVG Icon Size" type="range" min={20} max={48} step={4} value={iconSize} onChange={e => setIconSize(Number(e.target.value))} className="w-full" />
          </label>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              type="button"
              aria-label={`Filter category ${cat}`}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                category === cat ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'bg-zinc-900 text-zinc-300 border-zinc-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {filteredAssets.map(asset => (
            <button
              key={asset.id}
              type="button"
              aria-label={`Inspect vector asset ${asset.name}`}
              onClick={() => setSelectedAssetId(asset.id)}
              className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-center transition ${
                activeAsset.id === asset.id ? 'bg-zinc-900 border-[#D4AF37]' : 'bg-zinc-900/50 border-zinc-800'
              }`}
            >
              <svg
                width={iconSize}
                height={iconSize}
                viewBox="0 0 24 24"
                fill="none"
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {asset.paths.map((d, idx) => (
                  <path key={idx} d={d} />
                ))}
              </svg>
              <span className="text-[11px] font-medium text-zinc-200">{asset.name}</span>
            </button>
          ))}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-[#D4AF37]">Selected Asset: {activeAsset.name} ({activeAsset.category})</span>
            <button
              type="button"
              aria-label={`Copy SVG for ${activeAsset.name}`}
              onClick={() => void copyCode()}
              className="bg-[#D4AF37] text-black font-bold text-xs px-3 py-1.5 rounded"
            >
              Copy SVG Markup
            </button>
          </div>
          <pre className="bg-zinc-950 border border-zinc-800 rounded p-3 text-xs text-zinc-400 overflow-x-auto">
            {exportedSvg}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default IconIllustrationPack;
