import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import adminService from "../../api/adminService";
import Navbar from "../../components/layout/Navbar";
import { useConfirmDialog } from "../../components/ui/ConfirmDialog";
import { ListItemSkeleton } from "../../components/ui/Skeleton";
import Modal from "../../components/ui/Modal";
import logger from "../../utils/logger";
import { Trash2, Users, Ban, UserCircle2 } from "lucide-react";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pages: 1,
    limit: 15,
  });
  const [roleSummary, setRoleSummary] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserActivity, setSelectedUserActivity] = useState(null);
  const { confirm, ConfirmDialog: ConfirmDialogComponent } = useConfirmDialog();

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter, verifiedFilter, searchTerm]);

  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const data = await adminService.getUsers({ search: trimmed, page: 1, limit: 6 });
        const list = data?.data?.users || [];
        setSuggestions(Array.isArray(list) ? list : []);
      } catch {
        setSuggestions([]);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const [data, stats] = await Promise.all([
        adminService.getUsers({
          page,
          limit,
          role: roleFilter || undefined,
          verified: verifiedFilter || undefined,
          search: searchTerm || undefined,
        }),
        adminService.getStats(),
      ]);
      const usersList = Array.isArray(data)
        ? data
        : data?.data?.users;
      setUsers(Array.isArray(usersList) ? usersList : []);
      setPagination({
        total: Number(data?.data?.pagination?.total || 0),
        page: Number(data?.data?.pagination?.page || page),
        pages: Number(data?.data?.pagination?.pages || 1),
        limit: Number(data?.data?.pagination?.limit || limit),
      });
      setRoleSummary(stats?.data?.usersByRole || {});
    } catch (err) {
      logger.error("Failed to fetch users", err);
      toast.error("Failed to load users. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!users.length) return;
    const rows = [
      ["Name", "Email", "Phone", "Role", "Verified", "CreatedAt"],
      ...users.map((u) => [
        u.name || "",
        u.email || "",
        u.phone || "",
        u.role || "",
        u.verified ? "Yes" : "No",
        u.createdAt ? new Date(u.createdAt).toISOString() : "",
      ]),
    ];
    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-page-${pagination.page}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteUser = async (user) => {
    await confirm({
      title: "Delete User",
      message: `Are you sure you want to delete "${user.name}"? This action cannot be undone, and all associated data will be permanently removed.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger",
      onConfirm: async () => {
        try {
          await adminService.deleteUser(user._id);
          setUsers((prev) => prev.filter((u) => u._id !== user._id));
          toast.success(`User "${user.name}" deleted successfully.`);
          logger.info("User deleted", { userId: user._id });
        } catch (err) {
          logger.error("Failed to delete user", err);
          toast.error("Failed to delete user. Please try again.");
          throw err; // Re-throw to prevent dialog from closing
        }
      },
    });
  };

  const handleViewUser = async (userId) => {
    try {
      const data = await adminService.getUserById(userId);
      const detailedUser = data?.data?.user;
      if (detailedUser) {
        setSelectedUser(detailedUser);
        setSelectedUserActivity(data?.data?.activity || null);
      }
    } catch (err) {
      logger.error("Failed to load user details", err);
      toast.error("Failed to load user details.");
    }
  };

  const handleToggleBan = async (user) => {
    const isCurrentlyBanned = Boolean(user?.banned?.isBanned);
    const reason =
      !isCurrentlyBanned
        ? window.prompt("Optional: reason for banning this user")?.trim() || "Suspended by admin"
        : "";

    await confirm({
      title: isCurrentlyBanned ? "Unban User" : "Ban User",
      message: isCurrentlyBanned
        ? `Allow "${user.name}" to use the platform again?`
        : `Ban "${user.name}" from using the platform?`,
      confirmText: isCurrentlyBanned ? "Unban" : "Ban",
      cancelText: "Cancel",
      variant: "danger",
      onConfirm: async () => {
        try {
          await adminService.updateUser(user._id, {
            banned: !isCurrentlyBanned,
            banReason: reason,
          });
          toast.success(isCurrentlyBanned ? "User unbanned." : "User banned.");
          if (selectedUser?._id === user._id) {
            setSelectedUser((prev) =>
              prev
                ? {
                    ...prev,
                    banned: {
                      isBanned: !isCurrentlyBanned,
                      reason: !isCurrentlyBanned ? reason : "",
                      bannedAt: !isCurrentlyBanned ? new Date().toISOString() : null,
                    },
                  }
                : prev
            );
          }
          fetchUsers();
        } catch (err) {
          logger.error("Failed to update ban status", err);
          toast.error(err?.response?.data?.message || "Failed to update ban status.");
          throw err;
        }
      },
    });
  };

  const getRoleBadgeClass = (role) => {
    const baseClasses =
      "px-2 inline-flex text-xs leading-5 font-semibold rounded-full";
    switch (role) {
      case "admin":
        return `${baseClasses} bg-purple-100 text-purple-800`;
      case "owner":
        return `${baseClasses} bg-green-100 text-green-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-600" />
              User Directory
            </h1>
            <p className="mt-2 text-gray-600">
              Manage user accounts and permissions
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Total Users</div>
            <div className="text-3xl font-bold text-blue-600">
              {pagination.total}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border rounded-xl p-4">
            <p className="text-xs uppercase text-slate-500 font-semibold">Tenants</p>
            <p className="text-2xl font-bold text-slate-900">{roleSummary.tenant || 0}</p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <p className="text-xs uppercase text-slate-500 font-semibold">Owners</p>
            <p className="text-2xl font-bold text-slate-900">{roleSummary.owner || 0}</p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <p className="text-xs uppercase text-slate-500 font-semibold">Admins</p>
            <p className="text-2xl font-bold text-slate-900">{roleSummary.admin || 0}</p>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name or email"
              className="w-full lg:max-w-xs px-3 py-2 border rounded-lg"
            />
            <button
              onClick={() => {
                setPage(1);
                setSearchTerm(searchInput.trim());
                setSuggestions([]);
              }}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
            >
              Search
            </button>
            <select
              value={roleFilter}
              onChange={(e) => {
                setPage(1);
                setRoleFilter(e.target.value);
              }}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">All Roles</option>
              <option value="tenant">Tenant</option>
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
            </select>
            <select
              value={verifiedFilter}
              onChange={(e) => {
                setPage(1);
                setVerifiedFilter(e.target.value);
              }}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">All Verification</option>
              <option value="true">Verified</option>
              <option value="false">Unverified</option>
            </select>
            <button
              onClick={() => {
                setSearchInput("");
                setSearchTerm("");
                setRoleFilter("");
                setVerifiedFilter("");
                setPage(1);
                setSuggestions([]);
              }}
              className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50"
            >
              Reset
            </button>
            <button
              onClick={handleExport}
              className="lg:ml-auto px-4 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50"
            >
              Export CSV
            </button>
          </div>
          {suggestions.length > 0 && (
            <div className="mt-3 border rounded-lg bg-white shadow-sm max-w-xl">
              {suggestions.map((u) => (
                <button
                  key={u._id}
                  onClick={() => {
                    setSearchInput(u.name || "");
                    setSearchTerm(u.name || "");
                    setSuggestions([]);
                    handleViewUser(u._id);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm border-b last:border-b-0"
                >
                  <span className="font-medium text-slate-800">{u.name}</span>
                  <span className="text-slate-500"> ({u.email})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul
              className="divide-y divide-gray-200"
              role="status"
              aria-label="Loading users"
            >
              {[1, 2, 3, 4, 5].map((i) => (
                <ListItemSkeleton key={i} />
              ))}
            </ul>
          </div>
        ) : users.length > 0 ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {users.map((user) => (
                <li
                  key={user._id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <div className="px-4 py-4 flex items-center sm:px-6">
                    <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                      <div className="truncate">
                        <div className="flex text-sm items-center gap-2">
                          <p className="font-medium text-blue-600 truncate">
                            {user.name}
                          </p>
                          <span className={getRoleBadgeClass(user.role)}>
                            {user.role}
                          </span>
                          {user?.banned?.isBanned && (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-700">
                              banned
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex flex-col sm:flex-row sm:gap-6">
                          <div className="flex items-center text-sm text-gray-500">
                            <svg
                              className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                              aria-hidden="true"
                            >
                              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                            </svg>
                            <span className="truncate">{user.email}</span>
                          </div>
                          {user.phone && (
                            <div className="flex items-center text-sm text-gray-500">
                              <svg
                                className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                                aria-hidden="true"
                              >
                                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                              </svg>
                              <span>{user.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 flex-shrink-0 sm:mt-0 sm:ml-5">
                        <div className="flex space-x-2">
                          {user.role !== "admin" && (
                            <button
                              onClick={() => handleToggleBan(user)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                user?.banned?.isBanned
                                  ? "bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 focus:ring-emerald-500"
                                  : "bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 focus:ring-amber-500"
                              }`}
                              aria-label={`${user?.banned?.isBanned ? "Unban" : "Ban"} user: ${user.name}`}
                            >
                              <Ban className="h-4 w-4" />
                              {user?.banned?.isBanned ? "Unban" : "Ban"}
                            </button>
                          )}
                          {user.role !== "admin" && (
                            <button
                              onClick={() => handleDeleteUser(user)}
                              className="inline-flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 rounded-lg text-sm hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                              aria-label={`Delete user: ${user.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </button>
                          )}
                          <button
                            onClick={() => handleViewUser(user._id)}
                            className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1.5 rounded-lg text-sm hover:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            aria-label={`View details for user: ${user.name}`}
                          >
                            <UserCircle2 className="h-4 w-4" />
                            View
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="bg-white p-12 text-center rounded-xl border border-dashed border-gray-300">
            <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
              <Users className="h-full w-full" />
            </div>
            <p className="text-gray-500 text-lg">No users found</p>
            <p className="text-gray-400 text-sm mt-2">
              Users will appear here once they register
            </p>
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
        isOpen={!!selectedUser}
        onClose={() => {
          setSelectedUser(null);
          setSelectedUserActivity(null);
        }}
        title="User Details"
        size="md"
      >
        {selectedUser && (
          <div className="space-y-3 text-sm text-slate-700">
            <p><span className="font-semibold">Name:</span> {selectedUser.name}</p>
            <p><span className="font-semibold">Email:</span> {selectedUser.email}</p>
            <p><span className="font-semibold">Phone:</span> {selectedUser.phone || "N/A"}</p>
            <p><span className="font-semibold">Role:</span> {selectedUser.role}</p>
            <p><span className="font-semibold">Verified:</span> {selectedUser.verified ? "Yes" : "No"}</p>
            <p><span className="font-semibold">User ID:</span> {selectedUser._id}</p>
            <p><span className="font-semibold">Created:</span> {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleString() : "N/A"}</p>
            <p><span className="font-semibold">Last Login:</span> {selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleString() : "Never"}</p>
            <p><span className="font-semibold">Bio:</span> {selectedUser.bio || "N/A"}</p>
            <p>
              <span className="font-semibold">Rating:</span>{" "}
              {typeof selectedUser.rating?.average === "number"
                ? `${selectedUser.rating.average.toFixed(1)} (${selectedUser.rating?.count || 0} reviews)`
                : "N/A"}
            </p>
            <p>
              <span className="font-semibold">Ban Status:</span>{" "}
              {selectedUser?.banned?.isBanned ? "Banned" : "Active"}
            </p>
            {selectedUser?.banned?.isBanned && (
              <>
                <p><span className="font-semibold">Ban Reason:</span> {selectedUser?.banned?.reason || "N/A"}</p>
                <p><span className="font-semibold">Banned At:</span> {selectedUser?.banned?.bannedAt ? new Date(selectedUser.banned.bannedAt).toLocaleString() : "N/A"}</p>
              </>
            )}
            {selectedUserActivity && (
              <>
                <p><span className="font-semibold">Owned Listings:</span> {selectedUserActivity.listingsCount || 0}</p>
                <p><span className="font-semibold">Bookings (Tenant):</span> {selectedUserActivity.bookingsAsTenant || 0}</p>
                <p><span className="font-semibold">Bookings (Owner):</span> {selectedUserActivity.bookingsAsOwner || 0}</p>
                <p><span className="font-semibold">Successful Transactions:</span> {selectedUserActivity.successfulTransactions || 0}</p>
                <p><span className="font-semibold">Revenue Generated:</span> ETB {Number(selectedUserActivity.revenueGenerated || 0).toLocaleString()}</p>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Confirm Dialog */}
      <ConfirmDialogComponent />
    </div>
  );
};

export default UserManagement;
