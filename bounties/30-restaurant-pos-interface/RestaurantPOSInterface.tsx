'use client';

import React, { useMemo, useState } from 'react';

export interface MenuItem {
  id: string;
  name: string;
  category: 'Starters' | 'Mains' | 'Beverages' | 'Desserts';
  price: number;
}

const MENU: MenuItem[] = [
  { id: 'm-1', name: 'Wagyu Truffle Sliders', category: 'Starters', price: 24 },
  { id: 'm-2', name: 'Crispy Calamari & Yuzu Aioli', category: 'Starters', price: 18 },
  { id: 'm-3', name: 'Dry-Aged Ribeye (14oz)', category: 'Mains', price: 62 },
  { id: 'm-4', name: 'Miso Glazed Black Cod', category: 'Mains', price: 44 },
  { id: 'm-5', name: 'Smoked Old Fashioned', category: 'Beverages', price: 19 },
  { id: 'm-6', name: '24K Gold Espresso Martini', category: 'Beverages', price: 22 },
  { id: 'm-7', name: 'Valrhona Molten Lava Cake', category: 'Desserts', price: 16 },
];

export function RestaurantPOSInterface() {
  const [category, setCategory] = useState<string>('ALL');
  const [tableNumber, setTableNumber] = useState<string>('Table 04');
  const [cart, setCart] = useState<Record<string, number>>({ 'm-1': 1, 'm-3': 1 });

  const visibleMenu = useMemo(() => {
    return MENU.filter(item => category === 'ALL' || item.category === category);
  }, [category]);

  const orderSummary = useMemo(() => {
    const lines = Object.entries(cart)
      .map(([id, qty]) => {
        const item = MENU.find(m => m.id === id);
        return item && qty > 0 ? { item, qty, lineTotal: item.price * qty } : null;
      })
      .filter((x): x is { item: MenuItem; qty: number; lineTotal: number } => Boolean(x));
    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
    const tax = subtotal * 0.085;
    const total = subtotal + tax;
    return { lines, subtotal, tax, total };
  }, [cart]);

  function addItem(id: string) {
    setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  }

  function clearTicket() {
    setCart({});
  }

  return (
    <section className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] py-10 px-6 font-sans">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2A2A2A] pb-4">
            <div>
              <span className="text-xs uppercase tracking-widest text-[#D4AF37] font-mono">Agent Midas • Hospitality POS</span>
              <h1 className="text-2xl font-bold mt-1">Touchscreen Restaurant Point-of-Sale</h1>
            </div>
            <select
              value={tableNumber}
              onChange={e => setTableNumber(e.target.value)}
              className="bg-[#141414] border border-[#D4AF37] rounded-lg px-3 py-2 text-sm font-mono text-[#E8C547]"
            >
              <option value="Table 01">Table 01 (Patio)</option>
              <option value="Table 04">Table 04 (VIP Booth)</option>
              <option value="Table 09">Table 09 (Main Dining)</option>
              <option value="Bar Tab">Bar Counter</option>
            </select>
          </header>

          <div className="flex gap-2 flex-wrap">
            {['ALL', 'Starters', 'Mains', 'Beverages', 'Desserts'].map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold border ${category === cat ? 'bg-[#D4AF37] text-[#0A0A0A] border-[#D4AF37]' : 'bg-[#141414] text-[#9CA3AF] border-[#2A2A2A]'}`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {visibleMenu.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => addItem(item.id)}
                className="text-left bg-[#0D0D0D] hover:bg-[#141414] border border-[#2A2A2A] hover:border-[#D4AF37] rounded-xl p-5 flex items-center justify-between transition"
              >
                <div>
                  <p className="text-xs text-[#9CA3AF]">{item.category}</p>
                  <p className="font-semibold text-base mt-0.5">{item.name}</p>
                </div>
                <span className="font-mono text-lg font-bold text-[#D4AF37]">${item.price}</span>
              </button>
            ))}
          </div>
        </div>

        <aside className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-3">
              <h2 className="font-bold text-lg text-[#D4AF37]">Active Ticket • {tableNumber}</h2>
              <button type="button" onClick={clearTicket} className="text-xs text-[#9CA3AF] hover:text-[#F5F5F5]">Clear</button>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {orderSummary.lines.map(({ item, qty, lineTotal }) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span>{qty}x {item.name}</span>
                  <span className="font-mono text-[#E8C547]">${lineTotal.toFixed(2)}</span>
                </div>
              ))}
              {orderSummary.lines.length === 0 && (
                <p className="text-xs text-[#6B7280] py-8 text-center">Tap any menu item to add to ticket.</p>
              )}
            </div>
          </div>

          <div className="border-t border-[#2A2A2A] pt-4 space-y-2 text-sm">
            <div className="flex justify-between text-[#9CA3AF]">
              <span>Subtotal</span>
              <span className="font-mono">${orderSummary.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[#9CA3AF]">
              <span>Tax (8.5%)</span>
              <span className="font-mono">${orderSummary.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-[#D4AF37] pt-2">
              <span>Total Due</span>
              <span className="font-mono">${orderSummary.total.toFixed(2)}</span>
            </div>
            <button
              type="button"
              onClick={clearTicket}
              className="w-full mt-4 py-3 rounded-lg bg-[#D4AF37] text-[#0A0A0A] font-bold text-sm hover:bg-[#E8C547]"
            >
              Fire to Kitchen & Settle (${orderSummary.total.toFixed(2)})
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default RestaurantPOSInterface;
