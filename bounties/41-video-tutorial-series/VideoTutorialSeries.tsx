import React, { useState, useEffect, useMemo } from 'react';

export interface TutorialChapter {
  title: string;
  timestampSec: number;
}

export interface TutorialModule {
  id: string;
  moduleNumber: number;
  title: string;
  track: 'SDK' | 'API' | 'Dashboard';
  durationSec: number;
  watchedSec: number;
  completed: boolean;
  videoUrl: string;
  summary: string;
  transcript: string;
  codeSample: string;
  chapters: TutorialChapter[];
  quizQuestion: string;
  quizOptions: string[];
  quizAnswerIndex: number;
  quizPassed: boolean;
}

export interface VideoTutorialSeriesProps {
  storageKey?: string;
  initialModules?: TutorialModule[];
  onChange?: (modules: TutorialModule[]) => void | Promise<void>;
}

const DEFAULT_MODULES: TutorialModule[] = [
  {
    id: 'vid-01',
    moduleNumber: 1,
    title: '1. Agent Midas SDK Quickstart & TypeScript Setup',
    track: 'SDK',
    durationSec: 420,
    watchedSec: 420,
    completed: true,
    videoUrl: 'https://assets.agentmidas.dev/tutorials/01-sdk-quickstart.mp4',
    summary: 'Install @agentmidas/sdk, configure environment keys, and initialize the typed client.',
    transcript: 'Welcome to Tutorial 1. Run npm install @agentmidas/sdk and initialize MidasClient with your environment API key and strict TypeScript typing.',
    codeSample: `import { MidasClient } from '@agentmidas/sdk';\nconst client = new MidasClient({ apiKey: process.env.MIDAS_API_KEY! });`,
    chapters: [{ title: 'Package Installation', timestampSec: 0 }, { title: 'Client Initialization', timestampSec: 140 }, { title: 'Type Safety Verification', timestampSec: 290 }],
    quizQuestion: 'Which class initializes the typed Agent Midas SDK client?',
    quizOptions: ['MidasClient', 'AgentRouter', 'MidasWebhook'],
    quizAnswerIndex: 0,
    quizPassed: true
  },
  {
    id: 'vid-02',
    moduleNumber: 2,
    title: '2. Authentication, Scoped API Keys & Session Tokens',
    track: 'API',
    durationSec: 510,
    watchedSec: 510,
    completed: true,
    videoUrl: 'https://assets.agentmidas.dev/tutorials/02-auth-api-keys.mp4',
    summary: 'Rotate scoped API keys, issue short-lived JWT session tokens, and enforce RBAC permissions.',
    transcript: 'In Tutorial 2 we cover HMAC key rotation, read/write scopes, and issuing 15-minute session tokens for browser widgets.',
    codeSample: `const token = await client.auth.createSessionToken({ scopes: ['affiliates:read'], ttlSeconds: 900 });`,
    chapters: [{ title: 'Scoped API Keys', timestampSec: 0 }, { title: 'JWT Session Issuance', timestampSec: 180 }, { title: 'Key Rotation Zero-Downtime', timestampSec: 360 }],
    quizQuestion: 'What is the recommended TTL for browser session tokens?',
    quizOptions: ['900 seconds (15 mins)', '30 days', 'Unlimited'],
    quizAnswerIndex: 0,
    quizPassed: true
  },
  {
    id: 'vid-03',
    moduleNumber: 3,
    title: '3. Affiliate Link Attribution & UTM Conversion Tracking',
    track: 'SDK',
    durationSec: 480,
    watchedSec: 240,
    completed: false,
    videoUrl: 'https://assets.agentmidas.dev/tutorials/03-affiliate-attribution.mp4',
    summary: 'Capture referral clicks, persist first-touch/last-touch cookies, and record conversions.',
    transcript: 'Tutorial 3 demonstrates client.attribution.recordClick and deterministic conversion attribution across custom domains.',
    codeSample: `await client.attribution.recordConversion({ referralCode: 'MIDAS-PRO', orderAmountCents: 49000 });`,
    chapters: [{ title: 'Click Capture', timestampSec: 0 }, { title: 'Cross-Domain Persistence', timestampSec: 160 }, { title: 'Conversion Recording', timestampSec: 320 }],
    quizQuestion: 'Which method records a verified affiliate conversion?',
    quizOptions: ['recordConversion', 'trackPage', 'flushQueue'],
    quizAnswerIndex: 0,
    quizPassed: false
  },
  {
    id: 'vid-04',
    moduleNumber: 4,
    title: '4. Two-Up Commission Engine & Genealogy Pass-Up Rules',
    track: 'Dashboard',
    durationSec: 600,
    watchedSec: 0,
    completed: false,
    videoUrl: 'https://assets.agentmidas.dev/tutorials/04-two-up-genealogy.mp4',
    summary: 'Configure Two-Up qualification sales (#1 and #2 pass-up) and visualize sponsor trees.',
    transcript: 'Tutorial 4 walks through Two-Up pass-up rules where sales 1 and 2 route to the qualified upline sponsor and sale 3+ unlocks direct team lines.',
    codeSample: `const payout = client.commissions.evaluateTwoUp({ directSalesCount: 3, saleAmount: 500 });`,
    chapters: [{ title: 'Sale #1 & #2 Pass-Up', timestampSec: 0 }, { title: 'Unlocking Direct Lines', timestampSec: 220 }, { title: 'Compression Overrides', timestampSec: 440 }],
    quizQuestion: 'Which sales pass up to the sponsor in the standard Two-Up model?',
    quizOptions: ['Sales #1 and #2', 'Sales #3 and #4', 'Only Sale #10'],
    quizAnswerIndex: 0,
    quizPassed: false
  },
  {
    id: 'vid-05',
    moduleNumber: 5,
    title: '5. Webhook Signature Verification & Idempotent Retries',
    track: 'API',
    durationSec: 540,
    watchedSec: 0,
    completed: false,
    videoUrl: 'https://assets.agentmidas.dev/tutorials/05-webhooks-idempotency.mp4',
    summary: 'Verify X-Midas-Signature HMAC-SHA256 headers and deduplicate webhook event deliveries.',
    transcript: 'Tutorial 5 explains how to verify raw request bodies with HMAC-SHA256 and store event IDs for idempotent processing.',
    codeSample: `const event = client.webhooks.verifySignature(rawBody, req.headers['x-midas-signature'], secret);`,
    chapters: [{ title: 'HMAC-SHA256 Verification', timestampSec: 0 }, { title: 'Replay Attack Window', timestampSec: 190 }, { title: 'Idempotency Keys', timestampSec: 380 }],
    quizQuestion: 'Which header carries the webhook HMAC signature?',
    quizOptions: ['x-midas-signature', 'x-forwarded-for', 'user-agent'],
    quizAnswerIndex: 0,
    quizPassed: false
  },
  {
    id: 'vid-06',
    moduleNumber: 6,
    title: '6. Executive Revenue Dashboard & MRR/ARR Cohort Metrics',
    track: 'Dashboard',
    durationSec: 450,
    watchedSec: 0,
    completed: false,
    videoUrl: 'https://assets.agentmidas.dev/tutorials/06-revenue-cohorts.mp4',
    summary: 'Monitor real-time Net MRR, ARR, expansion revenue, logo churn, and LTV:CAC ratios.',
    transcript: 'Tutorial 6 explores the Executive Revenue Dashboard, live polling feeds, and CSV cohort exports.',
    codeSample: `const metrics = await client.analytics.getRevenueSummary({ range: '90d' });`,
    chapters: [{ title: 'MRR Breakdown', timestampSec: 0 }, { title: 'Churn & LTV Formulas', timestampSec: 170 }, { title: 'Live Polling Stream', timestampSec: 310 }],
    quizQuestion: 'How is ARR derived from Net MRR?',
    quizOptions: ['MRR * 12', 'MRR / 12', 'MRR + Churn'],
    quizAnswerIndex: 0,
    quizPassed: false
  },
  {
    id: 'vid-07',
    moduleNumber: 7,
    title: '7. Embedding Custom Dashboard Widgets in Next.js 14',
    track: 'SDK',
    durationSec: 495,
    watchedSec: 0,
    completed: false,
    videoUrl: 'https://assets.agentmidas.dev/tutorials/07-nextjs-widgets.mp4',
    summary: 'Drop Agent Midas black/gold Tailwind widgets into Next.js App Router with SSR hydration.',
    transcript: 'Tutorial 7 shows how to embed self-contained Agent Midas components inside Next.js 14 Server and Client Components.',
    codeSample: `import { AffiliateDashboard } from '@agentmidas/ui';\nexport default () => <AffiliateDashboard storageKey="prod" />;`,
    chapters: [{ title: 'Tailwind Theme Setup', timestampSec: 0 }, { title: 'Client Boundary Hydration', timestampSec: 200 }, { title: 'Async onChange Callbacks', timestampSec: 360 }],
    quizQuestion: 'What color palette defines the Agent Midas brand guidelines?',
    quizOptions: ['Black (#09090B) and Gold (#D4AF37)', 'White and Blue', 'Green and Pink'],
    quizAnswerIndex: 0,
    quizPassed: false
  },
  {
    id: 'vid-08',
    moduleNumber: 8,
    title: '8. API Rate Limiting, Cursor Pagination & Bulk Exports',
    track: 'API',
    durationSec: 430,
    watchedSec: 0,
    completed: false,
    videoUrl: 'https://assets.agentmidas.dev/tutorials/08-pagination-ratelimits.mp4',
    summary: 'Handle 429 Retry-After headers, iterate cursor-paginated endpoints, and stream CSV exports.',
    transcript: 'Tutorial 8 covers automatic exponential backoff on HTTP 429 and async iterator cursor pagination.',
    codeSample: `for await (const lead of client.leads.listAutoPaging({ limit: 100 })) { console.log(lead.id); }`,
    chapters: [{ title: 'Cursor Pagination', timestampSec: 0 }, { title: 'Exponential Backoff', timestampSec: 150 }, { title: 'Bulk Stream Exports', timestampSec: 300 }],
    quizQuestion: 'Which HTTP status indicates rate limiting?',
    quizOptions: ['429 Too Many Requests', '200 OK', '404 Not Found'],
    quizAnswerIndex: 0,
    quizPassed: false
  },
  {
    id: 'vid-09',
    moduleNumber: 9,
    title: '9. Multi-Gateway Stripe & Crypto Payout Automation',
    track: 'Dashboard',
    durationSec: 525,
    watchedSec: 0,
    completed: false,
    videoUrl: 'https://assets.agentmidas.dev/tutorials/09-payout-orchestration.mp4',
    summary: 'Configure automated affiliate batch payouts with Stripe Connect and failover routing.',
    transcript: 'Tutorial 9 configures batch affiliate payouts, tax form verification, and automatic gateway failover.',
    codeSample: `await client.payouts.executeBatch({ batchId: 'pay_oct_2026', gateway: 'stripe_connect' });`,
    chapters: [{ title: 'Gateway Priorities', timestampSec: 0 }, { title: 'Tax Compliance Checks', timestampSec: 190 }, { title: 'Failover Execution', timestampSec: 370 }],
    quizQuestion: 'What happens when the primary gateway experiences a timeout?',
    quizOptions: ['Automatic failover to secondary gateway', 'Permanent data loss', 'Silent drop'],
    quizAnswerIndex: 0,
    quizPassed: false
  },
  {
    id: 'vid-10',
    moduleNumber: 10,
    title: '10. 6-Layer Security Audit & Production Hardening',
    track: 'Dashboard',
    durationSec: 560,
    watchedSec: 0,
    completed: false,
    videoUrl: 'https://assets.agentmidas.dev/tutorials/10-security-hardening.mp4',
    summary: 'Pass the 6-Layer Agent Midas security review: CSP headers, input sanitization, and audit logs.',
    transcript: 'Tutorial 10 reviews all 6 layers of the Agent Midas production security checklist before deployment.',
    codeSample: `await client.security.verifyAuditLogIntegrity({ windowHours: 24 });`,
    chapters: [{ title: 'Input Sanitization', timestampSec: 0 }, { title: 'CSP & CORS Policy', timestampSec: 210 }, { title: 'Immutable Audit Trail', timestampSec: 400 }],
    quizQuestion: 'How many security layers are verified in the Agent Midas review?',
    quizOptions: ['6 layers', '1 layer', '2 layers'],
    quizAnswerIndex: 0,
    quizPassed: false
  }
];

export const VideoTutorialSeries: React.FC<VideoTutorialSeriesProps> = ({
  storageKey = 'agentmidas_video_tutorials_v1',
  initialModules = DEFAULT_MODULES,
  onChange
}) => {
  const [modules, setModules] = useState<TutorialModule[]>(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return initialModules;
  });

  const [selectedId, setSelectedId] = useState<string>(modules[0]?.id || 'vid-01');
  const [trackFilter, setTrackFilter] = useState<'ALL' | 'SDK' | 'API' | 'Dashboard'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [selectedQuizOption, setSelectedQuizOption] = useState<number>(0);
  const [notice, setNotice] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const persistModules = async (next: TutorialModule[], successNotice?: string) => {
    const prev = modules;
    setModules(next);
    setErrorMsg('');
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      }
      if (onChange) {
        await onChange(next);
      }
      if (successNotice) setNotice(successNotice);
    } catch {
      setModules(prev);
      setErrorMsg('Failed to persist tutorial progress; rolled back to previous state.');
    }
  };

  const activeModule = useMemo(
    () => modules.find(m => m.id === selectedId) || modules[0],
    [modules, selectedId]
  );

  useEffect(() => {
    if (!isPlaying || !activeModule) return;
    const timer = setInterval(() => {
      setModules(curr => {
        const next = curr.map(m => {
          if (m.id !== activeModule.id) return m;
          const nextWatched = Math.min(m.durationSec, m.watchedSec + Math.round(5 * playbackSpeed));
          const isDone = nextWatched >= m.durationSec;
          return { ...m, watchedSec: nextWatched, completed: m.completed || isDone };
        });
        try {
          if (typeof window !== 'undefined') window.localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {}
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying, activeModule, playbackSpeed, storageKey]);

  const filteredModules = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return modules.filter(m => {
      if (trackFilter !== 'ALL' && m.track !== trackFilter) return false;
      if (!q) return true;
      return (
        m.title.toLowerCase().includes(q) ||
        m.summary.toLowerCase().includes(q) ||
        m.transcript.toLowerCase().includes(q) ||
        m.codeSample.toLowerCase().includes(q)
      );
    });
  }, [modules, trackFilter, searchQuery]);

  const jumpToTimestamp = (sec: number) => {
    if (!activeModule) return;
    const clamped = Math.max(0, Math.min(activeModule.durationSec, sec));
    const next = modules.map(m =>
      m.id === activeModule.id
        ? { ...m, watchedSec: clamped, completed: m.completed || clamped >= m.durationSec }
        : m
    );
    void persistModules(next, `Jumped to chapter at ${Math.floor(clamped / 60)}m ${clamped % 60}s`);
  };

  const toggleComplete = (id: string) => {
    const next = modules.map(m =>
      m.id === id
        ? { ...m, completed: !m.completed, watchedSec: !m.completed ? m.durationSec : m.watchedSec }
        : m
    );
    void persistModules(next, 'Updated module completion status.');
  };

  const submitQuiz = () => {
    if (!activeModule) return;
    const passed = selectedQuizOption === activeModule.quizAnswerIndex;
    if (!passed) {
      setErrorMsg('Incorrect quiz answer. Review the transcript and try again.');
      return;
    }
    const next = modules.map(m =>
      m.id === activeModule.id ? { ...m, quizPassed: true, completed: true, watchedSec: m.durationSec } : m
    );
    void persistModules(next, `Passed verification quiz for Module #${activeModule.moduleNumber}!`);
  };

  const completedCount = modules.filter(m => m.completed).length;
  const totalSeconds = modules.reduce((acc, m) => acc + m.durationSec, 0);
  const watchedSeconds = modules.reduce((acc, m) => acc + m.watchedSec, 0);

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-[#D4AF37]">Agent Midas Video Tutorial Series</h1>
            <p className="text-sm text-zinc-400">
              10-Module Interactive Curriculum covering SDK, REST/Webhooks API, and Dashboard Operations
            </p>
          </div>
          <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-lg">
            <div>
              <div className="text-xs text-zinc-400">Course Completion</div>
              <div className="text-lg font-bold text-[#D4AF37]">
                {completedCount} / {modules.length} Modules ({Math.round((completedCount / modules.length) * 100)}%)
              </div>
            </div>
            <div className="border-l border-zinc-800 pl-4">
              <div className="text-xs text-zinc-400">Watch Time</div>
              <div className="text-sm font-semibold text-zinc-200">
                {Math.round(watchedSeconds / 60)} / {Math.round(totalSeconds / 60)} mins
              </div>
            </div>
          </div>
        </header>

        {notice && (
          <div role="status" className="bg-emerald-950/60 border border-emerald-700 text-emerald-200 px-4 py-2 rounded text-sm">
            {notice}
          </div>
        )}
        {errorMsg && (
          <div role="alert" className="bg-red-950/60 border border-red-700 text-red-200 px-4 py-2 rounded text-sm">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Curriculum Sidebar */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 space-y-4">
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Tutorial Track Filter">
              {(['ALL', 'SDK', 'API', 'Dashboard'] as const).map(track => (
                <button
                  key={track}
                  type="button"
                  role="tab"
                  aria-selected={trackFilter === track}
                  onClick={() => setTrackFilter(track)}
                  className={`px-3 py-1 rounded text-xs font-medium transition ${
                    trackFilter === track
                      ? 'bg-[#D4AF37] text-black font-bold'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {track}
                </button>
              ))}
            </div>

            <input
              type="search"
              aria-label="Search tutorials and transcripts"
              placeholder="Search titles, transcripts, or code..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-100"
            />

            <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
              {filteredModules.map(mod => {
                const isSelected = activeModule?.id === mod.id;
                const pct = Math.round((mod.watchedSec / mod.durationSec) * 100);
                return (
                  <div
                    key={mod.id}
                    onClick={() => {
                      setSelectedId(mod.id);
                      setSelectedQuizOption(0);
                      setIsPlaying(false);
                    }}
                    className={`p-3 rounded-lg border cursor-pointer transition ${
                      isSelected
                        ? 'bg-zinc-800/90 border-[#D4AF37]'
                        : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-800 text-[#D4AF37]">
                        {mod.track}
                      </span>
                      <span className="text-xs text-zinc-400">
                        {Math.floor(mod.durationSec / 60)}m {mod.durationSec % 60}s
                      </span>
                    </div>
                    <div className="font-medium text-sm mt-1 text-zinc-100">{mod.title}</div>
                    <div className="mt-2 flex items-center justify-between text-xs text-zinc-400">
                      <span>{mod.completed ? '✅ Completed' : `${pct}% watched`}</span>
                      {mod.quizPassed && <span className="text-emerald-400">Quiz Verified</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Video Player & Code Lab */}
          {activeModule && (
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-[#D4AF37] font-semibold">
                      Module #{activeModule.moduleNumber} · {activeModule.track} Track
                    </span>
                    <h2 className="text-xl font-bold text-white mt-0.5">{activeModule.title}</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleComplete(activeModule.id)}
                    className="px-3 py-1.5 rounded text-xs font-semibold border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition"
                  >
                    {activeModule.completed ? 'Mark Incomplete' : 'Mark Completed'}
                  </button>
                </div>

                {/* Simulated Video Canvas & Scrubber */}
                <div className="bg-black border border-zinc-800 rounded-lg p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-zinc-500 font-mono">{activeModule.videoUrl}</div>
                      <p className="text-sm text-zinc-300 mt-2">{activeModule.summary}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPlaying(p => !p)}
                      className="px-5 py-2.5 rounded-lg bg-[#D4AF37] text-black font-bold text-sm hover:opacity-90"
                    >
                      {isPlaying ? '⏸ Pause Video' : '▶ Play Tutorial'}
                    </button>
                  </div>

                  <div className="space-y-1">
                    <input
                      type="range"
                      aria-label="Video timeline scrubber"
                      min={0}
                      max={activeModule.durationSec}
                      value={activeModule.watchedSec}
                      onChange={e => jumpToTimestamp(Number(e.target.value))}
                      className="w-full accent-[#D4AF37]"
                    />
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>
                        Position: {Math.floor(activeModule.watchedSec / 60)}m {activeModule.watchedSec % 60}s /{' '}
                        {Math.floor(activeModule.durationSec / 60)}m {activeModule.durationSec % 60}s
                      </span>
                      <div className="flex items-center gap-2">
                        <span>Speed:</span>
                        {[0.75, 1, 1.25, 1.5, 2].map(spd => (
                          <button
                            key={spd}
                            type="button"
                            onClick={() => setPlaybackSpeed(spd)}
                            className={`px-1.5 py-0.5 rounded ${
                              playbackSpeed === spd ? 'bg-[#D4AF37] text-black font-bold' : 'bg-zinc-800 text-zinc-300'
                            }`}
                          >
                            {spd}x
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Chapter Markers */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-800">
                    {activeModule.chapters.map((ch, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => jumpToTimestamp(ch.timestampSec)}
                        className="text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 px-2.5 py-1 rounded text-zinc-200"
                      >
                        ⏱ {Math.floor(ch.timestampSec / 60)}:{String(ch.timestampSec % 60).padStart(2, '0')} — {ch.title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Transcript & Code Snippet */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] mb-2">
                      Synchronized Transcript
                    </h3>
                    <p className="text-sm text-zinc-300 leading-relaxed">{activeModule.transcript}</p>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] mb-2">
                      Reference SDK / API Code
                    </h3>
                    <pre className="text-xs text-emerald-300 font-mono overflow-x-auto whitespace-pre-wrap">
                      {activeModule.codeSample}
                    </pre>
                  </div>
                </div>

                {/* Module Verification Quiz */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-[#D4AF37]">
                      Module Knowledge Check: {activeModule.quizQuestion}
                    </h3>
                    {activeModule.quizPassed && (
                      <span className="text-xs bg-emerald-900/50 text-emerald-300 px-2 py-0.5 rounded">
                        ✅ Verified
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {activeModule.quizOptions.map((opt, idx) => (
                      <label key={idx} className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                        <input
                          type="radio"
                          name={`quiz-${activeModule.id}`}
                          checked={selectedQuizOption === idx}
                          onChange={() => setSelectedQuizOption(idx)}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={submitQuiz}
                    className="px-4 py-1.5 rounded bg-[#D4AF37] text-black text-xs font-bold hover:opacity-90"
                  >
                    Verify Answer & Complete Module
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoTutorialSeries;
