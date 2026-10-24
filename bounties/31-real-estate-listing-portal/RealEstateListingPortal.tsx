'use client';

import React, { useEffect, useState } from 'react';

export interface PropertyListing {
  id: string;
  title: string;
  city: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  lat: number;
  lng: number;
  virtualTourScenes: string[];
}

const DEFAULT_PROPERTIES: PropertyListing[] = [
  {
    id: 'prop-1',
    title: 'The Midas Penthouse at Sovereign Tower',
    city: 'Miami, FL',
    price: 3450000,
    beds: 4,
    baths: 4.5,
    sqft: 4200,
    lat: 25.7617,
    lng: -80.1918,
    virtualTourScenes: ['Grand Foyer (360°)', 'Infinity Pool Terrace (360°)', 'Primary Suite & Spa (360°)'],
  },
  {
    id: 'prop-2',
    title: 'Aurelia Modern Glass Villa',
    city: 'Austin, TX',
    price: 1890000,
    beds: 5,
    baths: 4,
    sqft: 3850,
    lat: 30.2672,
    lng: -97.7431,
    virtualTourScenes: ['Chef Kitchen & Wine Vault (360°)', 'Lakefront Deck (360°)'],
  },
];

const STORAGE_KEY = 'agentmidas_real_estate_v2';

export function RealEstateListingPortal() {
  const [listings, setListings] = useState<PropertyListing[]>(DEFAULT_PROPERTIES);
  const [selectedId, setSelectedId] = useState<string>(DEFAULT_PROPERTIES[0].id);
  const [activeSceneIdx, setActiveSceneIdx] = useState<number>(0);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCity, setNewCity] = useState<string>('Las Vegas, NV');
  const [newPrice, setNewPrice] = useState<string>('1250000');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as PropertyListing[];
        if (Array.isArray(parsed) && parsed.length > 0) setListings(parsed);
      }
    } catch {}
  }, []);

  const selected = listings.find(l => l.id === selectedId) ?? listings[0];

  const handleAddProperty = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const created: PropertyListing = {
      id: `prop-${Date.now().toString().slice(-4)}`,
      title: newTitle.trim(),
      city: newCity.trim(),
      price: Math.max(50000, Number(newPrice) || 500000),
      beds: 4,
      baths: 3,
      sqft: 3100,
      lat: 36.1699,
      lng: -115.1398,
      virtualTourScenes: ['Main Living Salon (360°)', 'Skyline Balcony (360°)'],
    };
    const next = [created, ...listings];
    setListings(next);
    setSelectedId(created.id);
    setActiveSceneIdx(0);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
    setNewTitle('');
  };

  return (
    <section aria-label="Real Estate Listing Portal" className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="border-b border-[#262626] pb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-[#D4AF37]">Real Estate Listing Portal</h1>
          <p className="text-sm text-[#A3A3A3]">Interactive Map Coordinates, 360° Virtual Tour Switcher & Property Manager</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {listings.map(item => (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedId(item.id);
                  setActiveSceneIdx(0);
                }}
                className={`p-5 rounded-xl bg-[#0D0D0D] border cursor-pointer ${
                  selected?.id === item.id ? 'border-[#D4AF37]' : 'border-[#262626]'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-bold text-[#F5F5F5]">{item.title}</h2>
                    <p className="text-xs text-[#A3A3A3]">
                      {item.city} • GPS: {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                    </p>
                  </div>
                  <p className="text-xl font-bold text-[#D4AF37]">${item.price.toLocaleString()}</p>
                </div>
                <p className="text-xs text-[#A3A3A3] mt-2">
                  {item.beds} Beds • {item.baths} Baths • {item.sqft.toLocaleString()} sq.ft
                </p>
              </div>
            ))}

            <form onSubmit={handleAddProperty} className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div>
                <label htmlFor="re-title" className="block text-xs text-[#A3A3A3] mb-1">Property Title</label>
                <input id="re-title" type="text" required value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3 py-1.5 text-sm" />
              </div>
              <div>
                <label htmlFor="re-city" className="block text-xs text-[#A3A3A3] mb-1">City</label>
                <input id="re-city" type="text" required value={newCity} onChange={e => setNewCity(e.target.value)} className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3 py-1.5 text-sm" />
              </div>
              <div>
                <label htmlFor="re-price" className="block text-xs text-[#A3A3A3] mb-1">Price ($)</label>
                <input id="re-price" type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)} className="w-full bg-[#0A0A0A] border border-[#262626] rounded px-3 py-1.5 text-sm" />
              </div>
              <button type="submit" className="py-2 rounded bg-[#D4AF37] text-[#0A0A0A] font-bold text-xs">+ Publish Listing</button>
            </form>
          </div>

          <aside className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-5 space-y-4">
            <h2 className="text-lg font-semibold text-[#D4AF37]">Interactive Map & 360° Virtual Tour</h2>
            {selected && (
              <>
                <div className="p-4 rounded-xl bg-[#141414] border border-[#262626] space-y-1">
                  <p className="text-xs uppercase text-[#A3A3A3]">Geospatial Map Pin</p>
                  <p className="font-mono text-sm text-[#22C55E]">
                    Lat {selected.lat.toFixed(4)}° N, Lng {selected.lng.toFixed(4)}° W
                  </p>
                  <p className="text-xs text-[#A3A3A3]">{selected.city}</p>
                </div>

                <div className="p-4 rounded-xl bg-[#141414] border border-[#D4AF37]/40 space-y-3">
                  <p className="text-xs uppercase text-[#D4AF37]">Active 360° Virtual Tour Room</p>
                  <p className="text-base font-bold text-[#F5F5F5]">
                    {selected.virtualTourScenes[activeSceneIdx] ?? selected.virtualTourScenes[0]}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selected.virtualTourScenes.map((scene, idx) => (
                      <button
                        key={scene}
                        type="button"
                        onClick={() => setActiveSceneIdx(idx)}
                        className={`px-2.5 py-1 rounded text-xs font-semibold ${
                          activeSceneIdx === idx ? 'bg-[#D4AF37] text-[#0A0A0A]' : 'bg-[#0A0A0A] text-[#A3A3A3] border border-[#262626]'
                        }`}
                      >
                        Room #{idx + 1}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}

export default RealEstateListingPortal;
