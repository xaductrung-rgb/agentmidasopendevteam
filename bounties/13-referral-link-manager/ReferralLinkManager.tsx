'use client';
import React, { useState, useRef, useMemo } from 'react';

export interface ReferralLinkItem {
  id: string;
  campaignSlug: string;
  destinationUrl: string;
  utmSource: string;
  utmMedium: string;
  clicks: number;
  conversions: number;
  commissionPerConversionUsd: number;
}

export interface ReferralLinkManagerProps {
  storageKey?: string;
  initialLinks?: ReferralLinkItem[];
  onChange?: (links: ReferralLinkItem[]) => void | Promise<void>;
}

const DEFAULT_LINKS: ReferralLinkItem[] = [
  {
    id: 'ref-101',
    campaignSlug: 'midas-vip-launch',
    destinationUrl: 'https://agentmidas.dev/pricing',
    utmSource: 'youtube',
    utmMedium: 'influencer',
    clicks: 1280,
    conversions: 94,
    commissionPerConversionUsd: 50
  },
  {
    id: 'ref-102',
    campaignSlug: 'q4-agency-partner',
    destinationUrl: 'https://agentmidas.dev/enterprise',
    utmSource: 'newsletter',
    utmMedium: 'email',
    clicks: 840,
    conversions: 62,
    commissionPerConversionUsd: 75
  }
];

function isValidLink(item: unknown): item is ReferralLinkItem {
  if (!item || typeof item !== 'object') return false;
  const r = item as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.campaignSlug === 'string' &&
    typeof r.destinationUrl === 'string' &&
    typeof r.clicks === 'number' &&
    r.clicks >= 0 &&
    typeof r.conversions === 'number' &&
    r.conversions >= 0 &&
    typeof r.commissionPerConversionUsd === 'number' &&
    r.commissionPerConversionUsd >= 0
  );
}

export const ReferralLinkManager: React.FC<ReferralLinkManagerProps> = ({
  storageKey = 'agentmidas_referral_links_v1',
  initialLinks = DEFAULT_LINKS,
  onChange
}) => {
  const [links, setLinks] = useState<ReferralLinkItem[]>(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(isValidLink)) {
          return parsed;
        }
      }
    } catch {}
    return initialLinks;
  });

  const linksRef = useRef<ReferralLinkItem[]>(links);
  linksRef.current = links;
  const saveLockRef = useRef(false);

  const [campaignSlug, setCampaignSlug] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('https://agentmidas.dev/signup');
  const [utmSource, setUtmSource] = useState('twitter');
  const [utmMedium, setUtmMedium] = useState('social');
  const [commissionInput, setCommissionInput] = useState('50');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [notice, setNotice] = useState('');

  const persistLinks = async (next: ReferralLinkItem[], msg: string): Promise<boolean> => {
    if (saveLockRef.current) return false;
    saveLockRef.current = true;
    setIsSaving(true);
    const prev = linksRef.current;
    linksRef.current = next;
    setLinks(next);
    setErrorMsg('');
    try {
      if (onChange) {
        await onChange(next);
      }
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      }
      setNotice(msg);
      return true;
    } catch {
      linksRef.current = prev;
      setLinks(prev);
      setErrorMsg('Failed to persist referral links; rolled back.');
      return false;
    } finally {
      saveLockRef.current = false;
      setIsSaving(false);
    }
  };

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saveLockRef.current) return;
    const slug = campaignSlug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    const comm = Number(commissionInput.trim());
    if (!slug || !destinationUrl.trim().startsWith('http') || !Number.isFinite(comm) || comm < 0) {
      setErrorMsg('Enter a valid campaign slug, HTTP/HTTPS destination URL, and non-negative commission.');
      return;
    }
    const created: ReferralLinkItem = {
      id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      campaignSlug: slug,
      destinationUrl: destinationUrl.trim(),
      utmSource: utmSource.trim() || 'direct',
      utmMedium: utmMedium.trim() || 'referral',
      clicks: 0,
      conversions: 0,
      commissionPerConversionUsd: Math.round(comm)
    };
    const ok = await persistLinks([created, ...linksRef.current], `Created referral link "${created.campaignSlug}".`);
    if (ok) {
      setCampaignSlug('');
    }
  };

  const recordConversion = async (id: string) => {
    if (saveLockRef.current) return;
    const next = linksRef.current.map(l =>
      l.id === id ? { ...l, clicks: l.clicks + 1, conversions: l.conversions + 1 } : l
    );
    await persistLinks(next, 'Recorded attributed referral conversion.');
  };

  const totals = useMemo(() => {
    const totalClicks = links.reduce((s, l) => s + l.clicks, 0);
    const totalConversions = links.reduce((s, l) => s + l.conversions, 0);
    const totalCommissionUsd = links.reduce((s, l) => s + l.conversions * l.commissionPerConversionUsd, 0);
    return { totalClicks, totalConversions, totalCommissionUsd };
  }, [links]);

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="border-b border-zinc-800 pb-4 flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#D4AF37]">Referral Link & UTM Attribution Manager</h1>
            <p className="text-sm text-zinc-400">Generate trackable affiliate links and monitor conversion commissions</p>
          </div>
          <div className="flex gap-3 text-xs">
            <div className="bg-zinc-900 border border-zinc-800 px-3 py-2 rounded">
              <div className="text-zinc-400">Total Clicks</div>
              <div className="text-base font-bold text-white">{totals.totalClicks.toLocaleString()}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 px-3 py-2 rounded">
              <div className="text-zinc-400">Conversions</div>
              <div className="text-base font-bold text-emerald-400">{totals.totalConversions.toLocaleString()}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 px-3 py-2 rounded">
              <div className="text-zinc-400">Earned Commissions</div>
              <div className="text-base font-bold text-[#D4AF37]">${totals.totalCommissionUsd.toLocaleString()}</div>
            </div>
          </div>
        </header>

        {notice && <div role="status" className="bg-emerald-950/60 border border-emerald-700 text-emerald-200 px-4 py-2 rounded text-sm">{notice}</div>}
        {errorMsg && <div role="alert" className="bg-red-950/60 border border-red-700 text-red-200 px-4 py-2 rounded text-sm">{errorMsg}</div>}

        <form onSubmit={handleCreateLink} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-6 gap-3">
          <input aria-label="Campaign Slug" value={campaignSlug} onChange={e => setCampaignSlug(e.target.value)} disabled={isSaving} placeholder="Slug (e.g. spring-vip)" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
          <input aria-label="Destination URL" value={destinationUrl} onChange={e => setDestinationUrl(e.target.value)} disabled={isSaving} placeholder="https://..." className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
          <input aria-label="UTM Source" value={utmSource} onChange={e => setUtmSource(e.target.value)} disabled={isSaving} placeholder="utm_source" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
          <input aria-label="UTM Medium" value={utmMedium} onChange={e => setUtmMedium(e.target.value)} disabled={isSaving} placeholder="utm_medium" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
          <input aria-label="Commission USD" type="number" min={0} value={commissionInput} onChange={e => setCommissionInput(e.target.value)} disabled={isSaving} placeholder="Commission ($)" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
          <button type="submit" disabled={isSaving} className="bg-[#D4AF37] text-black font-bold text-xs rounded px-4 py-2">
            + Create Link
          </button>
        </form>

        <div className="space-y-3">
          {links.map(l => {
            const fullUrl = `${l.destinationUrl}?ref=${encodeURIComponent(l.campaignSlug)}&utm_source=${encodeURIComponent(l.utmSource)}&utm_medium=${encodeURIComponent(l.utmMedium)}`;
            const convRate = l.clicks > 0 ? ((l.conversions / l.clicks) * 100).toFixed(1) : '0.0';
            return (
              <div key={l.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-wrap justify-between items-center gap-4">
                <div className="space-y-1">
                  <div className="font-bold text-white">{l.campaignSlug}</div>
                  <div className="text-xs font-mono text-[#D4AF37] break-all">{fullUrl}</div>
                  <div className="text-xs text-zinc-400">
                    Clicks: {l.clicks} · Conversions: {l.conversions} ({convRate}%) · Payout: ${(l.conversions * l.commissionPerConversionUsd).toLocaleString()}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`Record conversion for ${l.campaignSlug}`}
                  disabled={isSaving}
                  onClick={() => void recordConversion(l.id)}
                  className="px-3 py-1.5 rounded bg-zinc-800 text-xs text-[#D4AF37] font-bold"
                >
                  + Log Conversion
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ReferralLinkManager;
