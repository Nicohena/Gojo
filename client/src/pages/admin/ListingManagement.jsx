import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import adminService from "../../api/adminService";
import Navbar from "../../components/layout/Navbar";
import { useConfirmDialog } from "../../components/ui/ConfirmDialog";
import { CardSkeleton } from "../../components/ui/Skeleton";
import Modal from "../../components/ui/Modal";
import logger from "../../utils/logger";
import { Search, Filter, CheckCircle2, XCircle, PauseCircle, PlayCircle, History, Trash2, ExternalLink } from "lucide-react";

const inputCls = "bg-[#1a1a1a] border border-[#d4af37]/10 text-[#f8f6f3] px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]/40 placeholder-[#9a9a9a]/30 transition-all";
const selectCls = "bg-[#1a1a1a] border border-[#d4af37]/10 text-[#9a9a9a] px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]/40 hover:border-[#d4af37]/30 transition-all cursor-pointer appearance-none";

const ListingManagement = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [draftFilters, setDraftFilters] = useState({ city: "", state: "", propertyType: "", minPrice: "", maxPrice: "", available: "" });
  const [appliedFilters, setAppliedFilters] = useState({ city: "", state: "", propertyType: "", minPrice: "", maxPrice: "", available: "" });
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAction, setBulkAction] = useState("");
  const [bulkProgress, setBulkProgress] = useState({ action: "", total: 0, processed: 0 });
  const [bulkResult, setBulkResult] = useState(null);
  const [lastProcessedIds, setLastProcessedIds] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1, limit: 10 });
  const { confirm, ConfirmDialog: ConfirmDialogComponent } = useConfirmDialog();
  const fallbackImage = "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=400&q=80";

  const getListingImageUrl = (listing) => {
    if (!Array.isArray(listing?.images) || listing.images.length === 0) return fallbackImage;
    const primary = listing.images.find((img) => img?.isPrimary);
    if (primary?.url) return primary.url;
    const first = listing.images[0];
    if (typeof first === "string" && first) return first;
    if (typeof first?.url === "string" && first.url) return first.url;
    return fallbackImage;
  };

  useEffect(() => { setPage(1); }, [statusFilter, searchTerm, appliedFilters]);
  useEffect(() => { fetchListings(statusFilter, page, searchTerm, appliedFilters); }, [statusFilter, page, searchTerm, appliedFilters]);
  useEffect(() => { setSelectedIds((prev) => prev.filter((id) => listings.some((l) => l._id === id))); }, [listings]);

  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed.length < 2) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      try {
        const data = await adminService.getPendingListings({
          status: statusFilter,
          ...(statusFilter === "rejected" ? { reportedOnly: "true" } : {}),
          page: 1, limit: 6, search: trimmed,
          city: appliedFilters.city || undefined,
          state: appliedFilters.state || undefined,
          propertyType: appliedFilters.propertyType || undefined,
          minPrice: appliedFilters.minPrice || undefined,
          maxPrice: appliedFilters.maxPrice || undefined,
          available: appliedFilters.available || undefined,
        });
        const nextListings = data?.data?.listings || [];
        setSuggestions(Array.isArray(nextListings) ? nextListings : []);
      } catch { setSuggestions([]); }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput, statusFilter, appliedFilters]);

  const fetchListings = async (status = "pending", currentPage = 1, search = "", filters = appliedFilters) => {
    try {
      setLoading(true);
      const data = await adminService.getPendingListings({
        status,
        ...(status === "rejected" ? { reportedOnly: "true" } : {}),
        page: currentPage, limit, search: search || undefined,
        city: filters.city || undefined,
        state: filters.state || undefined,
        propertyType: filters.propertyType || undefined,
        minPrice: filters.minPrice || undefined,
        maxPrice: filters.maxPrice || undefined,
        available: filters.available || undefined,
      });
      const nextListings = Array.isArray(data) ? data : data?.data?.listings;
      setListings(Array.isArray(nextListings) ? nextListings : []);
      setPagination({
        total: Number(data?.data?.pagination?.total || 0),
        page: Number(data?.data?.pagination?.page || currentPage),
        pages: Number(data?.data?.pagination?.pages || 1),
        limit: Number(data?.data?.pagination?.limit || limit),
      });
    } catch (err) {
      logger.error("Failed to fetch listings", err);
      toast.error("Failed to load listings.");
    } finally { setLoading(false); }
  };

  const refreshCurrentPage = async () => { await fetchListings(statusFilter, page, searchTerm); };

  const areAllSelected = listings.length > 0 && selectedIds.length === listings.length;
  const toggleListingSelection = (listingId) => {
    setSelectedIds((prev) => prev.includes(listingId) ? prev.filter((id) => id !== listingId) : [...prev, listingId]);
  };
  const toggleSelectAllVisible = () => { setSelectedIds(areAllSelected ? [] : listings.map((l) => l._id)); };

  const handleModerationAction = async (listing, action) => {
    const actionConfig = {
      approve: { title: "Approve Listing", message: `Approve "${listing.title}"?`, confirmText: "Approve", variant: "success" },
      reject: { title: "Reject Listing", message: `Reject "${listing.title}"?`, confirmText: "Reject", variant: "danger" },
      pause: { title: "Pause Listing", message: `Pause "${listing.title}"?`, confirmText: "Pause", variant: "warning" },
      activate: { title: "Activate Listing", message: `Activate "${listing.title}"?`, confirmText: "Activate", variant: "success" },
      send_to_review: { title: "Send To Review", message: `Move "${listing.title}" back to pending queue?`, confirmText: "Send", variant: "info" },
      delete: { title: "Delete Listing", message: `Delete "${listing.title}" permanently?`, confirmText: "Delete", variant: "danger" },
    };
    const cfg = actionConfig[action];
    if (!cfg) return;

    const requiresReason = action === "reject" || action === "delete";
    const reason = requiresReason ? window.prompt("Reason:")?.trim() || "" : "";
    if (requiresReason && !reason) { toast.error("Reason is required."); return; }

    await confirm({
      title: cfg.title, message: cfg.message, confirmText: cfg.confirmText, variant: cfg.variant,
      onConfirm: async () => {
        try {
          setUpdatingId(listing._id);
          await adminService.moderateListing(listing._id, action, reason);
          await refreshCurrentPage();
          toast.success("Listing updated.");
        } catch (err) { toast.error("Update failed."); throw err; } finally { setUpdatingId(null); }
      },
    });
  };

  const runBulkAction = async (ids, action, reason = "") => {
    const selectedListingsById = Object.fromEntries(listings.map((item) => [item._id, item]));
    const getLocalFailureReason = (listing, nextAction) => {
      if (!listing) return "";
      const decision = listing?.verified?.decision;
      const status = listing?.verified?.status;
      if (nextAction === "approve" && decision === "approved" && status === true) return "Already approved";
      if (nextAction === "reject" && decision === "rejected" && status === false) return "Already rejected";
      if (nextAction === "pause" && listing.available === false) return "Already paused";
      if (nextAction === "activate" && listing.available === true) return "Already active";
      if (nextAction === "send_to_review" && decision === "pending") return "Already pending";
      return "";
    };

    try {
      setBulkProcessing(true);
      setBulkProgress({ action, total: ids.length, processed: 0 });
      setBulkResult(null);
      const successes = [];
      const failures = [];

      for (const id of ids) {
        const listing = selectedListingsById[id];
        const title = listing?.title || id;
        const localFailure = getLocalFailureReason(listing, action);
        if (localFailure) {
          failures.push({ id, title, reason: localFailure });
          setBulkProgress((prev) => ({ ...prev, processed: Math.min(prev.processed + 1, prev.total) }));
          continue;
        }
        try {
          await adminService.moderateListing(id, action, reason);
          successes.push({ id, title });
        } catch (err) {
          failures.push({ id, title, reason: err?.response?.data?.message || err?.message || "Error" });
        } finally {
          setBulkProgress((prev) => ({ ...prev, processed: Math.min(prev.processed + 1, prev.total) }));
        }
      }

      await refreshCurrentPage();
      setSelectedIds([]);
      setBulkResult({ action, reason, total: ids.length, processedIds: ids, successCount: successes.length, failureCount: failures.length, successes, failures, completedAt: new Date().toISOString() });
      setLastProcessedIds(ids);
      toast.success(`Bulk action completed.`);
    } catch (err) { toast.error("Bulk action failed."); } finally { setBulkProcessing(false); }
  };

  const handleBulkModeration = async () => {
    if (!bulkAction || !selectedIds.length) { toast.error("Select action and listings."); return; }
    const needsReason = bulkAction === "reject" || bulkAction === "delete";
    const reason = needsReason ? window.prompt("Reason:")?.trim() || "" : "";
    if (needsReason && !reason) { toast.error("Reason required."); return; }

    await confirm({
      title: "Run Bulk Action", message: `Apply "${bulkAction}" to ${selectedIds.length} listings?`, confirmText: "Run", variant: "warning",
      onConfirm: async () => { await runBulkAction(selectedIds, bulkAction, reason); },
    });
  };

  const handleRetryFailedOnly = async () => {
    if (!bulkResult?.failureCount) return;
    const action = bulkResult.action;
    const failedIds = bulkResult.failures.map((item) => item.id);
    let reason = bulkResult.reason || "";
    if ((action === "reject" || action === "delete") && !reason) {
      reason = window.prompt("Reason for retry:")?.trim() || "";
      if (!reason) { toast.error("Reason required."); return; }
    }
    await confirm({
      title: "Retry Failed", message: `Retry for ${failedIds.length} listings?`, confirmText: "Retry", variant: "warning",
      onConfirm: async () => { await runBulkAction(failedIds, action, reason); },
    });
  };

  const handleRepeatLastBulkAction = async () => {
    const ids = bulkResult?.processedIds?.length ? bulkResult.processedIds : lastProcessedIds;
    const action = bulkResult?.action || bulkAction;
    if (!ids?.length || !action) { toast.error("Nothing to repeat."); return; }
    let reason = bulkResult?.reason || "";
    if ((action === "reject" || action === "delete") && !reason) {
      reason = window.prompt("Reason:")?.trim() || "";
      if (!reason) { toast.error("Reason required."); return; }
    }
    await confirm({
      title: "Repeat Bulk Action", message: `Run again on ${ids.length} listings?`, confirmText: "Run Again", variant: "warning",
      onConfirm: async () => { await runBulkAction(ids, action, reason); },
    });
  };

  const handleExport = () => {
    if (!listings.length) return;
    const rows = [["Title", "Owner", "Email", "City", "Price", "Decision"], ...listings.map((l) => [l.title, l.ownerId?.name, l.ownerId?.email, l.location?.city, l.price, l.verified?.decision])];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `listings-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusTabCls = (active) => `px-6 py-2.5 text-xs font-bold tracking-widest uppercase transition-all border-b-2 ${active ? "text-[#d4af37] border-[#d4af37] bg-[#d4af37]/5" : "text-[#9a9a9a] border-transparent hover:text-[#f8f6f3]"}`;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl text-[#f8f6f3]" style={{ fontFamily: "'Playfair Display', serif" }}>Listing Management</h1>
            <p className="mt-2 text-[#9a9a9a] tracking-wide max-w-2xl">Review listing quality, moderate availability, and manage verification lifecycle across the platform.</p>
          </div>
          <button onClick={handleExport} className="flex items-center gap-2 px-6 py-2 border border-[#d4af37]/20 text-[#d4af37] text-xs font-bold tracking-widest uppercase hover:border-[#d4af37] transition-all">Export CSV</button>
        </div>

        <div className="mb-8 flex border-b border-[#d4af37]/10">
          {["all", "pending", "rejected", "approved"].map(status => (
            <button key={status} onClick={() => setStatusFilter(status)} className={statusTabCls(statusFilter === status)}>
              {status === "rejected" ? "Rejected Reports" : status}
            </button>
          ))}
        </div>

        <div className="bg-[#111] border border-[#d4af37]/10 p-6 mb-8">
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#d4af37]/50 mb-4 flex items-center gap-2"><Filter size={12} /> Advanced Intelligence Filters</p>
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <input value={draftFilters.city} onChange={(e) => setDraftFilters(p => ({ ...p, city: e.target.value }))} placeholder="City" className={inputCls} />
            <input value={draftFilters.state} onChange={(e) => setDraftFilters(p => ({ ...p, state: e.target.value }))} placeholder="State" className={inputCls} />
            <div className="relative">
              <select value={draftFilters.propertyType} onChange={(e) => setDraftFilters(p => ({ ...p, propertyType: e.target.value }))} className={`${selectCls} w-full`}><option value="">All Types</option><option value="apartment">Apartment</option><option value="house">House</option><option value="condo">Condo</option></select>
            </div>
            <input value={draftFilters.minPrice} onChange={(e) => setDraftFilters(p => ({ ...p, minPrice: e.target.value }))} placeholder="Min Price" type="number" className={inputCls} />
            <input value={draftFilters.maxPrice} onChange={(e) => setDraftFilters(p => ({ ...p, maxPrice: e.target.value }))} placeholder="Max Price" type="number" className={inputCls} />
            <select value={draftFilters.available} onChange={(e) => setDraftFilters(p => ({ ...p, available: e.target.value }))} className={`${selectCls} w-full`}><option value="">Availability</option><option value="true">Active</option><option value="false">Paused</option></select>
          </div>
          <div className="mt-6 flex items-center gap-4 border-t border-[#d4af37]/5 pt-6">
            <button onClick={() => setAppliedFilters(draftFilters)} className="px-6 py-2 bg-[#d4af37] text-[#0a0a0a] text-xs font-bold tracking-widest uppercase hover:bg-[#b8941f] transition-all">Apply Intelligence</button>
            <button onClick={() => { const r = { city: "", state: "", propertyType: "", minPrice: "", maxPrice: "", available: "" }; setDraftFilters(r); setAppliedFilters(r); }} className="text-xs text-[#9a9a9a] uppercase tracking-widest hover:text-[#d4af37] transition-all">Reset All</button>
            <div className="ml-auto relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#9a9a9a]" />
              <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search title, address..." className={`${inputCls} w-full pl-10`} onKeyDown={(e) => e.key === 'Enter' && setSearchTerm(searchInput.trim())} />
            </div>
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between text-[11px] uppercase tracking-widest font-bold text-[#9a9a9a]">
          <span>Analysis Results: {pagination.total} Listings</span>
          {selectedIds.length > 0 && <span className="text-[#d4af37]">{selectedIds.length} Selected Objects</span>}
        </div>

        {!loading && listings.length > 0 && (
          <div className="mb-8 bg-[#1a1a1a] border border-[#d4af37]/20 p-4 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-3 text-xs text-[#f8f6f3] font-medium cursor-pointer">
              <input type="checkbox" checked={areAllSelected} onChange={toggleSelectAllVisible} className="h-4 w-4 bg-[#0a0a0a] border-[#d4af37]/30 rounded focus:ring-0 checked:bg-[#d4af37]" />
              Select Visibility Range
            </label>
            <div className="h-4 w-px bg-[#d4af37]/10 mx-2" />
            <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)} className={`${selectCls} min-w-[160px] border-[#d4af37]/30`}>
              <option value="">Bulk Operational Mode...</option><option value="approve">Approve</option><option value="reject">Reject</option><option value="pause">Pause</option><option value="activate">Activate</option><option value="delete">Delete</option>
            </select>
            <button onClick={handleBulkModeration} disabled={!selectedIds.length || !bulkAction || bulkProcessing} className="px-6 py-2 bg-[#d4af37] text-[#0a0a0a] text-xs font-bold tracking-widest uppercase hover:bg-[#b8941f] disabled:opacity-30 transition-all">
              {bulkProcessing ? `Executing...` : "Run Processor"}
            </button>
            <button onClick={() => setSelectedIds([])} className="text-xs text-[#9a9a9a] uppercase tracking-widest hover:text-white ml-2">Clear</button>
          </div>
        )}

        {bulkResult && (
          <div className="mb-8 p-5 border border-[#d4af37]/30 bg-[#d4af37]/5 animate-in fade-in slide-in-from-top-2">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <p className="text-xs font-bold text-[#d4af37] uppercase tracking-widest flex items-center gap-2"><History size={14} /> Processor Intelligence Log</p>
                <p className="text-[13px] text-[#f8f6f3] mt-2">Mode: <span className="uppercase text-[#d4af37]">{bulkResult.action}</span> | Status: {bulkResult.successCount} Successful, {bulkResult.failureCount} Failures</p>
              </div>
              <div className="flex gap-2">
                {bulkResult.failureCount > 0 && <button onClick={handleRetryFailedOnly} className="px-4 py-1.5 bg-red-500 text-white text-[10px] font-bold uppercase tracking-tighter">Retry Failures</button>}
                <button onClick={handleRepeatLastBulkAction} className="px-4 py-1.5 bg-[#d4af37] text-[#0a0a0a] text-[10px] font-bold uppercase tracking-tighter">Repeat Full Batch</button>
                <button onClick={() => setBulkResult(null)} className="p-1.5 text-[#9a9a9a] hover:text-white"><XCircle size={18} /></button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-6">{[1, 2, 3].map(i => <div key={i} className="h-64 bg-[#111] animate-pulse border border-[#d4af37]/5" />)}</div>
        ) : (
          <div className="space-y-6">
            {listings.map((listing) => (
              <div key={listing._id} className={`group bg-[#111] border border-[#d4af37]/10 flex flex-col md:flex-row gap-8 p-1 hover:border-[#d4af37]/40 transition-all overflow-hidden ${updatingId === listing._id ? "opacity-30" : ""}`}>
                <div className="relative w-full md:w-[350px] shrink-0 h-[240px]">
                  <img src={getListingImageUrl(listing)} alt={listing.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute top-4 left-4 p-2 bg-[#0a0a0a]/80 backdrop-blur-sm">
                    <input type="checkbox" checked={selectedIds.includes(listing._id)} onChange={() => toggleListingSelection(listing._id)} className="h-5 w-5 bg-[#0a0a0a] border-[#d4af37] text-[#d4af37] focus:ring-0" />
                  </div>
                  <div className="absolute bottom-0 right-0 left-0 p-4 bg-gradient-to-t from-[#0a0a0a] to-transparent">
                    <div className="flex gap-2">
                       <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${listing.available ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20" : "bg-[#333] text-gray-400 border border-gray-600"}`}>
                        {listing.available ? "Active" : "Paused"}
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${listing.verified?.decision === "approved" ? "bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/20" : listing.verified?.decision === "rejected" ? "bg-red-500/20 text-red-500 border border-red-500/20" : "bg-amber-500/20 text-amber-500 border border-amber-500/20"}`}>
                        {listing.verified?.decision || "Pending"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex-1 py-8 md:pr-10 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                       <h2 className="text-2xl text-[#f8f6f3]" style={{ fontFamily: "'Playfair Display', serif" }}>{listing.title}</h2>
                       <button onClick={() => setSelectedListing(listing)} className="text-[#d4af37] hover:text-white transition-all"><ExternalLink size={18} /></button>
                    </div>
                    <p className="text-[#9a9a9a] text-sm mb-4 italic">{listing.location?.address}, {listing.location?.city}</p>
                    <p className="text-2xl text-[#d4af37] mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>ETB {listing.price?.toLocaleString()}<span className="text-[10px] text-[#9a9a9a] uppercase tracking-widest ml-2 font-sans font-bold">/ Monthly Lease</span></p>

                    <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-8 border-t border-[#d4af37]/5 pt-6">
                      <div className="text-[12px]"><span className="text-[#9a9a9a] uppercase tracking-tighter mr-2">Owner</span> <span className="text-[#f8f6f3] font-medium">{listing.ownerId?.name || "Unknown"}</span></div>
                      <div className="text-[12px]"><span className="text-[#9a9a9a] uppercase tracking-tighter mr-2">Email</span> <span className="text-[#f8f6f3] font-medium">{listing.ownerId?.email || "N/A"}</span></div>
                      <div className="text-[12px]"><span className="text-[#9a9a9a] uppercase tracking-tighter mr-2">Phone</span> <span className="text-[#f8f6f3] font-medium">{listing.ownerId?.phone || "N/A"}</span></div>
                      <div className="text-[12px]"><span className="text-[#9a9a9a] uppercase tracking-tighter mr-2">Type</span> <span className="text-[#f8f6f3] font-medium capitalize">{listing.propertyType}</span></div>
                    </div>

                    {listing.verified?.rejectionReason && <div className="mb-6 p-3 bg-red-900/10 border-l-2 border-red-500 text-[12px] text-red-300">MODERATION: {listing.verified.rejectionReason}</div>}
                    {listing.verified?.ownerReport?.status === "submitted" && <div className="mb-6 p-3 bg-amber-900/10 border-l-2 border-amber-500 text-[12px] text-amber-200">OWNER APPEAL: {listing.verified.ownerReport.message}</div>}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {listing.verified?.decision !== "approved" && (
                      <button onClick={() => handleModerationAction(listing, "approve")} className="px-6 py-2 bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-2"><CheckCircle2 size={14} /> {statusFilter === "rejected" ? "Undo Rejection" : "Approve"}</button>
                    )}
                    {listing.verified?.decision !== "rejected" && (
                      <button onClick={() => handleModerationAction(listing, "reject")} className="px-6 py-2 bg-red-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-red-700 transition-all flex items-center gap-2"><XCircle size={14} /> Reject</button>
                    )}
                    <button onClick={() => handleModerationAction(listing, listing.available ? "pause" : "activate")} className="px-6 py-2 border border-[#d4af37]/20 text-[#d4af37] text-[10px] font-bold uppercase tracking-widest hover:bg-[#d4af37]/5 transition-all flex items-center gap-2">
                       {listing.available ? <><PauseCircle size={14}/> Pause</> : <><PlayCircle size={14}/> Activate</>}
                    </button>
                    {listing.verified?.decision === "rejected" && (
                      <button onClick={() => handleModerationAction(listing, "send_to_review")} className="px-6 py-2 border border-[#d4af37]/20 text-[#d4af37] text-[10px] font-bold uppercase tracking-widest hover:bg-[#d4af37]/5 transition-all">Send To Review</button>
                    )}
                    <button onClick={() => handleModerationAction(listing, "delete")} className="ml-auto p-2 text-red-500/40 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                  </div>
                </div>
              </div>
            ))}
            {listings.length === 0 && (
              <div className="bg-[#111] p-24 text-center border border-dashed border-[#d4af37]/20">
                <Search className="h-16 w-16 text-[#d4af37]/10 mx-auto mb-6" />
                <p className="text-[#f8f6f3] text-2xl font-bold italic mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>Zero Matches Identified</p>
                <p className="text-[#9a9a9a] uppercase tracking-widest text-[10px] font-bold">Adjust intelligence parameters and try again.</p>
              </div>
            )}
          </div>
        )}

        {!loading && pagination.pages > 1 && (
          <div className="mt-12 flex items-center justify-between">
            <button disabled={pagination.page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-8 py-3 border border-[#d4af37]/15 text-[#9a9a9a] text-[10px] font-bold uppercase tracking-widest hover:border-[#d4af37] hover:text-[#f8f6f3] disabled:opacity-20 transition-all">Previous</button>
            <span className="text-[10px] text-[#9a9a9a] font-bold tracking-widest uppercase">Encryption / Page {pagination.page} OF {pagination.pages}</span>
            <button disabled={pagination.page >= pagination.pages} onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} className="px-8 py-3 border border-[#d4af37]/15 text-[#9a9a9a] text-[10px] font-bold uppercase tracking-widest hover:border-[#d4af37] hover:text-[#f8f6f3] disabled:opacity-20 transition-all">Next</button>
          </div>
        )}
      </div>

      <Modal isOpen={!!selectedListing} onClose={() => setSelectedListing(null)} title="Intelligence Profile Dossier" size="lg">
        {selectedListing && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 text-[13px] text-[#f8f6f3] py-4">
            <div className="space-y-4">
              <div className="border-b border-[#d4af37]/10 pb-2">
                <p className="text-[10px] font-bold text-[#d4af37]/50 uppercase tracking-widest">Identification</p>
                <p className="mt-1 font-bold text-lg">{selectedListing.title}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#d4af37]/50 uppercase tracking-widest">Spatial Description</p>
                <p className="mt-1 text-[#9a9a9a] leading-relaxed">{selectedListing.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-[10px] font-bold text-[#d4af37]/50 uppercase tracking-widest">Type</p><p className="mt-1 capitalize">{selectedListing.propertyType}</p></div>
                <div><p className="text-[10px] font-bold text-[#d4af37]/50 uppercase tracking-widest">Configuration</p><p className="mt-1">{selectedListing.rooms?.bedrooms} Bed / {selectedListing.rooms?.bathrooms} Bath</p></div>
              </div>
            </div>
            <div className="space-y-2">
               <p className="text-[10px] font-bold text-[#d4af37]/50 uppercase tracking-widest mb-3 italic">Technical Metadata</p>
               {[
                 {l: "Listing UID", v: selectedListing._id},
                 {l: "Ownership Entity", v: selectedListing.ownerId?.name || "N/A"},
                 {l: "Contact Channel", v: selectedListing.ownerId?.email || "N/A"},
                 {l: "Entity Status", v: selectedListing.ownerId?.banned?.isBanned ? "RESTRICTED" : "ACTIVE"},
                 {l: "Rating Metric", v: `${Number(selectedListing.ownerId?.rating?.average || 0).toFixed(1)} / 5.0`},
                 {l: "Primary Market City", v: selectedListing.location?.city || "N/A"},
                 {l: "Financial Yield", v: `ETB ${Number(selectedListing.price || 0).toLocaleString()} / Mo`},
                 {l: "Moderation Status", v: (selectedListing.verified?.decision || "pending").toUpperCase()}
               ].map(i => (
                 <div key={i.l} className="flex justify-between items-center py-1.5 border-b border-[#d4af37]/5 last:border-0">
                    <span className="text-[11px] text-[#9a9a9a] uppercase tracking-tighter">{i.l}</span>
                    <span className="font-medium">{i.v}</span>
                 </div>
               ))}
               <div className="mt-6 p-4 bg-[#0a0a0a] border border-[#d4af37]/10 text-[11px] leading-relaxed text-[#9a9a9a]">
                  <span className="text-[#d4af37] font-bold uppercase tracking-widest mr-2">Audit Trace:</span>
                  Created on {new Date(selectedListing.createdAt).toLocaleString()} with {selectedListing.viewCount || 0} interaction records.
               </div>
            </div>
          </div>
        )}
      </Modal>
      <ConfirmDialogComponent />
    </div>
  );
};

export default ListingManagement;
