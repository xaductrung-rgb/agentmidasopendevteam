'use client';
import React, { useState, useRef, useMemo } from 'react';

export type ExpenseCategory = 'Cloud Infrastructure' | 'Marketing & Ads' | 'Legal & Compliance' | 'Contractor Payroll' | 'Software Subscriptions';

export interface ExpenseRecord {
  id: string;
  vendor: string;
  category: ExpenseCategory;
  amountUsd: number;
  taxDeductible: boolean;
  incurredDate: string;
  receiptName?: string;
  status: 'Approved' | 'Pending Audit';
}

export interface ExpenseTrackerProps {
  storageKey?: string;
  monthlyBudgetUsd?: number;
  initialExpenses?: ExpenseRecord[];
  onChange?: (expenses: ExpenseRecord[]) => void | Promise<void>;
}

const CATEGORIES: ExpenseCategory[] = [
  'Cloud Infrastructure',
  'Marketing & Ads',
  'Legal & Compliance',
  'Contractor Payroll',
  'Software Subscriptions'
];

const DEFAULT_EXPENSES: ExpenseRecord[] = [
  {
    id: 'exp-101',
    vendor: 'AWS Enterprise Cluster',
    category: 'Cloud Infrastructure',
    amountUsd: 4250,
    taxDeductible: true,
    incurredDate: '2026-10-18',
    receiptName: 'aws-oct-invoice.pdf',
    status: 'Approved'
  },
  {
    id: 'exp-102',
    vendor: 'Meta Performance Ads',
    category: 'Marketing & Ads',
    amountUsd: 3100,
    taxDeductible: true,
    incurredDate: '2026-10-20',
    receiptName: 'meta-ads-receipt.pdf',
    status: 'Approved'
  }
];

function isValidExpense(item: unknown): item is ExpenseRecord {
  if (!item || typeof item !== 'object') return false;
  const e = item as Record<string, unknown>;
  return (
    typeof e.id === 'string' &&
    typeof e.vendor === 'string' &&
    CATEGORIES.includes(e.category as ExpenseCategory) &&
    typeof e.amountUsd === 'number' &&
    Number.isFinite(e.amountUsd) &&
    e.amountUsd > 0 &&
    e.amountUsd <= 10_000_000 &&
    typeof e.taxDeductible === 'boolean' &&
    typeof e.incurredDate === 'string'
  );
}

export const ExpenseTracker: React.FC<ExpenseTrackerProps> = ({
  storageKey = 'agentmidas_expenses_v1',
  monthlyBudgetUsd = 15000,
  initialExpenses = DEFAULT_EXPENSES,
  onChange
}) => {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(isValidExpense)) {
          return parsed;
        }
      }
    } catch {}
    return initialExpenses;
  });

  const expensesRef = useRef<ExpenseRecord[]>(expenses);
  expensesRef.current = expenses;
  const saveLockRef = useRef(false);

  const [vendor, setVendor] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Cloud Infrastructure');
  const [amountInput, setAmountInput] = useState('500');
  const [incurredDate, setIncurredDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [activeMonth, setActiveMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [receiptName, setReceiptName] = useState('');
  const [taxDeductible, setTaxDeductible] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [notice, setNotice] = useState('');

  const persistExpenses = async (next: ExpenseRecord[], msg: string): Promise<boolean> => {
    if (saveLockRef.current) return false;
    saveLockRef.current = true;
    setIsSaving(true);
    const prev = expensesRef.current;
    expensesRef.current = next;
    setExpenses(next);
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
      expensesRef.current = prev;
      setExpenses(prev);
      setErrorMsg('Failed to persist expense ledger; rolled back.');
      return false;
    } finally {
      saveLockRef.current = false;
      setIsSaving(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saveLockRef.current) return;
    const amt = Number(amountInput.trim());
    if (!vendor.trim() || !incurredDate.trim() || !Number.isFinite(amt) || amt <= 0 || amt > 10_000_000) {
      setErrorMsg('Vendor name, valid date, and USD amount between $0.01 and $10,000,000 are required.');
      return;
    }
    const roundedAmt = Number(amt.toFixed(2));
    if (!Number.isFinite(roundedAmt) || roundedAmt <= 0) {
      setErrorMsg('Invalid expense amount.');
      return;
    }
    const created: ExpenseRecord = {
      id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      vendor: vendor.trim(),
      category,
      amountUsd: roundedAmt,
      taxDeductible,
      incurredDate: incurredDate.trim(),
      receiptName: receiptName.trim() || undefined,
      status: 'Approved'
    };
    const ok = await persistExpenses([created, ...expensesRef.current], `Logged expense for ${created.vendor}.`);
    if (ok) {
      setVendor('');
      setAmountInput('500');
      setReceiptName('');
      setActiveMonth(created.incurredDate.slice(0, 7));
    }
  };

  const monthExpenses = useMemo(() => {
    if (!activeMonth) return expenses;
    return expenses.filter(e => e.incurredDate.startsWith(activeMonth));
  }, [expenses, activeMonth]);

  const summary = useMemo(() => {
    const totalSpend = monthExpenses.reduce((s, e) => s + e.amountUsd, 0);
    const deductibleSpend = monthExpenses.filter(e => e.taxDeductible).reduce((s, e) => s + e.amountUsd, 0);
    const remainingBudget = monthlyBudgetUsd - totalSpend;
    return { totalSpend, deductibleSpend, remainingBudget };
  }, [monthExpenses, monthlyBudgetUsd]);

  const visibleExpenses = useMemo(() => {
    if (categoryFilter === 'ALL') return monthExpenses;
    return monthExpenses.filter(e => e.category === categoryFilter);
  }, [monthExpenses, categoryFilter]);

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="border-b border-zinc-800 pb-4 flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#D4AF37]">Corporate Expense & Budget Variance Tracker</h1>
            <p className="text-sm text-zinc-400">Categorize monthly operational spend, receipts, and tax-deductible items</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <label className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-3 py-2 rounded">
              <span className="text-zinc-400">Budget Month:</span>
              <input
                aria-label="Budget Month Filter"
                type="month"
                value={activeMonth}
                onChange={e => setActiveMonth(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded px-2 py-0.5 text-white"
              />
            </label>
            <div className="bg-zinc-900 border border-zinc-800 px-3 py-2 rounded">
              <div className="text-zinc-400">Month Spend</div>
              <div className="text-base font-bold text-white">${summary.totalSpend.toLocaleString()}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 px-3 py-2 rounded">
              <div className="text-zinc-400">Tax Deductible</div>
              <div className="text-base font-bold text-[#D4AF37]">${summary.deductibleSpend.toLocaleString()}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 px-3 py-2 rounded">
              <div className="text-zinc-400">Remaining Budget</div>
              <div className={`text-base font-bold ${summary.remainingBudget >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                ${summary.remainingBudget.toLocaleString()}
              </div>
            </div>
          </div>
        </header>

        {notice && <div role="status" className="bg-emerald-950/60 border border-emerald-700 text-emerald-200 px-4 py-2 rounded text-sm">{notice}</div>}
        {errorMsg && <div role="alert" className="bg-red-950/60 border border-red-700 text-red-200 px-4 py-2 rounded text-sm">{errorMsg}</div>}

        <form onSubmit={handleAddExpense} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-7 gap-3 items-center">
          <input aria-label="Vendor Name" value={vendor} onChange={e => setVendor(e.target.value)} disabled={isSaving} placeholder="Vendor Name" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
          <select aria-label="Expense Category" value={category} onChange={e => setCategory(e.target.value as ExpenseCategory)} disabled={isSaving} className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input aria-label="Amount USD" type="number" min={0.01} max={10000000} step="0.01" value={amountInput} onChange={e => setAmountInput(e.target.value)} disabled={isSaving} placeholder="Amount ($)" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
          <input aria-label="Incurred Date" type="date" value={incurredDate} onChange={e => setIncurredDate(e.target.value)} disabled={isSaving} className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
          <input
            aria-label="Receipt File Upload"
            type="file"
            accept="image/*,.pdf"
            disabled={isSaving}
            onChange={e => setReceiptName(e.target.files?.[0]?.name || '')}
            className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-300"
          />
          <label className="flex items-center gap-2 text-xs text-zinc-300">
            <input type="checkbox" checked={taxDeductible} onChange={e => setTaxDeductible(e.target.checked)} disabled={isSaving} />
            Tax Deductible
          </label>
          <button type="submit" disabled={isSaving} className="bg-[#D4AF37] text-black font-bold text-xs rounded px-4 py-2">
            + Log Expense
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          {(['ALL', ...CATEGORIES] as const).map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded text-xs font-bold ${categoryFilter === cat ? 'bg-[#D4AF37] text-black' : 'bg-zinc-900 text-zinc-300 border border-zinc-800'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {visibleExpenses.map(exp => (
            <div key={exp.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex justify-between items-center">
              <div>
                <div className="font-bold text-sm text-white">{exp.vendor}</div>
                <div className="text-xs text-zinc-400">
                  {exp.category} · {exp.incurredDate} · {exp.taxDeductible ? 'Tax-Deductible' : 'Non-Deductible'}
                  {exp.receiptName ? ` · Receipt: ${exp.receiptName}` : ''}
                </div>
              </div>
              <div className="text-sm font-mono font-bold text-[#D4AF37]">${exp.amountUsd.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExpenseTracker;
