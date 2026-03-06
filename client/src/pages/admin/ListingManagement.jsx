import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import adminService from "../../api/adminService";
import Navbar from "../../components/layout/Navbar";
import { useConfirmDialog } from "../../components/ui/ConfirmDialog";
import { CardSkeleton } from "../../components/ui/Skeleton";
import Modal from "../../components/ui/Modal";
import logger from "../../utils/logger";

const ListingManagement = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [draftFilters, setDraftFilters] = useState({
    city: "",
    state: "",
    propertyType: "",
    minPrice: "",
    maxPrice: "",
    available: "",
  });
  const [appliedFilters, setAppliedFilters] = useState({
    city: "",
    state: "",
    propertyType: "",
    minPrice: "",
    maxPrice: "",
    available: "",
  });
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAction, setBulkAction] = useState("");
  const [bulkProgress, setBulkProgress] = useState({
    action: "",
    total: 0,
    processed: 0,
  });
  const [bulkResult, setBulkResult] = useState(null);
  const [lastProcessedIds, setLastProcessedIds] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pages: 1,
    limit: 10,
  });
  const { confirm, ConfirmDialog: ConfirmDialogComponent } = useConfirmDialog();
  const fallbackImage =
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=400&q=80";

  const getListingImageUrl = (listing) => {
    if (!Array.isArray(listing?.images) || listing.images.length === 0) {
      return fallbackImage;
    }

    const primary = listing.images.find((img) => img?.isPrimary);
    if (primary?.url) return primary.url;

    const first = listing.images[0];
    if (typeof first === "string" && first) return first;
    if (typeof first?.url === "string" && first.url) return first.url;

    return fallbackImage;
  };

  useEffect(() => {
    setPage(1);
  }, [statusFilter, searchTerm, appliedFilters]);

  useEffect(() => {
    fetchListings(statusFilter, page, searchTerm, appliedFilters);
  }, [statusFilter, page, searchTerm, appliedFilters]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => listings.some((l) => l._id === id)));
  }, [listings]);

  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const data = await adminService.getPendingListings({
          status: statusFilter,
          ...(statusFilter === "rejected" ? { reportedOnly: "true" } : {}),
          page: 1,
          limit: 6,
          search: trimmed,
          city: appliedFilters.city || undefined,
          state: appliedFilters.state || undefined,
          propertyType: appliedFilters.propertyType || undefined,
          minPrice: appliedFilters.minPrice || undefined,
          maxPrice: appliedFilters.maxPrice || undefined,
          available: appliedFilters.available || undefined,
        });
        const nextListings = data?.data?.listings || [];
        setSuggestions(Array.isArray(nextListings) ? nextListings : []);
      } catch {
        setSuggestions([]);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchInput, statusFilter, appliedFilters]);

  const fetchListings = async (status = "pending", currentPage = 1, search = "", filters = appliedFilters) => {
    try {
      setLoading(true);
      const data = await adminService.getPendingListings({
        status,
        ...(status === "rejected" ? { reportedOnly: "true" } : {}),
        page: currentPage,
        limit,
        search: search || undefined,
        city: filters.city || undefined,
        state: filters.state || undefined,
        propertyType: filters.propertyType || undefined,
        minPrice: filters.minPrice || undefined,
        maxPrice: filters.maxPrice || undefined,
        available: filters.available || undefined,
      });
      const nextListings = Array.isArray(data)
        ? data
        : data?.data?.listings;
      setListings(Array.isArray(nextListings) ? nextListings : []);
      setPagination({
        total: Number(data?.data?.pagination?.total || 0),
        page: Number(data?.data?.pagination?.page || currentPage),
        pages: Number(data?.data?.pagination?.pages || 1),
        limit: Number(data?.data?.pagination?.limit || limit),
      });
    } catch (err) {
      logger.error("Failed to fetch listings for review", err);
      toast.error("Failed to load listings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const refreshCurrentPage = async () => {
    await fetchListings(statusFilter, page, searchTerm);
  };

  const areAllSelected = listings.length > 0 && selectedIds.length === listings.length;

  const toggleListingSelection = (listingId) => {
    setSelectedIds((prev) =>
      prev.includes(listingId) ? prev.filter((id) => id !== listingId) : [...prev, listingId]
    );
  };

  const toggleSelectAllVisible = () => {
    setSelectedIds(areAllSelected ? [] : listings.map((l) => l._id));
  };

  const handleModerationAction = async (listing, action) => {
    const actionConfig = {
      approve: {
        title: "Approve Listing",
        message: `Approve "${listing.title}"?`,
        confirmText: "Approve",
        variant: "success",
      },
      reject: {
        title: "Reject Listing",
        message: `Reject "${listing.title}"?`,
        confirmText: "Reject",
        variant: "danger",
      },
      pause: {
        title: "Pause Listing",
        message: `Pause "${listing.title}" so tenants cannot book it?`,
        confirmText: "Pause",
        variant: "warning",
      },
      activate: {
        title: "Activate Listing",
        message: `Activate "${listing.title}" and make it available again?`,
        confirmText: "Activate",
        variant: "success",
      },
      send_to_review: {
        title: "Send To Review",
        message: `Move "${listing.title}" back to pending review queue?`,
        confirmText: "Send",
        variant: "info",
      },
      delete: {
        title: "Delete Listing",
        message: `Delete "${listing.title}" permanently? This cannot be undone.`,
        confirmText: "Delete",
        variant: "danger",
      },
    };

    const cfg = actionConfig[action];
    if (!cfg) return;

    const requiresReason = action === "reject" || action === "delete";
    const reason = requiresReason
      ? window.prompt("Reason is required for this action. Enter reason:")?.trim() || ""
      : "";
    if (requiresReason && !reason) {
      toast.error("Reason is required for this action.");
      return;
    }

    await confirm({
      title: cfg.title,
      message: cfg.message,
      confirmText: cfg.confirmText,
      variant: cfg.variant,
      onConfirm: async () => {
        try {
          setUpdatingId(listing._id);
          await adminService.moderateListing(listing._id, action, reason);
          await refreshCurrentPage();
          toast.success("Listing updated successfully.");
          logger.info("Listing moderation action completed", { listingId: listing._id, action, reason });
        } catch (err) {
          logger.error("Failed to perform listing moderation action", err);
          toast.error("Failed to update listing. Please try again.");
          throw err; // Re-throw to prevent dialog from closing
        } finally {
          setUpdatingId(null);
        }
      },
    });
  };

  const runBulkAction = async (ids, action, reason = "") => {
    const selectedListingsById = Object.fromEntries(
      listings.map((item) => [item._id, item])
    );
    const getLocalFailureReason = (listing, nextAction) => {
      if (!listing) return "";
      const decision = listing?.verified?.decision;
      const status = listing?.verified?.status;
      if (nextAction === "approve" && decision === "approved" && status === true) {
        return "Listing is already approved";
      }
      if (nextAction === "reject" && decision === "rejected" && status === false) {
        return "Listing is already rejected";
      }
      if (nextAction === "pause" && listing.available === false) {
        return "Listing is already paused";
      }
      if (nextAction === "activate" && listing.available === true) {
        return "Listing is already active";
      }
      if (nextAction === "send_to_review" && decision === "pending") {
        return "Listing is already in pending review";
      }
      return "";
    };

    try {
      setBulkProcessing(true);
      setBulkProgress({
        action,
        total: ids.length,
        processed: 0,
      });
      setBulkResult(null);

      const successes = [];
      const failures = [];

      for (const id of ids) {
        const listing = selectedListingsById[id];
        const title = listing?.title || id;
        const localFailure = getLocalFailureReason(listing, action);
        if (localFailure) {
          failures.push({ id, title, reason: localFailure });
          setBulkProgress((prev) => ({
            ...prev,
            processed: Math.min(prev.processed + 1, prev.total),
          }));
          continue;
        }
        try {
          await adminService.moderateListing(id, action, reason);
          successes.push({ id, title });
        } catch (err) {
          failures.push({
            id,
            title,
            reason:
              err?.response?.data?.message ||
              err?.message ||
              "Unknown error",
          });
        } finally {
          setBulkProgress((prev) => ({
            ...prev,
            processed: Math.min(prev.processed + 1, prev.total),
          }));
        }
      }

      const successCount = successes.length;
      const failureCount = failures.length;
      await refreshCurrentPage();
      setSelectedIds([]);
      setBulkResult({
        action,
        reason: reason || "",
        total: ids.length,
        processedIds: ids,
        successCount,
        failureCount,
        successes,
        failures,
        completedAt: new Date().toISOString(),
      });
      setLastProcessedIds(ids);
      if (failureCount === 0) {
        toast.success(`Bulk action completed for ${successCount} listings.`);
      } else {
        toast.error(`Bulk action done: ${successCount} succeeded, ${failureCount} failed.`);
      }
      logger.info("Bulk listing moderation completed", {
        action,
        successCount,
        failureCount,
      });
    } catch (err) {
      logger.error("Bulk listing moderation failed", err);
      toast.error("Bulk action failed. Please try again.");
    } finally {
      setBulkProcessing(false);
      setBulkProgress((prev) => ({
        ...prev,
        processed: prev.total,
      }));
    }
  };

  const handleBulkModeration = async () => {
    if (!bulkAction) {
      toast.error("Select a bulk action first.");
      return;
    }
    if (!selectedIds.length) {
      toast.error("Select at least one listing.");
      return;
    }

    const needsReason = bulkAction === "reject" || bulkAction === "delete";
    const reason = needsReason
      ? window.prompt("Reason is required for this bulk action. Enter reason:")?.trim() || ""
      : "";

    if (needsReason && !reason) {
      toast.error("Reason is required for this action.");
      return;
    }

    const actionLabel = String(bulkAction).replaceAll("_", " ");
    await confirm({
      title: "Run Bulk Action",
      message: `Apply "${actionLabel}" to ${selectedIds.length} selected listings?`,
      confirmText: "Run",
      variant: "warning",
      onConfirm: async () => {
        await runBulkAction(selectedIds, bulkAction, reason);
      },
    });
  };

  const handleRetryFailedOnly = async () => {
    if (!bulkResult?.failureCount) return;

    const action = bulkResult.action;
    const failedIds = bulkResult.failures.map((item) => item.id);
    const needsReason = action === "reject" || action === "delete";
    let reason = bulkResult.reason || "";

    if (needsReason && !reason) {
      reason = window.prompt("Reason is required. Enter reason for retry:")?.trim() || "";
      if (!reason) {
        toast.error("Reason is required for retry.");
        return;
      }
    }

    await confirm({
      title: "Retry Failed Listings",
      message: `Retry "${String(action || "").replaceAll("_", " ")}" for ${failedIds.length} failed listings?`,
      confirmText: "Retry",
      variant: "warning",
      onConfirm: async () => {
        await runBulkAction(failedIds, action, reason);
      },
    });
  };

  const handleRepeatLastBulkAction = async () => {
    const ids = bulkResult?.processedIds?.length ? bulkResult.processedIds : lastProcessedIds;
    if (!ids?.length) {
      toast.error("No previous bulk set to repeat.");
      return;
    }

    const action = bulkResult?.action || bulkAction;
    if (!action) {
      toast.error("No previous bulk action found.");
      return;
    }

    const needsReason = action === "reject" || action === "delete";
    let reason = bulkResult?.reason || "";
    if (needsReason && !reason) {
      reason = window.prompt("Reason is required. Enter reason:")?.trim() || "";
      if (!reason) {
        toast.error("Reason is required.");
        return;
      }
    }

    await confirm({
      title: "Repeat Bulk Action",
      message: `Run "${String(action).replaceAll("_", " ")}" again on ${ids.length} listings?`,
      confirmText: "Run Again",
      variant: "warning",
      onConfirm: async () => {
        await runBulkAction(ids, action, reason);
      },
    });
  };

  const handleReselectLastSet = () => {
    if (!lastProcessedIds.length) {
      toast.error("No previous bulk set available.");
      return;
    }
    const visibleSet = new Set(listings.map((item) => item._id));
    const nextSelected = lastProcessedIds.filter((id) => visibleSet.has(id));
    setSelectedIds(nextSelected);
    if (!nextSelected.length) {
      toast.error("Previous bulk set is not visible in the current filter.");
      return;
    }
    toast.success(`${nextSelected.length} listings reselected from previous bulk set.`);
  };

  const downloadBulkFailureReport = () => {
    if (!bulkResult?.failures?.length) return;

    const rows = [
      ["ListingId", "ListingTitle", "Action", "Error"],
      ...bulkResult.failures.map((item) => [
        item.id,
        item.title || "",
        bulkResult.action || "",
        item.reason || "",
      ]),
    ];

    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bulk-failures-${bulkResult.action}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    if (!listings.length) return;
    const rows = [
      [
        "Title",
        "Owner",
        "Email",
        "City",
        "State",
        "Price",
        "Decision",
        "OwnerReportStatus",
        "CreatedAt",
      ],
      ...listings.map((l) => [
        l.title || "",
        l.ownerId?.name || "",
        l.ownerId?.email || "",
        l.location?.city || "",
        l.location?.state || "",
        l.price || "",
        l.verified?.decision || "",
        l.verified?.ownerReport?.status || "",
        l.createdAt ? new Date(l.createdAt).toISOString() : "",
      ]),
    ];

    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `listings-${statusFilter}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Listing Management
          </h1>
          <p className="mt-2 text-gray-600">
            Review listing quality, moderate availability, and manage verification lifecycle
          </p>
        </div>

        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              statusFilter === "all"
                ? "bg-blue-600 text-white"
                : "bg-white border text-gray-700"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter("pending")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              statusFilter === "pending"
                ? "bg-blue-600 text-white"
                : "bg-white border text-gray-700"
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setStatusFilter("rejected")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              statusFilter === "rejected"
                ? "bg-blue-600 text-white"
                : "bg-white border text-gray-700"
            }`}
          >
            Rejected Reports
          </button>
          <button
            onClick={() => setStatusFilter("approved")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              statusFilter === "approved"
                ? "bg-blue-600 text-white"
                : "bg-white border text-gray-700"
            }`}
          >
            Approved
          </button>
          <button
            onClick={handleExport}
            className="ml-auto px-4 py-2 rounded-lg text-sm font-medium bg-white border text-gray-700 hover:bg-gray-50"
          >
            Export CSV
          </button>
        </div>

        <div className="mb-6 rounded-xl border bg-white p-4">
          <p className="text-sm font-semibold text-slate-800 mb-3">Advanced Filters</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
            <input
              value={draftFilters.city}
              onChange={(e) =>
                setDraftFilters((prev) => ({ ...prev, city: e.target.value }))
              }
              placeholder="City"
              className="px-3 py-2 border rounded-lg text-sm"
            />
            <input
              value={draftFilters.state}
              onChange={(e) =>
                setDraftFilters((prev) => ({ ...prev, state: e.target.value }))
              }
              placeholder="State"
              className="px-3 py-2 border rounded-lg text-sm"
            />
            <select
              value={draftFilters.propertyType}
              onChange={(e) =>
                setDraftFilters((prev) => ({ ...prev, propertyType: e.target.value }))
              }
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">All Types</option>
              <option value="apartment">Apartment</option>
              <option value="house">House</option>
              <option value="condo">Condo</option>
              <option value="townhouse">Townhouse</option>
              <option value="studio">Studio</option>
              <option value="room">Room</option>
            </select>
            <input
              value={draftFilters.minPrice}
              onChange={(e) =>
                setDraftFilters((prev) => ({ ...prev, minPrice: e.target.value }))
              }
              placeholder="Min Price"
              type="number"
              min="0"
              className="px-3 py-2 border rounded-lg text-sm"
            />
            <input
              value={draftFilters.maxPrice}
              onChange={(e) =>
                setDraftFilters((prev) => ({ ...prev, maxPrice: e.target.value }))
              }
              placeholder="Max Price"
              type="number"
              min="0"
              className="px-3 py-2 border rounded-lg text-sm"
            />
            <select
              value={draftFilters.available}
              onChange={(e) =>
                setDraftFilters((prev) => ({ ...prev, available: e.target.value }))
              }
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">All Availability</option>
              <option value="true">Active</option>
              <option value="false">Paused</option>
            </select>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => setAppliedFilters(draftFilters)}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
            >
              Apply Filters
            </button>
            <button
              onClick={() => {
                const reset = {
                  city: "",
                  state: "",
                  propertyType: "",
                  minPrice: "",
                  maxPrice: "",
                  available: "",
                };
                setDraftFilters(reset);
                setAppliedFilters(reset);
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-white border text-gray-700 hover:bg-gray-50"
            >
              Reset Filters
            </button>
          </div>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by title, city, state, address"
            className="w-full sm:max-w-md px-3 py-2 border rounded-lg"
          />
          <button
            onClick={() => setSearchTerm(searchInput.trim())}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
          >
            Search
          </button>
          {(searchInput || searchTerm) && (
            <button
              onClick={() => {
                setSearchInput("");
                setSearchTerm("");
                setSuggestions([]);
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-white border text-gray-700 hover:bg-gray-50"
            >
              Clear
            </button>
          )}
        </div>
        {suggestions.length > 0 && (
          <div className="mb-6 border rounded-lg bg-white shadow-sm max-w-xl">
            {suggestions.map((item) => (
              <button
                key={item._id}
                onClick={() => {
                  setSearchInput(item.title || "");
                  setSearchTerm(item.title || "");
                  setSuggestions([]);
                  setSelectedListing(item);
                }}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm border-b last:border-b-0"
              >
                <span className="font-medium text-slate-800">{item.title}</span>
                <span className="text-slate-500"> ({item.location?.city || "N/A"})</span>
              </button>
            ))}
          </div>
        )}

        <div className="mb-6 text-sm text-slate-600">
          Showing {listings.length} of {pagination.total} listings
        </div>

        {!loading && listings.length > 0 && (
          <div className="mb-6 rounded-xl border bg-white p-4 flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={areAllSelected}
                onChange={toggleSelectAllVisible}
                className="h-4 w-4 rounded border-slate-300"
              />
              Select all visible
            </label>
            <span className="text-sm text-slate-500">{selectedIds.length} selected</span>
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">Bulk action...</option>
              <option value="approve">Approve</option>
              <option value="reject">Reject</option>
              <option value="pause">Pause</option>
              <option value="activate">Activate</option>
              <option value="send_to_review">Send to review</option>
              <option value="delete">Delete</option>
            </select>
            <button
              onClick={handleBulkModeration}
              disabled={!selectedIds.length || !bulkAction || bulkProcessing}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-900 text-white hover:bg-black disabled:opacity-50"
            >
              {bulkProcessing
                ? `Running... (${bulkProgress.processed}/${bulkProgress.total})`
                : "Run Bulk Action"}
            </button>
            <button
              onClick={() => setSelectedIds([])}
              disabled={!selectedIds.length || bulkProcessing}
              className="px-4 py-2 rounded-lg text-sm font-medium border bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Clear Selection
            </button>
            <button
              onClick={handleReselectLastSet}
              disabled={!lastProcessedIds.length || bulkProcessing}
              className="px-4 py-2 rounded-lg text-sm font-medium border bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Reselect Last Set
            </button>
          </div>
        )}

        {bulkResult && (
          <div className="mb-6 rounded-xl border bg-white p-4">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Bulk Action Summary: {String(bulkResult.action || "").replaceAll("_", " ")}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {bulkResult.successCount} succeeded, {bulkResult.failureCount} failed out of{" "}
                  {bulkResult.total} listings.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {bulkResult.failureCount > 0 && (
                  <button
                    onClick={handleRetryFailedOnly}
                    disabled={bulkProcessing}
                    className="px-3 py-2 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Retry Failed Only
                  </button>
                )}
                <button
                  onClick={handleRepeatLastBulkAction}
                  disabled={bulkProcessing}
                  className="px-3 py-2 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Repeat Last Action
                </button>
                {bulkResult.failureCount > 0 && (
                  <button
                    onClick={downloadBulkFailureReport}
                    className="px-3 py-2 rounded-lg text-xs font-medium bg-white border hover:bg-gray-50"
                  >
                    Download Failure Report
                  </button>
                )}
                <button
                  onClick={() => setBulkResult(null)}
                  className="px-3 py-2 rounded-lg text-xs font-medium bg-slate-900 text-white hover:bg-black"
                >
                  Dismiss
                </button>
              </div>
            </div>

            {bulkResult.failureCount > 0 && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-slate-500">
                      <th className="text-left py-2">Listing</th>
                      <th className="text-left py-2">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkResult.failures.slice(0, 10).map((item) => (
                      <tr key={item.id} className="border-b last:border-b-0">
                        <td className="py-2 text-slate-700">{item.title}</td>
                        <td className="py-2 text-red-700">{item.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {bulkResult.failures.length > 10 && (
                  <p className="text-[11px] text-slate-500 mt-2">
                    Showing first 10 failures. Download the CSV for full details.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div
            className="grid grid-cols-1 gap-6"
            role="status"
            aria-label="Loading listings"
          >
            {[1, 2, 3].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {listings.map((listing) => (
              <div
                key={listing._id}
                className={`bg-white p-6 rounded-xl shadow-sm border flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow ${
                  updatingId === listing._id || bulkProcessing ? "opacity-60 pointer-events-none" : ""
                }`}
              >
                <div className="self-start">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(listing._id)}
                    onChange={() => toggleListingSelection(listing._id)}
                    className="h-4 w-4 rounded border-slate-300"
                    aria-label={`Select listing ${listing.title}`}
                  />
                </div>
                <img
                  src={getListingImageUrl(listing)}
                  alt={listing.title}
                  className="w-full md:w-64 h-40 object-cover rounded-lg"
                  loading="lazy"
                />
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900">
                    {listing.title}
                  </h2>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        listing.available
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {listing.available ? "Active" : "Paused"}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        listing.verified?.decision === "approved"
                          ? "bg-emerald-100 text-emerald-700"
                          : listing.verified?.decision === "rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {String(listing.verified?.decision || "pending").toUpperCase()}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-2">
                    {listing.location?.address}, {listing.location?.city}
                  </p>
                  <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                    {listing.description}
                  </p>
                  <p className="font-bold text-blue-600 mb-3">
                    ETB {listing.price?.toLocaleString()} / Month
                  </p>

                  <div className="text-sm text-gray-700 mb-4 space-y-1">
                    <p>
                      <span className="font-semibold">Owner:</span>{" "}
                      {listing.ownerId?.name || "Unknown"}
                    </p>
                    <p>
                      <span className="font-semibold">Email:</span>{" "}
                      {listing.ownerId?.email || "N/A"}
                    </p>
                    <p>
                      <span className="font-semibold">Phone:</span>{" "}
                      {listing.ownerId?.phone || "N/A"}
                    </p>
                    {listing.verified?.rejectionReason && (
                      <p className="text-red-700">
                        <span className="font-semibold">Rejection reason:</span>{" "}
                        {listing.verified.rejectionReason}
                      </p>
                    )}
                    {listing.verified?.ownerReport?.status === "submitted" && (
                      <p className="text-amber-800">
                        <span className="font-semibold">Owner report:</span>{" "}
                        {listing.verified.ownerReport.message}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedListing(listing)}
                    className="text-sm font-medium text-emerald-700 hover:text-emerald-800 mb-4"
                  >
                    Open Profile
                  </button>

                  <div className="flex flex-wrap gap-3">
                    {listing.verified?.decision !== "approved" && (
                      <button
                        onClick={() => handleModerationAction(listing, "approve")}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                        aria-label={`Approve listing: ${listing.title}`}
                      >
                        {statusFilter === "rejected" ? "Undo Rejection" : "Approve"}
                      </button>
                    )}
                    {listing.verified?.decision !== "rejected" && (
                      <button
                        onClick={() => handleModerationAction(listing, "reject")}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
                        aria-label={`Reject listing: ${listing.title}`}
                      >
                        Reject
                      </button>
                    )}
                    <button
                      onClick={() =>
                        handleModerationAction(
                          listing,
                          listing.available ? "pause" : "activate"
                        )
                      }
                      className={`px-4 py-2 rounded-lg font-medium text-sm ${
                        listing.available
                          ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                          : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                      }`}
                    >
                      {listing.available ? "Pause" : "Activate"}
                    </button>
                    {listing.verified?.decision === "rejected" && (
                      <button
                        onClick={() => handleModerationAction(listing, "send_to_review")}
                        className="px-4 py-2 rounded-lg font-medium text-sm bg-blue-100 text-blue-700 hover:bg-blue-200"
                      >
                        Send To Review
                      </button>
                    )}
                    <button
                      onClick={() => handleModerationAction(listing, "delete")}
                      className="px-4 py-2 rounded-lg font-medium text-sm bg-slate-900 text-white hover:bg-black"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {listings.length === 0 && (
              <div className="bg-white p-12 text-center rounded-xl border border-dashed border-gray-300">
                <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                  <svg
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                    />
                  </svg>
                </div>
                <p className="text-gray-500 text-lg">
                  {statusFilter === "rejected"
                    ? "No rejected listings with owner reports."
                    : statusFilter === "approved"
                      ? "No approved listings."
                      : statusFilter === "all"
                        ? "No listings found."
                        : "No pending listings for review."}
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  {statusFilter === "rejected"
                    ? "Rejected listings will appear here after owners submit a report."
                    : "New listings will appear here when they're submitted."}
                </p>
              </div>
            )}
          </div>
        )}

        {!loading && pagination.pages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-4 py-2 rounded-lg border bg-white text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-slate-600">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              disabled={pagination.page >= pagination.pages}
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              className="px-4 py-2 rounded-lg border bg-white text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      <Modal
        isOpen={!!selectedListing}
        onClose={() => setSelectedListing(null)}
        title="Listing Profile"
        size="lg"
      >
        {selectedListing && (
          <div className="space-y-3 text-sm text-slate-700">
            <p><span className="font-semibold">Title:</span> {selectedListing.title}</p>
            <p><span className="font-semibold">Description:</span> {selectedListing.description}</p>
            <p><span className="font-semibold">Owner:</span> {selectedListing.ownerId?.name || "N/A"}</p>
            <p><span className="font-semibold">Owner Email:</span> {selectedListing.ownerId?.email || "N/A"}</p>
            <p><span className="font-semibold">Owner Phone:</span> {selectedListing.ownerId?.phone || "N/A"}</p>
            <p><span className="font-semibold">Owner Role:</span> {selectedListing.ownerId?.role || "N/A"}</p>
            <p><span className="font-semibold">Owner Account Verified:</span> {selectedListing.ownerId?.verified ? "Yes" : "No"}</p>
            <p><span className="font-semibold">Owner Banned:</span> {selectedListing.ownerId?.banned?.isBanned ? "Yes" : "No"}</p>
            <p><span className="font-semibold">Owner Rating:</span> {Number(selectedListing.ownerId?.rating?.average || 0).toFixed(1)} ({selectedListing.ownerId?.rating?.count || 0} reviews)</p>
            <p><span className="font-semibold">Owner Joined:</span> {selectedListing.ownerId?.createdAt ? new Date(selectedListing.ownerId.createdAt).toLocaleString() : "N/A"}</p>
            <p><span className="font-semibold">Owner Last Login:</span> {selectedListing.ownerId?.lastLogin ? new Date(selectedListing.ownerId.lastLogin).toLocaleString() : "Never"}</p>
            <p><span className="font-semibold">Address:</span> {selectedListing.location?.address || "N/A"}</p>
            <p><span className="font-semibold">City/State:</span> {selectedListing.location?.city || "N/A"}, {selectedListing.location?.state || "N/A"}</p>
            <p><span className="font-semibold">Price:</span> ETB {Number(selectedListing.price || 0).toLocaleString()} / Month</p>
            <p><span className="font-semibold">Property Type:</span> {selectedListing.propertyType || "N/A"}</p>
            <p><span className="font-semibold">Rooms:</span> {selectedListing.rooms?.bedrooms || 0} bed, {selectedListing.rooms?.bathrooms || 0} bath</p>
            <p><span className="font-semibold">Amenities:</span> {Array.isArray(selectedListing.amenities) && selectedListing.amenities.length ? selectedListing.amenities.join(", ") : "None"}</p>
            <p><span className="font-semibold">Views:</span> {selectedListing.viewCount || 0}</p>
            <p><span className="font-semibold">Availability:</span> {selectedListing.available ? "Active" : "Paused"}</p>
            <p><span className="font-semibold">Listing ID:</span> {selectedListing._id}</p>
            <p><span className="font-semibold">Verification Decision:</span> {selectedListing.verified?.decision || "pending"}</p>
            <p><span className="font-semibold">Rejection Reason:</span> {selectedListing.verified?.rejectionReason || "N/A"}</p>
            {selectedListing?.verified?.ownerReport?.message && (
              <p><span className="font-semibold">Owner Report:</span> {selectedListing.verified.ownerReport.message}</p>
            )}
            <p><span className="font-semibold">Created:</span> {selectedListing.createdAt ? new Date(selectedListing.createdAt).toLocaleString() : "N/A"}</p>
          </div>
        )}
      </Modal>

      {/* Confirm Dialog */}
      <ConfirmDialogComponent />
    </div>
  );
};

export default ListingManagement;
