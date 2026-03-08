import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import adminService from "../../api/adminService";
import Navbar from "../../components/layout/Navbar";
import { useConfirmDialog } from "../../components/ui/ConfirmDialog";
import { ListItemSkeleton } from "../../components/ui/Skeleton";
import Modal from "../../components/ui/Modal";
import logger from "../../utils/logger";
import { Trash2, Users, Ban, UserCircle2, Search, Filter } from "lucide-react";

const selectCls = "appearance-none bg-[#1a1a1a] border border-[#d4af37]/10 text-[#9a9a9a] px-4 py-2 text-sm focus:outline-none focus:border-[#d4af37]/40 hover:border-[#d4af37]/30 transition-all cursor-pointer";

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
        const list = data?.data?.users || [];
        setSuggestions(Array.isArray(list) ? list : []);
      } catch { setSuggestions([]); }
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
          isVerifiedOwner: ownerVerificationFilter || undefined,
          search: searchTerm || undefined
        }),
        adminService.getStats(),
      ]);
      const usersList = Array.isArray(data) ? data : data?.data?.users;
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
      toast.error("Failed to load users.");
    } finally { setLoading(false); }
  };

  const handleExport = () => {
    if (!users.length) return;
    const rows = [
      ["Name", "Email", "Phone", "Role", "Owner Verified", "CreatedAt"],
      ...users.map((u) => [
        u.name || "",
        u.email || "",
        u.phone || "",
        u.role || "",
        u.role === "owner" ? (u.isVerifiedOwner ? "Yes" : "No") : "N/A",
        u.createdAt ? new Date(u.createdAt).toISOString() : ""
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteUser = async (user) => {
    await confirm({
      title: "Delete User",
      message: `Are you sure you want to delete "${user.name}"? This action cannot be undone.`,
      confirmText: "Delete",
      variant: "danger",
      onConfirm: async () => {
        try {
          await adminService.deleteUser(user._id);
          setUsers((prev) => prev.filter((u) => u._id !== user._id));
          toast.success(`User "${user.name}" deleted.`);
        } catch (err) {
          toast.error("Failed to delete user.");
          throw err;
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
    } catch (err) { toast.error("Failed to load user details."); }
  };

  const handleToggleBan = async (user) => {
    const isCurrentlyBanned = Boolean(user?.banned?.isBanned);
    const reason = !isCurrentlyBanned ? window.prompt("Reason for banning?")?.trim() || "Suspended by admin" : "";

    await confirm({
      title: isCurrentlyBanned ? "Unban User" : "Ban User",
      message: isCurrentlyBanned ? `Unban "${user.name}"?` : `Ban "${user.name}"?`,
      confirmText: isCurrentlyBanned ? "Unban" : "Ban",
      variant: "danger",
      onConfirm: async () => {
        try {
          await adminService.updateUser(user._id, { banned: !isCurrentlyBanned, banReason: reason });
          toast.success(isCurrentlyBanned ? "User unbanned." : "User banned.");
          fetchUsers();
        } catch (err) { toast.error("Failed to update status."); throw err; }
      },
    });
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case "admin": return "text-purple-400 border border-purple-500/20 bg-purple-500/10";
      case "owner": return "text-emerald-400 border border-emerald-500/20 bg-emerald-500/10";
      default: return "text-[#9a9a9a] border border-[#d4af37]/10 bg-[#1a1a1a]";
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl text-[#f8f6f3] flex items-center gap-3" style={{ fontFamily: "'Playfair Display', serif" }}>
              <Users className="h-8 w-8 text-[#d4af37]" />
              User Directory
            </h1>
            <p className="mt-2 text-[#9a9a9a] tracking-wide">Manage user accounts and platform permissions</p>
          </div>
          <div className="text-right border-l border-[#d4af37]/10 pl-6">
            <div className="text-[10px] uppercase font-bold text-[#d4af37]/50 tracking-widest">Total Users</div>
            <div className="text-3xl font-bold text-[#f8f6f3]" style={{ fontFamily: "'Playfair Display', serif" }}>
              {pagination.total}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {[{ label: "Tenants", val: roleSummary.tenant || 0 }, { label: "Owners", val: roleSummary.owner || 0 }, { label: "Admins", val: roleSummary.admin || 0 }].map((s) => (
            <div key={s.label} className="bg-[#111] border border-[#d4af37]/10 p-4">
              <p className="text-[10px] uppercase tracking-widest font-bold text-[#d4af37]/50">{s.label}</p>
              <p className="text-2xl mt-1 text-[#f8f6f3]" style={{ fontFamily: "'Playfair Display', serif" }}>{s.val}</p>
            </div>
          ))}
        </div>

        <div className="bg-[#111] border border-[#d4af37]/10 p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#9a9a9a]" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full bg-[#0a0a0a] border border-[#d4af37]/10 text-[#f8f6f3] pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-[#d4af37]/40 placeholder-[#9a9a9a]/30"
              />
            </div>
            <button
              onClick={() => { setPage(1); setSearchTerm(searchInput.trim()); setSuggestions([]); }}
              className="px-6 py-2 bg-[#d4af37] text-[#0a0a0a] text-xs font-bold tracking-widest uppercase hover:bg-[#b8941f] transition-all"
            >
              Search
            </button>
            <div className="h-8 w-px bg-[#d4af37]/10 mx-1 hidden lg:block" />
            <select value={roleFilter} onChange={(e) => { setPage(1); setRoleFilter(e.target.value); }} className={selectCls}>
              <option value="">All Roles</option>
              <option value="tenant">Tenant</option>
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
            </select>
            <select value={ownerVerificationFilter} onChange={(e) => { setPage(1); setOwnerVerificationFilter(e.target.value); }} className={selectCls}>
              <option value="">All Owner Verification</option>
              <option value="true">Verified Owners</option>
              <option value="false">Unverified Owners</option>
            </select>
            <button onClick={() => { setSearchInput(""); setSearchTerm(""); setRoleFilter(""); setOwnerVerificationFilter(""); setPage(1); setSuggestions([]); }} className="text-xs text-[#9a9a9a] uppercase tracking-widest hover:text-[#d4af37]">Reset</button>
            <button onClick={handleExport} className="ml-auto flex items-center gap-2 px-4 py-2 border border-[#d4af37]/20 text-[#d4af37]/70 text-xs font-bold tracking-widest uppercase hover:border-[#d4af37] hover:text-[#d4af37]">Export CSV</button>
          </div>
          {suggestions.length > 0 && (
            <div className="absolute z-20 mt-2 bg-[#1a1a1a] border border-[#d4af37]/20 shadow-2xl max-w-xl w-full">
              {suggestions.map((u) => (
                <button
                  key={u._id}
                  onClick={() => { setSearchInput(u.name || ""); setSearchTerm(u.name || ""); setSuggestions([]); handleViewUser(u._id); }}
                  className="w-full text-left px-4 py-3 hover:bg-[#d4af37]/5 border-b border-[#d4af37]/5 last:border-0 group"
                >
                  <span className="font-medium text-[#f8f6f3] group-hover:text-[#d4af37]">{u.name}</span>
                  <span className="text-[#9a9a9a] text-xs ml-2">({u.email})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-20 bg-[#111] animate-pulse border border-[#d4af37]/5" />)}
          </div>
        ) : users.length > 0 ? (
          <div className="bg-[#111] border border-[#d4af37]/10 overflow-hidden">
            <ul className="divide-y divide-[#d4af37]/5">
              {users.map((user) => (
                <li key={user._id} className="hover:bg-[#d4af37]/3 transition-colors">
                  <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="text-lg text-[#f8f6f3] font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>{user.name}</p>
                        <span className={`px-2 py-0.5 text-[10px] uppercase font-bold tracking-widest ${getRoleBadgeClass(user.role)}`}>
                          {user.role}
                        </span>
                        {user?.banned?.isBanned && (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 uppercase tracking-widest">
                            banned
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-[#9a9a9a]">
                        <span className="flex items-center gap-1.5"><Search size={12} className="text-[#d4af37]/40" /> {user.email}</span>
                        {user.phone && <span className="flex items-center gap-1.5"><Filter size={12} className="text-[#d4af37]/40" /> {user.phone}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.role !== "admin" && (
                        <button
                          onClick={() => handleToggleBan(user)}
                          className={`p-2 border transition-all ${
                            user?.banned?.isBanned
                              ? "border-emerald-500/20 text-emerald-400 hover:border-emerald-500/50"
                              : "border-amber-500/20 text-amber-400 hover:border-amber-500/50"
                          }`}
                          title={user?.banned?.isBanned ? "Unban" : "Ban"}
                        >
                          <Ban size={16} />
                        </button>
                      )}
                      {user.role !== "admin" && (
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="p-2 border border-red-500/20 text-red-500 hover:border-red-500/50 transition-all"
                          title="Delete User"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => handleViewUser(user._id)}
                        className="flex items-center gap-2 px-4 py-2 border border-[#d4af37]/20 text-[#d4af37] text-xs font-bold tracking-widest uppercase hover:bg-[#d4af37] hover:text-[#0a0a0a] transition-all"
                      >
                        <UserCircle2 size={14} />
                        View
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="bg-[#111] p-16 text-center border border-dashed border-[#d4af37]/20">
            <Users className="h-12 w-12 text-[#d4af37]/20 mx-auto mb-4" />
            <p className="text-[#f8f6f3] text-xl font-bold mb-2">No users found</p>
            <p className="text-[#9a9a9a] text-sm tracking-wide">Users will appear here once they register on the platform.</p>
          </div>
        )}

        {!loading && pagination.pages > 1 && (
          <div className="mt-8 flex items-center justify-between">
            <button disabled={pagination.page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-5 py-2 border border-[#d4af37]/15 text-[#9a9a9a] text-sm hover:border-[#d4af37]/40 hover:text-[#f8f6f3] disabled:opacity-30 transition-all uppercase tracking-widest text-xs">
              Previous
            </button>
            <span className="text-xs text-[#9a9a9a] font-bold">Page {pagination.page} of {pagination.pages}</span>
            <button disabled={pagination.page >= pagination.pages} onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} className="px-5 py-2 border border-[#d4af37]/15 text-[#9a9a9a] text-sm hover:border-[#d4af37]/40 hover:text-[#f8f6f3] disabled:opacity-30 transition-all uppercase tracking-widest text-xs">
              Next
            </button>
          </div>
        )}
      </div>

      <Modal
        isOpen={!!selectedUser}
        onClose={() => { setSelectedUser(null); setSelectedUserActivity(null); }}
        title="User Intelligence Profile"
        size="md"
      >
        {selectedUser && (
          <div className="space-y-6 text-sm">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {[
                { l: "Name", v: selectedUser.name },
                { l: "Email", v: selectedUser.email },
                { l: "Phone", v: selectedUser.phone || "N/A" },
                { l: "Role", v: selectedUser.role.toUpperCase() },
                
                {
                  l: "Verification",
                  v:
                    selectedUser.role === "owner"
                      ? (selectedUser.isVerifiedOwner ? "VERIFIED OWNER" : "NOT VERIFIED OWNER")
                      : "N/A"
                },
                { l: "Member Since", v: selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : "N/A" },
                { l: "Account Status", v: selectedUser?.banned?.isBanned ? "SUSPENDED" : "ACTIVE" },
                { l: "Rating", v: selectedUser.rating?.average ? `${selectedUser.rating.average.toFixed(1)} / 5.0` : "NEW" }
              ].map(item => (
                <div key={item.l} className="border-b border-[#d4af37]/5 pb-1">
                  <p className="text-[10px] font-bold text-[#d4af37]/50 uppercase tracking-widest">{item.l}</p>
                  <p className="text-[#f8f6f3] mt-0.5 font-medium">{item.v}</p>
                </div>
              ))}
            </div>

            {selectedUser.role === "owner" && selectedUser.isVerifiedOwner && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-400/40 bg-blue-500/15 text-blue-300 text-[11px] font-bold uppercase tracking-wider" title="Verified Owner">
                <span className="w-2 h-2 rounded-full bg-blue-300" />
                Verified Owner
              </div>
            )}

            {selectedUserActivity && (
              <div className="bg-[#0a0a0a] border border-[#d4af37]/10 p-5 space-y-3">
                <p className="text-[11px] font-bold text-[#d4af37] uppercase tracking-widest border-b border-[#d4af37]/10 pb-2 mb-3">Activity Analytics</p>
                <div className="grid grid-cols-2 gap-3 text-[12px]">
                  <p className="text-[#9a9a9a]">Owned Listings: <span className="text-[#f8f6f3] font-bold">{selectedUserActivity.listingsCount || 0}</span></p>
                  <p className="text-[#9a9a9a]">Bookings (T): <span className="text-[#f8f6f3] font-bold">{selectedUserActivity.bookingsAsTenant || 0}</span></p>
                  <p className="text-[#9a9a9a]">Revenue: <span className="text-[#d4af37] font-bold">ETB {Number(selectedUserActivity.revenueGenerated || 0).toLocaleString()}</span></p>
                  <p className="text-[#9a9a9a]">Transactions: <span className="text-[#f8f6f3] font-bold">{selectedUserActivity.successfulTransactions || 0}</span></p>
                </div>
              </div>
            )}

            {selectedUser?.banned?.isBanned && (
              <div className="p-4 bg-red-900/10 border border-red-500/20">
                <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">Ban Reason</p>
                <p className="text-red-300/70">{selectedUser?.banned?.reason || "No reason provided."}</p>
                <p className="text-[10px] text-red-400/50 mt-2 italic">Banned on {new Date(selectedUser.banned.bannedAt).toLocaleString()}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialogComponent />
    </div>
  );
};

export default UserManagement;
