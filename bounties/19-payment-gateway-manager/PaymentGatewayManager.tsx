'use client';

import React, { useEffect, useState } from 'react';

export interface PaymentGateway {
  id: string;
  name: string;
  priority: number;
  status: 'Healthy' | 'Degraded' | 'Offline';
  successRate: number;
  maxRetries: number;
  baseBackoffMs: number;
}

export interface PaymentTransaction {
  id: string;
  amount: number;
  gatewayUsed: string;
  attempts: number;
  backoffDelayMs: number;
  status: 'Succeeded' | 'Retried & Succeeded' | 'Failed';
  timestamp: string;
}

const DEFAULT_GATEWAYS: PaymentGateway[] = [
  { id: 'gw-stripe', name: 'Stripe Primary', priority: 1, status: 'Healthy', successRate: 99.4, maxRetries: 3, baseBackoffMs: 500 },
  { id: 'gw-adyen', name: 'Adyen Global Failover', priority: 2, status: 'Healthy', successRate: 98.9, maxRetries: 3, baseBackoffMs: 750 },
  { id: 'gw-braintree', name: 'Braintree Backup', priority: 3, status: 'Degraded', successRate: 94.2, maxRetries: 4, baseBackoffMs: 1000 },
];

const GW_STORAGE_KEY = 'agentmidas_payment_gateways_v2';
const TX_STORAGE_KEY = 'agentmidas_payment_txs_v2';

export function PaymentGatewayManager() {
  const [gateways, setGateways] = useState<PaymentGateway[]>(DEFAULT_GATEWAYS);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [chargeAmount, setChargeAmount] = useState<string>('249.00');
  const [simulateFailureOnPrimary, setSimulateFailureOnPrimary] = useState<boolean>(false);

  useEffect(() => {
    try {
      const savedGw = window.localStorage.getItem(GW_STORAGE_KEY);
      if (savedGw) setGateways(JSON.parse(savedGw));
      const savedTx = window.localStorage.getItem(TX_STORAGE_KEY);
      if (savedTx) setTransactions(JSON.parse(savedTx));
    } catch {}
  }, []);

  const toggleGatewayStatus = (id: string) => {
    const order: PaymentGateway['status'][] = ['Healthy', 'Degraded', 'Offline'];
    const next = gateways.map(g =>
      g.id === id ? { ...g, status: order[(order.indexOf(g.status) + 1) % order.length] } : g
    );
    setGateways(next);
    try {
      window.localStorage.setItem(GW_STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };

  const processChargeWithRetry = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const amount = Math.max(1, Number(chargeAmount) || 100);
    const activeGateways = [...gateways]
      .filter(g => g.status !== 'Offline')
      .sort((a, b) => a.priority - b.priority);

    if (activeGateways.length === 0) return;

    const primary = activeGateways[0];
    const fallback = activeGateways[1] ?? primary;

    let attempts = 1;
    let chosenGateway = primary.name;
    let backoffDelayMs = 0;
    let txStatus: PaymentTransaction['status'] = 'Succeeded';

    if (simulateFailureOnPrimary || primary.status === 'Degraded') {
      attempts = 2;
      backoffDelayMs = primary.baseBackoffMs * Math.pow(2, attempts - 1);
      chosenGateway = `${fallback.name} (Failover from ${primary.name})`;
      txStatus = 'Retried & Succeeded';
    }

    const tx: PaymentTransaction = {
      id: `TX-${Date.now().toString().slice(-5)}`,
      amount,
      gatewayUsed: chosenGateway,
      attempts,
      backoffDelayMs,
      status: txStatus,
      timestamp: new Date().toLocaleTimeString(),
    };
    const nextTxs = [tx, ...transactions];
    setTransactions(nextTxs);
    try {
      window.localStorage.setItem(TX_STORAGE_KEY, JSON.stringify(nextTxs));
    } catch {}
  };

  return (
    <section aria-label="Payment Gateway Manager" className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="border-b border-[#262626] pb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-[#D4AF37]">Payment Gateway Manager</h1>
          <p className="text-sm text-[#A3A3A3]">Multi-Gateway Routing, Exponential Backoff Retry & Automatic Failover</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {gateways.map(gw => (
            <div key={gw.id} className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono text-[#D4AF37]">Priority #{gw.priority}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-[#1F1F1F]">{gw.status}</span>
              </div>
              <h2 className="text-lg font-bold">{gw.name}</h2>
              <p className="text-xs text-[#A3A3A3]">
                Auth Rate: {gw.successRate}% • Max Retries: {gw.maxRetries} • Base Backoff: {gw.baseBackoffMs}ms
              </p>
              <button
                type="button"
                onClick={() => toggleGatewayStatus(gw.id)}
                className="w-full py-1.5 rounded bg-[#1F1F1F] border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-semibold"
              >
                Cycle Health State
              </button>
            </div>
          ))}
        </div>

        <form onSubmit={processChargeWithRetry} className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-5 flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="pg-amount" className="block text-xs text-[#A3A3A3] mb-1">Charge Amount (USD)</label>
            <input
              id="pg-amount"
              type="number"
              step="0.01"
              required
              value={chargeAmount}
              onChange={e => setChargeAmount(e.target.value)}
              className="bg-[#0A0A0A] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#F5F5F5]"
            />
          </div>
          <label htmlFor="pg-sim-fail" className="flex items-center gap-2 text-xs text-[#A3A3A3] py-2 cursor-pointer">
            <input
              id="pg-sim-fail"
              type="checkbox"
              checked={simulateFailureOnPrimary}
              onChange={e => setSimulateFailureOnPrimary(e.target.checked)}
              className="accent-[#D4AF37]"
            />
            Simulate Primary Timeout (Trigger Exponential Backoff + Failover)
          </label>
          <button type="submit" className="px-4 py-2 rounded-lg bg-[#D4AF37] text-[#0A0A0A] font-bold text-sm">
            Execute Charge
          </button>
        </form>

        <div className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-5">
          <h2 className="text-lg font-semibold text-[#D4AF37] mb-3">Transaction & Retry Audit Log ({transactions.length})</h2>
          <div className="space-y-2 text-sm">
            {transactions.map(tx => (
              <div key={tx.id} className="flex flex-wrap justify-between items-center p-3 rounded bg-[#141414] border border-[#262626]">
                <div>
                  <span className="font-mono text-[#D4AF37] mr-2">{tx.id}</span>
                  <span className="font-semibold">${tx.amount.toFixed(2)}</span>
                  <span className="text-xs text-[#A3A3A3] ml-2">via {tx.gatewayUsed}</span>
                </div>
                <div className="text-xs text-[#22C55E]">
                  {tx.status} ({tx.attempts} attempt{tx.attempts > 1 ? 's' : ''}, {tx.backoffDelayMs}ms backoff) • {tx.timestamp}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default PaymentGatewayManager;
