'use client';
import React, { useState, useMemo, useRef } from 'react';

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface InvoicePayload {
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  taxRatePct: number;
  discountAmount: number;
  items: InvoiceLineItem[];
  subtotal: number;
  taxAmount: number;
  totalDue: number;
}

export interface InvoiceGeneratorProps {
  onCreateStripeCheckout?: (invoice: InvoicePayload) => Promise<{ checkoutUrl: string; sessionId: string }>;
  stripeCheckoutEndpoint?: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export const InvoiceGenerator: React.FC<InvoiceGeneratorProps> = ({
  onCreateStripeCheckout,
  stripeCheckoutEndpoint
}) => {
  const [invoiceNumber, setInvoiceNumber] = useState('INV-2026-1048');
  const [clientName, setClientName] = useState('Apex Fintech Corp');
  const [clientEmail, setClientEmail] = useState('ap@apexfintech.io');
  const [taxRatePct, setTaxRatePct] = useState(8.5);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [items, setItems] = useState<InvoiceLineItem[]>([
    { id: 'li-1', description: 'Agent Midas Enterprise License (Q4)', quantity: 1, unitPrice: 2400 },
    { id: 'li-2', description: 'Custom Two-Up Webhook Integration', quantity: 6, unitPrice: 150 }
  ]);
  const [descInput, setDescInput] = useState('');
  const [qtyInput, setQtyInput] = useState('1');
  const [priceInput, setPriceInput] = useState('250');
  const [checkoutUrl, setCheckoutUrl] = useState<string>('');
  const [checkoutError, setCheckoutError] = useState<string>('');
  const invoiceVersionRef = useRef(0);

  const invalidateCheckout = () => {
    invoiceVersionRef.current += 1;
    setCheckoutUrl('');
    setCheckoutError('');
  };

  const totals = useMemo(() => {
    const subtotal = round2(items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0));
    const safeTaxRate = Math.max(0, Math.min(100, Number.isFinite(taxRatePct) ? taxRatePct : 0));
    const effectiveDiscount = Math.max(0, Math.min(subtotal, Number.isFinite(discountAmount) ? round2(discountAmount) : 0));
    const discountedSubtotal = round2(subtotal - effectiveDiscount);
    const taxAmount = round2(discountedSubtotal * (safeTaxRate / 100));
    const totalDue = round2(discountedSubtotal + taxAmount);
    return { subtotal, effectiveDiscount, safeTaxRate, discountedSubtotal, taxAmount, totalDue };
  }, [items, taxRatePct, discountAmount]);

  const handleAddLine = (e: React.FormEvent) => {
    e.preventDefault();
    const q = Number(qtyInput);
    const p = Number(priceInput);
    if (!descInput.trim() || Number.isNaN(q) || q <= 0 || Number.isNaN(p) || p < 0) return;
    invalidateCheckout();
    setItems(curr => [
      ...curr,
      { id: `li-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, description: descInput.trim(), quantity: q, unitPrice: round2(p) }
    ]);
    setDescInput('');
  };

  const generateNewInvoiceId = () => {
    invalidateCheckout();
    const currentYear = new Date().getUTCFullYear();
    setInvoiceNumber(`INV-${currentYear}-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  const handleCreateCheckoutSession = async () => {
    const reqVersion = invoiceVersionRef.current;
    setCheckoutError('');
    const payload: InvoicePayload = {
      invoiceNumber,
      clientName,
      clientEmail,
      taxRatePct: totals.safeTaxRate,
      discountAmount: totals.effectiveDiscount,
      items: items.map(item => ({ ...item })),
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      totalDue: totals.totalDue
    };

    if (onCreateStripeCheckout) {
      try {
        const res = await onCreateStripeCheckout(payload);
        if (reqVersion !== invoiceVersionRef.current) return;
        if (res && res.checkoutUrl) {
          setCheckoutUrl(res.checkoutUrl);
          return;
        }
      } catch {
        if (reqVersion === invoiceVersionRef.current) {
          setCheckoutError('Failed to create Stripe Checkout session via callback.');
        }
        return;
      }
    }

    if (stripeCheckoutEndpoint) {
      try {
        const resp = await fetch(stripeCheckoutEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        if (reqVersion !== invoiceVersionRef.current) return;
        if (data?.checkoutUrl) {
          setCheckoutUrl(data.checkoutUrl);
          return;
        }
      } catch {
        if (reqVersion === invoiceVersionRef.current) {
          setCheckoutError('Failed to create Stripe Checkout session from endpoint.');
        }
        return;
      }
    }

    if (reqVersion === invoiceVersionRef.current) {
      setCheckoutError('Connect onCreateStripeCheckout or stripeCheckoutEndpoint to generate a live Stripe Checkout Session link.');
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 p-6 font-sans print:bg-white print:text-black">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="print:hidden bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-[#D4AF37]">Invoice Editor & Stripe Checkout Generator</h1>
            <div className="flex gap-2">
              <button type="button" onClick={generateNewInvoiceId} className="px-3 py-1.5 rounded bg-zinc-800 text-xs text-zinc-200">
                New Invoice #
              </button>
              <button type="button" onClick={() => typeof window !== 'undefined' && window.print()} className="px-4 py-1.5 rounded bg-[#D4AF37] text-black font-bold text-xs">
                Print / Export PDF
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input aria-label="Invoice Number" value={invoiceNumber} onChange={e => { invalidateCheckout(); setInvoiceNumber(e.target.value); }} className="bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-sm text-white" />
            <input aria-label="Client Name" value={clientName} onChange={e => { invalidateCheckout(); setClientName(e.target.value); }} className="bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-sm text-white" />
            <input aria-label="Client Email" value={clientEmail} onChange={e => { invalidateCheckout(); setClientEmail(e.target.value); }} className="bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-sm text-white" />
            <input aria-label="Tax Rate (%)" type="number" min={0} max={100} step="0.1" value={taxRatePct} onChange={e => { invalidateCheckout(); setTaxRatePct(Math.max(0, Number(e.target.value))); }} className="bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-sm text-white" />
            <input aria-label="Discount ($)" type="number" min={0} step="0.01" value={discountAmount} onChange={e => { invalidateCheckout(); setDiscountAmount(Math.max(0, Number(e.target.value))); }} className="bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-sm text-white" />
          </div>

          <form onSubmit={handleAddLine} className="flex flex-wrap gap-2">
            <input aria-label="Line Item Description" value={descInput} onChange={e => setDescInput(e.target.value)} placeholder="Line Item Description" className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-sm text-white" />
            <input aria-label="Line Item Quantity" type="number" min={1} value={qtyInput} onChange={e => setQtyInput(e.target.value)} placeholder="Qty" className="w-20 bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-sm text-white" />
            <input aria-label="Line Item Unit Price" type="number" min={0} step="0.01" value={priceInput} onChange={e => setPriceInput(e.target.value)} placeholder="Unit Price" className="w-28 bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-sm text-white" />
            <button type="submit" className="bg-[#D4AF37] text-black font-bold text-xs px-4 py-1.5 rounded">+ Add Line</button>
          </form>

          <div className="flex items-center gap-3">
            <button type="button" onClick={() => void handleCreateCheckoutSession()} className="px-4 py-1.5 rounded border border-[#D4AF37] text-[#D4AF37] text-xs font-bold">
              Generate Stripe Checkout Session
            </button>
            {checkoutError && <span role="alert" className="text-xs text-amber-400">{checkoutError}</span>}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 space-y-6 print:bg-white print:text-black print:border-zinc-300">
          <div className="flex justify-between items-start border-b border-zinc-800 print:border-zinc-300 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-[#D4AF37] print:text-black">INVOICE {invoiceNumber}</h2>
              <p className="text-xs text-zinc-400 print:text-zinc-700">Billed To: {clientName} ({clientEmail})</p>
            </div>
            <div className="text-right text-sm">
              <div className="text-zinc-400 print:text-zinc-700">Total Amount Due</div>
              <div className="text-2xl font-extrabold text-[#D4AF37] print:text-black">${totals.totalDue.toFixed(2)}</div>
            </div>
          </div>

          <table className="w-full text-left text-sm print:text-black">
            <thead className="border-b border-zinc-800 print:border-zinc-300 text-zinc-400 print:text-zinc-700 text-xs uppercase">
              <tr>
                <th className="py-2">Description</th>
                <th className="py-2">Qty</th>
                <th className="py-2">Unit Price</th>
                <th className="py-2 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 print:divide-zinc-300">
              {items.map(item => (
                <tr key={item.id}>
                  <td className="py-3">{item.description}</td>
                  <td className="py-3">{item.quantity}</td>
                  <td className="py-3">${item.unitPrice.toFixed(2)}</td>
                  <td className="py-3 text-right font-mono">${round2(item.quantity * item.unitPrice).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-zinc-800 print:border-zinc-300 pt-4 space-y-1 text-sm max-w-xs ml-auto">
            <div className="flex justify-between text-zinc-400 print:text-zinc-700">
              <span>Subtotal:</span>
              <span className="font-mono">${totals.subtotal.toFixed(2)}</span>
            </div>
            {totals.effectiveDiscount > 0 && (
              <div className="flex justify-between text-emerald-400 print:text-zinc-800">
                <span>Applied Discount:</span>
                <span className="font-mono">-${totals.effectiveDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-zinc-300 print:text-zinc-800">
              <span>Calculated Tax ({totals.safeTaxRate}%):</span>
              <span className="font-mono">${totals.taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-[#D4AF37] print:text-black pt-2 border-t border-zinc-800 print:border-zinc-300">
              <span>Total Due:</span>
              <span className="font-mono">${totals.totalDue.toFixed(2)}</span>
            </div>
          </div>

          {checkoutUrl && (
            <div className="pt-4 border-t border-zinc-800 print:border-zinc-300 text-xs">
              <span className="text-zinc-400 print:text-zinc-700">Verified Stripe Checkout Session URL: </span>
              <a href={checkoutUrl} className="text-[#D4AF37] print:text-black underline font-mono">{checkoutUrl}</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceGenerator;
