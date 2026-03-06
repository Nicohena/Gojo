import React, { useMemo, useState, useEffect } from "react";
import adminService from "../../api/adminService";
import Navbar from "../../components/layout/Navbar";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Users,
  Home,
  CalendarCheck,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  Activity,
  Loader2,
  AlertTriangle,
} from "lucide-react";

const formatChange = (value = 0) => {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}%`;
};

const getTrendTone = (value = 0) => {
  if (value > 0) return "text-emerald-600";
  if (value < 0) return "text-red-600";
  return "text-slate-500";
};

const StatCard = ({ title, value, icon: Icon, trend, subtitle }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-slate-500 font-medium">{title}</p>
        <p className="text-3xl font-black text-slate-900 mt-1">{value}</p>
        {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
      </div>
      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
        <Icon size={18} className="text-slate-700" />
      </div>
    </div>
    {typeof trend === "number" && (
      <div className={`mt-3 text-xs font-semibold flex items-center gap-1 ${getTrendTone(trend)}`}>
        {trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
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
  const [queues, setQueues] = useState({
    pendingHouses: 0,
    rejectedReports: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [period]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [analyticsResponse, systemStats, rejectedReportsResponse] = await Promise.all([
        adminService.getAnalytics(period),
        adminService.getStats(),
        adminService.getPendingListings({
          status: "rejected",
          reportedOnly: "true",
          limit: 1,
        }),
      ]);

      const overview = analyticsResponse?.data?.overview || {};
      const detailed = analyticsResponse?.data?.analytics || {};
      const ownerLeaders = analyticsResponse?.data?.topOwners || [];

      setAnalytics({
        overview,
        trends: detailed?.trends || {},
        bookings: detailed?.bookings || {},
      });
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
    const rejectionRate =
      totalBookings > 0 ? Math.round((rejectedBookings / totalBookings) * 100) : 0;

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
    try {
      await adminService.updateUser(ownerId, { verified: !owner.verified });
      setTopOwners((prev) =>
        prev.map((item) =>
          (item.ownerIdString || item.ownerId) === ownerId
            ? { ...item, verified: !item.verified }
            : item
        )
      );
      toast.success(
        !owner.verified
          ? `${owner.name} marked as verified.`
          : `${owner.name} marked as unverified.`
      );
    } catch (err) {
      console.error("Failed to update account verification", err);
      toast.error("Failed to update account verification.");
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <div className="max-w-7xl mx-auto py-20 flex items-center justify-center">
          <Loader2 className="animate-spin text-blue-600" size={36} />
          <span className="ml-3 text-slate-600">Loading Dashboard...</span>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Control Panel</h1>
            <p className="text-sm text-slate-500 mt-1">
              Live operational overview and decision queues
            </p>
          </div>
          <div className="flex gap-2">
            {["7d", "30d", "90d", "1y"].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  period === p
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <StatCard
            title="Total Users"
            value={derived.totalUsers}
            icon={Users}
            trend={derived.trends.users}
          />
          <StatCard
            title="Verified Houses"
            value={derived.verifiedHouses}
            icon={Home}
            trend={derived.trends.listings}
          />
          <StatCard
            title="Pending Approvals"
            value={derived.pendingHouses}
            icon={ShieldAlert}
            subtitle={
              derived.pendingHouses > 10 ? "Backlog is high" : "Queue is manageable"
            }
          />
          <StatCard
            title="Total Bookings"
            value={derived.totalBookings}
            icon={CalendarCheck}
            trend={derived.trends.bookings}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Activity size={18} /> Action Queues
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Pending listing approvals</span>
                <span className="font-bold text-slate-900">{derived.pendingHouses}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Owner rejection reports</span>
                <span className="font-bold text-slate-900">{derived.rejectedReports}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Booking rejection rate</span>
                <span
                  className={`font-bold ${
                    derived.bookingRejectionRate > 30 ? "text-red-600" : "text-slate-900"
                  }`}
                >
                  {derived.bookingRejectionRate}%
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 lg:col-span-2">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <AlertTriangle size={18} /> Operational Alerts
            </h2>
            <div className="space-y-2 text-sm">
              {derived.pendingHouses > 0 && (
                <p className="text-amber-700">
                  {derived.pendingHouses} listings are waiting for admin approval.
                </p>
              )}
              {derived.rejectedReports > 0 && (
                <p className="text-amber-700">
                  {derived.rejectedReports} rejected listings have owner reports awaiting review.
                </p>
              )}
              {derived.bookingRejectionRate > 30 && (
                <p className="text-red-700">
                  Booking rejection rate is high ({derived.bookingRejectionRate}%) for this period.
                </p>
              )}
              {derived.pendingHouses === 0 &&
                derived.rejectedReports === 0 &&
                derived.bookingRejectionRate <= 30 && (
                  <p className="text-emerald-700">No critical operational alerts right now.</p>
                )}
            </div>
          </div>
        </div>

        {/* Management Shortcuts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          <Link
            to="/admin/listings"
            className="bg-white p-8 rounded-xl shadow hover:shadow-lg transition-shadow border border-gray-200 block"
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Listing Management
            </h2>
            <p className="text-gray-600 mb-4">
              Review, approve, or reject new house listings submitted by owners.
            </p>
            <span className="text-blue-600 font-semibold flex items-center justify-between">
              Go to Listings →
              <span className="ml-3 text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                {derived.pendingHouses} pending
              </span>
            </span>
          </Link>

          <Link
            to="/admin/users"
            className="bg-white p-8 rounded-xl shadow hover:shadow-lg transition-shadow border border-gray-200 block"
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              User Management
            </h2>
            <p className="text-gray-600 mb-4">
              Manage user accounts, roles, and permissions across the platform.
            </p>
            <span className="text-blue-600 font-semibold flex items-center">
              Go to Users →
            </span>
          </Link>

          <Link
            to="/admin/analytics"
            className="bg-white p-8 rounded-xl shadow hover:shadow-lg transition-shadow border border-gray-200 block"
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Analytics</h2>
            <p className="text-gray-600 mb-4">
              View platform performance, revenue trends, and usage statistics.
            </p>
            <span className="text-blue-600 font-semibold flex items-center">
              Go to Analytics →
            </span>
          </Link>

          <Link
            to="/admin/logs"
            className="bg-white p-8 rounded-xl shadow hover:shadow-lg transition-shadow border border-gray-200 block"
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Audit Logs
            </h2>
            <p className="text-gray-600 mb-4">
              Track all admin actions, verification decisions, and system
              events.
            </p>
            <span className="text-blue-600 font-semibold flex items-center">
              Go to Logs →
            </span>
          </Link>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 mb-10">
          <h2 className="text-lg font-bold text-slate-900 mb-4">
            Top Owners By Listings
          </h2>
          {topOwners.length === 0 ? (
            <p className="text-sm text-slate-500">No owner leaderboard data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-slate-500">
                    <th className="text-left py-2">Owner</th>
                    <th className="text-left py-2">Listings</th>
                    <th className="text-left py-2">Approved</th>
                    <th className="text-left py-2">Views</th>
                    <th className="text-left py-2">Conv.</th>
                    <th className="text-left py-2">Account</th>
                    <th className="text-left py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {topOwners.map((owner) => (
                    <tr key={owner.ownerIdString || owner.ownerId} className="border-b last:border-b-0">
                      <td className="py-2">
                        <p className="font-semibold text-slate-900">{owner.name}</p>
                        <p className="text-xs text-slate-500">{owner.email}</p>
                        {owner?.banned?.isBanned && (
                          <p className="text-[11px] text-red-600 font-semibold mt-0.5">Banned</p>
                        )}
                      </td>
                      <td className="py-2">{owner.listings || 0}</td>
                      <td className="py-2">{owner.approvedListings || 0}</td>
                      <td className="py-2">{owner.totalViews || 0}</td>
                      <td className="py-2">{owner.conversionRate || 0}%</td>
                      <td className="py-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            owner.verified
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {owner.verified ? "Verified" : "Unverified"}
                        </span>
                      </td>
                      <td className="py-2">
                        <button
                          onClick={() => handleToggleUserVerification(owner)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                            owner.verified
                              ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                              : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}
                        >
                          {owner.verified ? "Unverify" : "Verify"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {stats?.recentActivity?.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Recent Admin Activity</h2>
            <div className="space-y-3">
              {stats.recentActivity.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-b-0"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {String(item.action || "").replaceAll("_", " ")}
                    </p>
                    <p className="text-xs text-slate-500">
                      by {item.performedBy?.name || "System"}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
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
