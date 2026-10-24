'use client';

import React, { useEffect, useMemo, useState } from 'react';

export interface MenuItem {
  id: string;
  name: string;
  category: 'Starters' | 'Mains' | 'Beverages';
  price: number;
}

export interface OrderLine {
  item: MenuItem;
  qty: number;
}

export interface SettledKitchenOrder {
  orderId: string;
  tableNumber: number;
  itemsCount: number;
  total: number;
  firedAt: string;
}

const DEFAULT_MENU: MenuItem[] = [
  { id: 'm1', name: 'Wagyu Truffle Sliders', category: 'Starters', price: 24 },
  { id: 'm2', name: 'Crispy Calamari', category: 'Starters', price: 18 },
  { id: 'm3', name: 'Dry-Aged Ribeye (14oz)', category: 'Mains', price: 64 },
  { id: 'm4', name: 'Pan-Seared Chilean Sea Bass', category: 'Mains', price: 48 },
  { id: 'm5', name: 'Smoked Old Fashioned', category: 'Beverages', price: 19 },
];

const MENU_STORAGE_KEY = 'agentmidas_pos_menu_v2';
const ORDERS_STORAGE_KEY = 'agentmidas_pos_orders_v2';

export function RestaurantPOSInterface() {
  const [menu, setMenu] = useState<MenuItem[]>(DEFAULT_MENU);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [tableNumber, setTableNumber] = useState<number>(12);
  const [ticket, setTicket] = useState<OrderLine[]>([]);
  const [settledOrders, setSettledOrders] = useState<SettledKitchenOrder[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formCategory, setFormCategory] = useState<MenuItem['category']>('Mains');
  const [formPrice, setFormPrice] = useState<string>('32');

  useEffect(() => {
    try {
      const savedMenu = window.localStorage.getItem(MENU_STORAGE_KEY);
      if (savedMenu) {
        const parsed = JSON.parse(savedMenu) as MenuItem[];
        if (Array.isArray(parsed) && parsed.length > 0) setMenu(parsed);
      }
      const savedOrders = window.localStorage.getItem(ORDERS_STORAGE_KEY);
      if (savedOrders) {
        const parsedOrders = JSON.parse(savedOrders) as SettledKitchenOrder[];
        if (Array.isArray(parsedOrders)) setSettledOrders(parsedOrders);
      }
    } catch {}
  }, []);

  const persistMenu = (next: MenuItem[]) => {
    setMenu(next);
    try {
      window.localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };

  const addItemToTicket = (item: MenuItem) => {
    setTicket(prev => {
      const existing = prev.find(l => l.item.id === item.id);
      if (existing) {
        return prev.map(l => (l.item.id === item.id ? { ...l, qty: l.qty + 1 } : l));
      }
      return [...prev, { item, qty: 1 }];
    });
  };

  const startEditItem = (item: MenuItem) => {
    setEditingId(item.id);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormPrice(String(item.price));
  };

  const handleSaveMenuItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formName.trim()) return;
    const numericPrice = Math.max(1, Number(formPrice) || 10);

    if (editingId) {
      const nextMenu = menu.map(m =>
        m.id === editingId ? { ...m, name: formName.trim(), category: formCategory, price: numericPrice } : m
      );
      persistMenu(nextMenu);
      setTicket(prev =>
        prev.map(l =>
          l.item.id === editingId
            ? { ...l, item: { ...l.item, name: formName.trim(), category: formCategory, price: numericPrice } }
            : l
        )
      );
      setEditingId(null);
    } else {
      const created: MenuItem = {
        id: `m-${Date.now().toString().slice(-4)}`,
        name: formName.trim(),
        category: formCategory,
        price: numericPrice,
      };
      persistMenu([...menu, created]);
    }
    setFormName('');
    setFormPrice('32');
  };

  const removeMenuItem = (id: string) => {
    persistMenu(menu.filter(m => m.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const orderSummary = useMemo(() => {
    const subtotal = ticket.reduce((sum, l) => sum + l.item.price * l.qty, 0);
    const tax = subtotal * 0.08875;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  }, [ticket]);

  const fireAndSettleOrder = () => {
    if (ticket.length === 0) return;
    const record: SettledKitchenOrder = {
      orderId: `KDS-${Date.now().toString().slice(-4)}`,
      tableNumber,
      itemsCount: ticket.reduce((s, l) => s + l.qty, 0),
      total: orderSummary.total,
      firedAt: new Date().toLocaleTimeString(),
    };
    const nextOrders = [record, ...settledOrders];
    setSettledOrders(nextOrders);
    try {
      window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(nextOrders));
    } catch {}
    setTicket([]);
  };

  const visibleMenu = useMemo(
    () => menu.filter(m => activeCategory === 'ALL' || m.category === activeCategory),
    [menu, activeCategory]
  );

  return (
    <section aria-label="Restaurant POS Interface" className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#262626] pb-4">
            <h1 className="text-2xl font-bold text-[#D4AF37]">Midas Hospitality POS</h1>
            <div className="flex gap-2">
              {['ALL', 'Starters', 'Mains', 'Beverages'].map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    activeCategory === cat ? 'bg-[#D4AF37] text-[#0A0A0A]' : 'bg-[#0D0D0D] text-[#A3A3A3] border border-[#262626]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {visibleMenu.map(item => (
              <div key={item.id} className="flex items-center justify-between p-4 rounded-xl bg-[#0D0D0D] border border-[#262626]">
                <button type="button" onClick={() => addItemToTicket(item)} className="text-left flex-1">
                  <p className="font-semibold text-[#F5F5F5]">{item.name}</p>
                  <p className="text-xs text-[#A3A3A3]">{item.category} • <span className="text-[#D4AF37] font-mono">${item.price}</span></p>
                </button>
                <div className="flex gap-2 ml-2">
                  <button
                    type="button"
                    onClick={() => startEditItem(item)}
                    className="text-xs text-[#D4AF37] hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => removeMenuItem(item.id)}
                    className="text-xs text-[#EF4444] hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSaveMenuItem} className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <label htmlFor="pos-item-name" className="block text-xs text-[#A3A3A3] mb-1">
                {editingId ? 'Edit Dish Name' : 'New Dish Name'}
              </label>
              <input id="pos-item-name" type="text" required value={formName} onChange={e => setFormName(e.target.value)} className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label htmlFor="pos-item-cat" className="block text-xs text-[#A3A3A3] mb-1">Category</label>
              <select id="pos-item-cat" value={formCategory} onChange={e => setFormCategory(e.target.value as MenuItem['category'])} className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3 py-1.5 text-sm">
                <option value="Starters">Starters</option>
                <option value="Mains">Mains</option>
                <option value="Beverages">Beverages</option>
              </select>
            </div>
            <div>
              <label htmlFor="pos-item-price" className="block text-xs text-[#A3A3A3] mb-1">Price ($)</label>
              <input id="pos-item-price" type="number" value={formPrice} onChange={e => setFormPrice(e.target.value)} className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3 py-1.5 text-sm" />
            </div>
            <button type="submit" className="py-2 rounded bg-[#D4AF37] text-[#0A0A0A] font-bold text-xs">
              {editingId ? 'Save Changes' : '+ Add Dish'}
            </button>
          </form>
        </div>

        <aside className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <h2 className="text-lg font-semibold text-[#D4AF37]">Table #{tableNumber} Ticket</h2>
              <label htmlFor="pos-table-num" className="sr-only">Table Number</label>
              <input
                id="pos-table-num"
                type="number"
                min={1}
                max={99}
                value={tableNumber}
                onChange={e => setTableNumber(Number(e.target.value) || 1)}
                className="w-16 bg-[#0A0A0A] border border-[#262626] rounded px-2 py-1 text-sm text-center"
              />
            </div>
            <div className="space-y-2">
              {ticket.map(line => (
                <div key={line.item.id} className="flex items-center justify-between text-sm">
                  <span>{line.qty}x {line.item.name}</span>
                  <span className="font-mono">${(line.item.price * line.qty).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-[#262626] pt-4 space-y-2 text-sm">
            <div className="flex justify-between text-lg font-bold text-[#D4AF37]">
              <span>Total (incl. Tax)</span>
              <span className="font-mono">${orderSummary.total.toFixed(2)}</span>
            </div>
            <button
              type="button"
              disabled={ticket.length === 0}
              onClick={fireAndSettleOrder}
              className="w-full mt-2 py-3 rounded-lg bg-[#D4AF37] text-[#0A0A0A] font-bold text-sm hover:bg-[#E8C547] disabled:opacity-40"
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
