'use client';
import React, { useState, useMemo, useRef } from 'react';

export interface MenuItem {
  id: string;
  name: string;
  category: 'Starters' | 'Mains' | 'Drinks' | 'Desserts';
  price: number;
  available: boolean;
}

export interface OrderLine {
  itemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface SettledOrder {
  id: string;
  tableNumber: string;
  lines: OrderLine[];
  subtotal: number;
  tax: number;
  total: number;
  settledAtIso: string;
}

export interface RestaurantPOSProps {
  storageKey?: string;
  initialMenu?: MenuItem[];
  onChange?: (state: { menu: MenuItem[]; orders: SettledOrder[] }) => void | Promise<void>;
}

const roundCents = (val: number) => Math.round(val * 100) / 100;
const TAX_RATE = 0.08875; // 8.875% tax

const DEFAULT_MENU: MenuItem[] = [
  { id: 'm-1', name: 'Wagyu Truffle Sliders', category: 'Starters', price: 18.5, available: true },
  { id: 'm-2', name: 'Pan-Seared Sea Bass', category: 'Mains', price: 34.0, available: true },
  { id: 'm-3', name: 'Dry-Aged Ribeye (14oz)', category: 'Mains', price: 52.0, available: true },
  { id: 'm-4', name: 'Smoked Old Fashioned', category: 'Drinks', price: 16.0, available: true },
  { id: 'm-5', name: 'Gold-Leaf Espresso Tart', category: 'Desserts', price: 14.5, available: true }
];

export const RestaurantPOSInterface: React.FC<RestaurantPOSProps> = ({
  storageKey = 'agentmidas_restaurant_pos_v2',
  initialMenu = DEFAULT_MENU,
  onChange
}) => {
  const [menu, setMenu] = useState<MenuItem[]>(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.menu)) return parsed.menu;
      }
    } catch {}
    return initialMenu;
  });

  const [settledOrders, setSettledOrders] = useState<SettledOrder[]>(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.orders)) return parsed.orders;
      }
    } catch {}
    return [];
  });

  const [categoryFilter, setCategoryFilter] = useState<'ALL' | MenuItem['category']>('ALL');
  const [tableNumber, setTableNumber] = useState('Table 4');
  const [cart, setCart] = useState<OrderLine[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemCategory, setItemCategory] = useState<MenuItem['category']>('Mains');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const saveLockRef = useRef(false);

  const persistPosState = async (nextMenu: MenuItem[], nextOrders: SettledOrder[]): Promise<boolean> => {
    if (saveLockRef.current) return false;
    saveLockRef.current = true;
    setIsSaving(true);
    const prevMenu = menu;
    const prevOrders = settledOrders;
    setMenu(nextMenu);
    setSettledOrders(nextOrders);
    setErrorMsg('');
    try {
      if (onChange) {
        await onChange({ menu: nextMenu, orders: nextOrders });
      }
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, JSON.stringify({ menu: nextMenu, orders: nextOrders }));
      }
      return true;
    } catch {
      setMenu(prevMenu);
      setSettledOrders(prevOrders);
      setErrorMsg('Failed to save POS state; rolled back.');
      return false;
    } finally {
      saveLockRef.current = false;
      setIsSaving(false);
    }
  };

  const filteredMenu = useMemo(
    () => menu.filter(m => (categoryFilter === 'ALL' ? true : m.category === categoryFilter)),
    [menu, categoryFilter]
  );

  const ticketTotals = useMemo(() => {
    const rawSubtotal = cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
    const subtotal = roundCents(rawSubtotal);
    const tax = roundCents(subtotal * TAX_RATE);
    const total = roundCents(subtotal + tax);
    return { subtotal, tax, total };
  }, [cart]);

  const addToTicket = (item: MenuItem) => {
    if (!item.available || isSaving) return;
    setCart(curr => {
      const existing = curr.find(l => l.itemId === item.id);
      if (existing) {
        return curr.map(l => (l.itemId === item.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...curr, { itemId: item.id, name: item.name, unitPrice: roundCents(item.price), quantity: 1 }];
    });
  };

  const adjustQty = (itemId: string, delta: number) => {
    if (isSaving) return;
    setCart(curr =>
      curr
        .map(l => (l.itemId === itemId ? { ...l, quantity: l.quantity + delta } : l))
        .filter(l => l.quantity > 0)
    );
  };

  const handleSaveMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saveLockRef.current) return;
    const parsedPrice = roundCents(Number(itemPrice));
    if (!itemName.trim() || Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      setErrorMsg('Valid menu item name and positive price are required.');
      return;
    }
    let nextMenu: MenuItem[];
    if (editingId) {
      nextMenu = menu.map(m =>
        m.id === editingId ? { ...m, name: itemName.trim(), price: parsedPrice, category: itemCategory } : m
      );
    } else {
      nextMenu = [
        ...menu,
        { id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: itemName.trim(), category: itemCategory, price: parsedPrice, available: true }
      ];
    }
    const ok = await persistPosState(nextMenu, settledOrders);
    if (ok) {
      setEditingId(null);
      setItemName('');
      setItemPrice('');
    }
  };

  const startEditItem = (item: MenuItem) => {
    setEditingId(item.id);
    setItemName(item.name);
    setItemPrice(String(item.price));
    setItemCategory(item.category);
  };

  const deleteMenuItem = (id: string) => {
    void persistPosState(menu.filter(m => m.id !== id), settledOrders);
  };

  const settleTicket = async () => {
    if (cart.length === 0 || saveLockRef.current) return;
    const order: SettledOrder = {
      id: `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
      tableNumber,
      lines: cart,
      subtotal: ticketTotals.subtotal,
      tax: ticketTotals.tax,
      total: ticketTotals.total,
      settledAtIso: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
    };
    const ok = await persistPosState(menu, [order, ...settledOrders]);
    if (ok) {
      setCart([]);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex justify-between items-center border-b border-zinc-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-[#D4AF37]">Restaurant POS & Kitchen Dispatch Terminal</h1>
            <p className="text-sm text-zinc-400">Menu CRUD editing, 8.875% tax calculation, and settled kitchen order log</p>
          </div>
          <select
            aria-label="Select Active Table"
            value={tableNumber}
            onChange={e => setTableNumber(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-[#D4AF37] font-bold"
          >
            {['Table 1', 'Table 2', 'Table 4', 'Table 8 (VIP)', 'Bar Counter'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </header>

        {errorMsg && (
          <div role="alert" className="bg-red-950/60 border border-red-700 text-red-200 px-4 py-2 rounded text-sm">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <form onSubmit={handleSaveMenuItem} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-wrap gap-2">
              <input aria-label="Menu Item Name" type="text" placeholder="Menu Item Name" value={itemName} onChange={e => setItemName(e.target.value)} className="flex-1 min-w-[160px] bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-sm text-white" />
              <input aria-label="Menu Item Price" type="number" step="0.01" placeholder="Price ($)" value={itemPrice} onChange={e => setItemPrice(e.target.value)} className="w-28 bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-sm text-white" />
              <select aria-label="Menu Item Category" value={itemCategory} onChange={e => setItemCategory(e.target.value as MenuItem['category'])} className="bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-sm text-white">
                {(['Starters', 'Mains', 'Drinks', 'Desserts'] as const).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <button type="submit" disabled={isSaving} className="bg-[#D4AF37] text-black font-bold text-xs px-4 py-1.5 rounded disabled:opacity-50">
                {editingId ? 'Save Item Edit' : '+ Add Menu Item'}
              </button>
            </form>

            <div className="flex gap-2" role="tablist">
              {(['ALL', 'Starters', 'Mains', 'Drinks', 'Desserts'] as const).map(cat => (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={categoryFilter === cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1 rounded text-xs font-bold ${
                    categoryFilter === cat ? 'bg-[#D4AF37] text-black' : 'bg-zinc-900 text-zinc-300 border border-zinc-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredMenu.map(item => (
                <div key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex justify-between items-center">
                  <div>
                    <div className="text-xs text-[#D4AF37]">{item.category}</div>
                    <div className="font-bold text-white">{item.name}</div>
                    <div className="text-sm font-mono text-zinc-300">${item.price.toFixed(2)}</div>
                  </div>
                  <div className="flex gap-1.5">
                    <button type="button" disabled={isSaving} onClick={() => addToTicket(item)} className="px-3 py-1.5 rounded bg-[#D4AF37] text-black font-bold text-xs">+ Order</button>
                    <button type="button" disabled={isSaving} onClick={() => startEditItem(item)} className="px-2.5 py-1.5 rounded bg-zinc-800 text-zinc-200 text-xs">Edit</button>
                    <button type="button" disabled={isSaving} onClick={() => deleteMenuItem(item.id)} className="px-2.5 py-1.5 rounded bg-red-950 text-red-300 text-xs">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
              <h2 className="text-lg font-bold text-[#D4AF37]">Active Ticket — {tableNumber}</h2>
              {cart.length === 0 ? (
                <p className="text-xs text-zinc-500">Tap menu items to add to {tableNumber}.</p>
              ) : (
                <div className="space-y-2">
                  {cart.map(line => (
                    <div key={line.itemId} className="flex justify-between items-center text-sm bg-zinc-950 p-2.5 rounded">
                      <div>
                        <div className="font-semibold text-white">{line.name}</div>
                        <div className="text-xs text-zinc-400">${line.unitPrice.toFixed(2)} each</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" disabled={isSaving} onClick={() => adjustQty(line.itemId, -1)} className="px-2 py-0.5 bg-zinc-800 rounded">-</button>
                        <span className="font-mono font-bold">{line.quantity}</span>
                        <button type="button" disabled={isSaving} onClick={() => adjustQty(line.itemId, 1)} className="px-2 py-0.5 bg-zinc-800 rounded">+</button>
                        <span className="font-mono text-[#D4AF37] w-16 text-right">${roundCents(line.unitPrice * line.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-zinc-800 pt-3 space-y-1 text-sm">
                <div className="flex justify-between text-zinc-400">
                  <span>Subtotal</span>
                  <span className="font-mono">${ticketTotals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Sales Tax (8.875%)</span>
                  <span className="font-mono">${ticketTotals.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-[#D4AF37] pt-1 border-t border-zinc-800">
                  <span>Total Due</span>
                  <span className="font-mono">${ticketTotals.total.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="button"
                disabled={cart.length === 0 || isSaving}
                onClick={() => void settleTicket()}
                className="w-full py-2.5 rounded-lg bg-[#D4AF37] text-black font-bold text-sm disabled:opacity-40"
              >
                {isSaving ? 'Settling Ticket...' : `Dispatch to Kitchen & Settle ($${ticketTotals.total.toFixed(2)})`}
              </button>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-[#D4AF37]">Recent Kitchen Dispatches ({settledOrders.length})</h3>
              {settledOrders.map(ord => (
                <div key={ord.id} className="bg-zinc-950 border border-zinc-800 rounded p-3 text-xs space-y-1">
                  <div className="flex justify-between font-bold text-[#D4AF37]">
                    <span>{ord.id} · {ord.tableNumber}</span>
                    <span>{ord.settledAtIso}</span>
                  </div>
                  <div className="text-zinc-400">
                    Subtotal: ${ord.subtotal.toFixed(2)} · Tax: ${ord.tax.toFixed(2)} ·{' '}
                    <strong className="text-emerald-400">Total: ${ord.total.toFixed(2)}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantPOSInterface;
