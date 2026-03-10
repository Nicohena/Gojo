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
            <h1 className="text-4xl flex items-center gap-3" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--text)' }}>
              <Bell size={32} strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
              Notifications
            </h1>
            <p style={{ color: 'var(--muted)' }} className="tracking-wide text-sm mt-2">
              Stay up to date with activity on your account.
            </p>
          </div>
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={markingAll || unreadCount === 0}
              className="px-5 py-2.5 text-xs tracking-widest uppercase transition-all disabled:opacity-40"
              style={{ border: '1px solid', borderColor: 'rgba(212,175,55,0.2)', color: 'rgba(212,175,55,0.7)' }}
            >
              {markingAll ? "Marking..." : "Mark all as read"}
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin" size={40} style={{ color: 'var(--accent)' }} />
            <p className="tracking-wide" style={{ color: 'var(--muted)' }}>Loading your notifications...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center" style={{ border: '1px solid rgba(239,68,68,0.12)', background: 'rgba(239,68,68,0.05)', color: 'rgba(220,38,38,0.9)' }}>{error}</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-lg mb-2" style={{ color: 'var(--muted)' }}>You have no notifications yet.</p>
            <p className="text-sm" style={{ color: 'rgba(154,154,154,0.6)' }}>Activity like saved homes and bookings will appear here.</p>
          </div>
        ) : (
          <div style={{ background: 'var(--panel)', border: '1px solid', borderColor: 'var(--panel-border)', overflow: 'hidden' }}>
            {notifications.map((n) => (
              <div
                key={n._id}
                onClick={() => !n.read && handleMarkOneRead(n._id)}
                className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-colors"
                style={!n.read ? { background: 'rgba(212,175,55,0.05)', cursor: 'pointer' } : {}}
              >
                <div className="flex items-start gap-3">
                  {!n.read && (
                    <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: 'var(--accent)' }} />
                  )}
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{n.title}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{n.message}</p>
                  </div>
                </div>
                <div className="text-right text-[10px] whitespace-nowrap" style={{ color: 'rgba(154,154,154,0.5)' }}>
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
