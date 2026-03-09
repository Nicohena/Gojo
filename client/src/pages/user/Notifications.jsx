import React, { useEffect, useState } from "react";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { Bell, Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import userService from "../../api/userService";

const NotificationsPage = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) { setLoading(false); return; }
      try {
        setLoading(true);
        const response = await userService.getNotifications(user.id);
        const list = response.data?.notifications || response.data?.data?.notifications || [];
        setNotifications(list);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load notifications. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, [user]);

  const handleMarkAllRead = async () => {
    if (!user || notifications.length === 0) return;
    try {
      setMarkingAll(true);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      await userService.markAllNotificationsRead(user.id);
    } catch (err) {
      alert(err.response?.data?.message || "Something went wrong while updating notifications.");
    } finally {
      setMarkingAll(false);
    }
  };

  const handleMarkOneRead = async (notificationId) => {
    if (!user) return;
    try {
      setNotifications((prev) => prev.map((n) => (n._id === notificationId ? { ...n, read: true } : n)));
      await userService.markNotificationRead(user.id, notificationId);
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl text-[#f8f6f3] flex items-center gap-3" style={{ fontFamily: "'Playfair Display', serif" }}>
              <Bell className="text-[#d4af37]" size={32} strokeWidth={1.5} />
              Notifications
            </h1>
            <p className="text-[#9a9a9a] tracking-wide text-sm mt-2">
              Stay up to date with activity on your account.
            </p>
          </div>
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={markingAll || unreadCount === 0}
              className="px-5 py-2.5 border border-[#d4af37]/20 text-[#d4af37]/70 text-xs tracking-widest uppercase hover:border-[#d4af37] hover:text-[#d4af37] transition-all disabled:opacity-40"
            >
              {markingAll ? "Marking..." : "Mark all as read"}
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-[#d4af37]" size={40} />
            <p className="text-[#9a9a9a] tracking-wide">Loading your notifications...</p>
          </div>
        ) : error ? (
          <div className="border border-red-500/30 bg-red-500/10 text-red-400 p-6 text-center">{error}</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#9a9a9a] text-lg mb-2">You have no notifications yet.</p>
            <p className="text-[#9a9a9a]/60 text-sm">Activity like saved homes and bookings will appear here.</p>
          </div>
        ) : (
          <div className="bg-[#111] border border-[#d4af37]/10 divide-y divide-[#d4af37]/5 overflow-hidden">
            {notifications.map((n) => (
              <div
                key={n._id}
                onClick={() => !n.read && handleMarkOneRead(n._id)}
                className={`px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-colors ${
                  !n.read ? "bg-[#d4af37]/5 cursor-pointer hover:bg-[#d4af37]/8" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  {!n.read && (
                    <div className="w-1.5 h-1.5 rounded-full bg-[#d4af37] mt-2 flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-semibold text-[#f8f6f3] text-sm">{n.title}</p>
                    <p className="text-xs text-[#9a9a9a] mt-1">{n.message}</p>
                  </div>
                </div>
                <div className="text-right text-[10px] text-[#9a9a9a]/50 whitespace-nowrap">
                  {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default NotificationsPage;
