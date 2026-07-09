import React, { useState, useEffect } from "react";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { HouseCard } from "../../components/pieces/HouseCard";
import { Map as MapIcon, SlidersHorizontal, Loader2, X } from "lucide-react";
import { houseService } from "../../api/houseService";
import userService from "../../api/userService";
import configService from "../../api/configService";
import { useAuth } from "../../context/AuthContext";

const CORAL = "#E67E5F";

// ─── Filter chip ──────────────────────────────────────────────────────────────
const FilterChip = ({ label, active = false, onClick }) => (
  <button
    onClick={onClick}
    className="px-4 py-2 text-xs font-semibold border rounded-full transition-all whitespace-nowrap"
    style={
      active
        ? { background: CORAL, color: "white", borderColor: CORAL }
        : { background: "white", color: "#6B7280", borderColor: "#E5E7EB" }
    }
  >
    {label}
  </button>
);

// ─── Light modal ──────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const AMENITY_OPTIONS = ["WiFi", "Parking", "Furnished", "Air Conditioning", "Laundry"];

const SearchPage = () => {
  const { user } = useAuth();
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savedHomeIds, setSavedHomeIds] = useState([]);
  const [savingId, setSavingId] = useState(null);
  const [fairPriceThreshold, setFairPriceThreshold] = useState(3000);

  const [filters, setFilters] = useState({
    verified: false,
    minRooms: null,
    minPrice: null,
    maxPrice: null,
    amenities: [],
    smartMatchHigh: false,
  });

  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showAmenitiesModal, setShowAmenitiesModal] = useState(false);
  const [priceDraft, setPriceDraft] = useState({ min: "", max: "" });
  const [amenitiesDraft, setAmenitiesDraft] = useState([]);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await configService.getConfig();
        setFairPriceThreshold(config?.pricing?.fairPriceThreshold || 3000);
      } catch {
        setFairPriceThreshold(3000);
      }
    };
    loadConfig();
  }, []);

  // Fetch houses
  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await houseService.getHouses({
          verified: filters.verified ? "true" : undefined,
          minRooms: filters.minRooms || undefined,
          minPrice: filters.minPrice || undefined,
          maxPrice: filters.maxPrice || undefined,
          amenities: filters.amenities?.length ? filters.amenities.join(",") : undefined,
          sort: filters.smartMatchHigh ? "match" : "-createdAt",
        });
        let list = res.data?.data?.houses || res.data?.houses || [];
        if (filters.smartMatchHigh) list = list.filter((h) => typeof h.matchScore === "number" && h.matchScore >= 90);
        setHouses(list);
        setError(null);
      } catch {
        setError("Failed to load properties. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [filters]);

  // Fetch saved homes
  useEffect(() => {
    const load = async () => {
      if (!user) { setSavedHomeIds([]); return; }
      try {
        const res = await userService.getSavedHomes(user.id || user._id);
        const ids = (res.data?.houses || res.data?.data?.houses || []).map((h) => h._id);
        setSavedHomeIds(ids);
      } catch { /* silent */ }
    };
    load();
  }, [user]);

  const handleToggleSave = async (houseId) => {
    if (!user) { alert("Please login to save homes"); return; }
    try {
      setSavingId(houseId);
      const uid = user.id || user._id;
      if (savedHomeIds.includes(houseId)) {
        await userService.removeSavedHome(uid, houseId);
        setSavedHomeIds((p) => p.filter((id) => id !== houseId));
      } else {
        await userService.addSavedHome(uid, houseId);
        setSavedHomeIds((p) => [...p, houseId]);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Something went wrong.");
    } finally {
      setSavingId(null);
    }
  };

  const resetFilters = () => setFilters({ verified: false, minRooms: null, minPrice: null, maxPrice: null, amenities: [], smartMatchHigh: false });
  const allClear = !filters.verified && !filters.minRooms && !filters.minPrice && !filters.maxPrice && !filters.amenities?.length && !filters.smartMatchHigh;

  return (
    <DashboardLayout>
      <div className="p-6 pb-24">
        {/* Heading */}
        <h1 className="text-2xl font-bold text-gray-900 mb-5">Find your perfect stay</h1>

        {/* Filter bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 no-scrollbar mb-6">
          <FilterChip label="All" active={allClear} onClick={resetFilters} />
          <FilterChip label="Verified" active={filters.verified} onClick={() => setFilters((p) => ({ ...p, verified: !p.verified }))} />
          <FilterChip
            label={filters.minPrice || filters.maxPrice ? `ETB ${filters.minPrice || 0} – ${filters.maxPrice || "∞"}` : "Price Range"}
            active={!!(filters.minPrice || filters.maxPrice)}
            onClick={() => { setPriceDraft({ min: filters.minPrice?.toString() || "", max: filters.maxPrice?.toString() || "" }); setShowPriceModal(true); }}
          />
          <FilterChip label="2+ Beds" active={filters.minRooms === 2} onClick={() => setFilters((p) => ({ ...p, minRooms: p.minRooms === 2 ? null : 2 }))} />
          <FilterChip
            label={filters.amenities?.length ? `Amenities (${filters.amenities.length})` : "Amenities"}
            active={!!filters.amenities?.length}
            onClick={() => { setAmenitiesDraft(filters.amenities || []); setShowAmenitiesModal(true); }}
          />
          <FilterChip label="Smart Match > 90%" active={filters.smartMatchHigh} onClick={() => setFilters((p) => ({ ...p, smartMatchHigh: !p.smartMatchHigh }))} />
          <button
            className="p-2 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
            onClick={() => { setPriceDraft({ min: filters.minPrice?.toString() || "", max: filters.maxPrice?.toString() || "" }); setShowPriceModal(true); }}
          >
            <SlidersHorizontal size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 h-40 animate-pulse rounded-[1.2rem] bg-slate-200" />
                <div className="mb-2 h-4 w-2/3 animate-pulse rounded-full bg-slate-200" />
                <div className="mb-2 h-4 w-1/2 animate-pulse rounded-full bg-slate-200" />
                <div className="h-4 w-1/3 animate-pulse rounded-full bg-slate-200" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="border border-red-200 bg-red-50 text-red-600 rounded-xl p-5 text-sm text-center">{error}</div>
        ) : houses.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500">No properties found matching your criteria.</p>
            <button onClick={resetFilters} className="mt-3 text-sm font-semibold hover:underline" style={{ color: CORAL }}>Clear filters</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {houses.map((house) => (
              <HouseCard
                key={house._id}
                house={{
                  id: house._id,
                  title: house.title,
                  location: `${house.location?.city || ""}, ${house.location?.state || ""}`,
                  price: house.price,
                  rating: house.averageRating || 0,
                  beds: house.rooms?.bedrooms || 0,
                  sqft: house.size || 0,
                  verified: house.verified?.status,
                  match: house.matchScore,
                  isFair: house.price < fairPriceThreshold,
                  image: house.images?.[0]?.url || house.images?.[0],
                  views: house.viewCount || 0,
                }}
                isSaved={savedHomeIds.includes(house._id)}
                onToggleSave={handleToggleSave}
              />
            ))}
          </div>
        )}
      </div>

      {/* Map button */}
      <button
        className="fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full flex items-center gap-2 shadow-lg font-semibold text-sm text-white z-50 transition-opacity hover:opacity-90"
        style={{ background: CORAL }}
        onClick={() => {
          if (!houses.length) { alert("No properties to show on the map yet."); return; }
          const loc = houses[0].location || {};
          const q = `${loc.city || ""} ${loc.state || ""}`.trim();
          window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q || "rental homes")}`, "_blank");
        }}
      >
        <MapIcon size={16} />
        Map View
      </button>

      {/* Price modal */}
      {showPriceModal && (
        <Modal title="Price Range (per month)" onClose={() => setShowPriceModal(false)}>
          <div className="grid grid-cols-2 gap-4 mb-5">
            {["min", "max"].map((k) => (
              <div key={k}>
                <label className="block text-xs font-medium text-gray-600 mb-1 capitalize">{k === "min" ? "Min price" : "Max price"}</label>
                <input type="number" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none bg-gray-50" value={priceDraft[k]} onChange={(e) => setPriceDraft((p) => ({ ...p, [k]: e.target.value }))} placeholder={k === "min" ? "e.g. 3000" : "e.g. 12000"} />
              </div>
            ))}
          </div>
          <div className="flex justify-between gap-3">
            <button onClick={() => { setPriceDraft({ min: "", max: "" }); setFilters((p) => ({ ...p, minPrice: null, maxPrice: null })); setShowPriceModal(false); }} className="text-sm text-gray-500 hover:text-gray-800">Clear</button>
            <div className="flex gap-2">
              <button onClick={() => setShowPriceModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={() => { setFilters((p) => ({ ...p, minPrice: priceDraft.min ? Number(priceDraft.min) : null, maxPrice: priceDraft.max ? Number(priceDraft.max) : null })); setShowPriceModal(false); }} className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: CORAL }}>Apply</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Amenities modal */}
      {showAmenitiesModal && (
        <Modal title="Amenities" onClose={() => setShowAmenitiesModal(false)}>
          <div className="space-y-3 mb-5">
            {AMENITY_OPTIONS.map((a) => (
              <label key={a} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={amenitiesDraft.includes(a)} onChange={() => setAmenitiesDraft((p) => p.includes(a) ? p.filter((x) => x !== a) : [...p, a])} className="w-4 h-4 rounded accent-[#E67E5F]" />
                <span className="text-sm text-gray-700">{a}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-between gap-3">
            <button onClick={() => { setAmenitiesDraft([]); setFilters((p) => ({ ...p, amenities: [] })); setShowAmenitiesModal(false); }} className="text-sm text-gray-500 hover:text-gray-800">Clear</button>
            <div className="flex gap-2">
              <button onClick={() => setShowAmenitiesModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={() => { setFilters((p) => ({ ...p, amenities: amenitiesDraft })); setShowAmenitiesModal(false); }} className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: CORAL }}>Apply</button>
            </div>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
};

export default SearchPage;
