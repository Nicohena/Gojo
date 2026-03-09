import React, { useMemo, useState, useEffect } from "react";
import adminService from "../../api/adminService";
import Navbar from "../../components/layout/Navbar";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Users, Home, CalendarCheck, ShieldAlert,
  TrendingUp, TrendingDown, Activity, Loader2, AlertTriangle,
} from "lucide-react";

const formatChange = (value = 0) => `${value > 0 ? "+" : ""}${value}%`;

const getTrendTone = (value = 0) => {
  if (value > 0) return "text-emerald-400";
  if (value < 0) return "text-red-400";
  return "text-[#9a9a9a]";
};

const StatCard = ({ title, value, icon: Icon, trend, subtitle }) => (
  <div className="bg-[#111] p-6 border border-[#d4af37]/10">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[10px] font-bold text-[#d4af37]/50 uppercase tracking-widest">{title}</p>
        <p className="text-3xl text-[#f8f6f3] mt-2" style={{ fontFamily: "'Playfair Display', serif" }}>{value}</p>
        {subtitle && <p className="text-xs text-[#9a9a9a] mt-1">{subtitle}</p>}
      </div>
      <div className="w-10 h-10 border border-[#d4af37]/20 flex items-center justify-center">
        <Icon size={16} className="text-[#d4af37]" />
      </div>
    </div>
    {typeof trend === "number" && (
      <div className={`mt-3 text-xs flex items-center gap-1 ${getTrendTone(trend)}`}>
        {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        <span>{formatChange(trend)} vs previous period</span>
      </div>
    )}
  </div>
);

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
    } catch (err) {
      console.error("Failed to fetch admin stats", err);
    } finally {
      setLoading(false);
    }
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
      totalBookings,
      verifiedHouses,
      pendingHouses,
      rejectedReports: Number(queues.rejectedReports || 0),
      bookingRejectionRate: rejectionRate,
      trends,
    };
  }, [analytics, queues]);

  const handleToggleUserVerification = async (owner) => {
    const ownerId = owner.ownerIdString || owner.ownerId;
    const nextStatus = !Boolean(owner.isVerifiedOwner);
    try {
      await adminService.updateUser(ownerId, { isVerifiedOwner: nextStatus });
      setTopOwners((prev) =>
        prev.map((item) =>
          (item.ownerIdString || item.ownerId) === ownerId ? { ...item, isVerifiedOwner: nextStatus } : item
        )
      );
      toast.success(nextStatus ? `${owner.name} marked as verified owner.` : `${owner.name} marked as unverified owner.`);
    } catch (err) {
      toast.error("Failed to update owner verification.");
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      <div className="max-w-7xl mx-auto py-20 flex items-center justify-center gap-3">
        <Loader2 className="animate-spin text-[#d4af37]" size={36} />
        <span className="text-[#9a9a9a] tracking-wide">Initializing Administrative Dashboard...</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl text-[#f8f6f3]" style={{ fontFamily: "'Playfair Display', serif" }}>
              Administrative Dashboard
            </h1>
            <p className="text-sm text-[#9a9a9a] mt-1 tracking-wide">Real-time operational summary and administrative queues</p>
          </div>
          <div className="flex gap-2">
            {["7d", "30d", "90d", "1y"].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs tracking-widest uppercase transition-all ${
                  period === p ? "bg-[#d4af37] text-[#0a0a0a] font-bold" : "border border-[#d4af37]/20 text-[#9a9a9a] hover:border-[#d4af37]/50 hover:text-[#f8f6f3]"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard title="Total Users" value={derived.totalUsers} icon={Users} trend={derived.trends.users} />
          <StatCard title="Verified Houses" value={derived.verifiedHouses} icon={Home} trend={derived.trends.listings} />
          <StatCard title="Pending Approvals" value={derived.pendingHouses} icon={ShieldAlert} subtitle={derived.pendingHouses > 10 ? "Action required: High volume" : "Queue within standard capacity"} />
          <StatCard title="Total Bookings" value={derived.totalBookings} icon={CalendarCheck} trend={derived.trends.bookings} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#111] p-6 border border-[#d4af37]/10">
            <h2 className="text-lg text-[#f8f6f3] mb-4 flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              <Activity size={16} className="text-[#d4af37]" /> Action Queues
            </h2>
            <div className="space-y-3 text-sm">
              {[
                { label: "Pending listing approvals", value: derived.pendingHouses },
                { label: "Owner rejection reports", value: derived.rejectedReports },
                { label: "Booking rejection rate", value: `${derived.bookingRejectionRate}%`, highlight: derived.bookingRejectionRate > 30 },
              ].map(({ label, value, highlight }) => (
                <div key={label} className="flex items-center justify-between border-b border-[#d4af37]/5 pb-2">
                  <span className="text-[#9a9a9a] tracking-wide">{label}</span>
                  <span className={`font-bold ${highlight ? "text-red-400" : "text-[#f8f6f3]"}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#111] p-6 border border-[#d4af37]/10 lg:col-span-2">
            <h2 className="text-lg text-[#f8f6f3] mb-4 flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              <AlertTriangle size={16} className="text-[#d4af37]" /> Operational Alerts
            </h2>
            <div className="space-y-2 text-sm">
              {derived.pendingHouses > 0 && <p className="text-amber-400">{derived.pendingHouses} listings are waiting for admin approval.</p>}
              {derived.rejectedReports > 0 && <p className="text-amber-400">{derived.rejectedReports} rejected listings have owner reports awaiting review.</p>}
              {derived.bookingRejectionRate > 30 && <p className="text-red-400">Booking rejection rate is high ({derived.bookingRejectionRate}%) for this period.</p>}
              {derived.pendingHouses === 0 && derived.rejectedReports === 0 && derived.bookingRejectionRate <= 30 && (
                <p className="text-emerald-400">No critical operational alerts right now.</p>
              )}
            </div>
          </div>
        </div>

        {/* Management Shortcuts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            { [
              { to: "/admin/listings", title: "Property Management", desc: "Review, approve, or reject property listings submitted by owners.", badge: `${derived.pendingHouses} pending` },
              { to: "/admin/users", title: "User Management", desc: "Manage user accounts, roles, and permissions across the platform." },
              { to: "/admin/analytics", title: "Analytics", desc: "Monitor platform performance, revenue trends, and usage statistics." },
              { to: "/admin/logs", title: "Audit Logs", desc: "Track administrative actions, verification decisions, and system events." },
            ].map(({ to, title, desc, badge }) => (
            <Link key={to} to={to} className="bg-[#111] p-8 border border-[#d4af37]/10 hover:border-[#d4af37]/30 transition-all group block">
              <h2 className="text-2xl text-[#f8f6f3] mb-2 group-hover:text-[#d4af37] transition-colors" style={{ fontFamily: "'Playfair Display', serif" }}>{title}</h2>
              <p className="text-[#9a9a9a] text-sm tracking-wide mb-4">{desc}</p>
              <span className="text-[#d4af37] text-xs tracking-widest uppercase flex items-center justify-between">
                Manage →
                {badge && <span className="text-[10px] bg-[#d4af37]/10 text-[#d4af37] px-2 py-1">{badge}</span>}
              </span>
            </Link>
          ))}
        </div>

        {/* Top Owners Table */}
        {topOwners.length > 0 && (
          <div className="bg-[#111] p-6 border border-[#d4af37]/10 mb-8">
            <h2 className="text-lg text-[#f8f6f3] mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>Top Owners By Listings</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#d4af37]/10 text-[#d4af37]/50">
                    {["Owner", "Listings", "Approved", "Views", "Conv.", "Account", "Action"].map((h) => (
                      <th key={h} className="text-left py-2 text-[10px] uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topOwners.map((owner) => (
                    <tr key={owner.ownerIdString || owner.ownerId} className="border-b border-[#d4af37]/5 last:border-b-0">
                      <td className="py-3">
                        <p className="font-semibold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]" style={{ color: "#ffffff" }}>
                          {owner.name || owner.fullName || owner.username || owner.email?.split("@")[0] || `Owner ${String(owner.ownerIdString || owner.ownerId || "").slice(-6)}`}
                        </p>
                        <p className="text-xs text-[#9a9a9a]">{owner.email}</p>
                        {owner?.banned?.isBanned && <p className="text-[11px] text-red-400 font-semibold mt-0.5">Banned</p>}
                      </td>
                      <td className="py-3 text-[#9a9a9a]">{owner.listings || 0}</td>
                      <td className="py-3 text-[#9a9a9a]">{owner.approvedListings || 0}</td>
                      <td className="py-3 text-[#9a9a9a]">{owner.totalViews || 0}</td>
                      <td className="py-3 text-[#9a9a9a]">{owner.conversionRate || 0}%</td>
                      <td className="py-3">
                        <span className={`text-xs px-2 py-1 font-bold ${owner.isVerifiedOwner ? "text-blue-300" : "text-amber-400"}`}>
                          {owner.isVerifiedOwner ? "Verified Owner" : "Unverified"}
                        </span>
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => handleToggleUserVerification(owner)}
                          className={`px-3 py-1 text-xs font-bold border transition-all ${
                            owner.isVerifiedOwner ? "border-blue-400/30 text-blue-300 hover:border-blue-300/60" : "border-[#d4af37] text-[#d4af37] hover:bg-[#d4af37] hover:text-[#0a0a0a]"
                          }`}
                        >
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

        {/* Recent Activity */}
        {stats?.recentActivity?.length > 0 && (
          <div className="bg-[#111] p-6 border border-[#d4af37]/10">
            <h2 className="text-lg text-[#f8f6f3] mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>Recent Admin Activity</h2>
            <div className="space-y-3">
              {stats.recentActivity.map((item) => (
                <div key={item._id} className="flex items-center justify-between border-b border-[#d4af37]/5 pb-2 last:border-b-0">
                  <div>
                    <p className="text-sm text-[#f8f6f3]">{String(item.action || "").replaceAll("_", " ")}</p>
                    <p className="text-xs text-[#9a9a9a]">by {item.performedBy?.name || "System"}</p>
                  </div>
                  <span className="text-xs text-[#9a9a9a]/50">{new Date(item.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
