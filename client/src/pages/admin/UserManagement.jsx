import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import adminService from "../../api/adminService";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { Navbar } from "../../components/layout/Navbar";
import { useConfirmDialog } from "../../components/ui/ConfirmDialog";
import Modal from "../../components/ui/Modal";
import logger from "../../utils/logger";
import { Trash2, Users, Ban, UserCircle2, Search, ChevronLeft, ChevronRight } from "lucide-react";

const CORAL = "#E67E5F";

const RoleBadge = ({ role }) => {
  if (role === "admin") return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700">Admin</span>;
  if (role === "owner") return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">Owner</span>;
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-600">Tenant</span>;
};

const UserAvatar = ({ name, size = "md" }) => {
  const initials = (name || "?").split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
  const sizeClass = size === "lg" ? "w-12 h-12 text-base" : "w-9 h-9 text-sm";
  return (
    <div className={`${sizeClass} rounded-full flex items-center justify-center font-bold shrink-0`}
      style={{ background: "#FEF0EC", color: CORAL }}>
      {initials}
    </div>
  );
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [ownerVerificationFilter, setOwnerVerificationFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1, limit: 15 });
  const [roleSummary, setRoleSummary] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserActivity, setSelectedUserActivity] = useState(null);
  const { confirm, ConfirmDialog: ConfirmDialogComponent } = useConfirmDialog();

  useEffect(() => { fetchUsers(); }, [page, roleFilter, ownerVerificationFilter, searchTerm]);

  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed.length < 2) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      try {
        const data = await adminService.getUsers({ search: trimmed, page: 1, limit: 6 });
        setSuggestions(Array.isArray(data?.data?.users) ? data.data.users : []);
      } catch { setSuggestions([]); }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const [data, stats] = await Promise.all([
        adminService.getUsers({ page, limit, role: roleFilter || undefined, isVerifiedOwner: ownerVerificationFilter || undefined, search: searchTerm || undefined }),
        adminService.getStats(),
      ]);
      const usersList = Array.isArray(data) ? data : data?.data?.users;
      setUsers(Array.isArray(usersList) ? usersList : []);
      setPagination({ total: Number(data?.data?.pagination?.total || 0), page: Number(data?.data?.pagination?.page || page), pages: Number(data?.data?.pagination?.pages || 1), limit: Number(data?.data?.pagination?.limit || limit) });
      setRoleSummary(stats?.data?.usersByRole || {});
    } catch (err) { logger.error("Failed to fetch users", err); toast.error("Failed to load users."); }
    finally { setLoading(false); }
  };

  const handleExport = () => {
    if (!users.length) return;
    const rows = [["Name", "Email", "Phone", "Role", "Owner Verified", "CreatedAt"], ...users.map(u => [u.name || "", u.email || "", u.phone || "", u.role || "", u.role === "owner" ? (u.isVerifiedOwner ? "Yes" : "No") : "N/A", u.createdAt ? new Date(u.createdAt).toISOString() : ""])];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `users-report-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteUser = async (user) => {
    await confirm({ title: "Delete User", message: `Delete "${user.name}"? This cannot be undone.`, confirmText: "Delete", variant: "danger",
      onConfirm: async () => {
        try { await adminService.deleteUser(user._id); setUsers(prev => prev.filter(u => u._id !== user._id)); toast.success(`User "${user.name}" deleted.`); }
        catch { toast.error("Failed to delete user."); }
      },
    });
  };

  const handleViewUser = async (userId) => {
    try {
      const data = await adminService.getUserById(userId);
      const detailedUser = data?.data?.user;
      if (detailedUser) { setSelectedUser(detailedUser); setSelectedUserActivity(data?.data?.activity || null); }
    } catch { toast.error("Failed to load user details."); }
  };

  const handleToggleBan = async (user) => {
    const isCurrentlyBanned = Boolean(user?.banned?.isBanned);
    const reason = !isCurrentlyBanned ? window.prompt("Reason for banning?")?.trim() || "Suspended by admin" : "";
    await confirm({ title: isCurrentlyBanned ? "Unban User" : "Ban User", message: isCurrentlyBanned ? `Unban "${user.name}"?` : `Ban "${user.name}"?`, confirmText: isCurrentlyBanned ? "Unban" : "Ban", variant: "danger",
      onConfirm: async () => {
        try { await adminService.updateUser(user._id, { banned: !isCurrentlyBanned, banReason: reason }); toast.success(isCurrentlyBanned ? "User unbanned." : "User banned."); fetchUsers(); }
        catch { toast.error("Failed to update status."); }
      },
    });
  };

  const start = (pagination.page - 1) * pagination.limit + 1;
  const end = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <DashboardLayout>
      <Navbar />
      <div className="px-6 py-6 max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: CORAL }}>User Management</h1>
            <p className="text-sm text-gray-400 mt-0.5">Oversee user accounts, roles, and administrative permissions.</p>
          </div>
          <button onClick={handleExport} className="px-4 py-2 text-xs font-semibold border border-gray-200 text-gray-600 rounded-xl hover:border-gray-300 transition-all shrink-0">Export CSV</button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[{ label: "Total Users", value: pagination.total }, { label: "Tenants", value: roleSummary.tenant || 0 }, { label: "Owners", value: roleSummary.owner || 0 }, { label: "Admins", value: roleSummary.admin || 0 }].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
            </div>
          ))}
        </div>

        {/* Search + filter */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-300" />
              <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
                placeholder="Search by name, email, or ID…"
                className="w-full bg-gray-50 border border-gray-200 text-gray-700 pl-9 pr-4 py-2 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E67E5F]/30 focus:border-[#E67E5F] placeholder-gray-300 transition-all" />
              {suggestions.length > 0 && (
                <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  {suggestions.map(u => (
                    <button key={u._id} onClick={() => { setSearchInput(u.name || ""); setSearchTerm(u.name || ""); setSuggestions([]); handleViewUser(u._id); }}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors">
                      <span className="font-medium text-gray-800 text-sm">{u.name}</span>
                      <span className="text-gray-400 text-xs ml-2">({u.email})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => { setPage(1); setSearchTerm(searchInput.trim()); setSuggestions([]); }}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-white transition-all" style={{ background: CORAL }}>
              Search
            </button>
            <div className="h-7 w-px bg-gray-200 hidden lg:block" />
            <select value={roleFilter} onChange={e => { setPage(1); setRoleFilter(e.target.value); }}
              className="border border-gray-200 text-gray-600 text-sm px-3 py-2 rounded-xl focus:outline-none cursor-pointer appearance-none">
              <option value="">All Roles</option>
              <option value="tenant">Tenant</option>
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
            </select>
            <select value={ownerVerificationFilter} onChange={e => { setPage(1); setOwnerVerificationFilter(e.target.value); }}
              className="border border-gray-200 text-gray-600 text-sm px-3 py-2 rounded-xl focus:outline-none cursor-pointer appearance-none">
              <option value="">All Verification</option>
              <option value="true">Verified Owners</option>
              <option value="false">Unverified Owners</option>
            </select>
            <button onClick={() => { setSearchInput(""); setSearchTerm(""); setRoleFilter(""); setOwnerVerificationFilter(""); setPage(1); setSuggestions([]); }}
              className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors">
              Reset
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : users.length === 0 ? (
            <div className="py-24 text-center">
              <Users className="h-12 w-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 font-semibold">No users found</p>
              <p className="text-sm text-gray-400 mt-1">Users will appear here once they register.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["User Name", "Role", "Email", "Status", "Actions"].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map(user => (
                    <tr key={user._id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar name={user.name} />
                          <div>
                            <p className="font-semibold text-gray-800">{user.name}</p>
                            <p className="text-xs text-gray-400 font-mono">{String(user._id).slice(-8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4"><RoleBadge role={user.role} /></td>
                      <td className="px-5 py-4 text-gray-500 text-sm">{user.email}</td>
                      <td className="px-5 py-4">
                        {user?.banned?.isBanned ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Banned
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleViewUser(user._id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all"
                            style={{ borderColor: CORAL, color: CORAL }}>
                            <UserCircle2 size={12} /> View
                          </button>
                          {user.role !== "admin" && (
                            <button onClick={() => handleToggleBan(user)}
                              className={`p-1.5 rounded-lg border transition-all ${user?.banned?.isBanned ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50" : "border-amber-200 text-amber-600 hover:bg-amber-50"}`}
                              title={user?.banned?.isBanned ? "Unban" : "Ban"}>
                              <Ban size={14} />
                            </button>
                          )}
                          {user.role !== "admin" && (
                            <button onClick={() => handleDeleteUser(user)}
                              className="p-1.5 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 transition-all" title="Delete">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && pagination.total > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Showing {start} to {end} of <span className="font-semibold text-gray-600">{pagination.total}</span> users
            </p>
            {pagination.pages > 1 && (
              <div className="flex items-center gap-1">
                <button disabled={pagination.page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:border-gray-300 disabled:opacity-30 transition-all">
                  <ChevronLeft size={14} /> Prev
                </button>
                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button key={pageNum} onClick={() => setPage(pageNum)}
                      className="w-8 h-8 text-sm font-medium rounded-lg transition-all"
                      style={pagination.page === pageNum ? { background: CORAL, color: "white" } : { color: "#6B7280" }}>
                      {pageNum}
                    </button>
                  );
                })}
                <button disabled={pagination.page >= pagination.pages} onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:border-gray-300 disabled:opacity-30 transition-all">
                  Next <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* User detail modal */}
      <Modal isOpen={!!selectedUser} onClose={() => { setSelectedUser(null); setSelectedUserActivity(null); }} title="User Profile" size="md">
        {selectedUser && (
          <div className="space-y-5 text-sm">
            <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
              <UserAvatar name={selectedUser.name} size="lg" />
              <div>
                <p className="text-lg font-bold text-gray-800">{selectedUser.name}</p>
                <RoleBadge role={selectedUser.role} />
                {selectedUser.role === "owner" && selectedUser.isVerifiedOwner && (
                  <span className="inline-flex items-center gap-1 mt-1 text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Verified Owner
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { l: "Email", v: selectedUser.email },
                { l: "Phone", v: selectedUser.phone || "N/A" },
                { l: "Member Since", v: selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : "N/A" },
                { l: "Account Status", v: selectedUser?.banned?.isBanned ? "Suspended" : "Active" },
                { l: "Rating", v: selectedUser.rating?.average ? `${selectedUser.rating.average.toFixed(1)} / 5.0` : "New" },
                { l: "Owner Verified", v: selectedUser.role === "owner" ? (selectedUser.isVerifiedOwner ? "Yes" : "No") : "N/A" },
              ].map(item => (
                <div key={item.l}>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{item.l}</p>
                  <p className="font-medium text-gray-700 mt-0.5">{item.v}</p>
                </div>
              ))}
            </div>
            {selectedUserActivity && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Activity Summary</p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <p className="text-gray-500">Listings: <span className="font-bold text-gray-800">{selectedUserActivity.listingsCount || 0}</span></p>
                  <p className="text-gray-500">Bookings: <span className="font-bold text-gray-800">{selectedUserActivity.bookingsAsTenant || 0}</span></p>
                  <p className="text-gray-500">Revenue: <span className="font-bold" style={{ color: CORAL }}>ETB {Number(selectedUserActivity.revenueGenerated || 0).toLocaleString()}</span></p>
                  <p className="text-gray-500">Transactions: <span className="font-bold text-gray-800">{selectedUserActivity.successfulTransactions || 0}</span></p>
                </div>
              </div>
            )}
            {selectedUser?.banned?.isBanned && (
              <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-wide mb-1">Ban Reason</p>
                <p className="text-red-700 text-sm">{selectedUser?.banned?.reason || "No reason provided."}</p>
                <p className="text-[10px] text-red-400 mt-1">Banned on {new Date(selectedUser.banned.bannedAt).toLocaleString()}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
      <ConfirmDialogComponent />
    </DashboardLayout>
  );
};

export default UserManagement;
