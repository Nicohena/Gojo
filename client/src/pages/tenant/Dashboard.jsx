import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import bookingService from "../../api/bookingService";
import chatService from "../../api/chatService";
import userService from "../../api/userService";
import { getImageUrl } from "../../utils/imageUtils";
import {
  Search,
  MapPin,
  ArrowRight,
  Heart,
  MessageSquare,
  CreditCard,
} from "lucide-react";
import PaymentModal from "../../components/payment/PaymentModal";

// ─── Brand ───────────────────────────────────────────────────────────────────
const CORAL = "#E67E5F";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hrs ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function StatusBadge({ status }) {
  const styles = {
    approved: { bg: "#D1FAE5", color: "#065F46", label: "Confirmed" },
    confirmed: { bg: "#D1FAE5", color: "#065F46", label: "Confirmed" },
    pending: { bg: "#FEF3C7", color: "#92400E", label: "Pending" },
    cancelled: { bg: "#FEE2E2", color: "#991B1B", label: "Cancelled" },
    rejected: { bg: "#FEE2E2", color: "#991B1B", label: "Rejected" },
  };
  const s = styles[status] || { bg: "#F3F4F6", color: "#374151", label: status };
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

// ─── Avatar initials circle ───────────────────────────────────────────────────
function Avatar({ name = "", size = 36, color = "#6B7280" }) {
  const letter = name.trim()[0]?.toUpperCase() || "?";
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
      style={{ width: size, height: size, background: color }}
    >
      {letter}
    </div>
  );
}

// ─── Gojo Rewards placeholder data ───────────────────────────────────────────
const REWARDS_BALANCE = 12450;
const REWARDS_NEXT = 15000;
const REWARDS_COMPLETED = 8;

// ─── Favorite places placeholder images ──────────────────────────────────────
const FAVE_PLACEHOLDERS = [
  {
    id: "f1",
    image: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&q=80",
    title: "Urban Oasis Loft",
    location: "Kazanchis, Addis A...",
  },
  {
    id: "f2",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80",
    title: "Mountain View ...",
    location: "Bishoftu, Ethiopia",
  },
  {
    id: "f3",
    image: "https://images.unsplash.com/photo-1631049552057-403cdb8f0658?w=400&q=80",
    title: "Skyline Penthouse",
    location: "Piassa, Addis Ababa",
  },
];

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const TenantDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [bookings, setBookings] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [savedHomes, setSavedHomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentBooking, setPaymentBooking] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [bookRes, chatRes] = await Promise.allSettled([
          bookingService.getBookings(),
          chatService.getConversations(),
        ]);

        if (bookRes.status === "fulfilled") {
          const list =
            bookRes.value?.data?.bookings ||
            bookRes.value?.bookings ||
            [];
          setBookings(Array.isArray(list) ? list : []);
        }

        if (chatRes.status === "fulfilled") {
          const list =
            chatRes.value?.data?.conversations ||
            chatRes.value?.conversations ||
            [];
          setConversations(Array.isArray(list) ? list.slice(0, 3) : []);
        }

        // Saved homes
        const userId = user?.id || user?._id;
        if (userId) {
          try {
            const savedRes = await userService.getSavedHomes(userId);
            const homes = savedRes?.data?.savedHomes || savedRes?.savedHomes || [];
            setSavedHomes(Array.isArray(homes) ? homes.slice(0, 3) : []);
          } catch {
            setSavedHomes([]);
          }
        }
      } catch (err) {
        console.error("Dashboard load error", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  // Pick the upcoming confirmed booking
  const upcomingBooking = bookings.find(
    (b) => b.status === "approved" || b.status === "confirmed"
  );

  // Favorite places: use saved homes or fall back to placeholders
  const favePlaces =
    savedHomes.length > 0
      ? savedHomes.map((h) => ({
          id: h._id,
          image:
            h.images?.[0]?.url ||
            h.images?.[0] ||
            FAVE_PLACEHOLDERS[0].image,
          title: h.title || "Saved Place",
          location: `${h.location?.city || ""}, ${h.location?.state || ""}`,
        }))
      : FAVE_PLACEHOLDERS;

  const firstName = user?.name?.split(" ")[0] || "there";
  const progressPct = Math.min((REWARDS_BALANCE / REWARDS_NEXT) * 100, 100);

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-7">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {firstName}!
            </h1>
            <p className="text-gray-500 mt-1 text-sm">
              Where is your next adventure?
            </p>
          </div>
          <button
            onClick={() => navigate("/search")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: CORAL }}
          >
            <Search size={14} strokeWidth={2.5} />
            Explore Destinations
          </button>
        </div>

        {/* ── Top row ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
          {/* Upcoming Trip card (spans 2 cols) */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Upcoming Trip</h2>
              {upcomingBooking && (
                <button
                  onClick={() => navigate("/tenant/dashboard")}
                  className="text-sm font-medium hover:underline"
                  style={{ color: CORAL }}
                >
                  View Itinerary
                </button>
              )}
            </div>

            {loading ? (
              <div className="h-36 flex items-center justify-center">
                <div
                  className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: CORAL, borderTopColor: "transparent" }}
                />
              </div>
            ) : upcomingBooking ? (
              <div className="flex gap-4">
                {/* Property image */}
                <div className="relative w-36 h-28 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                  {upcomingBooking.houseId?.images?.[0] ? (
                    <img
                      src={
                        upcomingBooking.houseId.images[0]?.url ||
                        upcomingBooking.houseId.images[0]
                      }
                      alt={upcomingBooking.houseId?.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200" />
                  )}
                  <div className="absolute top-2 left-2">
                    <StatusBadge status={upcomingBooking.status} />
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-base truncate">
                    {upcomingBooking.houseId?.title || "Your Upcoming Stay"}
                  </h3>
                  <div className="flex items-center gap-1 text-gray-500 text-xs mt-0.5">
                    <MapPin size={11} />
                    <span>
                      {upcomingBooking.houseId?.location?.city || "Ethiopia"}
                      {upcomingBooking.houseId?.location?.state
                        ? `, ${upcomingBooking.houseId.location.state}`
                        : ""}
                    </span>
                  </div>

                  {/* Dates */}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 rounded-lg px-3 py-1.5">
                      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                        Check-in
                      </p>
                      <p className="text-xs font-bold text-gray-800 mt-0.5">
                        {fmt(upcomingBooking.startDate)}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg px-3 py-1.5">
                      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                        Check-out
                      </p>
                      <p className="text-xs font-bold text-gray-800 mt-0.5">
                        {fmt(upcomingBooking.endDate)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => navigate("/messages")}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <MessageSquare size={12} />
                      Message Host
                    </button>
                    <button
                      onClick={() =>
                        upcomingBooking.houseId?._id &&
                        navigate(`/details/${upcomingBooking.houseId._id}`)
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <MapPin size={12} />
                      Directions
                    </button>
                    {upcomingBooking.paymentStatus !== "paid" && !upcomingBooking.paymentId && (
                      <button
                        onClick={() => setPaymentBooking(upcomingBooking)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
                        style={{ background: CORAL }}
                      >
                        <CreditCard size={12} />
                        Pay Now
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center mb-3">
                  <Search size={22} style={{ color: CORAL }} />
                </div>
                <p className="text-sm font-medium text-gray-700">No upcoming trips</p>
                <p className="text-xs text-gray-400 mt-1">
                  Start exploring to book your next stay.
                </p>
                <button
                  onClick={() => navigate("/search")}
                  className="mt-3 text-sm font-semibold hover:underline"
                  style={{ color: CORAL }}
                >
                  Browse properties →
                </button>
              </div>
            )}
          </div>

          {/* Gojo Rewards card */}
          <div
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col"
          >
            <h2 className="text-lg font-bold mb-4" style={{ color: CORAL }}>
              Gojo Rewards
            </h2>

            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Current Balance
            </p>
            <div className="flex items-baseline gap-1.5 mt-1 mb-4">
              <span className="text-3xl font-bold text-gray-900">
                {REWARDS_BALANCE.toLocaleString()}
              </span>
              <span className="text-sm text-gray-400 font-medium">pts</span>
            </div>

            <div className="flex justify-between text-sm text-gray-600 mb-1.5">
              <span>Completed Stays</span>
              <span className="font-bold text-gray-900">{REWARDS_COMPLETED}</span>
            </div>

            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Next Tier: Gold</span>
              <span className="text-xs font-bold" style={{ color: CORAL }}>
                {(REWARDS_NEXT - REWARDS_BALANCE).toLocaleString()} pts away
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-auto">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${progressPct}%`, background: CORAL }}
              />
            </div>
          </div>
        </div>

        {/* ── Bottom row ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Recent Messages */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900">
                  Recent Messages
                </h2>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: "#EBF3FB", color: "#3B82F6" }}
                >
                  Inbox
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {conversations.length > 0 ? (
                conversations.map((conv, i) => {
                  const other =
                    conv.participants?.find(
                      (p) => (p._id || p) !== (user?.id || user?._id)
                    ) || {};
                  const name =
                    typeof other === "object"
                      ? other.name || "User"
                      : "User";
                  const lastMsg =
                    conv.lastMessage?.content ||
                    conv.lastMessage?.text ||
                    "No messages yet";
                  const colors = ["#4ADE80", "#93C5FD", "#FCA5A5", "#FCD34D"];
                  return (
                    <button
                      key={conv._id || i}
                      onClick={() => navigate("/messages")}
                      className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left"
                    >
                      <Avatar name={name} size={36} color={colors[i % colors.length]} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {name}
                          </p>
                          <span className="text-[10px] text-gray-400 shrink-0 ml-2">
                            {timeAgo(conv.lastMessage?.createdAt || conv.updatedAt)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {lastMsg}
                        </p>
                      </div>
                    </button>
                  );
                })
              ) : (
                /* Placeholder messages to match design */
                [
                  { name: "Elias (Host)", color: "#4ADE80", time: "2 hrs ago", msg: "The key is in the lock..." },
                  { name: "Support ...", color: "#93C5FD", time: "Yesterday", msg: "Your refund has been..." },
                ].map((m, i) => (
                  <button
                    key={i}
                    onClick={() => navigate("/messages")}
                    className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left"
                  >
                    <Avatar name={m.name} size={36} color={m.color} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-800 truncate">{m.name}</p>
                        <span className="text-[10px] text-gray-400 shrink-0 ml-2">{m.time}</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{m.msg}</p>
                    </div>
                  </button>
                ))
              )}
            </div>

            <button
              onClick={() => navigate("/messages")}
              className="mt-4 w-full py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              View All Activity
            </button>
          </div>

          {/* Favorite Places */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900">Favorite Places</h2>
              <button
                onClick={() => navigate("/saved")}
                className="flex items-center gap-1 text-sm font-medium hover:underline"
                style={{ color: CORAL }}
              >
                See All <ArrowRight size={13} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {favePlaces.map((place) => (
                <button
                  key={place.id}
                  onClick={() => navigate(place.id.startsWith("f") ? "/saved" : `/details/${place.id}`)}
                  className="relative rounded-xl overflow-hidden h-32 bg-gray-100 group text-left"
                >
                  <img
                    src={place.image}
                    alt={place.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400"
                  />
                  {/* Heart overlay */}
                  <div className="absolute top-2 right-2 w-6 h-6 bg-white/80 rounded-full flex items-center justify-center">
                    <Heart size={11} fill={CORAL} stroke={CORAL} />
                  </div>
                  {/* Title overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2">
                    <p className="text-white text-[11px] font-bold leading-tight truncate">
                      {place.title}
                    </p>
                    <p className="text-white/70 text-[10px] truncate">{place.location}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-200 bg-white mt-6">
        <div className="max-w-5xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold" style={{ color: CORAL }}>Gojo</p>
            <p className="text-xs text-gray-400 mt-0.5">
              © 2024 Gojo Ethiopia. All rights reserved. Built with hospitality.
            </p>
          </div>
          <nav className="flex flex-wrap justify-center gap-4 text-xs text-gray-500">
            <a href="#support" className="hover:text-gray-800 transition-colors">Support Center</a>
            <a href="#trust" className="hover:text-gray-800 transition-colors">Trust &amp; Safety</a>
            <a href="#terms" className="hover:text-gray-800 transition-colors">Terms of Service</a>
            <a href="#privacy" className="hover:text-gray-800 transition-colors">Privacy Policy</a>
            <button onClick={() => navigate("/owner/dashboard")} className="hover:text-gray-800 transition-colors">
              List your Property
            </button>
          </nav>
        </div>
      </footer>

      {/* Payment modal */}
      {paymentBooking && (
        <PaymentModal
          booking={paymentBooking}
          onClose={() => setPaymentBooking(null)}
          onSuccess={() => {
            setPaymentBooking(null);
            window.location.reload();
          }}
        />
      )}
    </DashboardLayout>
  );
};

export default TenantDashboard;
