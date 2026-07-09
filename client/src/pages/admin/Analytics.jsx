import React, { useState, useEffect } from "react";
import adminService from "../../api/adminService";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { Navbar } from "../../components/layout/Navbar";
import {
  TrendingUp, TrendingDown, Users, Home, CalendarCheck, DollarSign,
  ShieldCheck, BarChart3, Loader2, Download, Wallet,
} from "lucide-react";

const CORAL = "#E67E5F";

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, subtext, iconBg }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
        {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
      </div>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: iconBg || "#FEF0EC" }}>
        <Icon size={18} style={{ color: CORAL }} />
      </div>
    </div>
  </div>
);

// ── Trend badge ───────────────────────────────────────────────────────────────
const TrendCard = ({ label, value }) => {
  const positive = value >= 0;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{label} Trend</p>
      <div className={`inline-flex items-center gap-1.5 text-lg font-bold ${positive ? "text-emerald-600" : "text-red-500"}`}>
        {positive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
        {value > 0 ? "+" : ""}{value}%
      </div>
      <p className="text-xs text-gray-400 mt-1">vs previous period</p>
    </div>
  );
};

// ── Breakdown card ────────────────────────────────────────────────────────────
const BreakdownCard = ({ title, data, colorMap }) => {
  const entries = Object.entries(data || {});
  const total = entries.reduce((s, [, v]) => s + Number(v), 0);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-bold text-gray-800 mb-4">{title}</h3>
      {entries.length === 0 ? (
        <p className="text-sm text-gray-400">No data yet</p>
      ) : (
        <div className="space-y-3">
          {entries.map(([key, count]) => {
            const pct = total > 0 ? Math.round((Number(count) / total) * 100) : 0;
            return (
              <div key={key}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-600 capitalize font-medium">{key}</span>
                  <span className="font-bold text-gray-800">{count}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: colorMap?.[key] || CORAL }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
const AdminAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState("30d");
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [analyticsData, statsData] = await Promise.all([
        adminService.getAnalytics(period),
        adminService.getStats(),
      ]);
      setAnalytics(analyticsData?.data || analyticsData);
      setStats(statsData?.data || statsData);
    } catch (err) { console.error("Failed to fetch analytics", err); }
    finally { setLoading(false); }
  };

  const roleColors   = { tenant: "#3B82F6", owner: "#10B981", admin: "#8B5CF6" };
  const statusColors = { pending: "#F59E0B", approved: "#10B981", rejected: "#EF4444", cancelled: "#9CA3AF", completed: CORAL };
  const typeColors   = { apartment: CORAL, house: "#10B981", condo: "#8B5CF6", townhouse: "#F59E0B", studio: "#EC4899", room: "#F59E0B" };

  const trends       = analytics?.analytics?.trends || {};
  const trendChanges = trends?.changes || {};
  const revenueStats = analytics?.analytics?.revenue || {};
  const listingStats = analytics?.analytics?.listings || {};
  const overview     = analytics?.overview || {};
  const topPropertyTypes = Object.entries(listingStats.byPropertyType || {}).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const exportDailyRevenue = () => {
    const rows = [["Date","Revenue","Transactions"], ...(revenueStats.dailyBreakdown || []).map(d => [d._id, d.revenue || 0, d.count || 0])];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `analytics-${period}-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return (
    <DashboardLayout>
      <Navbar />
      <div className="mx-auto max-w-screen-xl px-6 py-6">
        <div className="mb-6 h-8 w-40 animate-pulse rounded-full bg-slate-200" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 h-4 w-1/3 animate-pulse rounded-full bg-slate-200" />
              <div className="mb-2 h-8 w-2/3 animate-pulse rounded-full bg-slate-200" />
              <div className="h-3 w-1/2 animate-pulse rounded-full bg-slate-200" />
            </div>
          ))}
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
            <h1 className="text-2xl font-bold text-gray-800">Analytics</h1>
            <p className="text-sm text-gray-400 mt-0.5">Comprehensive platform performance and operational metrics.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportDailyRevenue}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-gray-200 text-gray-600 rounded-xl hover:border-gray-300 transition-all">
              <Download size={12} /> Export CSV
            </button>
            <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 shadow-sm">
              {[{ key: "7d", label: "7d" }, { key: "30d", label: "30d" }, { key: "90d", label: "90d" }, { key: "1y", label: "1y" }].map(({ key, label }) => (
                <button key={key} onClick={() => setPeriod(key)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
                  style={period === key ? { background: CORAL, color: "white" } : { color: "#6B7280" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Trend cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[{ label: "Bookings", value: trendChanges.bookings ?? 0 }, { label: "Users", value: trendChanges.users ?? 0 }, { label: "Listings", value: trendChanges.listings ?? 0 }, { label: "Revenue", value: trendChanges.revenue ?? 0 }].map(item => (
            <TrendCard key={item.label} label={item.label} value={item.value} />
          ))}
        </div>

        {/* Overview stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <StatCard icon={Users}      label="Total Users"             value={overview.totalUsers || 0}                              iconBg="#EBF3FB" />
          <StatCard icon={Home}       label="Total Houses"            value={overview.totalHouses || 0}                             iconBg="#F0FDF4" />
          <StatCard icon={CalendarCheck} label="Total Bookings"       value={overview.totalBookings || 0}                           iconBg="#FEF0EC" />
          <StatCard icon={ShieldCheck}label="Pending Verifications"   value={overview.pendingVerifications || 0}                    iconBg="#FEF2F2" />
          <StatCard icon={Wallet}     label="Revenue"                 value={`ETB ${(overview.revenue || 0).toLocaleString()}`} subtext={`${overview.transactions || 0} transactions`} iconBg="#ECFDF5" />
          <StatCard icon={TrendingUp} label="Period"                  value={period.toUpperCase()}                                  iconBg="#FAF5FF" />
        </div>

        {/* Breakdowns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <BreakdownCard title="Users by Role"       data={stats?.usersByRole}      colorMap={roleColors} />
          <BreakdownCard title="Bookings by Status"  data={stats?.bookingsByStatus} colorMap={statusColors} />
          <BreakdownCard title="Houses by Type"      data={stats?.housesByType}     colorMap={typeColors} />
        </div>

        {/* Revenue quality + Listing performance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Wallet size={15} style={{ color: CORAL }} /> Revenue Quality
            </h3>
            <div className="space-y-3">
              {[
                { label: "Net Revenue",           value: `ETB ${(revenueStats.netRevenue || 0).toLocaleString()}` },
                { label: "Average Transaction",   value: `ETB ${Math.round(revenueStats.averageTransaction || 0).toLocaleString()}` },
                { label: "Total Refunds",         value: `ETB ${(revenueStats.totalRefunds || 0).toLocaleString()}` },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between border-b border-gray-50 pb-2 last:border-0">
                  <span className="text-sm text-gray-500">{label}</span>
                  <span className="font-bold text-gray-800 text-sm">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Home size={15} style={{ color: CORAL }} /> Listing Performance
            </h3>
            <div className="space-y-3">
              {[
                { label: "New Listings",          value: listingStats.newListings || 0 },
                { label: "Verified Listings",     value: listingStats.verifiedListings || 0 },
                { label: "Avg Market Price",      value: `ETB ${Math.round(listingStats.averagePrice || 0).toLocaleString()}` },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between border-b border-gray-50 pb-2">
                  <span className="text-sm text-gray-500">{label}</span>
                  <span className="font-bold text-gray-800 text-sm">{value}</span>
                </div>
              ))}
              {topPropertyTypes.length > 0 && (
                <div className="pt-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Top Property Types</p>
                  {topPropertyTypes.map(([type, count]) => (
                    <p key={type} className="text-sm text-gray-500 mb-0.5">
                      <span className="capitalize">{type}</span>: <span className="font-bold text-gray-800">{count}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent activity */}
        {stats?.recentActivity?.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <BarChart3 size={15} style={{ color: CORAL }} /> Recent Activity (24h)
            </h3>
            <div className="space-y-3">
              {stats.recentActivity.map((log, idx) => (
                <div key={idx} className="flex items-center justify-between border-b border-gray-50 pb-2 last:border-0">
                  <div>
                    <span className="text-sm font-medium text-gray-700">{log.action?.replace(/_/g, " ")}</span>
                    <span className="text-xs text-gray-400 ml-2">by {log.performedBy?.name || "System"}</span>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(log.createdAt).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminAnalytics;
