import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import adminService from "../../api/adminService";
import Navbar from "../../components/layout/Navbar";
import { useConfirmDialog } from "../../components/ui/ConfirmDialog";
import { ListItemSkeleton } from "../../components/ui/Skeleton";
import Modal from "../../components/ui/Modal";
import logger from "../../utils/logger";
import { Trash2, Users, Ban, UserCircle2, Search, Filter } from "lucide-react";

const selectCls = "appearance-none px-4 py-2 text-sm focus:outline-none cursor-pointer";

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
      case "admin": return { color: 'var(--accent)', borderColor: 'var(--panel-border)' };
      case "owner": return { color: 'var(--success)', borderColor: 'var(--panel-border)' };
      default: return { color: 'var(--muted)', borderColor: 'var(--panel-border)' };
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl flex items-center gap-3" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--text)' }}>
              <Users className="h-8 w-8" style={{ color: 'var(--accent)' }} />
              User Management
            </h1>
            <p className="mt-2 tracking-wide" style={{ color: 'var(--muted)' }}>Oversee user accounts, roles, and administrative permissions.</p>
          </div>
          <div className="text-right pl-6" style={{ borderLeft: '1px solid', borderColor: 'var(--panel-border)' }}>
            <div className="text-[10px] uppercase font-bold tracking-widest" style={{ color: 'rgba(212,175,55,0.5)' }}>Total Users</div>
            <div className="text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--text)' }}>
              {pagination.total}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {[{ label: "Tenants", val: roleSummary.tenant || 0 }, { label: "Owners", val: roleSummary.owner || 0 }, { label: "Admins", val: roleSummary.admin || 0 }].map((s) => (
            <div key={s.label} className="p-4" style={{ background: 'var(--panel)', border: '1px solid', borderColor: 'var(--panel-border)' }}>
              <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: 'rgba(212,175,55,0.5)' }}>{s.label}</p>
              <p className="text-2xl mt-1" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--text)' }}>{s.val}</p>
            </div>
          ))}
        </div>

        <div className="p-4 mb-6" style={{ background: 'var(--panel)', border: '1px solid', borderColor: 'var(--panel-border)' }}>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4" style={{ color: 'var(--muted)' }} />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-2 text-sm"
                style={{ background: 'transparent', border: '1px solid', borderColor: 'var(--panel-border)', color: 'var(--text)', paddingLeft: '2.5rem' }}
              />
            </div>
            <button
              onClick={() => { setPage(1); setSearchTerm(searchInput.trim()); setSuggestions([]); }}
              className="px-6 py-2 text-xs font-bold tracking-widest uppercase transition-all"
              style={{ background: 'var(--accent)', color: 'var(--panel)' }}
            >
              Search
            </button>
            <div className="h-8 w-px mx-1 hidden lg:block" style={{ background: 'var(--panel-border)' }} />
            <select value={roleFilter} onChange={(e) => { setPage(1); setRoleFilter(e.target.value); }} className={selectCls} style={{ border: '1px solid', borderColor: 'var(--panel-border)', background: 'transparent', color: 'var(--text)' }}>
              <option value="">All Roles</option>
              <option value="tenant">Tenant</option>
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
            </select>
            <select value={ownerVerificationFilter} onChange={(e) => { setPage(1); setOwnerVerificationFilter(e.target.value); }} className={selectCls} style={{ border: '1px solid', borderColor: 'var(--panel-border)', background: 'transparent', color: 'var(--text)' }}>
              <option value="">All Owner Verification</option>
              <option value="true">Verified Owners</option>
              <option value="false">Unverified Owners</option>
            </select>
            <button onClick={() => { setSearchInput(""); setSearchTerm(""); setRoleFilter(""); setOwnerVerificationFilter(""); setPage(1); setSuggestions([]); }} className="text-xs uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Reset</button>
            <button onClick={handleExport} className="ml-auto flex items-center gap-2 px-4 py-2 text-xs font-bold tracking-widest uppercase transition-all" style={{ border: '1px solid', borderColor: 'rgba(212,175,55,0.2)', color: 'rgba(212,175,55,0.7)' }}>Export CSV</button>
          </div>
          {suggestions.length > 0 && (
            <div className="absolute z-20 mt-2 shadow-2xl max-w-xl w-full" style={{ background: 'var(--panel)', border: '1px solid', borderColor: 'var(--panel-border)' }}>
              {suggestions.map((u) => (
                <button
                  key={u._id}
                  onClick={() => { setSearchInput(u.name || ""); setSearchTerm(u.name || ""); setSuggestions([]); handleViewUser(u._id); }}
                  className="w-full text-left px-4 py-3 border-b last:border-0 group"
                  style={{ borderBottom: '1px solid rgba(212,175,55,0.05)' }}
                >
                  <span className="font-medium" style={{ color: 'var(--text)' }}>{u.name}</span>
                  <span className="text-xs ml-2" style={{ color: 'var(--muted)' }}>({u.email})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-20 animate-pulse" style={{ background: 'var(--panel)', border: '1px solid', borderColor: 'var(--panel-border)' }} />)}
          </div>
        ) : users.length > 0 ? (
          <div style={{ background: 'var(--panel)', border: '1px solid', borderColor: 'var(--panel-border)' }} className="overflow-hidden">
            <ul>
              {users.map((user) => {
                const badgeStyle = getRoleBadgeClass(user.role);
                return (
                <li key={user._id} className="transition-colors hover:opacity-95">
                  <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="text-lg font-bold" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--text)' }}>{user.name}</p>
                        <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-widest" style={{ color: badgeStyle.color, border: '1px solid', borderColor: badgeStyle.borderColor }}>{user.role}</span>
                        {user?.banned?.isBanned && (
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest" style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--danger)', border: '1px solid', borderColor: 'rgba(239,68,68,0.2)' }}>
                            banned
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm" style={{ color: 'var(--muted)' }}>
                        <span className="flex items-center gap-1.5"><Search size={12} style={{ color: 'var(--panel-border)' }} /> {user.email}</span>
                        {user.phone && <span className="flex items-center gap-1.5"><Filter size={12} style={{ color: 'var(--panel-border)' }} /> {user.phone}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.role !== "admin" && (
                        <button
                          onClick={() => handleToggleBan(user)}
                          className="p-2 transition-all"
                          title={user?.banned?.isBanned ? "Unban" : "Ban"}
                          style={{ border: '1px solid', borderColor: 'var(--panel-border)', color: user?.banned?.isBanned ? 'var(--success)' : 'var(--accent)' }}
                        >
                          <Ban size={16} />
                        </button>
                      )}
                      {user.role !== "admin" && (
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="p-2 transition-all"
                          title="Delete User"
                          style={{ border: '1px solid', borderColor: 'rgba(239,68,68,0.2)', color: 'var(--danger)' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => handleViewUser(user._id)}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-bold tracking-widest uppercase transition-all"
                        style={{ border: '1px solid', borderColor: 'var(--panel-border)', color: 'var(--accent)' }}
                      >
                        <UserCircle2 size={14} />
                        View
                      </button>
                    </div>
                  </div>
                </li>
              )})}
            </ul>
          </div>
        ) : (
          <div className="p-16 text-center" style={{ background: 'var(--panel)', border: '1px dashed', borderColor: 'var(--panel-border)' }}>
            <Users className="h-12 w-12 mx-auto mb-4" style={{ color: 'rgba(212,175,55,0.2)' }} />
            <p className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>No users found</p>
            <p className="text-sm tracking-wide" style={{ color: 'var(--muted)' }}>Users will appear here once they register on the platform.</p>
          </div>
        )}

        {!loading && pagination.pages > 1 && (
          <div className="mt-8 flex items-center justify-between">
            <button disabled={pagination.page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-5 py-2 disabled:opacity-30 transition-all uppercase tracking-widest text-xs" style={{ border: '1px solid', borderColor: 'var(--panel-border)', color: 'var(--muted)' }}>
              Previous
            </button>
            <span className="text-xs font-bold" style={{ color: 'var(--muted)' }}>Page {pagination.page} of {pagination.pages}</span>
            <button disabled={pagination.page >= pagination.pages} onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} className="px-5 py-2 disabled:opacity-30 transition-all uppercase tracking-widest text-xs" style={{ border: '1px solid', borderColor: 'var(--panel-border)', color: 'var(--muted)' }}>
              Next
            </button>
          </div>
        )}
      </div>

      <Modal
        isOpen={!!selectedUser}
        onClose={() => { setSelectedUser(null); setSelectedUserActivity(null); }}
        title="User Profile Details"
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
                <div key={item.l} className="pb-1" style={{ borderBottom: '1px solid', borderColor: 'var(--panel-border)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(212,175,55,0.5)' }}>{item.l}</p>
                  <p style={{ color: 'var(--text)' }} className="mt-0.5 font-medium">{item.v}</p>
                </div>
              ))}
            </div>

            {selectedUser.role === "owner" && selectedUser.isVerifiedOwner && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider" title="Verified Owner" style={{ border: '1px solid', borderColor: 'var(--panel-border)', background: 'rgba(16,185,129,0.06)', color: 'var(--success)' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: 'var(--success)' }} />
                Verified Owner
              </div>
            )}

            {selectedUserActivity && (
              <div className="p-5 space-y-3" style={{ background: 'var(--panel)', border: '1px solid', borderColor: 'var(--panel-border)' }}>
                <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--accent)', borderBottom: '1px solid', borderColor: 'var(--panel-border)', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>User Activity Summary</p>
                <div className="grid grid-cols-2 gap-3 text-[12px]">
                  <p style={{ color: 'var(--muted)' }}>Owned Listings: <span style={{ color: 'var(--text)', fontWeight: 700 }}>{selectedUserActivity.listingsCount || 0}</span></p>
                  <p style={{ color: 'var(--muted)' }}>Bookings (T): <span style={{ color: 'var(--text)', fontWeight: 700 }}>{selectedUserActivity.bookingsAsTenant || 0}</span></p>
                  <p style={{ color: 'var(--muted)' }}>Revenue: <span style={{ color: 'var(--accent)', fontWeight: 700 }}>ETB {Number(selectedUserActivity.revenueGenerated || 0).toLocaleString()}</span></p>
                  <p style={{ color: 'var(--muted)' }}>Transactions: <span style={{ color: 'var(--text)', fontWeight: 700 }}>{selectedUserActivity.successfulTransactions || 0}</span></p>
                </div>
              </div>
            )}

            {selectedUser?.banned?.isBanned && (
              <div className="p-4" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid', borderColor: 'rgba(239,68,68,0.15)' }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--danger)' }}>Ban Reason</p>
                <p style={{ color: 'rgba(255,255,255,0.8)' }}>{selectedUser?.banned?.reason || "No reason provided."}</p>
                <p className="text-[10px] mt-2 italic" style={{ color: 'rgba(255,255,255,0.6)' }}>Banned on {new Date(selectedUser.banned.bannedAt).toLocaleString()}</p>
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
