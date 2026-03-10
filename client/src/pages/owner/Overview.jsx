import React, { useEffect, useState } from "react";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import {
  DollarSign,
  Users,
  Clock,
  Star,
  PlusCircle,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import bookingService from "../../api/bookingService";
import { StatCard } from "../../components/owner/StatCard";
import { RevenueChart } from "../../components/owner/RevenueChart";
import { BookingRequestCard } from "../../components/owner/BookingRequestCard";
import { toast } from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import VerifiedOwnerBadge from "../../components/ui/VerifiedOwnerBadge";

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
  const [revenueData, setRevenueData] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [statsData, revenueDataObj, requestsData] = await Promise.all([
          bookingService.getBookingStats().catch(() => ({ data: {} })),
          bookingService.getRevenueAnalytics().catch(() => ({ data: { revenue: [] } })),
          bookingService.getPendingRequests().catch(() => ({ data: { bookings: [] } })),
        ]);

        const stats = statsData.data?.stats || {};
        const revenue = revenueDataObj.data?.revenue || [];
        const requests = requestsData.data?.bookings || [];

        setStats({
          totalRevenue: stats.totalRevenue || 0,
          occupancyRate: stats.occupancyRate || 0,
          pendingRequests: requests.length || stats.pendingRequests || 0,
          averageRating: stats.averageRating || 0,
        });

        if (revenue && revenue.length > 0) {
          setRevenueData(revenue);
        } else {
          setRevenueData([
            { label: "Jan", value: 4500 },
            { label: "Feb", value: 6000 },
            { label: "Mar", value: 7500 },
            { label: "Apr", value: 8200 },
            { label: "May", value: 9800 },
            { label: "Jun", value: 12450 },
          ]);
        }

        setPendingRequests(requests || []);
      } catch (error) {
        console.error("Failed to load dashboard data", error);
        toast.error("Failed to refresh dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleApprove = async (id) => {
    try {
      setProcessingId(id);
      await bookingService.acceptBooking(id);
      setPendingRequests((prev) => prev.filter((req) => req._id !== id));
      setStats((prev) => ({ ...prev, pendingRequests: prev.pendingRequests - 1 }));
      toast.success("Booking accepted successfully");
    } catch (error) {
      toast.error("Failed to accept booking");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (id) => {
    if (!window.confirm("Are you sure you want to decline this booking?")) return;
    try {
      setProcessingId(id);
      await bookingService.declineBooking(id);
      setPendingRequests((prev) => prev.filter((req) => req._id !== id));
      setStats((prev) => ({ ...prev, pendingRequests: prev.pendingRequests - 1 }));
      toast.success("Booking declined");
    } catch (error) {
      toast.error("Failed to decline booking");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="h-[80vh] flex items-center justify-center">
          <Loader2 className="animate-spin" size={40} style={{ color: 'var(--accent)' }} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1
                className="text-4xl"
                style={{ fontFamily: "'Playfair Display', serif", color: 'var(--text)' }}
              >
                Overview
              </h1>
              {user?.isVerifiedOwner && <VerifiedOwnerBadge />}
            </div>
            <p className="tracking-wide text-sm mt-1" style={{ color: 'var(--muted)' }}>
              Welcome back. Review the current status and performance of your property listings.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/owner/listings/add")}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm tracking-[0.05em] transition-all"
            style={{ border: '1px solid', borderColor: 'var(--panel-border)', color: 'var(--accent)', background: 'transparent' }}
          >
            <PlusCircle size={16} />
            <span>Add Property</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Revenue" value={`$${stats.totalRevenue.toLocaleString()}`} icon={DollarSign} color="emerald" trend="up" trendValue="+12.5%" />
          <StatCard label="Occupancy Rate" value={`${stats.occupancyRate}%`} icon={Clock} color="blue" trend="up" trendValue="+4.2%" />
          <StatCard label="Pending Requests" value={stats.pendingRequests} icon={Users} color="orange" trend={stats.pendingRequests > 5 ? "down" : "neutral"} trendValue={stats.pendingRequests > 0 ? "Requires attention" : "All caught up"} />
          <StatCard label="Average Rating" value={stats.averageRating} icon={Star} color="purple" trend="up" trendValue="+0.2" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 min-h-[400px]">
            <RevenueChart data={revenueData} loading={loading} />
          </div>

          {/* Booking Requests Panel */}
          <div className="p-6 flex flex-col h-full min-h-[400px]" style={{ background: 'var(--panel)', border: '1px solid', borderColor: 'var(--panel-border)' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--text)' }}>
                Booking Requests
              </h3>
              <button onClick={() => navigate("/owner/bookings")} className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--accent)' }}>
                View All
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 -mr-1">
              {pendingRequests.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <div className="w-14 h-14 border flex items-center justify-center mb-4" style={{ borderColor: 'rgba(212,175,55,0.2)' }}>
                    <Users size={24} style={{ color: 'rgba(212,175,55,0.4)' }} />
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text)' }}>No pending requests</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>All requests have been addressed.</p>
                </div>
              ) : (
                pendingRequests.map((request) => (
                  <BookingRequestCard key={request._id} request={request} onAccept={handleApprove} onDecline={handleDecline} processing={processingId} />
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
