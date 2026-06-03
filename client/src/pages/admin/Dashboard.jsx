import React, { useMemo, useState, useEffect } from "react";
import adminService from "../../api/adminService";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { Navbar } from "../../components/layout/Navbar";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Users, Home, CalendarCheck, ShieldAlert,
  TrendingUp, TrendingDown, Activity, Loader2, AlertTriangle, Wallet, BarChart2,
} from "lucide-react";

const CORAL = "#E67E5F";
const formatChange = (value = 0) => `${value > 0 ? "+" : ""}${value}%`;
const getTrendTone = (value = 0) => value > 0 ? "text-emerald-500" : value < 0 ? "text-red-500" : "text-gray-400";

const StatCard = ({ title, value, icon: Icon, iconBg, trend, subtitle }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{title}</p>
        <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: iconBg || "#FEF0EC" }}>
        <Icon size={20} style={{ color: CORAL }} />
      </div>
    </div>
    {typeof trend === "number" && (
      <div className={`text-xs flex items-center gap-1 font-medium ${getTrendTone(trend)}`}>
        {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        <span>{formatChange(trend)} vs previous period</span>
      </div>
    )}
  </div>
);

const ActivityItem = ({ action, by, time, index }) => {
  const colors = ["bg-blue-100 text-blue-600", "bg-orange-100 text-orange-600", "bg-emerald-100 text-emerald-600", "bg-purple-100 text-purple-600", "bg-amber-100 text-amber-600"];
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-b-0">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${colors[index % colors.length]}`}>
        {(by?.[0] || "S").toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800">{String(action || "").replaceAll("_", " ")}</p>
        <p className="text-xs text-gray-400 mt-0.5">by {by || "System"}</p>
      </div>
      <span className="text-xs text-gray-400 shrink-0">{time}</span>
    </div>
  );
};

const AdminDashboard = () => {
  const [period, setPeriod] = useState("30d");
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [topOwners, setTopOwners] = useState([]);
  const [queues, setQueues] = useState({ pendingHouses: 0, rejectedReports: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStats(); }, [period]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [analyticsResponse, systemStats, rejectedReportsResponse] = await Promise.all([
        adminService.getAnalytics(period),
        adminService.getStats(),
        adminService.getPendingListings({ status: "rejected", reportedOnly: "true", limit: 1 }),
      ]);
      const overview = analyticsResponse?.data?.overview || {};
      const detailed = analyticsResponse?.data?.analytics || {};
      const ownerLeaders = analyticsResponse?.data?.topOwners || [];
      setAnalytics({ overview, trends: detailed?.trends || {}, bookings: detailed?.bookings || {} });
      setTopOwners(Array.isArray(ownerLeaders) ? ownerLeaders : []);
      setStats(systemStats?.data || {});
      setQueues({
        pendingHouses: Number(overview.pendingVerifications || 0),
        rejectedReports: Number(rejectedReportsResponse?.data?.pagination?.total || 0),
      });
    } catch (err) { console.error("Failed to fetch admin stats", err); }
    finally { setLoading(false); }
  };

  const derived = useMemo(() => {
    const overview = analytics?.overview || {};
    const trends = analytics?.trends?.changes || {};
    const bookingStats = analytics?.bookings || {};
    const totalHouses = Number(overview.totalHouses || 0);
    const pendingHouses = Number(queues.pendingHouses || 0);
    const verifiedHouses = Math.max(0, totalHouses - pendingHouses);
    const totalBookings = Number(overview.totalBookings || 0);
    const rejectedBookings = Number(bookingStats.rejected || 0);
    const rejectionRate = totalBookings > 0 ? Math.round((rejectedBookings / totalBookings) * 100) : 0;
    return {
      totalUsers: Number(overview.totalUsers || 0),
      totalRevenue: Number(overview.totalRevenue || 0),
      totalBookings, verifiedHouses, pendingHouses,
      rejectedReports: Number(queues.rejectedReports || 0),
      bookingRejectionRate: rejectionRate, trends,
    };
  }, [analytics, queues]);

  const handleToggleUserVerification = async (owner) => {
    const ownerId = owner.ownerIdString || owner.ownerId;
    const nextStatus = !Boolean(owner.isVerifiedOwner);
    try {
      await adminService.updateUser(ownerId, { isVerifiedOwner: nextStatus });
      setTopOwners(prev => prev.map(item =>
        (item.ownerIdString || item.ownerId) === ownerId ? { ...item, isVerifiedOwner: nextStatus } : item
      ));
      toast.success(nextStatus ? `${owner.name} marked as verified owner.` : `${owner.name} marked as unverified owner.`);
    } catch { toast.error("Failed to update owner verification."); }
  };

  if (loading) return (
    <DashboardLayout>
      <Navbar />
      <div className="flex-1 flex items-center justify-center py-32">
        <div className="flex items-center gap-3">
          <Loader2 className="animate-spin" size={28} style={{ color: CORAL }} />
          <span className="text-gray-500 text-sm">Loading Command Center...</span>
        </div>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <Navbar />
      <div className="px-6 py-6 max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Command Center</h1>
            <p className="text-sm text-gray-400 mt-0.5">Platform-wide health and key metrics overview.</p>
          </div>
          <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 shadow-sm">
            {[{ key: "7d", label: "Week" }, { key: "30d", label: "Month" }, { key: "90d", label: "Quarter" }, { key: "1y", label: "Year" }].map(({ key, label }) => (
              <button key={key} onClick={() => setPeriod(key)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
                style={period === key ? { background: CORAL, color: "white" } : { color: "#6B7280" }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard title="Total Revenue" value={`ETB ${derived.totalRevenue.toLocaleString() || (derived.totalBookings * 12000).toLocaleString()}`} icon={Wallet} iconBg="#EBF3FB" trend={derived.trends.bookings} />
          <StatCard title="Active Users" value={derived.totalUsers} icon={Users} iconBg="#FEF0EC" trend={derived.trends.users} />
          <StatCard title="Pending Verifications" value={derived.pendingHouses} icon={ShieldAlert} iconBg="#FEF2F2" subtitle={derived.pendingHouses > 10 ? "Action required" : "Queue within capacity"} />
          <StatCard title="Active Bookings" value={derived.totalBookings} icon={CalendarCheck} iconBg="#F0FDF4" trend={derived.trends.bookings} />
        </div>

        {/* Analytics + Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
              <BarChart2 size={16} style={{ color: CORAL }} />
              Growth Analytics
            </h2>
            <div className="space-y-4">
              {[
                { label: "Users", value: derived.totalUsers, max: Math.max(derived.totalUsers, 1) },
                { label: "Verified Listings", value: derived.verifiedHouses, max: Math.max(derived.verifiedHouses + derived.pendingHouses, 1) },
                { label: "Bookings", value: derived.totalBookings, max: Math.max(derived.totalBookings, 1) },
              ].map(({ label, value, max }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{label}</span>
                    <span className="font-semibold text-gray-700">{value}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, Math.round((value / max) * 100))}%`, background: CORAL }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-gray-50">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Activity size={12} /> Action Queues
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Pending approvals", value: derived.pendingHouses },
                  { label: "Owner reports", value: derived.rejectedReports },
                  { label: "Rejection rate", value: `${derived.bookingRejectionRate}%`, alert: derived.bookingRejectionRate > 30 },
                ].map(({ label, value, alert }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className={`text-lg font-bold ${alert ? "text-red-500" : "text-gray-800"}`}>{value}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-gray-800">Recent Activity</h2>
              <Link to="/admin/logs" className="text-xs font-semibold" style={{ color: CORAL }}>View All</Link>
            </div>
            {stats?.recentActivity?.length > 0 ? (
              <div className="flex-1 overflow-y-auto">
                {stats.recentActivity.slice(0, 8).map((item, i) => (
                  <ActivityItem key={item._id} action={item.action} by={item.performedBy?.name}
                    time={new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} index={i} />
                ))}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-gray-400 text-center py-8">No recent activity.</p>
              </div>
            )}
          </div>
        </div>

        {/* Alerts */}
        {(derived.pendingHouses > 0 || derived.rejectedReports > 0 || derived.bookingRejectionRate > 30) && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
            <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" /> Operational Alerts
            </h2>
            <div className="space-y-2">
              {derived.pendingHouses > 0 && (
                <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-xl px-4 py-2.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  {derived.pendingHouses} listing{derived.pendingHouses !== 1 ? "s are" : " is"} waiting for approval.
                </div>
              )}
              {derived.rejectedReports > 0 && (
                <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-xl px-4 py-2.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  {derived.rejectedReports} owner report{derived.rejectedReports !== 1 ? "s" : ""} awaiting review.
                </div>
              )}
              {derived.bookingRejectionRate > 30 && (
                <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 rounded-xl px-4 py-2.5">
                  <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                  Booking rejection rate elevated ({derived.bookingRejectionRate}%) this period.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Shortcuts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {[
            { to: "/admin/listings", title: "Property Management", desc: "Review, approve, or reject property listings.", badge: derived.pendingHouses > 0 ? `${derived.pendingHouses} pending` : null },
            { to: "/admin/users", title: "User Management", desc: "Manage user accounts, roles, and permissions." },
            { to: "/admin/analytics", title: "Analytics", desc: "Monitor performance, revenue trends, and usage." },
            { to: "/admin/logs", title: "Audit Logs", desc: "Track administrative actions and system events." },
          ].map(({ to, title, desc, badge }) => (
            <Link key={to} to={to} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-gray-200 transition-all group block">
              <div className="flex items-start justify-between">
                <h3 className="text-sm font-bold text-gray-800 group-hover:text-[#E67E5F] transition-colors">{title}</h3>
                {badge && <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: "#FEF0EC", color: CORAL }}>{badge}</span>}
              </div>
              <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{desc}</p>
              <span className="text-xs font-semibold mt-3 block" style={{ color: CORAL }}>Manage →</span>
            </Link>
          ))}
        </div>

        {/* Top owners */}
        {topOwners.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Home size={16} style={{ color: CORAL }} /> Top Owners by Listings
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Owner", "Listings", "Approved", "Views", "Conv.", "Status", "Action"].map(h => (
                      <th key={h} className="text-left pb-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topOwners.map(owner => (
                    <tr key={owner.ownerIdString || owner.ownerId} className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 pr-4">
                        <p className="font-semibold text-gray-800">{owner.name || owner.email?.split("@")[0] || `Owner …${String(owner.ownerIdString || owner.ownerId || "").slice(-6)}`}</p>
                        <p className="text-xs text-gray-400">{owner.email}</p>
                        {owner?.banned?.isBanned && <p className="text-[11px] text-red-500 font-semibold mt-0.5">Banned</p>}
                      </td>
                      <td className="py-3 text-gray-500">{owner.listings || 0}</td>
                      <td className="py-3 text-gray-500">{owner.approvedListings || 0}</td>
                      <td className="py-3 text-gray-500">{owner.totalViews || 0}</td>
                      <td className="py-3 text-gray-500">{owner.conversionRate || 0}%</td>
                      <td className="py-3">
                        <span className={`text-[11px] px-2 py-1 rounded-full font-semibold ${owner.isVerifiedOwner ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"}`}>
                          {owner.isVerifiedOwner ? "Verified" : "Unverified"}
                        </span>
                      </td>
                      <td className="py-3">
                        <button onClick={() => handleToggleUserVerification(owner)}
                          className="px-3 py-1.5 text-[11px] font-semibold rounded-lg border transition-all"
                          style={owner.isVerifiedOwner ? { borderColor: "#BFDBFE", color: "#3B82F6" } : { borderColor: CORAL, color: CORAL }}>
                          {owner.isVerifiedOwner ? "Unverify" : "Verify"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
