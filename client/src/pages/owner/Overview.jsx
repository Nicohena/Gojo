import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { DollarSign, Building2, Mail, Star, Plus, Users } from "lucide-react";
import bookingService from "../../api/bookingService";
import { StatCard } from "../../components/owner/StatCard";
import { RevenueChart } from "../../components/owner/RevenueChart";
import { BookingRequestCard } from "../../components/owner/BookingRequestCard";
import { toast } from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import VerifiedOwnerBadge from "../../components/ui/VerifiedOwnerBadge";

const CORAL = "#E67E5F";

const FALLBACK_REVENUE = [
  { label: "Jan", value: 4500 },
  { label: "Feb", value: 6000 },
  { label: "Mar", value: 7500 },
  { label: "Apr", value: 8200 },
  { label: "May", value: 9800 },
  { label: "Jun", value: 12450 },
];

const Overview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    occupancyRate: 0,
    pendingRequests: 0,
    averageRating: 0,
  });
  const [revenueData, setRevenueData] = useState(FALLBACK_REVENUE);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [statsRes, revenueRes, requestsRes] = await Promise.all([
          bookingService.getBookingStats().catch(() => ({ data: {} })),
          bookingService.getRevenueAnalytics().catch(() => ({ data: { revenue: [] } })),
          bookingService.getPendingRequests().catch(() => ({ data: { bookings: [] } })),
        ]);

        const s = statsRes.data?.stats || {};
        const revenue = revenueRes.data?.revenue || [];
        const requests = requestsRes.data?.bookings || [];

        setStats({
          totalRevenue: s.totalRevenue || 0,
          occupancyRate: s.occupancyRate || 0,
          pendingRequests: requests.length || s.pendingRequests || 0,
          averageRating: s.averageRating || 0,
        });

        setRevenueData(revenue.length > 0 ? revenue : FALLBACK_REVENUE);
        setPendingRequests(requests);
      } catch {
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleApprove = async (id) => {
    try {
      setProcessingId(id);
      await bookingService.acceptBooking(id);
      setPendingRequests((p) => p.filter((r) => r._id !== id));
      setStats((p) => ({ ...p, pendingRequests: Math.max(p.pendingRequests - 1, 0) }));
      toast.success("Booking approved");
    } catch { toast.error("Failed to approve booking"); }
    finally { setProcessingId(null); }
  };

  const handleDecline = async (id) => {
    if (!window.confirm("Decline this booking?")) return;
    try {
      setProcessingId(id);
      await bookingService.declineBooking(id);
      setPendingRequests((p) => p.filter((r) => r._id !== id));
      setStats((p) => ({ ...p, pendingRequests: Math.max(p.pendingRequests - 1, 0) }));
      toast.success("Booking declined");
    } catch { toast.error("Failed to decline booking"); }
    finally { setProcessingId(null); }
  };

  const footer = (
    <footer className="border-t border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <button onClick={() => navigate("/")} className="text-base font-bold" style={{ color: CORAL }}>Gojo</button>
        <p className="text-xs text-gray-400">© 2024 Gojo Ethiopia. All rights reserved. Built with hospitality.</p>
        <nav className="flex flex-wrap justify-center gap-5 text-xs text-gray-500">
          <a href="#support" className="hover:text-gray-800">Support Center</a>
          <a href="#trust"   className="hover:text-gray-800">Trust &amp; Safety</a>
          <a href="#terms"   className="hover:text-gray-800">Terms of Service</a>
          <a href="#privacy" className="hover:text-gray-800">Privacy Policy</a>
          <button onClick={() => navigate("/owner/listings/add")} className="hover:text-gray-800">List your Property</button>
        </nav>
      </div>
    </footer>
  );

  return (
    <DashboardLayout footer={footer}>
      <div className="py-8 px-6 md:px-10">
        {/* ── Page heading ─────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: CORAL }}>
              Property Portfolio
            </p>
            <div className="flex items-center gap-2.5">
              <h1 className="text-3xl font-bold text-gray-900">Overview</h1>
              {user?.isVerifiedOwner && <VerifiedOwnerBadge />}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Review the current status and performance of your property listings.
            </p>
          </div>
          <button
            onClick={() => navigate("/owner/listings/add")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 shrink-0"
            style={{ background: CORAL }}
          >
            <Plus size={16} strokeWidth={2.5} />
            Add Property
          </button>
        </div>

        {/* ── Stat cards ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Total Revenue"
            value={`$${stats.totalRevenue.toLocaleString()}`}
            icon={DollarSign}
            color="coral"
            trend="up"
            trendValue="+12.5%"
          />
          <StatCard
            label="Occupancy"
            value={`${stats.occupancyRate}%`}
            icon={Building2}
            color="amber"
            trend="up"
            trendValue="+4.2%"
          />
          <StatCard
            label="Pending"
            value={stats.pendingRequests}
            icon={Mail}
            color="blue"
            trend={stats.pendingRequests === 0 ? "neutral" : "up"}
            trendValue={stats.pendingRequests === 0 ? "All clear" : `${stats.pendingRequests} pending`}
          />
          <StatCard
            label="Avg Rating"
            value={stats.averageRating.toFixed ? stats.averageRating.toFixed(1) : stats.averageRating}
            icon={Star}
            color="purple"
            trend="up"
            trendValue="+0.2"
          />
        </div>

        {/* ── Chart + Requests ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Revenue chart — spans 2 cols */}
          <div className="lg:col-span-2 min-h-[320px]">
            <RevenueChart data={revenueData} loading={loading} />
          </div>

          {/* Booking requests */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">Booking Requests</h3>
              <button
                onClick={() => navigate("/owner/bookings")}
                className="text-xs font-semibold hover:underline"
                style={{ color: CORAL }}
              >
                View All
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: CORAL, borderTopColor: "transparent" }} />
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center mb-3">
                    <Users size={20} style={{ color: CORAL }} />
                  </div>
                  <p className="text-sm font-medium text-gray-600">No pending requests</p>
                  <p className="text-xs text-gray-400 mt-0.5">All bookings are up to date.</p>
                </div>
              ) : (
                pendingRequests.map((req) => (
                  <BookingRequestCard
                    key={req._id}
                    request={req}
                    onAccept={handleApprove}
                    onDecline={handleDecline}
                    processing={processingId}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Overview;
