import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import userService from "../../api/userService";
import { useAuth } from "../../context/AuthContext";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { getImageUrl } from "../../utils/imageUtils";
import {
  Heart,
  MapPin,
  Star,
  FolderPlus,
  CheckCircle,
} from "lucide-react";

// ─── Brand ───────────────────────────────────────────────────────────────────
const CORAL = "#E67E5F";
const BROWN = "#3D2C29";

// ─── Time-ago helper ──────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)}w ago`;
  return `${Math.floor(diff / 2592000)}mo ago`;
}

// ─── Saved property card ──────────────────────────────────────────────────────
function SavedCard({ house, onRemove }) {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(true);
  const isVerified = house.verified?.status || house.verified === true;
  const USD_RATE = 0.0174;
  const usdPrice = Math.round((house.price || 0) * USD_RATE);

  const handleRemove = (e) => {
    e.stopPropagation();
    setLiked(false);
    setTimeout(() => onRemove(house._id), 200);
  };

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group"
      onClick={() => navigate(`/details/${house._id}`)}
    >
      {/* Image */}
      <div className="relative h-44 overflow-hidden bg-gray-100">
        <img
          src={
            getImageUrl(house.images?.[0]?.url || house.images?.[0]) ||
            "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80"
          }
          alt={house.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Verified badge */}
        {isVerified && (
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
            <CheckCircle size={11} style={{ color: CORAL }} />
            Verified
          </div>
        )}

        {/* Rating badge */}
        {house.averageRating > 0 && (
          <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
            <Star size={11} fill="#111" stroke="none" />
            {house.averageRating.toFixed(1)}
          </div>
        )}

        {/* Heart button */}
        <button
          className="absolute top-3 right-3 p-1.5 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-colors"
          onClick={handleRemove}
          aria-label="Remove from saved"
        >
          <Heart
            size={16}
            fill={liked ? CORAL : "none"}
            stroke={liked ? CORAL : "#9CA3AF"}
            strokeWidth={2}
          />
        </button>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate">{house.title}</h3>
        <div className="flex items-center gap-1 text-gray-500 text-xs mb-3">
          <MapPin size={11} />
          <span className="truncate">
            {house.location?.city || ""}
            {house.location?.state ? `, ${house.location.state}` : ""}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-base font-bold" style={{ color: CORAL }}>
              ${usdPrice}
            </span>
            <span className="text-xs text-gray-400"> / night</span>
          </div>
          <span className="text-[11px] text-gray-400">
            Added {timeAgo(house.createdAt || house.savedAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Folder/collection tabs (static UI matching the design) ───────────────────
const FOLDERS = [
  { id: "all", label: "All Saved" },
  { id: "addis", label: "Addis Ababa Getaway" },
  { id: "bole", label: "Bole Business Trip" },
  { id: "laketana", label: "Lake Tana Retreat" },
];

// ─── Main page ────────────────────────────────────────────────────────────────
const SavedHomesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFolder, setActiveFolder] = useState("all");

  useEffect(() => {
    const load = async () => {
      if (!user) { setLoading(false); return; }
      try {
        setLoading(true);
        const res = await userService.getSavedHomes(user.id || user._id);
        const list = res.data?.houses || res.data?.data?.houses || [];
        setHouses(Array.isArray(list) ? list : []);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load saved homes.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const handleRemove = async (houseId) => {
    try {
      await userService.removeSavedHome(user.id || user._id, houseId);
      setHouses((p) => p.filter((h) => h._id !== houseId));
    } catch (err) {
      alert(err.response?.data?.message || "Could not remove this home.");
    }
  };

  // Tab counts
  const tabCounts = { all: houses.length };

  const footer = (
    <footer className="border-t border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <button onClick={() => navigate("/")} className="text-base font-bold" style={{ color: CORAL }}>Gojo</button>
        <nav className="flex flex-wrap justify-center gap-5 text-xs text-gray-500">
          <a href="#support"  className="hover:text-gray-800">Support Center</a>
          <a href="#trust"    className="hover:text-gray-800">Trust &amp; Safety</a>
          <a href="#terms"    className="hover:text-gray-800">Terms of Service</a>
          <a href="#privacy"  className="hover:text-gray-800">Privacy Policy</a>
          <button onClick={() => navigate("/owner/dashboard")} className="hover:text-gray-800">List your Property</button>
        </nav>
        <p className="text-xs text-gray-400">© 2024 Gojo Ethiopia. All rights reserved. Built with hospitality.</p>
      </div>
    </footer>
  );

  return (
    <DashboardLayout footer={footer}>
      <div className="py-8 px-6 md:px-10 max-w-6xl">
        {/* Heading */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Your Wishlists</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your saved properties and planned trips.</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm">
            <FolderPlus size={15} />
            Create New Folder
          </button>
        </div>

        {/* Collection tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mt-5 mb-6">
          {FOLDERS.map((f) => {
            const count = f.id === "all" ? tabCounts.all : null;
            const isActive = activeFolder === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setActiveFolder(f.id)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-colors whitespace-nowrap"
                style={
                  isActive
                    ? { background: BROWN, color: "white", borderColor: BROWN }
                    : { background: "white", color: "#374151", borderColor: "#E5E7EB" }
                }
              >
                {f.label}
                {count !== null && (
                  <span className="text-xs font-bold" style={{ color: isActive ? "rgba(255,255,255,0.8)" : "#9CA3AF" }}>
                    ({count})
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Cards */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: CORAL, borderTopColor: "transparent" }} />
            <p className="text-sm text-gray-500">Loading your saved homes...</p>
          </div>
        ) : error ? (
          <div className="border border-red-200 bg-red-50 text-red-600 rounded-xl p-5 text-sm text-center">{error}</div>
        ) : houses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mb-4">
              <Heart size={28} style={{ color: CORAL }} />
            </div>
            <p className="text-base font-semibold text-gray-700 mb-1">No saved homes yet</p>
            <p className="text-sm text-gray-400 max-w-xs">
              Tap the heart icon on any property while exploring to add it here.
            </p>
            <button
              onClick={() => navigate("/search")}
              className="mt-4 px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: CORAL }}
            >
              Explore Properties
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {houses.map((house) => (
              <SavedCard key={house._id} house={house} onRemove={handleRemove} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SavedHomesPage;
