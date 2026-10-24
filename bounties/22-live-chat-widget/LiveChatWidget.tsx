'use client';

import React, { useEffect, useState } from 'react';

export interface ChatMessage {
  id: string;
  sender: 'Visitor' | 'Agent';
  agentName: string;
  text: string;
  timestamp: string;
}

const CANNED_RESPONSES: string[] = [
  'Welcome to Agent Midas! How can we help scale your workflow today?',
  'Your request has been routed to our Tier-2 Billing & Stripe specialist.',
  'All 75% affiliate pass-up commissions settle automatically via Stripe.',
];

const AGENTS = ['Sarah (Billing Queue)', 'Devon (Technical Support)', 'Midas AI Concierge'];
const STORAGE_KEY = 'agentmidas_live_chat_v2';

export function LiveChatWidget() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'm-1', sender: 'Agent', agentName: AGENTS[0], text: CANNED_RESPONSES[0], timestamp: '09:00' },
  ]);
  const [selectedAgent, setSelectedAgent] = useState<string>(AGENTS[0]);
  const [draft, setDraft] = useState<string>('');
  const [senderRole, setSenderRole] = useState<'Visitor' | 'Agent'>('Visitor');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
      }
    } catch {}
  }, []);

  const appendMessage = (text: string, role: 'Visitor' | 'Agent') => {
    if (!text.trim()) return;
    const msg: ChatMessage = {
      id: `msg-${Date.now().toString().slice(-5)}`,
      sender: role,
      agentName: role === 'Agent' ? selectedAgent : 'Visitor',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    const next = [...messages, msg];
    setMessages(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };

  const handleSend = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    appendMessage(draft, senderRole);
    setDraft('');
  };

  return (
    <section aria-label="Live Chat Widget" className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto bg-[#0D0D0D] border border-[#262626] rounded-2xl overflow-hidden shadow-xl">
        <header className="p-4 bg-[#141414] border-b border-[#262626] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#D4AF37]">Agent Midas Live Chat</h1>
            <p className="text-xs text-[#22C55E]">● Online • Routed to: {selectedAgent}</p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="chat-agent-route" className="text-xs text-[#A3A3A3]">Route Agent:</label>
            <select
              id="chat-agent-route"
              value={selectedAgent}
              onChange={e => setSelectedAgent(e.target.value)}
              className="bg-[#0A0A0A] border border-[#262626] rounded px-2.5 py-1.5 text-xs text-[#F5F5F5]"
            >
              {AGENTS.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </header>

        <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
          {messages.map(m => (
            <div
              key={m.id}
              className={`p-3 rounded-xl max-w-md ${
                m.sender === 'Visitor'
                  ? 'ml-auto bg-[#D4AF37] text-[#0A0A0A]'
                  : 'mr-auto bg-[#171717] border border-[#262626] text-[#F5F5F5]'
              }`}
            >
              <p className="text-xs font-bold opacity-80">{m.agentName} • {m.timestamp}</p>
              <p className="text-sm mt-1">{m.text}</p>
            </div>
          ))}
        </div>

        <div className="p-3 bg-[#121212] border-t border-[#262626] space-y-2">
          <p className="text-xs text-[#A3A3A3]">One-Click Canned Responses (Agent):</p>
          <div className="flex flex-wrap gap-2">
            {CANNED_RESPONSES.map((resp, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => appendMessage(resp, 'Agent')}
                className="text-xs px-2.5 py-1 rounded bg-[#1F1F1F] border border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#262626]"
              >
                + &ldquo;{resp.slice(0, 38)}...&rdquo;
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSend} className="p-4 border-t border-[#262626] flex flex-wrap gap-2 items-center">
          <label htmlFor="chat-role" className="sr-only">Sender Role</label>
          <select
            id="chat-role"
            value={senderRole}
            onChange={e => setSenderRole(e.target.value as 'Visitor' | 'Agent')}
            className="bg-[#0A0A0A] border border-[#262626] rounded-lg px-3 py-2 text-xs text-[#F5F5F5]"
          >
            <option value="Visitor">Send as Visitor</option>
            <option value="Agent">Send as Agent</option>
          </select>
          <label htmlFor="chat-input" className="sr-only">Message text</label>
          <input
            id="chat-input"
            type="text"
            required
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-[#0A0A0A] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#F5F5F5]"
          />
          <button type="submit" className="px-4 py-2 rounded-lg bg-[#D4AF37] text-[#0A0A0A] font-bold text-sm">
            Send
          </button>
        </form>
      </div>
    </section>
  );
}

export default LiveChatWidget;
