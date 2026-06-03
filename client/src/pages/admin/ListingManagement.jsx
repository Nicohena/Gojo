import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import adminService from "../../api/adminService";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { Navbar } from "../../components/layout/Navbar";
import { useConfirmDialog } from "../../components/ui/ConfirmDialog";
import Modal from "../../components/ui/Modal";
import logger from "../../utils/logger";
import { Search, CheckCircle2, XCircle, PauseCircle, PlayCircle, History, Trash2, ExternalLink, Plus, ChevronLeft, ChevronRight, Filter } from "lucide-react";

const CORAL = "#E67E5F";
const inputCls = "bg-white border border-gray-200 text-gray-700 px-3 py-2 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E67E5F]/30 focus:border-[#E67E5F] placeholder-gray-300 transition-all w-full";
const selectCls = "bg-white border border-gray-200 text-gray-600 px-3 py-2 text-sm rounded-xl focus:outline-none cursor-pointer appearance-none w-full";

const StatusBadge = ({ decision, available }) => {
  if (decision === "approved" && available !== false) return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Active</span>;
  if (decision === "rejected") return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />Rejected</span>;
  if (available === false) return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500"><span className="w-1.5 h-1.5 rounded-full bg-gray-400" />Paused</span>;
  return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />Pending Review</span>;
};

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
  const [selectedListing, setSelectedListing] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAction, setBulkAction] = useState("");
  const [bulkResult, setBulkResult] = useState(null);
  const [lastProcessedIds, setLastProcessedIds] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1, limit: 10 });
  const { confirm, ConfirmDialog: ConfirmDialogComponent } = useConfirmDialog();
  const fallbackImage = "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=400&q=80";

  const getListingImageUrl = (listing) => {
    if (!Array.isArray(listing?.images) || !listing.images.length) return fallbackImage;
    const primary = listing.images.find(img => img?.isPrimary);
    if (primary?.url) return primary.url;
    const first = listing.images[0];
    if (typeof first === "string" && first) return first;
    if (typeof first?.url === "string" && first.url) return first.url;
    return fallbackImage;
  };

  useEffect(() => { setPage(1); }, [statusFilter, searchTerm, appliedFilters]);
  useEffect(() => { fetchListings(statusFilter, page, searchTerm, appliedFilters); }, [statusFilter, page, searchTerm, appliedFilters]);
  useEffect(() => { setSelectedIds(prev => prev.filter(id => listings.some(l => l._id === id))); }, [listings]);

  const fetchListings = async (status = "pending", currentPage = 1, search = "", filters = appliedFilters) => {
    try {
      setLoading(true);
      const data = await adminService.getPendingListings({
        status, ...(status === "rejected" ? { reportedOnly: "true" } : {}),
        page: currentPage, limit, search: search || undefined,
        city: filters.city || undefined, state: filters.state || undefined,
        propertyType: filters.propertyType || undefined, minPrice: filters.minPrice || undefined,
        maxPrice: filters.maxPrice || undefined, available: filters.available || undefined,
      });
      const nextListings = Array.isArray(data) ? data : data?.data?.listings;
      setListings(Array.isArray(nextListings) ? nextListings : []);
      setPagination({ total: Number(data?.data?.pagination?.total || 0), page: Number(data?.data?.pagination?.page || currentPage), pages: Number(data?.data?.pagination?.pages || 1), limit: Number(data?.data?.pagination?.limit || limit) });
    } catch (err) { logger.error("Failed to fetch listings", err); toast.error("Failed to load listings."); }
    finally { setLoading(false); }
  };

  const refreshCurrentPage = async () => { await fetchListings(statusFilter, page, searchTerm); };
  const areAllSelected = listings.length > 0 && selectedIds.length === listings.length;
  const toggleListingSelection = id => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSelectAllVisible = () => setSelectedIds(areAllSelected ? [] : listings.map(l => l._id));

  const handleModerationAction = async (listing, action) => {
    const cfg = { approve: { title: "Approve", confirmText: "Approve", variant: "success" }, reject: { title: "Reject", confirmText: "Reject", variant: "danger" }, pause: { title: "Pause", confirmText: "Pause", variant: "warning" }, activate: { title: "Activate", confirmText: "Activate", variant: "success" }, send_to_review: { title: "Send To Review", confirmText: "Send", variant: "info" }, delete: { title: "Delete", confirmText: "Delete", variant: "danger" } }[action];
    if (!cfg) return;
    const requiresReason = action === "reject" || action === "delete";
    const reason = requiresReason ? window.prompt("Reason:")?.trim() || "" : "";
    if (requiresReason && !reason) { toast.error("Reason is required."); return; }
    await confirm({ title: `${cfg.title} Listing`, message: `${cfg.title} "${listing.title}"?`, confirmText: cfg.confirmText, variant: cfg.variant,
      onConfirm: async () => {
        try { setUpdatingId(listing._id); await adminService.moderateListing(listing._id, action, reason); await refreshCurrentPage(); toast.success("Listing updated."); }
        catch (err) { toast.error("Update failed."); throw err; }
        finally { setUpdatingId(null); }
      },
    });
  };

  const runBulkAction = async (ids, action, reason = "") => {
    const byId = Object.fromEntries(listings.map(item => [item._id, item]));
    const getSkipReason = (l, a) => {
      if (!l) return "";
      const d = l?.verified?.decision;
      if (a === "approve" && d === "approved" && l?.verified?.status === true) return "Already approved";
      if (a === "reject" && d === "rejected" && l?.verified?.status === false) return "Already rejected";
      if (a === "pause" && l.available === false) return "Already paused";
      if (a === "activate" && l.available === true) return "Already active";
      if (a === "send_to_review" && d === "pending") return "Already pending";
      return "";
    };
    try {
      setBulkProcessing(true); setBulkResult(null);
      const successes = [], failures = [];
      for (const id of ids) {
        const listing = byId[id];
        const skip = getSkipReason(listing, action);
        if (skip) { failures.push({ id, title: listing?.title || id, reason: skip }); continue; }
        try { await adminService.moderateListing(id, action, reason); successes.push({ id, title: listing?.title || id }); }
        catch (err) { failures.push({ id, title: listing?.title || id, reason: err?.response?.data?.message || "Error" }); }
      }
      await refreshCurrentPage(); setSelectedIds([]);
      setBulkResult({ action, reason, total: ids.length, processedIds: ids, successCount: successes.length, failureCount: failures.length, successes, failures });
      setLastProcessedIds(ids);
      toast.success("Bulk action completed.");
    } catch { toast.error("Bulk action failed."); } finally { setBulkProcessing(false); }
  };

  const handleBulkModeration = async () => {
    if (!bulkAction || !selectedIds.length) { toast.error("Select action and listings."); return; }
    const needsReason = bulkAction === "reject" || bulkAction === "delete";
    const reason = needsReason ? window.prompt("Reason:")?.trim() || "" : "";
    if (needsReason && !reason) { toast.error("Reason required."); return; }
    await confirm({ title: "Run Bulk Action", message: `Apply "${bulkAction}" to ${selectedIds.length} listings?`, confirmText: "Run", variant: "warning",
      onConfirm: async () => { await runBulkAction(selectedIds, bulkAction, reason); },
    });
  };

  const handleRetryFailedOnly = async () => {
    if (!bulkResult?.failureCount) return;
    const action = bulkResult.action;
    const failedIds = bulkResult.failures.map(item => item.id);
    let reason = bulkResult.reason || "";
    if ((action === "reject" || action === "delete") && !reason) { reason = window.prompt("Reason:")?.trim() || ""; if (!reason) { toast.error("Reason required."); return; } }
    await confirm({ title: "Retry Failed", message: `Retry for ${failedIds.length} listings?`, confirmText: "Retry", variant: "warning",
      onConfirm: async () => { await runBulkAction(failedIds, action, reason); },
    });
  };

  const handleRepeatLastBulkAction = async () => {
    const ids = bulkResult?.processedIds?.length ? bulkResult.processedIds : lastProcessedIds;
    const action = bulkResult?.action || bulkAction;
    if (!ids?.length || !action) { toast.error("Nothing to repeat."); return; }
    let reason = bulkResult?.reason || "";
    if ((action === "reject" || action === "delete") && !reason) { reason = window.prompt("Reason:")?.trim() || ""; if (!reason) { toast.error("Reason required."); return; } }
    await confirm({ title: "Repeat Bulk Action", message: `Run again on ${ids.length} listings?`, confirmText: "Run Again", variant: "warning",
      onConfirm: async () => { await runBulkAction(ids, action, reason); },
    });
  };

  const handleExport = () => {
    if (!listings.length) return;
    const rows = [["Title","Owner","Email","City","Price","Decision"], ...listings.map(l => [l.title, l.ownerId?.name, l.ownerId?.email, l.location?.city, l.price, l.verified?.decision])];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `listings-export-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <Navbar />
      <div className="px-6 py-6 max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Property Management</h1>
            <p className="text-sm text-gray-400 mt-0.5">Manage your portfolio, review pending listings, and monitor property status.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={handleExport} className="px-4 py-2 text-xs font-semibold border border-gray-200 text-gray-600 rounded-xl hover:border-gray-300 transition-all">Export CSV</button>
            <button className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl text-white" style={{ background: CORAL }}>
              <Plus size={14} /> Add Property
            </button>
          </div>
        </div>

        {/* Search + filter */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-300" />
              <input value={searchInput} onChange={e => setSearchInput(e.target.value)} onKeyDown={e => e.key === "Enter" && setSearchTerm(searchInput.trim())}
                placeholder="Search properties..." className={`${inputCls} pl-9`} />
            </div>
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {["all","pending","rejected","approved"].map(status => (
                <button key={status} onClick={() => setStatusFilter(status)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all"
                  style={statusFilter === status ? { background: CORAL, color: "white" } : { color: "#6B7280" }}>
                  {status === "rejected" ? "Flagged" : status}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <input value={draftFilters.city} onChange={e => setDraftFilters(p => ({ ...p, city: e.target.value }))} placeholder="City" className={inputCls} />
            <input value={draftFilters.state} onChange={e => setDraftFilters(p => ({ ...p, state: e.target.value }))} placeholder="Region" className={inputCls} />
            <select value={draftFilters.propertyType} onChange={e => setDraftFilters(p => ({ ...p, propertyType: e.target.value }))} className={selectCls}>
              <option value="">All Types</option><option value="apartment">Apartment</option><option value="house">House</option><option value="condo">Condo</option>
            </select>
            <input value={draftFilters.minPrice} onChange={e => setDraftFilters(p => ({ ...p, minPrice: e.target.value }))} placeholder="Min Price" type="number" className={inputCls} />
            <input value={draftFilters.maxPrice} onChange={e => setDraftFilters(p => ({ ...p, maxPrice: e.target.value }))} placeholder="Max Price" type="number" className={inputCls} />
            <select value={draftFilters.available} onChange={e => setDraftFilters(p => ({ ...p, available: e.target.value }))} className={selectCls}>
              <option value="">Availability</option><option value="true">Active</option><option value="false">Paused</option>
            </select>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <button onClick={() => setAppliedFilters(draftFilters)} className="px-4 py-2 text-xs font-semibold rounded-xl text-white" style={{ background: CORAL }}>Apply Filters</button>
            <button onClick={() => { const r = { city:"",state:"",propertyType:"",minPrice:"",maxPrice:"",available:"" }; setDraftFilters(r); setAppliedFilters(r); }} className="text-xs font-medium text-gray-400 hover:text-gray-600">Clear</button>
            <span className="ml-auto text-xs text-gray-400">{pagination.total} result{pagination.total !== 1 ? "s" : ""}{selectedIds.length > 0 && <span className="ml-2 font-semibold" style={{ color: CORAL }}>· {selectedIds.length} selected</span>}</span>
          </div>
        </div>

        {/* Bulk action bar */}
        {!loading && listings.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600 font-medium cursor-pointer select-none">
              <input type="checkbox" checked={areAllSelected} onChange={toggleSelectAllVisible} className="rounded border-gray-300 accent-[#E67E5F]" /> Select All
            </label>
            <div className="h-4 w-px bg-gray-200 mx-1" />
            <select value={bulkAction} onChange={e => setBulkAction(e.target.value)} className="border border-gray-200 text-gray-600 text-sm px-3 py-1.5 rounded-xl focus:outline-none min-w-[160px]">
              <option value="">Bulk Action…</option><option value="approve">Approve</option><option value="reject">Reject</option><option value="pause">Pause</option><option value="activate">Activate</option><option value="delete">Delete</option>
            </select>
            <button onClick={handleBulkModeration} disabled={!selectedIds.length || !bulkAction || bulkProcessing}
              className="px-4 py-1.5 text-xs font-semibold rounded-xl text-white disabled:opacity-40" style={{ background: CORAL }}>
              {bulkProcessing ? "Processing…" : "Apply"}
            </button>
            {selectedIds.length > 0 && <button onClick={() => setSelectedIds([])} className="text-xs text-gray-400 hover:text-gray-600">Clear selection</button>}
          </div>
        )}

        {/* Bulk result */}
        {bulkResult && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1"><History size={12} /> Action History</p>
              <p className="text-sm text-gray-700">
                <span className="font-semibold capitalize">{bulkResult.action}</span> — <span className="text-emerald-600 font-semibold">{bulkResult.successCount} ok</span>
                {bulkResult.failureCount > 0 && <span className="text-red-500 font-semibold ml-2">{bulkResult.failureCount} failed</span>}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              {bulkResult.failureCount > 0 && <button onClick={handleRetryFailedOnly} className="px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-xl">Retry Failures</button>}
              <button onClick={handleRepeatLastBulkAction} className="px-3 py-1.5 text-xs font-semibold rounded-xl text-white" style={{ background: CORAL }}>Repeat Batch</button>
              <button onClick={() => setBulkResult(null)} className="text-gray-400 hover:text-gray-600 p-1"><XCircle size={16} /></button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : listings.length === 0 ? (
            <div className="py-24 text-center">
              <Search className="h-12 w-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 font-semibold">No listings found</p>
              <p className="text-sm text-gray-400 mt-1">Adjust your filters and try again.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="w-10 px-4 py-3"><input type="checkbox" checked={areAllSelected} onChange={toggleSelectAllVisible} className="rounded border-gray-300 accent-[#E67E5F]" /></th>
                    {["ID","Property Name","Owner","Status","Date Added","Actions"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {listings.map(listing => (
                    <tr key={listing._id} className={`hover:bg-gray-50/60 transition-colors ${updatingId === listing._id ? "opacity-40 pointer-events-none" : ""}`}>
                      <td className="px-4 py-4"><input type="checkbox" checked={selectedIds.includes(listing._id)} onChange={() => toggleListingSelection(listing._id)} className="rounded border-gray-300 accent-[#E67E5F]" /></td>
                      <td className="px-4 py-4 text-xs text-gray-400 font-mono">#{String(listing._id).slice(-4).toUpperCase()}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <img src={getListingImageUrl(listing)} alt={listing.title} className="w-12 h-12 rounded-xl object-cover shrink-0 border border-gray-100" />
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-800 truncate max-w-[180px]">{listing.title}</p>
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5 truncate max-w-[180px]">
                              <span className="shrink-0">📍</span>{listing.location?.city}, {listing.location?.address}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
                            {(listing.ownerId?.name?.[0] || "?").toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-700 truncate max-w-[120px]">{listing.ownerId?.name || "Unknown"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4"><StatusBadge decision={listing.verified?.decision} available={listing.available} /></td>
                      <td className="px-4 py-4 text-xs text-gray-400 whitespace-nowrap">{listing.createdAt ? new Date(listing.createdAt).toLocaleDateString() : "—"}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {listing.verified?.decision !== "approved" && (
                            <button onClick={() => handleModerationAction(listing, "approve")} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 flex items-center gap-1">
                              <CheckCircle2 size={12} />Approve
                            </button>
                          )}
                          {listing.verified?.decision !== "rejected" && (
                            <button onClick={() => handleModerationAction(listing, "reject")} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center gap-1">
                              <XCircle size={12} />Reject
                            </button>
                          )}
                          <button onClick={() => handleModerationAction(listing, listing.available ? "pause" : "activate")} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center gap-1">
                            {listing.available ? <><PauseCircle size={12} />Pause</> : <><PlayCircle size={12} />Activate</>}
                          </button>
                          <button onClick={() => setSelectedListing(listing)} className="p-1.5 text-gray-400 hover:text-gray-700" title="View details"><ExternalLink size={14} /></button>
                          <button onClick={() => handleModerationAction(listing, "delete")} className="p-1.5 text-red-400 hover:text-red-600" title="Delete"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && pagination.pages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <button disabled={pagination.page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:border-gray-300 disabled:opacity-30 transition-all">
              <ChevronLeft size={14} /> Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button key={pageNum} onClick={() => setPage(pageNum)} className="w-8 h-8 text-sm font-medium rounded-lg transition-all"
                    style={pagination.page === pageNum ? { background: CORAL, color: "white" } : { color: "#6B7280" }}>{pageNum}</button>
                );
              })}
              {pagination.pages > 5 && <span className="text-gray-400 text-sm px-1">… {pagination.pages}</span>}
            </div>
            <button disabled={pagination.page >= pagination.pages} onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:border-gray-300 disabled:opacity-30 transition-all">
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Detail modal */}
      <Modal isOpen={!!selectedListing} onClose={() => setSelectedListing(null)} title="Property Details" size="lg">
        {selectedListing && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-700 py-2">
            <div className="space-y-4">
              <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Property</p><p className="font-bold text-lg text-gray-800 mt-0.5">{selectedListing.title}</p></div>
              <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Description</p><p className="mt-0.5 text-gray-500 leading-relaxed">{selectedListing.description}</p></div>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Type</p><p className="mt-0.5 capitalize font-medium">{selectedListing.propertyType}</p></div>
                <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Rooms</p><p className="mt-0.5 font-medium">{selectedListing.rooms?.bedrooms} Bed / {selectedListing.rooms?.bathrooms} Bath</p></div>
              </div>
            </div>
            <div className="space-y-3">
              {[{ l: "Property ID", v: selectedListing._id }, { l: "Owner", v: selectedListing.ownerId?.name || "N/A" }, { l: "Email", v: selectedListing.ownerId?.email || "N/A" }, { l: "Phone", v: selectedListing.ownerId?.phone || "N/A" }, { l: "Price", v: `ETB ${selectedListing.price?.toLocaleString()}/mo` }, { l: "Decision", v: selectedListing.verified?.decision || "pending" }, { l: "Available", v: selectedListing.available ? "Yes" : "No" }].map(item => (
                <div key={item.l} className="flex justify-between items-start border-b border-gray-50 pb-2">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{item.l}</span>
                  <span className="font-medium text-gray-700 text-right max-w-[200px] truncate">{item.v}</span>
                </div>
              ))}
              {selectedListing.verified?.rejectionReason && (
                <div className="mt-2 p-3 bg-red-50 rounded-xl border border-red-100 text-xs text-red-600">
                  <span className="font-bold block mb-1">Rejection Reason</span>{selectedListing.verified.rejectionReason}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
      <ConfirmDialogComponent />
    </DashboardLayout>
  );
};

export default ListingManagement;
