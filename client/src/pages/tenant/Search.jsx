import React, { useState, useEffect } from "react";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { HouseCard } from "../../components/pieces/HouseCard";
import { Map as MapIcon, SlidersHorizontal, Loader2 } from "lucide-react";
import { houseService } from "../../api/houseService";
import userService from "../../api/userService";
import { useAuth } from "../../context/AuthContext";

const FilterChip = ({ label, active = false, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-xs tracking-widest uppercase border transition-all whitespace-nowrap ${
      active
        ? "border-[#d4af37] text-[#d4af37] bg-[#d4af37]/5"
        : "border-[#d4af37]/10 text-[#9a9a9a] hover:border-[#d4af37]/40 hover:text-[#f8f6f3] bg-[#1a1a1a]"
    }`}
  >
    {label}
  </button>
);

const SearchPage = () => {
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    verified: false,
    minRooms: null,
    minPrice: null,
    maxPrice: null,
    amenities: [],
    smartMatchHigh: false,
  });
  const { user } = useAuth();
  const [savedHomeIds, setSavedHomeIds] = useState([]);
  const [savingId, setSavingId] = useState(null);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showAmenitiesModal, setShowAmenitiesModal] = useState(false);
  const [priceDraft, setPriceDraft] = useState({ min: "", max: "" });
  const [amenitiesDraft, setAmenitiesDraft] = useState([]);

  useEffect(() => {
    const fetchHouses = async () => {
      setLoading(true);
      try {
        const response = await houseService.getHouses({
          verified: filters.verified ? "true" : undefined,
          minRooms: filters.minRooms || undefined,
          minPrice: filters.minPrice || undefined,
          maxPrice: filters.maxPrice || undefined,
          amenities: filters.amenities?.length > 0 ? filters.amenities.join(",") : undefined,
          sort: filters.smartMatchHigh ? "match" : "-createdAt",
        });
        let list = response.data.data.houses;
        if (filters.smartMatchHigh) {
          list = list.filter((h) => typeof h.matchScore === "number" && h.matchScore >= 90);
        }
        setHouses(list);
        setError(null);
      } catch (err) {
        setError("Failed to load properties. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchHouses();
  }, [filters]);

  useEffect(() => {
    const fetchSavedHomes = async () => {
      if (!user) { setSavedHomeIds([]); return; }
      try {
        const response = await userService.getSavedHomes(user.id);
        const ids = (response.data?.houses || response.data?.data?.houses || []).map((h) => h._id);
        setSavedHomeIds(ids);
      } catch (err) {
        console.error("Failed to load saved homes", err);
      }
    };
    fetchSavedHomes();
  }, [user]);

  const handleToggleSave = async (houseId) => {
    if (!user) { alert("Please login to save homes"); return; }
    try {
      setSavingId(houseId);
      const isSaved = savedHomeIds.includes(houseId);
      if (isSaved) {
        await userService.removeSavedHome(user.id, houseId);
        setSavedHomeIds((prev) => prev.filter((id) => id !== houseId));
      } else {
        await userService.addSavedHome(user.id, houseId);
        setSavedHomeIds((prev) => [...prev, houseId]);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Something went wrong.");
    } finally {
      setSavingId(null);
    }
  };

  const AMENITY_OPTIONS = ["WiFi", "Parking", "Furnished", "Air Conditioning", "Laundry"];

  return (
    <DashboardLayout>
      <div className="space-y-8 relative pb-20">
        <div className="space-y-6">
          <h1 className="text-4xl text-[#f8f6f3]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Find your perfect stay
          </h1>

          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            <FilterChip label="All Types" active={!filters.verified && !filters.minRooms && !filters.minPrice && !filters.maxPrice && (!filters.amenities || filters.amenities.length === 0) && !filters.smartMatchHigh} onClick={() => setFilters({ verified: false, minRooms: null, minPrice: null, maxPrice: null, amenities: [], smartMatchHigh: false })} />
            <FilterChip label="Verified Only" active={filters.verified} onClick={() => setFilters((p) => ({ ...p, verified: !p.verified }))} />
            <FilterChip label={filters.minPrice || filters.maxPrice ? `ETB ${filters.minPrice || 0} - ${filters.maxPrice || "∞"}` : "Price Range"} active={!!(filters.minPrice || filters.maxPrice)} onClick={() => { setPriceDraft({ min: filters.minPrice?.toString() || "", max: filters.maxPrice?.toString() || "" }); setShowPriceModal(true); }} />
            <FilterChip label="2+ Beds" active={filters.minRooms === 2} onClick={() => setFilters((p) => ({ ...p, minRooms: p.minRooms === 2 ? null : 2 }))} />
            <FilterChip label={filters.amenities?.length > 0 ? `Amenities (${filters.amenities.length})` : "Amenities"} active={filters.amenities?.length > 0} onClick={() => { setAmenitiesDraft(filters.amenities || []); setShowAmenitiesModal(true); }} />
            <FilterChip label="Smart Match > 90%" active={filters.smartMatchHigh} onClick={() => setFilters((p) => ({ ...p, smartMatchHigh: !p.smartMatchHigh }))} />
            <button className="p-2 border border-[#d4af37]/10 hover:border-[#d4af37]/40 bg-[#1a1a1a] transition-colors" onClick={() => { setPriceDraft({ min: filters.minPrice?.toString() || "", max: filters.maxPrice?.toString() || "" }); setShowPriceModal(true); }}>
              <SlidersHorizontal size={18} className="text-[#9a9a9a]" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-[#d4af37]" size={40} />
            <p className="text-[#9a9a9a] tracking-wide">Finding the best matches for you...</p>
          </div>
        ) : error ? (
          <div className="border border-red-500/30 bg-red-500/10 text-red-400 p-6 text-center">{error}</div>
        ) : houses.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#9a9a9a] text-lg">No properties found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
            {houses.map((house) => (
              <HouseCard
                key={house._id}
                house={{
                  id: house._id,
                  title: house.title,
                  location: `${house.location.city}, ${house.location.state}`,
                  price: house.price,
                  rating: house.averageRating || 0,
                  beds: house.rooms.bedrooms,
                  sqft: house.size || 0,
                  verified: house.verified?.status,
                  match: house.matchScore,
                  isFair: house.price < 3000,
                  image: house.images?.[0]?.url,
                  views: house.viewCount || 0,
                }}
                isSaved={savedHomeIds.includes(house._id)}
                onToggleSave={handleToggleSave}
              />
            ))}
          </div>
        )}

        <button
          className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#d4af37] text-[#0a0a0a] px-6 py-3 flex items-center gap-2 shadow-2xl hover:bg-[#b8941f] transition-all font-bold text-sm z-50 tracking-wide"
          onClick={() => {
            if (!houses || houses.length === 0) { alert("No properties to show on the map yet."); return; }
            const first = houses[0];
            const loc = first.location || {};
            const query = `${loc.city || ""} ${loc.state || ""}`.trim();
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || "rental homes")}`, "_blank");
          }}
        >
          <MapIcon size={18} />
          <span>Map View</span>
        </button>

        {/* Price Range Modal */}
        {showPriceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#111] border border-[#d4af37]/20 w-full max-w-md p-6">
              <h2 className="text-xl text-[#f8f6f3] mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>Price Range (per month)</h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-[10px] font-bold text-[#d4af37]/50 uppercase tracking-widest block mb-1">Min price</label>
                  <input type="number" className="w-full bg-[#1a1a1a] border border-[#d4af37]/10 text-[#f8f6f3] px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]/40" value={priceDraft.min} onChange={(e) => setPriceDraft((prev) => ({ ...prev, min: e.target.value }))} placeholder="e.g. 3000" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#d4af37]/50 uppercase tracking-widest block mb-1">Max price</label>
                  <input type="number" className="w-full bg-[#1a1a1a] border border-[#d4af37]/10 text-[#f8f6f3] px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]/40" value={priceDraft.max} onChange={(e) => setPriceDraft((prev) => ({ ...prev, max: e.target.value }))} placeholder="e.g. 12000" />
                </div>
              </div>
              <div className="flex justify-between gap-3">
                <button type="button" onClick={() => { setPriceDraft({ min: "", max: "" }); setFilters((p) => ({ ...p, minPrice: null, maxPrice: null })); setShowPriceModal(false); }} className="px-4 py-2 border border-[#d4af37]/10 text-[#9a9a9a] text-sm hover:border-[#d4af37]/40 hover:text-[#f8f6f3] transition-all">Clear</button>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowPriceModal(false)} className="px-4 py-2 border border-[#d4af37]/10 text-[#9a9a9a] text-sm hover:border-[#d4af37]/40 transition-all">Cancel</button>
                  <button type="button" onClick={() => { setFilters((p) => ({ ...p, minPrice: priceDraft.min ? Number(priceDraft.min) : null, maxPrice: priceDraft.max ? Number(priceDraft.max) : null })); setShowPriceModal(false); }} className="px-4 py-2 bg-[#d4af37] text-[#0a0a0a] text-sm font-bold hover:bg-[#b8941f] transition-all">Apply</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Amenities Modal */}
        {showAmenitiesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#111] border border-[#d4af37]/20 w-full max-w-md p-6">
              <h2 className="text-xl text-[#f8f6f3] mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>Amenities</h2>
              <div className="grid grid-cols-1 gap-3 mb-6">
                {AMENITY_OPTIONS.map((amenity) => {
                  const checked = amenitiesDraft.includes(amenity);
                  return (
                    <label key={amenity} className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" className="border-[#d4af37]/30 text-[#d4af37] focus:ring-[#d4af37]/30 bg-[#1a1a1a]" checked={checked} onChange={() => setAmenitiesDraft((prev) => prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity])} />
                      <span className="text-sm text-[#f8f6f3] tracking-wide">{amenity}</span>
                    </label>
                  );
                })}
              </div>
              <div className="flex justify-between gap-3">
                <button type="button" onClick={() => { setAmenitiesDraft([]); setFilters((p) => ({ ...p, amenities: [] })); setShowAmenitiesModal(false); }} className="px-4 py-2 border border-[#d4af37]/10 text-[#9a9a9a] text-sm hover:border-[#d4af37]/40 transition-all">Clear</button>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowAmenitiesModal(false)} className="px-4 py-2 border border-[#d4af37]/10 text-[#9a9a9a] text-sm hover:border-[#d4af37]/40 transition-all">Cancel</button>
                  <button type="button" onClick={() => { setFilters((p) => ({ ...p, amenities: amenitiesDraft })); setShowAmenitiesModal(false); }} className="px-4 py-2 bg-[#d4af37] text-[#0a0a0a] text-sm font-bold hover:bg-[#b8941f] transition-all">Apply</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SearchPage;
