'use client';
import React, { useState, useMemo, useRef, useEffect } from 'react';

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
    transcript: 'Welcome to Tutorial 1. Run npm install @agentmidas/sdk and initialize MidasClient with your environment API key.',
    codeSample: `import { MidasClient } from '@agentmidas/sdk';\nconst client = new MidasClient({ apiKey: process.env.MIDAS_API_KEY! });`,
    chapters: [{ title: 'Package Installation', timestampSec: 0 }, { title: 'Client Initialization', timestampSec: 140 }],
    quizQuestion: 'Which class initializes the typed Agent Midas SDK client?',
    quizOptions: ['AgentRouter', 'MidasClient', 'MidasWebhook'],
    quizAnswerIndex: 1,
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
    transcript: 'In Tutorial 2 we cover HMAC key rotation, read/write scopes, and issuing 15-minute session tokens.',
    codeSample: `const token = await client.auth.createSessionToken({ scopes: ['affiliates:read'], ttlSeconds: 900 });`,
    chapters: [{ title: 'Scoped API Keys', timestampSec: 0 }, { title: 'JWT Session Issuance', timestampSec: 180 }],
    quizQuestion: 'What is the recommended TTL for browser session tokens?',
    quizOptions: ['30 days', 'Unlimited', '900 seconds (15 mins)'],
    quizAnswerIndex: 2,
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
    transcript: 'Tutorial 3 demonstrates client.attribution.recordClick and deterministic conversion attribution.',
    codeSample: `await client.attribution.recordConversion({ referralCode: 'MIDAS-PRO', orderAmountCents: 49000 });`,
    chapters: [{ title: 'Click Capture', timestampSec: 0 }, { title: 'Conversion Recording', timestampSec: 320 }],
    quizQuestion: 'Which method records a verified affiliate conversion?',
    quizOptions: ['trackPage', 'recordConversion', 'flushQueue'],
    quizAnswerIndex: 1,
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
    transcript: 'Tutorial 4 walks through Two-Up pass-up rules where sales 1 and 2 route to the qualified upline sponsor.',
    codeSample: `const payout = client.commissions.evaluateTwoUp({ directSalesCount: 3, saleAmount: 500 });`,
    chapters: [{ title: 'Sale #1 & #2 Pass-Up', timestampSec: 0 }, { title: 'Unlocking Direct Lines', timestampSec: 220 }],
    quizQuestion: 'Which sales pass up to the sponsor in the standard Two-Up model?',
    quizOptions: ['Sales #3 and #4', 'Only Sale #10', 'Sales #1 and #2'],
    quizAnswerIndex: 2,
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
    transcript: 'Tutorial 5 explains how to verify raw request bodies with HMAC-SHA256 and store event IDs.',
    codeSample: `const event = client.webhooks.verifySignature(rawBody, req.headers['x-midas-signature'], secret);`,
    chapters: [{ title: 'HMAC-SHA256 Verification', timestampSec: 0 }, { title: 'Idempotency Keys', timestampSec: 380 }],
    quizQuestion: 'Which header carries the webhook HMAC signature?',
    quizOptions: ['x-forwarded-for', 'x-midas-signature', 'user-agent'],
    quizAnswerIndex: 1,
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
    chapters: [{ title: 'MRR Breakdown', timestampSec: 0 }, { title: 'Churn & LTV Formulas', timestampSec: 170 }],
    quizQuestion: 'How is ARR derived from Ending MRR?',
    quizOptions: ['MRR / 12', 'MRR * 12', 'MRR + Churn'],
    quizAnswerIndex: 1,
    quizPassed: false
  },
  {
    id: 'vid-07',
    moduleNumber: 7,
    title: '7. Embedding Custom Widgets in Next.js App Router',
    track: 'SDK',
    durationSec: 495,
    watchedSec: 0,
    completed: false,
    videoUrl: 'https://assets.agentmidas.dev/tutorials/07-nextjs-widgets.mp4',
    summary: 'Drop Agent Midas black/gold Tailwind widgets into Next.js App Router with client boundaries.',
    transcript: 'Tutorial 7 shows how to embed self-contained Agent Midas components inside Next.js Client Components.',
    codeSample: `'use client';\nimport { AffiliateDashboard } from '@agentmidas/ui';`,
    chapters: [{ title: 'Tailwind Theme Setup', timestampSec: 0 }, { title: 'Client Boundary Hydration', timestampSec: 200 }],
    quizQuestion: 'What color palette defines the Agent Midas brand guidelines?',
    quizOptions: ['White and Blue', 'Green and Pink', 'Black (#09090B) and Gold (#D4AF37)'],
    quizAnswerIndex: 2,
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
    chapters: [{ title: 'Cursor Pagination', timestampSec: 0 }, { title: 'Exponential Backoff', timestampSec: 150 }],
    quizQuestion: 'Which HTTP status indicates rate limiting?',
    quizOptions: ['200 OK', '429 Too Many Requests', '404 Not Found'],
    quizAnswerIndex: 1,
    quizPassed: false
  },
  {
    id: 'vid-09',
    moduleNumber: 9,
    title: '9. CLI Deployment & Multi-Gateway Payout Automation',
    track: 'SDK',
    durationSec: 525,
    watchedSec: 0,
    completed: false,
    videoUrl: 'https://assets.agentmidas.dev/tutorials/09-cli-deployment.mp4',
    summary: 'Run npx @agentmidas/cli deploy for zero-downtime rollouts and automated Stripe Connect payouts.',
    transcript: 'Tutorial 9 demonstrates CLI deployment pipelines (npx @agentmidas/cli deploy) and gateway failover.',
    codeSample: `npx @agentmidas/cli deploy --env production --verify-webhooks`,
    chapters: [{ title: 'CLI Deployment Pipeline', timestampSec: 0 }, { title: 'Failover Execution', timestampSec: 370 }],
    quizQuestion: 'Which CLI command deploys an Agent Midas workspace to production?',
    quizOptions: ['npx @agentmidas/cli deploy', 'git status', 'npm uninstall'],
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
    chapters: [{ title: 'Input Sanitization', timestampSec: 0 }, { title: 'Immutable Audit Trail', timestampSec: 400 }],
    quizQuestion: 'How many security layers are verified in the Agent Midas review?',
    quizOptions: ['1 layer', '2 layers', '6 layers'],
    quizAnswerIndex: 2,
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
    } catch {}
    return initialModules;
  });

  const [selectedId, setSelectedId] = useState<string>(modules[0]?.id || 'vid-01');
  const [trackFilter, setTrackFilter] = useState<'ALL' | 'SDK' | 'API' | 'Dashboard'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [notice, setNotice] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const saveSeqRef = useRef(0);

  const persistModules = async (next: TutorialModule[], successNotice?: string) => {
    const seq = ++saveSeqRef.current;
    const prev = modules;
    setModules(next);
    setErrorMsg('');
    try {
      if (onChange) {
        await onChange(next);
      }
      if (seq !== saveSeqRef.current) return;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      }
      if (successNotice) setNotice(successNotice);
    } catch {
      if (seq === saveSeqRef.current) {
        setModules(prev);
        setErrorMsg('Failed to persist tutorial progress; rolled back to previous state.');
      }
    }
  };

  const activeModule = useMemo(
    () => modules.find(m => m.id === selectedId) || modules[0],
    [modules, selectedId]
  );

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, activeModule]);

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
    if (videoRef.current) {
      try {
        videoRef.current.currentTime = clamped;
      } catch {}
    }
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
    if (selectedQuizOption === null) {
      setErrorMsg('Please select an answer option before submitting.');
      return;
    }
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

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-[#D4AF37]">Agent Midas Video Tutorial Series</h1>
            <p className="text-sm text-zinc-400">
              10-Module Curriculum covering SDK, REST/Webhooks API, CLI Deployment, and Dashboard Operations
            </p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-lg">
            <div className="text-xs text-zinc-400">Course Completion</div>
            <div className="text-lg font-bold text-[#D4AF37]">
              {completedCount} / {modules.length} Modules
            </div>
          </div>
        </header>

        {notice && <div role="status" className="bg-emerald-950/60 border border-emerald-700 text-emerald-200 px-4 py-2 rounded text-sm">{notice}</div>}
        {errorMsg && <div role="alert" className="bg-red-950/60 border border-red-700 text-red-200 px-4 py-2 rounded text-sm">{errorMsg}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 space-y-4">
            <div className="flex flex-wrap gap-2" role="tablist">
              {(['ALL', 'SDK', 'API', 'Dashboard'] as const).map(track => (
                <button
                  key={track}
                  type="button"
                  role="tab"
                  aria-selected={trackFilter === track}
                  onClick={() => setTrackFilter(track)}
                  className={`px-3 py-1 rounded text-xs font-medium ${
                    trackFilter === track ? 'bg-[#D4AF37] text-black font-bold' : 'bg-zinc-800 text-zinc-300'
                  }`}
                >
                  {track}
                </button>
              ))}
            </div>

            <input
              type="search"
              placeholder="Search titles, transcripts, or CLI/SDK code..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-100"
            />

            <div className="space-y-2 max-h-[540px] overflow-y-auto">
              {filteredModules.map(mod => (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(mod.id);
                    setSelectedQuizOption(null);
                  }}
                  className={`w-full text-left p-3 rounded-lg border transition ${
                    activeModule?.id === mod.id ? 'bg-zinc-800 border-[#D4AF37]' : 'bg-zinc-950 border-zinc-800'
                  }`}
                >
                  <div className="flex justify-between text-xs text-[#D4AF37]">
                    <span>{mod.track}</span>
                    <span>{mod.completed ? '✅ Completed' : `${Math.round((mod.watchedSec / mod.durationSec) * 100)}%`}</span>
                  </div>
                  <div className="font-medium text-sm mt-1 text-zinc-100">{mod.title}</div>
                </button>
              ))}
            </div>
          </div>

          {activeModule && (
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-white">{activeModule.title}</h2>
                  <button
                    type="button"
                    onClick={() => toggleComplete(activeModule.id)}
                    className="px-3 py-1.5 rounded text-xs font-semibold border border-[#D4AF37] text-[#D4AF37]"
                  >
                    {activeModule.completed ? 'Mark Incomplete' : 'Mark Completed'}
                  </button>
                </div>

                {/* Real HTML5 Video Element with Chapter Scrubber */}
                <div className="bg-black border border-zinc-800 rounded-lg p-4 space-y-3">
                  <video
                    ref={videoRef}
                    src={activeModule.videoUrl}
                    controls
                    preload="metadata"
                    onTimeUpdate={e => {
                      const sec = Math.floor(e.currentTarget.currentTime);
                      if (sec > activeModule.watchedSec) {
                        jumpToTimestamp(sec);
                      }
                    }}
                    onEnded={() => jumpToTimestamp(activeModule.durationSec)}
                    className="w-full rounded bg-zinc-950 max-h-72"
                  >
                    <track kind="captions" label="English" />
                  </video>

                  <div className="flex justify-between items-center text-xs text-zinc-400">
                    <span>
                      Watched: {Math.floor(activeModule.watchedSec / 60)}m {activeModule.watchedSec % 60}s /{' '}
                      {Math.floor(activeModule.durationSec / 60)}m {activeModule.durationSec % 60}s
                    </span>
                    <div className="flex gap-1.5">
                      {[0.75, 1, 1.25, 1.5, 2].map(spd => (
                        <button
                          key={spd}
                          type="button"
                          onClick={() => setPlaybackSpeed(spd)}
                          className={`px-2 py-0.5 rounded ${
                            playbackSpeed === spd ? 'bg-[#D4AF37] text-black font-bold' : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          {spd}x
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-800">
                    {activeModule.chapters.map((ch, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => jumpToTimestamp(ch.timestampSec)}
                        className="text-xs bg-zinc-900 border border-zinc-700 px-2.5 py-1 rounded text-zinc-200"
                      >
                        ⏱ {Math.floor(ch.timestampSec / 60)}:{String(ch.timestampSec % 60).padStart(2, '0')} — {ch.title}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                    <h3 className="text-xs font-bold uppercase text-[#D4AF37] mb-2">Transcript</h3>
                    <p className="text-sm text-zinc-300">{activeModule.transcript}</p>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                    <h3 className="text-xs font-bold uppercase text-[#D4AF37] mb-2">Reference Code</h3>
                    <pre className="text-xs text-emerald-300 font-mono whitespace-pre-wrap">{activeModule.codeSample}</pre>
                  </div>
                </div>

                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-bold text-[#D4AF37]">Quiz: {activeModule.quizQuestion}</h3>
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
                    className="px-4 py-1.5 rounded bg-[#D4AF37] text-black text-xs font-bold"
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
