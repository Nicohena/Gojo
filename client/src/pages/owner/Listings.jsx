import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { houseService } from "../../api/houseService";
import { getImageUrl } from "../../utils/imageUtils";
import { toast } from "react-hot-toast";
import socket, { connectSocket } from "../../utils/socket";
import {
  Plus,
  Home,
  CheckCircle2,
  FileText,
  MapPin,
  Star,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  MoreHorizontal,
  Search,
  Bell,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getImageUrl as getImg } from "../../utils/imageUtils";

const CORAL = "#E67E5F";
const BROWN = "#3D2C29";

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, iconBg, iconColor }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: iconBg }}>
        <Icon size={22} style={{ color: iconColor }} />
      </div>
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ house }) {
  const status = house.verified?.status;
  const available = house.available;

  if (status === "approved" && available)
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
        Active
      </span>
    );
  if (status === "pending" || status === "under_review")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        Under Review
      </span>
    );
  if (status === "rejected")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-600">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        Rejected
      </span>
    );
  if (!available)
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
        Draft
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700">
      <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
      Draft
    </span>
  );
}

// ─── Filter tab ───────────────────────────────────────────────────────────────
function FilterTab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-full text-sm font-medium border transition-colors whitespace-nowrap"
      style={active
        ? { background: "white", color: "#111827", borderColor: "#D1D5DB", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }
        : { background: "transparent", color: "#6B7280", borderColor: "transparent" }
      }
    >
      {label}
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
const OwnerListings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await houseService.getMyListings();
      setListings(res.data?.data?.houses || res.data?.houses || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load listings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    connectSocket(token);
    const onVerify = (p) => { toast.success(`Listing "${p?.title}" ${p?.approved ? "approved" : "rejected"}.`); fetch(); };
    const onMod = (p) => { toast.success(`Admin updated "${p?.title}".`); fetch(); };
    socket.on("listingVerification", onVerify);
    socket.on("listingModeration", onMod);
    return () => { socket.off("listingVerification", onVerify); socket.off("listingModeration", onMod); };
  }, [fetch]);

  const handleToggle = async (house) => {
    try {
      setUpdatingId(house._id);
      const res = await houseService.updateHouse(house._id, { available: !house.available });
      const updated = res.data?.data?.house || res.data?.house;
      if (updated) setListings((p) => p.map((h) => h._id === house._id ? updated : h));
    } catch (err) { toast.error(err.response?.data?.message || "Failed to update."); }
    finally { setUpdatingId(null); }
  };

  const handleDelete = async (house) => {
    if (!window.confirm(`Delete "${house.title}"? This cannot be undone.`)) return;
    try {
      setUpdatingId(house._id);
      await houseService.deleteHouse(house._id);
      setListings((p) => p.filter((h) => h._id !== house._id));
      toast.success("Listing deleted.");
    } catch (err) { toast.error(err.response?.data?.message || "Failed to delete."); }
    finally { setUpdatingId(null); }
  };

  // Stats
  const stats = useMemo(() => {
    const total = listings.length;
    const active = listings.filter((l) => l.available && l.verified?.status === "approved").length;
    const inProgress = listings.filter((l) => l.verified?.status === "pending" || l.verified?.status === "under_review" || (!l.available && l.verified?.status !== "approved")).length;
    return { total, active, inProgress };
  }, [listings]);

  // Filter
  const filtered = useMemo(() => {
    let data = [...listings];
    if (statusFilter === "active")   data = data.filter((l) => l.available && l.verified?.status === "approved");
    if (statusFilter === "draft")    data = data.filter((l) => !l.available || (!l.verified?.status));
    if (statusFilter === "review")   data = data.filter((l) => l.verified?.status === "pending" || l.verified?.status === "under_review");
    if (search) data = data.filter((l) => l.title?.toLowerCase().includes(search.toLowerCase()) || l.location?.city?.toLowerCase().includes(search.toLowerCase()));
    return data;
  }, [listings, statusFilter, search]);

  const TABS = [
    { id: "all",    label: `All (${stats.total})` },
    { id: "active", label: `Active (${stats.active})` },
    { id: "draft",  label: `Drafts (${stats.inProgress > 0 ? 1 : 0})` },
    { id: "review", label: `Under Review (${listings.filter(l => l.verified?.status === "pending" || l.verified?.status === "under_review").length})` },
  ];

  const footer = (
    <footer className="border-t border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <button onClick={() => navigate("/")} className="text-base font-bold" style={{ color: CORAL }}>Gojo</button>
        <p className="text-xs text-gray-400">© 2024 Gojo Ethiopia. All rights reserved. Built with hospitality.</p>
        <nav className="flex flex-wrap justify-center gap-5 text-xs text-gray-500">
          <a href="#support" className="hover:text-gray-800">Support Center</a>
          <a href="#terms"   className="hover:text-gray-800">Terms of Service</a>
          <a href="#privacy" className="hover:text-gray-800">Privacy Policy</a>
        </nav>
      </div>
    </footer>
  );

  return (
    <DashboardLayout footer={footer}>
      <div className="py-8 px-6 md:px-10">
        {/* ── Heading ──────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-7">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Listings</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your properties and track their performance.</p>
          </div>
          <button
            onClick={() => navigate("/owner/listings/add")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: CORAL }}
          >
            <Plus size={16} strokeWidth={2.5} />
            Add New Listing
          </button>
        </div>

        {/* ── Stat cards ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard label="Total Listings" value={stats.total} icon={Home}         iconBg="#EBF3FB" iconColor="#3B82F6" />
          <StatCard label="Active"         value={stats.active} icon={CheckCircle2} iconBg="#D1FAE5" iconColor="#059669" />
          <StatCard label="In Progress"    value={stats.inProgress} icon={FileText}   iconBg="#EFF6FF" iconColor="#6366F1" />
        </div>

        {/* ── Filter tabs ──────────────────────────────────────────── */}
        <div className="flex items-center gap-1 mb-5 overflow-x-auto no-scrollbar bg-gray-50 rounded-full px-2 py-1 w-fit">
          {TABS.map((t) => (
            <FilterTab key={t.id} label={t.label} active={statusFilter === t.id} onClick={() => setStatusFilter(t.id)} />
          ))}
        </div>

        {/* ── Table ────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: CORAL, borderTopColor: "transparent" }} />
          </div>
        ) : error ? (
          <div className="border border-red-200 bg-red-50 text-red-600 rounded-xl p-5 text-sm text-center">{error}</div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1.5fr_1fr] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100">
              {["PROPERTY", "STATUS", "PRICE / NIGHT", "PERFORMANCE", "ACTIONS"].map((h) => (
                <p key={h} className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{h}</p>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center mb-3">
                  <Home size={24} style={{ color: CORAL }} />
                </div>
                <p className="text-sm font-semibold text-gray-700 mb-1">No listings found</p>
                <p className="text-xs text-gray-400 mb-4">Add your first property to start receiving bookings.</p>
                <button
                  onClick={() => navigate("/owner/listings/add")}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: CORAL }}
                >
                  Add New Listing
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filtered.map((house) => {
                  const img = getImageUrl(house.images?.[0]?.url || house.images?.[0]);
                  const priceUsd = Math.round((house.price || 0) * 0.0174);
                  const rating = house.averageRating;
                  const reviews = house.ratingsCount || house.reviewCount || 0;
                  const occupancy = house.occupancyRate || null;
                  const isActive = house.available && house.verified?.status === "approved";
                  const isDraft = !house.available;
                  const isReview = house.verified?.status === "pending" || house.verified?.status === "under_review";

                  return (
                    <div
                      key={house._id}
                      className={`grid grid-cols-[2fr_1fr_1fr_1.5fr_1fr] gap-4 items-center px-5 py-4 hover:bg-gray-50 transition-colors ${updatingId === house._id ? "opacity-50 pointer-events-none" : ""}`}
                    >
                      {/* Property */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-14 h-11 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                          {img ? (
                            <img src={img} alt={house.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gray-200" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{house.title}</p>
                          <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                            <MapPin size={10} />
                            <span className="truncate">{house.location?.city}{house.location?.state ? `, ${house.location.state}` : ""}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status */}
                      <div><StatusBadge house={house} /></div>

                      {/* Price */}
                      <div>
                        {isDraft ? (
                          <span className="text-sm text-gray-400">—</span>
                        ) : (
                          <>
                            <span className="text-sm font-bold" style={{ color: CORAL }}>${priceUsd}</span>
                            <span className="text-xs text-gray-400"> /night</span>
                          </>
                        )}
                      </div>

                      {/* Performance */}
                      <div>
                        {isDraft || isReview ? (
                          <span className="text-xs text-gray-400">{isReview ? "Pending approval" : "No data yet"}</span>
                        ) : rating ? (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <Star size={13} fill="#F59E0B" stroke="none" />
                              <span className="text-sm font-semibold text-gray-800">{rating.toFixed(1)}</span>
                              <span className="text-xs text-gray-400">({reviews} reviews)</span>
                            </div>
                            {occupancy !== null && (
                              <p className="text-xs text-gray-400 mt-0.5">{occupancy}% Occupancy</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">No reviews yet</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 justify-end relative">
                        <button
                          onClick={() => navigate(`/owner/listings/${house._id}/edit`)}
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleToggle(house)}
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          title={house.available ? "Pause listing" : "Activate listing"}
                        >
                          {house.available ? <ToggleRight size={16} style={{ color: CORAL }} /> : <ToggleLeft size={16} />}
                        </button>
                        <button
                          onClick={() => handleDelete(house)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Bottom Add Property button ────────────────────────────── */}
        <div className="mt-6">
          <button
            onClick={() => navigate("/owner/listings/add")}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: CORAL }}
          >
            <Plus size={16} />
            Add Property
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OwnerListings;
