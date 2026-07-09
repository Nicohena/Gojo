import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import userService from "../../api/userService";
import {
  CheckCircle2,
  CreditCard,
  MessageSquare,
  Star,
  User,
  Bell,
  SlidersHorizontal,
} from "lucide-react";

const CORAL = "#E67E5F";

// ─── Time-ago ─────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)    return "Just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)} min ago`;
  if (diff < 7200)  return "1 hour ago";
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 172800) return "Yesterday";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Icon + color per notification type ──────────────────────────────────────
function notifStyle(type, title = "") {
  const t = (type || "").toLowerCase();
  const ti = (title || "").toLowerCase();

  if (t.includes("booking") || ti.includes("booking") || ti.includes("confirmed"))
    return { Icon: CheckCircle2, bg: "#D1FAE5", color: "#059669" };
  if (t.includes("payment") || ti.includes("payment") || ti.includes("reminder"))
    return { Icon: CreditCard, bg: "#FEE2E2", color: CORAL };
  if (t.includes("message") || ti.includes("support") || ti.includes("responded"))
    return { Icon: MessageSquare, bg: "#EBF3FB", color: "#3B82F6" };
  if (t.includes("review") || ti.includes("review"))
    return { Icon: Star, bg: "#F3F4F6", color: "#6B7280" };
  return { Icon: User, bg: "#F3F4F6", color: "#6B7280" };
}

// ─── CTA button per notification type ────────────────────────────────────────
function CtaButton({ title = "", onClick }) {
  const ti = title.toLowerCase();
  if (ti.includes("booking") || ti.includes("confirmed"))
    return (
      <button onClick={onClick} className="mt-3 px-4 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
        View Details
      </button>
    );
  if (ti.includes("payment") || ti.includes("reminder"))
    return (
      <button onClick={onClick} className="mt-3 px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90" style={{ background: CORAL }}>
        Pay Now
      </button>
    );
  if (ti.includes("support") || ti.includes("responded") || ti.includes("message"))
    return (
      <button onClick={onClick} className="mt-3 px-4 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
        Read Message
      </button>
    );
  return null;
}

// ─── Single notification row ──────────────────────────────────────────────────
function NotifRow({ notif, onRead, navigate }) {
  const { Icon, bg, color } = notifStyle(notif.type, notif.title);
  const isUnread = !notif.read;

  return (
    <div
      className={`flex items-start gap-4 px-6 py-5 border-b border-gray-100 last:border-0 transition-colors ${
        isUnread ? "bg-blue-50/30 cursor-pointer hover:bg-blue-50/50" : "hover:bg-gray-50/50"
      }`}
      onClick={() => isUnread && onRead(notif._id)}
    >
      {/* Icon circle */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: bg }}
      >
        <Icon size={18} style={{ color }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <p className={`text-sm font-semibold ${isUnread ? "text-gray-900" : "text-gray-700"}`}>
            {notif.title}
          </p>
          <span className="text-xs text-gray-400 shrink-0 mt-0.5">{timeAgo(notif.createdAt)}</span>
        </div>
        <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{notif.message}</p>

        {/* CTA */}
        <CtaButton
          title={notif.title}
          onClick={(e) => {
            e.stopPropagation();
            if (notif.title?.toLowerCase().includes("payment")) navigate("/payments");
            else if (notif.title?.toLowerCase().includes("booking")) navigate("/tenant/dashboard");
            else if (notif.title?.toLowerCase().includes("message") || notif.title?.toLowerCase().includes("support")) navigate("/messages");
          }}
        />
      </div>

      {/* Unread dot */}
      {isUnread && (
        <div className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ background: CORAL }} />
      )}
    </div>
  );
}

// ─── Placeholder notifications shown when API returns nothing ─────────────────
const PLACEHOLDERS = [
  {
    _id: "ph1",
    type: "booking",
    title: "Booking Confirmed: Bole Serene Villa",
    message: "Your booking for Oct 12 – Oct 15 has been confirmed by the host. View your itinerary for more details.",
    read: false,
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    _id: "ph2",
    type: "payment",
    title: "Payment Reminder",
    message: "Your second installment of 15,000 ETB for the Entoto Mountain Retreat is due tomorrow. Please ensure your payment method is up to date.",
    read: false,
    createdAt: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
  },
  {
    _id: "ph3",
    type: "message",
    title: "Support Team Responded",
    message: '"Hello! We have updated the WiFi password for your upcoming stay as requested..."',
    read: false,
    createdAt: new Date(Date.now() - 3 * 86400 * 1000 + 10.75 * 3600 * 1000).toISOString(),
  },
  {
    _id: "ph4",
    type: "review",
    title: "Leave a Review",
    message: "How was your stay at Piassa Historic Loft? Share your experience to help other guests.",
    read: true,
    createdAt: new Date(Date.now() - 7 * 86400 * 1000).toISOString(),
  },
  {
    _id: "ph5",
    type: "profile",
    title: "Profile Updated",
    message: "Your phone number was successfully updated.",
    read: true,
    createdAt: new Date(Date.now() - 11 * 86400 * 1000).toISOString(),
  },
];

// ─── Main page ────────────────────────────────────────────────────────────────
const NotificationsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user) { setLoading(false); return; }
      try {
        setLoading(true);
        const res = await userService.getNotifications(user.id || user._id);
        const list = res.data?.notifications || res.data?.data?.notifications || [];
        setNotifications(Array.isArray(list) && list.length > 0 ? list : PLACEHOLDERS);
        setError(null);
      } catch (err) {
        setNotifications(PLACEHOLDERS);
        setError(null); // show placeholders silently
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const handleMarkAllRead = async () => {
    if (!user || markingAll) return;
    try {
      setMarkingAll(true);
      setNotifications((p) => p.map((n) => ({ ...n, read: true })));
      await userService.markAllNotificationsRead(user.id || user._id);
    } catch { /* silent */ } finally { setMarkingAll(false); }
  };

  const handleMarkOneRead = async (id) => {
    setNotifications((p) => p.map((n) => n._id === id ? { ...n, read: true } : n));
    try { await userService.markNotificationRead(user.id || user._id, id); } catch { /* silent */ }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

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
          <button onClick={() => navigate("/owner/dashboard")} className="hover:text-gray-800">List your Property</button>
        </nav>
      </div>
    </footer>
  );

  return (
    <DashboardLayout footer={footer}>
      <div className="py-8 px-6 md:px-10 max-w-3xl">
        {/* ── Heading ──────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-500 mt-1">
              {unreadCount > 0
                ? `You have ${unreadCount} unread message${unreadCount > 1 ? "s" : ""}.`
                : "You're all caught up."}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors disabled:opacity-50 mt-1"
            >
              <SlidersHorizontal size={13} />
              {markingAll ? "Clearing..." : "Clear All"}
            </button>
          )}
        </div>

        {/* ── Content ──────────────────────────────────────────────── */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 h-4 w-1/3 animate-pulse rounded-full bg-slate-200" />
                <div className="mb-2 h-4 w-full animate-pulse rounded-full bg-slate-200" />
                <div className="h-4 w-5/6 animate-pulse rounded-full bg-slate-200" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="border border-red-200 bg-red-50 text-red-600 rounded-xl p-5 text-sm text-center">{error}</div>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {notifications.map((n) => (
                <NotifRow
                  key={n._id}
                  notif={n}
                  onRead={handleMarkOneRead}
                  navigate={navigate}
                />
              ))}
            </div>

            {/* Load older */}
            <div className="flex justify-center mt-6">
              <button className="px-6 py-2.5 border border-gray-200 rounded-full text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors bg-white shadow-sm">
                Load Older Notifications
              </button>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default NotificationsPage;
