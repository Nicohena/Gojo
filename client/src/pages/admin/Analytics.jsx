import React, { useState, useEffect } from "react";
import adminService from "../../api/adminService";
import Navbar from "../../components/layout/Navbar";
import { Link } from "react-router-dom";
import {
  TrendingUp, TrendingDown, Users, Home, CalendarCheck, DollarSign,
  ShieldCheck, BarChart3, Loader2, ArrowLeft, Download,
} from "lucide-react";

const StatCard = ({ icon: Icon, label, value, subtext }) => (
  <div className="p-6" style={{ background: 'var(--panel)', border: '1px solid', borderColor: 'var(--panel-border)' }}>
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 border flex items-center justify-center" style={{ borderColor: 'rgba(212,175,55,0.2)' }}>
        <Icon size={18} style={{ color: 'var(--accent)' }} />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(212,175,55,0.5)' }}>{label}</p>
        <p className="text-2xl mt-1" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--text)' }}>{value}</p>
        {subtext && <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{subtext}</p>}
      </div>
    </div>
  </div>
);

const BreakdownCard = ({ title, data, colorMap }) => (
  <div className="p-6" style={{ background: 'var(--panel)', border: '1px solid', borderColor: 'var(--panel-border)' }}>
    <h3 className="mb-4 text-sm font-bold tracking-wide" style={{ color: 'var(--text)' }}>{title}</h3>
    <div className="space-y-3">
      {Object.entries(data || {}).map(([key, count]) => (
        <div key={key} className="flex items-center justify-between" style={{ borderBottom: '1px solid rgba(212,175,55,0.05)', paddingBottom: '0.5rem' }}>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full`} style={{ background: colorMap?.[key] ? undefined : 'var(--muted)' }} />
            <span className="text-sm capitalize" style={{ color: 'var(--muted)' }}>{key}</span>
          </div>
          <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>{count}</span>
        </div>
      ))}
      {(!data || Object.keys(data).length === 0) && <p className="text-sm" style={{ color: 'rgba(154,154,154,0.5)' }}>No data yet</p>}
    </div>
  </div>
);

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
    } catch (err) {
      console.error("Failed to fetch analytics", err);
    } finally {
      setLoading(false);
    }
  };

  const roleColors = { tenant: "bg-[#d4af37]", owner: "bg-emerald-400", admin: "bg-purple-400" };
  const statusColors = { pending: "bg-yellow-400", approved: "bg-emerald-400", rejected: "bg-red-400", cancelled: "bg-slate-400", completed: "bg-[#d4af37]" };
  const typeColors = { apartment: "bg-[#d4af37]", house: "bg-emerald-400", condo: "bg-purple-400", townhouse: "bg-orange-400", studio: "bg-pink-400", room: "bg-yellow-400", unspecified: "bg-slate-400" };

  const trends = analytics?.analytics?.trends || {};
  const trendChanges = trends?.changes || {};
  const revenueStats = analytics?.analytics?.revenue || {};
  const listingStats = analytics?.analytics?.listings || {};
  const topPropertyTypes = Object.entries(listingStats.byPropertyType || {}).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const overview = analytics?.overview || {};

  const exportDailyRevenue = () => {
    const rows = [["Date", "Revenue", "Transactions"], ...(revenueStats.dailyBreakdown || []).map((d) => [d._id, d.revenue || 0, d.count || 0])];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-daily-revenue-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return (
    <div className="min-h-screen">
      <Navbar />
      <div className="flex items-center justify-center py-20 gap-3">
        <Loader2 className="animate-spin" size={40} style={{ color: 'var(--accent)' }} />
        <span className="tracking-wide" style={{ color: 'var(--muted)' }}>Loading analytics...</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="p-2 transition-all" style={{ border: '1px solid', borderColor: 'var(--panel-border)', color: 'var(--muted)' }}>
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-4xl" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--text)' }}>Analytics</h1>
              <p className="text-sm mt-1 tracking-wide" style={{ color: 'var(--muted)' }}>Comprehensive platform performance and operational metrics.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={exportDailyRevenue} className="px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 tracking-wide transition-all" style={{ border: '1px solid', borderColor: 'rgba(212,175,55,0.2)', color: 'rgba(212,175,55,0.7)' }}>
              <Download size={12} />
              Export CSV
            </button>
            {["7d", "30d", "90d", "1y"].map((p) => (
              <button key={p} onClick={() => setPeriod(p)} className="px-3 py-1.5 text-xs tracking-widest uppercase transition-all" style={period === p ? { background: 'var(--accent)', color: 'var(--panel)', fontWeight: 700 } : { border: '1px solid', borderColor: 'var(--panel-border)', color: 'var(--muted)' }}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Trend Snapshot */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Bookings", value: trendChanges.bookings ?? 0 },
            { label: "Users", value: trendChanges.users ?? 0 },
            { label: "Listings", value: trendChanges.listings ?? 0 },
            { label: "Revenue", value: trendChanges.revenue ?? 0 },
          ].map((item) => {
            const positive = item.value >= 0;
            return (
              <div key={item.label} className="p-4" style={{ background: 'var(--panel)', border: '1px solid', borderColor: 'var(--panel-border)' }}>
                <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: 'rgba(212,175,55,0.5)' }}>{item.label} Trend</p>
                <div className="mt-2 inline-flex items-center gap-1 text-sm font-bold" style={{ color: positive ? 'var(--success)' : 'var(--danger)' }}>
                  {positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {item.value > 0 ? "+" : ""}{item.value}%
                </div>
                <p className="text-[10px] mt-1" style={{ color: 'var(--muted)' }}>vs previous period</p>
              </div>
            );
          })}
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <StatCard icon={Users} label="Total Users" value={overview.totalUsers || 0} />
          <StatCard icon={Home} label="Total Houses" value={overview.totalHouses || 0} />
          <StatCard icon={CalendarCheck} label="Total Bookings" value={overview.totalBookings || 0} />
          <StatCard icon={ShieldCheck} label="Pending Verifications" value={overview.pendingVerifications || 0} />
          <StatCard icon={DollarSign} label="Revenue" value={`ETB ${(overview.revenue || 0).toLocaleString()}`} subtext={`${overview.transactions || 0} transactions`} />
          <StatCard icon={TrendingUp} label="Period" value={period.toUpperCase()} />
        </div>

        {/* Breakdowns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <BreakdownCard title="Users by Role" data={stats?.usersByRole} colorMap={roleColors} />
          <BreakdownCard title="Bookings by Status" data={stats?.bookingsByStatus} colorMap={statusColors} />
          <BreakdownCard title="Houses by Type" data={stats?.housesByType} colorMap={typeColors} />
        </div>

        {/* Revenue + Listing Quality */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-[#111] p-6 border border-[#d4af37]/10">
            <h3 className="text-[#f8f6f3] mb-4 text-sm font-bold tracking-wide">Revenue Quality</h3>
            <div className="space-y-3 text-sm">
              {[
                { label: "Net Revenue", value: `ETB ${(revenueStats.netRevenue || 0).toLocaleString()}` },
                { label: "Average Transaction", value: `ETB ${Math.round(revenueStats.averageTransaction || 0).toLocaleString()}` },
                { label: "Total Refunds", value: `ETB ${(revenueStats.totalRefunds || 0).toLocaleString()}` },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between border-b border-[#d4af37]/5 pb-2">
                  <span className="text-[#9a9a9a]">{label}</span>
                  <span className="font-bold text-[#f8f6f3]">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#111] p-6 border border-[#d4af37]/10">
            <h3 className="text-[#f8f6f3] mb-4 text-sm font-bold tracking-wide">Listing Performance</h3>
            <div className="space-y-3 text-sm">
              {[
                { label: "New Listings", value: listingStats.newListings || 0 },
                { label: "Verified Listings", value: listingStats.verifiedListings || 0 },
                { label: "Average Market Price", value: `ETB ${Math.round(listingStats.averagePrice || 0).toLocaleString()}` },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between border-b border-[#d4af37]/5 pb-2">
                  <span className="text-[#9a9a9a]">{label}</span>
                  <span className="font-bold text-[#f8f6f3]">{value}</span>
                </div>
              ))}
              <div className="pt-1">
                <p className="text-[10px] uppercase tracking-widest font-bold text-[#d4af37]/50 mb-2">Top Property Types</p>
                {topPropertyTypes.length > 0 ? (
                  <div className="space-y-1">
                    {topPropertyTypes.map(([type, count]) => (
                      <p key={type} className="text-[#9a9a9a]"><span className="capitalize">{type}</span>: <span className="font-bold text-[#f8f6f3]">{count}</span></p>
                    ))}
                  </div>
                ) : (
                  <p className="text-[#9a9a9a]/50">No property type distribution yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        {stats?.recentActivity?.length > 0 && (
          <div className="bg-[#111] p-6 border border-[#d4af37]/10">
            <h3 className="text-[#f8f6f3] mb-4 text-sm font-bold tracking-wide flex items-center gap-2">
              <BarChart3 size={16} className="text-[#d4af37]" /> Recent Activity (24h)
            </h3>
            <div className="space-y-3">
              {stats.recentActivity.map((log, idx) => (
                <div key={idx} className="flex items-center justify-between border-b border-[#d4af37]/5 pb-2 last:border-0">
                  <div>
                    <span className="text-sm text-[#f8f6f3]">{log.action?.replace(/_/g, " ")}</span>
                    <span className="text-xs text-[#9a9a9a] ml-2">by {log.performedBy?.name || "System"}</span>
                  </div>
                  <span className="text-xs text-[#9a9a9a]/50">{new Date(log.createdAt).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAnalytics;
