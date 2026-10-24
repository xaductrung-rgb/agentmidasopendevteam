'use client';

import React, { useEffect, useMemo, useState } from 'react';

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

const DEFAULT_LINES: InvoiceLineItem[] = [
  { id: 'li-1', description: 'Agent Midas Enterprise OS License', quantity: 1, unitPrice: 599 },
  { id: 'li-2', description: 'Custom Autonomous Workflow Integration', quantity: 5, unitPrice: 250 },
];

const STORAGE_KEY = 'agentmidas_invoice_lines_v2';

export function InvoiceGenerator() {
  const [clientName, setClientName] = useState<string>('Nakamoto Institutional Partners');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('INV-2026-1084');
  const [taxRatePct, setTaxRatePct] = useState<number>(8.5);
  const [lines, setLines] = useState<InvoiceLineItem[]>(DEFAULT_LINES);
  const [desc, setDesc] = useState<string>('');
  const [qty, setQty] = useState<string>('1');
  const [price, setPrice] = useState<string>('200');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as InvoiceLineItem[];
        if (Array.isArray(parsed) && parsed.length > 0) setLines(parsed);
      }
    } catch {}
  }, []);

  const addLineItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!desc.trim()) return;
    const item: InvoiceLineItem = {
      id: `li-${Date.now().toString().slice(-4)}`,
      description: desc.trim(),
      quantity: Math.max(1, Number(qty) || 1),
      unitPrice: Math.max(0, Number(price) || 0),
    };
    const next = [...lines, item];
    setLines(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
    setDesc('');
  };

  const totals = useMemo(() => {
    const subtotal = lines.reduce((acc, l) => acc + l.quantity * l.unitPrice, 0);
    const tax = subtotal * (taxRatePct / 100);
    const total = subtotal + tax;
    const stripeCheckoutUrl = `https://checkout.stripe.com/pay/${encodeURIComponent(invoiceNumber)}?amount=${Math.round(total * 100)}`;
    return { subtotal, tax, total, stripeCheckoutUrl };
  }, [lines, taxRatePct, invoiceNumber]);

  return (
    <section aria-label="Invoice Generator" className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto bg-[#0D0D0D] border border-[#262626] rounded-2xl p-6 space-y-6">
        <header className="flex flex-wrap justify-between items-start gap-4 border-b border-[#262626] pb-4">
          <div>
            <h1 className="text-2xl font-bold text-[#D4AF37]">Invoice Generator</h1>
            <p className="text-xs text-[#A3A3A3]">Invoice #{invoiceNumber} • Billed To: {clientName}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-2 rounded-lg bg-[#1F1F1F] border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-bold"
            >
              Export / Print PDF
            </button>
            <a
              href={totals.stripeCheckoutUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 rounded-lg bg-[#D4AF37] text-[#0A0A0A] text-xs font-bold"
            >
              Pay ${totals.total.toFixed(2)} via Stripe
            </a>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="inv-client" className="block text-xs text-[#A3A3A3] mb-1">Client Name</label>
            <input id="inv-client" type="text" value={clientName} onChange={e => setClientName(e.target.value)} className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label htmlFor="inv-tax" className="block text-xs text-[#A3A3A3] mb-1">Tax Rate (%)</label>
            <input id="inv-tax" type="number" step="0.1" value={taxRatePct} onChange={e => setTaxRatePct(Number(e.target.value) || 0)} className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3 py-1.5 text-sm" />
          </div>
        </div>

        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-[#262626] text-[#A3A3A3]">
              <th className="py-2">Description</th>
              <th className="py-2">Qty</th>
              <th className="py-2">Unit Price</th>
              <th className="py-2 text-right">Line Total</th>
            </tr>
          </thead>
          <tbody>
            {lines.map(l => (
              <tr key={l.id} className="border-b border-[#1A1A1A]">
                <td className="py-3">{l.description}</td>
                <td className="py-3 font-mono">{l.quantity}</td>
                <td className="py-3 font-mono">${l.unitPrice.toFixed(2)}</td>
                <td className="py-3 font-mono text-right">${(l.quantity * l.unitPrice).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <form onSubmit={addLineItem} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end border-t border-[#262626] pt-4">
          <div className="sm:col-span-2">
            <label htmlFor="inv-desc" className="block text-xs text-[#A3A3A3] mb-1">Line Item Description</label>
            <input id="inv-desc" type="text" required value={desc} onChange={e => setDesc(e.target.value)} className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label htmlFor="inv-qty" className="block text-xs text-[#A3A3A3] mb-1">Qty</label>
            <input id="inv-qty" type="number" value={qty} onChange={e => setQty(e.target.value)} className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label htmlFor="inv-price" className="block text-xs text-[#A3A3A3] mb-1">Unit Price ($)</label>
            <input id="inv-price" type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3 py-1.5 text-sm" />
          </div>
          <button type="submit" className="sm:col-span-4 py-2 rounded bg-[#D4AF37] text-[#0A0A0A] font-bold text-xs">
            + Add Line Item
          </button>
        </form>
      </div>
    </section>
  );
}

export default InvoiceGenerator;
