'use client';
import React, { useState, useMemo, useRef } from 'react';

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
  virtualTourUrl: string;
}

export interface RealEstateListingPortalProps {
  storageKey?: string;
  initialListings?: PropertyListing[];
  onChange?: (listings: PropertyListing[]) => void | Promise<void>;
}

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'las vegas': { lat: 36.1699, lng: -115.1398 },
  'miami': { lat: 25.7617, lng: -80.1918 },
  'austin': { lat: 30.2672, lng: -97.7431 },
  'new york': { lat: 40.7128, lng: -74.0060 },
  'los angeles': { lat: 34.0522, lng: -118.2437 }
};

const TOUR_ROOMS = [
  { id: 'foyer', label: 'Grand Foyer', fovDesc: 'Double-height marble entryway with custom chandelier' },
  { id: 'living', label: 'Skyline Living Salon', fovDesc: 'Floor-to-ceiling panoramic glass overlooking city skyline' },
  { id: 'kitchen', label: 'Chef Kitchen', fovDesc: 'Waterfall quartz island with integrated Gaggenau appliances' },
  { id: 'terrace', label: 'Infinity Pool Terrace', fovDesc: 'Heated zero-edge pool with outdoor fire lounge' }
];

function isValidListing(item: any): item is PropertyListing {
  return (
    item &&
    typeof item === 'object' &&
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    typeof item.city === 'string' &&
    typeof item.price === 'number' &&
    Number.isFinite(item.price) &&
    typeof item.lat === 'number' &&
    Number.isFinite(item.lat) &&
    typeof item.lng === 'number' &&
    Number.isFinite(item.lng)
  );
}

const makeUniqueId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `prop-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const DEFAULT_LISTINGS: PropertyListing[] = [
  {
    id: 'prop-101',
    title: 'Obsidian Sky Penthouse',
    city: 'Las Vegas',
    price: 1850000,
    beds: 4,
    baths: 4.5,
    sqft: 4100,
    lat: 36.1699,
    lng: -115.1398,
    virtualTourUrl: 'https://tours.agentmidas.dev/obsidian-penthouse'
  },
  {
    id: 'prop-102',
    title: 'Biscayne Waterfront Villa',
    city: 'Miami',
    price: 2450000,
    beds: 5,
    baths: 5,
    sqft: 5200,
    lat: 25.7617,
    lng: -80.1918,
    virtualTourUrl: 'https://tours.agentmidas.dev/biscayne-villa'
  }
];

export const RealEstateListingPortal: React.FC<RealEstateListingPortalProps> = ({
  storageKey = 'agentmidas_real_estate_v2',
  initialListings = DEFAULT_LISTINGS,
  onChange
}) => {
  const [listings, setListings] = useState<PropertyListing[]>(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter(isValidListing);
          if (valid.length > 0) return valid;
        }
      }
    } catch {}
    return initialListings;
  });

  const [selectedId, setSelectedId] = useState<string>(listings[0]?.id || 'prop-101');
  const [activeRoomId, setActiveRoomId] = useState<string>('foyer');
  const [panYawDeg, setPanYawDeg] = useState<number>(120);
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('Austin');
  const [price, setPrice] = useState('950000');
  const [latInput, setLatInput] = useState('30.2672');
  const [lngInput, setLngInput] = useState('-97.7431');
  const [downPaymentPct, setDownPaymentPct] = useState(20);
  const [interestRatePct, setInterestRatePct] = useState(6.5);
  const [loanTermYears, setLoanTermYears] = useState(30);
  const [errorMsg, setErrorMsg] = useState('');
  const saveSeqRef = useRef(0);

  const persistListings = async (next: PropertyListing[]) => {
    const seq = ++saveSeqRef.current;
    const prev = listings;
    setListings(next);
    setErrorMsg('');
    try {
      if (onChange) {
        await onChange(next);
      }
      if (seq !== saveSeqRef.current) return;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      }
    } catch {
      if (seq === saveSeqRef.current) {
        setListings(prev);
        setErrorMsg('Failed to persist property listings.');
      }
    }
  };

  const activeProperty = useMemo(
    () => listings.find(l => l.id === selectedId) || listings[0],
    [listings, selectedId]
  );

  const activeRoom = useMemo(
    () => TOUR_ROOMS.find(r => r.id === activeRoomId) || TOUR_ROOMS[0],
    [activeRoomId]
  );

  const monthlyMortgage = useMemo(() => {
    if (!activeProperty) return 0;
    const principal = activeProperty.price * (1 - downPaymentPct / 100);
    const monthlyRate = interestRatePct / 100 / 12;
    const n = loanTermYears * 12;
    if (monthlyRate <= 0) return principal / Math.max(1, n);
    return (principal * (monthlyRate * Math.pow(1 + monthlyRate, n))) / (Math.pow(1 + monthlyRate, n) - 1);
  }, [activeProperty, downPaymentPct, interestRatePct, loanTermYears]);

  const handleCityChange = (nextCity: string) => {
    setCity(nextCity);
    const preset = CITY_COORDS[nextCity.trim().toLowerCase()];
    if (preset) {
      setLatInput(String(preset.lat));
      setLngInput(String(preset.lng));
    }
  };

  const handleAddListing = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPrice = Number(price);
    const parsedLat = Number(latInput);
    const parsedLng = Number(lngInput);
    if (!title.trim() || !city.trim() || Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      setErrorMsg('Title, city, and positive price are required.');
      return;
    }
    const fallbackCoords = CITY_COORDS[city.trim().toLowerCase()] || { lat: 30.2672, lng: -97.7431 };
    const created: PropertyListing = {
      id: makeUniqueId(),
      title: title.trim(),
      city: city.trim(),
      price: parsedPrice,
      beds: 4,
      baths: 3,
      sqft: 3200,
      lat: Number.isFinite(parsedLat) ? parsedLat : fallbackCoords.lat,
      lng: Number.isFinite(parsedLng) ? parsedLng : fallbackCoords.lng,
      virtualTourUrl: `https://tours.agentmidas.dev/${Date.now()}`
    };
    setTitle('');
    setSelectedId(created.id);
    void persistListings([created, ...listings]);
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="border-b border-zinc-800 pb-4">
          <h1 className="text-2xl font-bold text-[#D4AF37]">Luxury Real Estate Portal, Geospatial Map & 360° Virtual Tour</h1>
        </header>

        {errorMsg && (
          <div role="alert" className="bg-red-950/60 border border-red-700 text-red-200 px-4 py-2 rounded text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAddListing} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-6 gap-3">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Property Title" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
          <input value={city} onChange={e => handleCityChange(e.target.value)} placeholder="City" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
          <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="Price ($)" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
          <input type="number" step="0.0001" value={latInput} onChange={e => setLatInput(e.target.value)} placeholder="Latitude" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
          <input type="number" step="0.0001" value={lngInput} onChange={e => setLngInput(e.target.value)} placeholder="Longitude" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white" />
          <button type="submit" className="bg-[#D4AF37] text-black font-bold text-sm rounded px-4 py-2">+ Add Listing</button>
        </form>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            {listings.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={`w-full text-left p-4 rounded-xl border transition ${
                  activeProperty?.id === item.id ? 'bg-zinc-800 border-[#D4AF37]' : 'bg-zinc-900 border-zinc-800'
                }`}
              >
                <div className="font-bold text-white">{item.title}</div>
                <div className="text-xs text-zinc-400">{item.city} · ({item.lat.toFixed(4)}, {item.lng.toFixed(4)})</div>
                <div className="text-lg font-bold text-[#D4AF37] mt-1">${item.price.toLocaleString()}</div>
              </button>
            ))}
          </div>

          {activeProperty && (
            <div className="lg:col-span-2 space-y-6">
              {/* Interactive Geospatial SVG Map Viewport */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
                <h2 className="text-lg font-bold text-[#D4AF37]">Interactive Property Map Viewport</h2>
                <svg
                  viewBox="0 0 600 220"
                  role="img"
                  aria-label="Interactive Property Map"
                  className="w-full h-48 bg-zinc-950 border border-zinc-800 rounded-lg"
                >
                  {listings.map(l => {
                    const x = Math.max(30, Math.min(570, ((l.lng + 125) / 60) * 540 + 30));
                    const y = Math.max(25, Math.min(195, ((50 - l.lat) / 28) * 170 + 25));
                    const isSelected = l.id === activeProperty.id;
                    return (
                      <g
                        key={l.id}
                        onClick={() => setSelectedId(l.id)}
                        className="cursor-pointer"
                      >
                        <circle
                          cx={x}
                          cy={y}
                          r={isSelected ? 9 : 6}
                          fill={isSelected ? '#D4AF37' : '#71717A'}
                        />
                        <text x={x + 12} y={y + 4} fill="#F4F4F5" fontSize="11">
                          {l.city} (${Math.round(l.price / 1000)}k)
                        </text>
                      </g>
                    );
                  })}
                </svg>
                <div className="text-xs text-zinc-400">
                  Selected Pin: <strong>{activeProperty.title}</strong> ({activeProperty.city}) — Lat {activeProperty.lat.toFixed(4)}, Lng {activeProperty.lng.toFixed(4)}
                </div>
              </div>

              {/* Embedded 360 Virtual Tour Viewer */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-bold text-[#D4AF37]">360° Interactive Virtual Tour Viewer</h3>
                  <span className="text-xs font-mono text-zinc-400">Camera Yaw: {panYawDeg}°</span>
                </div>
                <div className="flex flex-wrap gap-2" role="tablist" aria-label="Virtual Tour Rooms">
                  {TOUR_ROOMS.map(room => (
                    <button
                      key={room.id}
                      type="button"
                      role="tab"
                      aria-selected={activeRoom.id === room.id}
                      onClick={() => setActiveRoomId(room.id)}
                      className={`px-3 py-1 rounded text-xs font-bold ${
                        activeRoom.id === room.id ? 'bg-[#D4AF37] text-black' : 'bg-zinc-950 text-zinc-300 border border-zinc-800'
                      }`}
                    >
                      {room.label}
                    </button>
                  ))}
                </div>
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 space-y-2">
                  <div className="text-sm font-bold text-white">{activeRoom.label} — {activeProperty.title}</div>
                  <p className="text-xs text-zinc-300">{activeRoom.fovDesc}</p>
                  <input
                    type="range"
                    aria-label="360 Virtual Tour Camera Pan Angle"
                    min={0}
                    max={360}
                    value={panYawDeg}
                    onChange={e => setPanYawDeg(Number(e.target.value))}
                    className="w-full accent-[#D4AF37]"
                  />
                </div>
              </div>

              {/* Interactive Mortgage Calculator */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
                <h3 className="text-base font-bold text-[#D4AF37]">Interactive Mortgage Payment Calculator</h3>
                <div className="grid grid-cols-3 gap-3">
                  <label className="text-xs text-zinc-400">
                    Down Payment (%)
                    <input type="number" min={0} max={90} value={downPaymentPct} onChange={e => setDownPaymentPct(Number(e.target.value))} className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-sm text-white" />
                  </label>
                  <label className="text-xs text-zinc-400">
                    APR Interest (%)
                    <input type="number" step="0.1" min={0.5} max={20} value={interestRatePct} onChange={e => setInterestRatePct(Number(e.target.value))} className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-sm text-white" />
                  </label>
                  <label className="text-xs text-zinc-400">
                    Term (Years)
                    <select value={loanTermYears} onChange={e => setLoanTermYears(Number(e.target.value))} className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-sm text-white">
                      <option value={15}>15 Years</option>
                      <option value={30}>30 Years</option>
                    </select>
                  </label>
                </div>
                <div className="text-lg font-bold text-emerald-400">
                  Estimated Principal & Interest: ${Math.round(monthlyMortgage).toLocaleString()} / month
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RealEstateListingPortal;
