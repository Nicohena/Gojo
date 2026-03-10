import React, { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { Loader2, PlusCircle } from "lucide-react";
import { houseService } from "../../api/houseService";
import OwnerListingCard from "../../components/pieces/OwnerListingCard";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import socket, { connectSocket } from "../../utils/socket";

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

const OwnerListings = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState("createdAt");
  const [updatingId, setUpdatingId] = useState(null);
  const navigate = useNavigate();

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await houseService.getMyListings();
      setListings(response.data.data.houses || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to retrieve property listings. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    connectSocket(token);

    const handleListingVerification = (payload) => {
      const statusText = payload?.approved ? "approved" : "rejected";
      toast.success(`Your listing "${payload?.title || "listing"}" was ${statusText}.`);
      fetchListings();
    };
    const handleListingModeration = (payload) => {
      const action = String(payload?.action || "updated").replaceAll("_", " ");
      const extra = payload?.reason ? ` (${payload.reason})` : "";
      toast.success(`Admin ${action} your listing "${payload?.title || "listing"}"${extra}.`);
      fetchListings();
    };

    socket.on("listingVerification", handleListingVerification);
    socket.on("listingModeration", handleListingModeration);
    return () => {
      socket.off("listingVerification", handleListingVerification);
      socket.off("listingModeration", handleListingModeration);
    };
  }, [fetchListings]);

  const handleToggleAvailability = async (house) => {
    try {
      setUpdatingId(house._id);
      const updated = await houseService.updateHouse(house._id, { available: !house.available });
      const updatedHouse = updated.data.data.house;
      setListings((prev) => prev.map((h) => (h._id === house._id ? updatedHouse : h)));
    } catch (err) {
      window.alert(err.response?.data?.message || "Failed to update listing availability.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (house) => {
    if (!window.confirm(`Delete "${house.title}"? This cannot be undone.`)) return;
    try {
      setUpdatingId(house._id);
      await houseService.deleteHouse(house._id);
      setListings((prev) => prev.filter((h) => h._id !== house._id));
    } catch (err) {
      window.alert(err.response?.data?.message || "Failed to delete listing.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleReportIssue = async (house) => {
    const message = window.prompt("Please describe the corrective actions taken to address the previous rejection and request a re-review:")?.trim();
    if (!message) return;
    try {
      setUpdatingId(house._id);
      await houseService.reportRejection(house._id, message);
      toast.success("Report submitted to admin.");
      fetchListings();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit report.");
    } finally {
      setUpdatingId(null);
    }
  };

  const stats = useMemo(() => {
    if (!listings || listings.length === 0) return { total: 0, active: 0, paused: 0, totalViews: 0, avgRating: 0 };
    const total = listings.length;
    const active = listings.filter((l) => l.available).length;
    const paused = total - active;
    const totalViews = listings.reduce((sum, l) => sum + (l.viewCount || 0), 0);
    const avgRating = listings.reduce((sum, l) => sum + (l.averageRating || 0), 0) / total;
    return { total, active, paused, totalViews, avgRating };
  }, [listings]);

  const filteredAndSorted = useMemo(() => {
    let data = [...listings];
    if (statusFilter === "active") data = data.filter((l) => l.available);
    else if (statusFilter === "paused") data = data.filter((l) => !l.available);
    if (verifiedOnly) data = data.filter((l) => l.verified?.status);
    data.sort((a, b) => {
      if (sortBy === "views") return (b.viewCount || 0) - (a.viewCount || 0);
      if (sortBy === "price") return (b.price || 0) - (a.price || 0);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    return data;
  }, [listings, statusFilter, verifiedOnly, sortBy]);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--text)' }}>
              My Listings
            </h1>
            <p className="tracking-wide text-sm mt-1" style={{ color: 'var(--muted)' }}>
              Oversee your property portfolio and monitor listing performance metrics.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/owner/listings/add")}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm tracking-[0.05em] transition-all"
            style={{ border: '1px solid', borderColor: 'var(--panel-border)', color: 'var(--accent)', background: 'transparent' }}
          >
            <PlusCircle size={16} />
            <span>Add New Listing</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Active Listings", value: `${stats.active} / ${stats.total}` },
            { label: "Total Views", value: stats.totalViews.toLocaleString() },
            { label: "Average Rating", value: `${stats.avgRating.toFixed(1)} / 5` },
            { label: "Paused Listings", value: stats.paused },
          ].map(({ label, value }) => (
            <div key={label} className="p-5" style={{ background: 'var(--panel)', border: '1px solid', borderColor: 'var(--panel-border)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(212,175,55,0.5)' }}>{label}</p>
              <p className="mt-2 text-2xl" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--text)' }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            <FilterChip label="All Listings" active={statusFilter === "all" && !verifiedOnly} onClick={() => { setStatusFilter("all"); setVerifiedOnly(false); }} />
            <FilterChip label="Active Only" active={statusFilter === "active"} onClick={() => setStatusFilter("active")} />
            <FilterChip label="Paused" active={statusFilter === "paused"} onClick={() => setStatusFilter("paused")} />
            <FilterChip label="Verified Only" active={verifiedOnly} onClick={() => setVerifiedOnly((v) => !v)} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-[#d4af37]/50 uppercase tracking-widest">Sort by</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-sm px-3 py-1.5 focus:outline-none"
              style={{ border: '1px solid', borderColor: 'var(--panel-border)', background: 'transparent', color: 'var(--text)' }}
            >
              <option value="createdAt">Newest</option>
              <option value="views">Most views</option>
              <option value="price">Highest price</option>
            </select>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin" size={40} style={{ color: 'var(--accent)' }} />
            <p className="tracking-wide" style={{ color: 'var(--muted)' }}>Loading your listings...</p>
          </div>
        ) : error ? (
          <div className="border border-red-500/30 bg-red-500/10 text-red-400 p-6 text-center">{error}</div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-lg mb-2" style={{ color: 'var(--muted)' }}>No property listings found.</p>
            <p className="text-sm mb-6" style={{ color: 'rgba(154,154,154,0.6)' }}>Start by creating your first listing to receive booking inquiries from prospective tenants.</p>
            <button
              type="button"
              onClick={() => navigate("/owner/listings/add")}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm tracking-[0.05em] transition-all"
              style={{ border: '1px solid', borderColor: 'var(--panel-border)', color: 'var(--accent)', background: 'transparent' }}
            >
              <PlusCircle size={16} />
              <span>Add New Listing</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredAndSorted.map((house) => (
              <div key={house._id} className={updatingId === house._id ? "opacity-60 pointer-events-none" : ""}>
                <OwnerListingCard
                  house={house}
                  onToggleAvailability={handleToggleAvailability}
                  onDelete={handleDelete}
                  onReportIssue={handleReportIssue}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default OwnerListings;
