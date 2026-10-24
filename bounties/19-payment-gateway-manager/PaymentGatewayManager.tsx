'use client';
import React, { useState, useEffect, useRef } from 'react';

export interface GatewayNode {
  id: string;
  name: string;
  priority: number;
  healthy: boolean;
  feePct: number;
}

export interface GatewayTransaction {
  id: string;
  customerEmail: string;
  amount: number;
  routedGateway: string;
  attempts: number;
  mode: 'live_gateway' | 'sandbox_simulation';
  status: 'succeeded' | 'simulated' | 'failed';
  createdAtIso: string;
}

export interface PaymentGatewayManagerProps {
  storageKey?: string;
  gatewayEndpoint?: string;
  onExecutePayment?: (payload: {
    gatewayId: string;
    customerEmail: string;
    amount: number;
  }) => Promise<{ status: 'succeeded' | 'failed'; transactionId?: string }>;
  onChange?: (txs: GatewayTransaction[]) => void | Promise<void>;
}

const DEFAULT_GATEWAYS: GatewayNode[] = [
  { id: 'gw-stripe', name: 'Stripe Primary', priority: 1, healthy: true, feePct: 2.9 },
  { id: 'gw-adyen', name: 'Adyen Fallback', priority: 2, healthy: true, feePct: 2.7 },
  { id: 'gw-braintree', name: 'Braintree Backup', priority: 3, healthy: true, feePct: 3.1 }
];

function isValidTx(tx: any): tx is GatewayTransaction {
  return (
    tx &&
    typeof tx === 'object' &&
    typeof tx.id === 'string' &&
    typeof tx.customerEmail === 'string' &&
    typeof tx.amount === 'number' &&
    Number.isFinite(tx.amount) &&
    typeof tx.routedGateway === 'string' &&
    typeof tx.attempts === 'number' &&
    typeof tx.status === 'string' &&
    typeof tx.mode === 'string'
  );
}

function isValidGateway(g: any): g is GatewayNode {
  return (
    g &&
    typeof g === 'object' &&
    typeof g.id === 'string' &&
    typeof g.name === 'string' &&
    typeof g.priority === 'number' &&
    typeof g.healthy === 'boolean' &&
    typeof g.feePct === 'number'
  );
}

export const PaymentGatewayManager: React.FC<PaymentGatewayManagerProps> = ({
  storageKey = 'agentmidas_gateway_txs_v2',
  gatewayEndpoint,
  onExecutePayment,
  onChange
}) => {
  const gatewayStorageKey = `${storageKey}_gateways`;

  const [gateways, setGateways] = useState<GatewayNode[]>(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(gatewayStorageKey) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter(isValidGateway);
          if (valid.length > 0) return valid;
        }
      }
    } catch {}
    return DEFAULT_GATEWAYS;
  });

  const [transactions, setTransactions] = useState<GatewayTransaction[]>(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.filter(isValidTx);
      }
    } catch {}
    return [];
  });

  const txsRef = useRef<GatewayTransaction[]>(transactions);
  txsRef.current = transactions;

  const [customerEmail, setCustomerEmail] = useState('billing@enterprise.io');
  const [amount, setAmount] = useState('450.00');
  const [statusNotice, setStatusNotice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorage = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setTransactions(parsed.filter(isValidTx));
        } catch {}
      } else if (e.key === gatewayStorageKey && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            const valid = parsed.filter(isValidGateway);
            if (valid.length > 0) setGateways(valid);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [storageKey, gatewayStorageKey]);

  const appendTransactionAtomically = async (tx: GatewayTransaction) => {
    const prev = txsRef.current;
    const merged = [tx, ...prev.filter(item => item.id !== tx.id)];
    txsRef.current = merged;
    setTransactions(merged);
    try {
      if (onChange) {
        await onChange(merged);
      }
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, JSON.stringify(merged));
      }
    } catch {
      txsRef.current = prev;
      setTransactions(prev);
      setErrorMsg('Failed to persist transaction log to storage.');
    }
  };

  const toggleGatewayHealth = (id: string) => {
    const next = gateways.map(g => (g.id === id ? { ...g, healthy: !g.healthy } : g));
    setGateways(next);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(gatewayStorageKey, JSON.stringify(next));
      }
    } catch {}
  };

  const handleRoutePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setStatusNotice('');
    const parsedAmount = Math.round(Number(amount) * 100) / 100;
    if (!customerEmail.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Valid customer email and positive amount are required.');
      return;
    }

    const ordered = [...gateways].sort((a, b) => a.priority - b.priority);
    const healthyCandidates = ordered.filter(g => g.healthy);
    if (healthyCandidates.length === 0) {
      const failedTx: GatewayTransaction = {
        id: `fail-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        customerEmail: customerEmail.trim(),
        amount: parsedAmount,
        routedGateway: 'None (All Outage)',
        attempts: ordered.length,
        mode: onExecutePayment || gatewayEndpoint ? 'live_gateway' : 'sandbox_simulation',
        status: 'failed',
        createdAtIso: new Date().toISOString()
      };
      await appendTransactionAtomically(failedTx);
      setErrorMsg('All payment gateways are currently unhealthy; failover exhausted and logged.');
      return;
    }

    let attempts = 0;
    for (const candidate of ordered) {
      attempts += 1;
      if (!candidate.healthy) continue;

      if (onExecutePayment) {
        try {
          const res = await onExecutePayment({
            gatewayId: candidate.id,
            customerEmail: customerEmail.trim(),
            amount: parsedAmount
          });
          if (res.status === 'succeeded') {
            const tx: GatewayTransaction = {
              id: res.transactionId || `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              customerEmail: customerEmail.trim(),
              amount: parsedAmount,
              routedGateway: candidate.name,
              attempts,
              mode: 'live_gateway',
              status: 'succeeded',
              createdAtIso: new Date().toISOString()
            };
            await appendTransactionAtomically(tx);
            setStatusNotice(`Live payment succeeded via ${candidate.name} after ${attempts} attempt(s).`);
            return;
          }
        } catch {
          continue;
        }
      } else if (gatewayEndpoint) {
        try {
          const resp = await fetch(gatewayEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gatewayId: candidate.id, customerEmail: customerEmail.trim(), amount: parsedAmount })
          });
          if (resp.ok) {
            const tx: GatewayTransaction = {
              id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              customerEmail: customerEmail.trim(),
              amount: parsedAmount,
              routedGateway: candidate.name,
              attempts,
              mode: 'live_gateway',
              status: 'succeeded',
              createdAtIso: new Date().toISOString()
            };
            await appendTransactionAtomically(tx);
            setStatusNotice(`Live gateway endpoint charge succeeded via ${candidate.name}.`);
            return;
          }
        } catch {
          continue;
        }
      } else {
        const tx: GatewayTransaction = {
          id: `sim-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          customerEmail: customerEmail.trim(),
          amount: parsedAmount,
          routedGateway: candidate.name,
          attempts,
          mode: 'sandbox_simulation',
          status: 'simulated',
          createdAtIso: new Date().toISOString()
        };
        await appendTransactionAtomically(tx);
        setStatusNotice(
          `Sandbox Routing Simulation: selected ${candidate.name} (attempt #${attempts}).`
        );
        return;
      }
    }

    const exhaustedTx: GatewayTransaction = {
      id: `fail-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      customerEmail: customerEmail.trim(),
      amount: parsedAmount,
      routedGateway: 'Exhausted',
      attempts,
      mode: 'live_gateway',
      status: 'failed',
      createdAtIso: new Date().toISOString()
    };
    await appendTransactionAtomically(exhaustedTx);
    setErrorMsg('All healthy gateways rejected the payment request; failure logged.');
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="border-b border-zinc-800 pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-[#D4AF37]">Multi-Gateway Payment Failover & Routing Manager</h1>
          </div>
        </header>

        {statusNotice && <div role="status" className="bg-emerald-950/60 border border-emerald-700 text-emerald-200 px-4 py-2 rounded text-sm">{statusNotice}</div>}
        {errorMsg && <div role="alert" className="bg-red-950/60 border border-red-700 text-red-200 px-4 py-2 rounded text-sm">{errorMsg}</div>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {gateways.map(g => (
            <div key={g.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex justify-between items-center">
              <div>
                <div className="text-xs text-zinc-400">Priority #{g.priority} · Fee {g.feePct}%</div>
                <div className="font-bold text-white">{g.name}</div>
              </div>
              <button
                type="button"
                onClick={() => toggleGatewayHealth(g.id)}
                className={`px-3 py-1 rounded text-xs font-bold ${
                  g.healthy ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-red-950 text-red-300 border border-red-700'
                }`}
              >
                {g.healthy ? 'Healthy' : 'Outage'}
              </button>
            </div>
          ))}
        </div>

        <form onSubmit={handleRoutePayment} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-wrap gap-3">
          <input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="Customer Email" className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
          <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount ($)" className="w-40 bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
          <button type="submit" className="bg-[#D4AF37] text-black font-bold text-sm px-5 py-2 rounded">
            {onExecutePayment || gatewayEndpoint ? 'Execute Live Gateway Charge' : 'Simulate Failover Routing'}
          </button>
        </form>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
          <h2 className="text-sm font-bold text-[#D4AF37]">Routing Audit Log ({transactions.length})</h2>
          {transactions.map(tx => (
            <div key={tx.id} className="bg-zinc-950 border border-zinc-800 rounded p-3 flex justify-between text-xs">
              <span>
                <strong className="text-[#D4AF37]">{tx.id}</strong> · {tx.customerEmail} · ${tx.amount.toFixed(2)}
              </span>
              <span>
                {tx.routedGateway} ({tx.attempts} attempt{tx.attempts > 1 ? 's' : ''}) ·{' '}
                <strong className={tx.status === 'succeeded' ? 'text-emerald-400' : tx.status === 'failed' ? 'text-red-400' : 'text-amber-300'}>
                  {tx.status.toUpperCase()} ({tx.mode})
                </strong>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PaymentGatewayManager;
