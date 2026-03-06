import React, { useEffect, useRef, useState } from "react";
import { Search, ChevronDown, User, Bell, LogOut, Moon, Sun, CircleUser } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { getImageUrl } from "../../utils/imageUtils";
import { useAuth } from "../../context/AuthContext";
import userService from "../../api/userService";
import { disconnectSocket } from "../../utils/socket";
import { applyTheme, getStoredTheme } from "../../utils/theme";

export const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [theme, setTheme] = useState(getStoredTheme());
  const profileMenuRef = useRef(null);
  const notificationRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const path = location.pathname;
  const showNavbar =
    path === "/search" ||
    path === "/tenant/dashboard" ||
    path.startsWith("/owner/") ||
    path.startsWith("/admin") ||
    path === "/messages" ||
    path === "/payments";
  const showSearch = path === "/search" || path === "/tenant/dashboard" || path.startsWith("/owner/");
  const canShowNotifications = path === "/search" || path.startsWith("/tenant") || path.startsWith("/owner") || path === "/messages" || path === "/payments";

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotificationsPanel(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const loadNotifications = async () => {
      if (!user || !canShowNotifications) {
        setNotifications([]);
        return;
      }
      // Ensure we have a valid user ID
      const userId = user.id || user._id;
      if (!userId) {
        return;
      }

      try {
        setLoadingNotifications(true);
        const response = await userService.getNotifications(userId);
        const notifs =
          response.data?.notifications ||
          response.data?.data?.notifications ||
          [];
        setNotifications(notifs);
      } catch (error) {
        console.error("Failed to load notifications", error);
      } finally {
        setLoadingNotifications(false);
      }
    };

    loadNotifications();
  }, [user, canShowNotifications]);

  const handleOpenNotifications = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    setShowNotificationsPanel((prev) => !prev);

    // Optimistically mark all as read
    if (unreadCount > 0) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      try {
        const userId = user.id || user._id;
        if (userId) {
          await userService.markAllNotificationsRead(userId);
        }
      } catch (error) {
        console.error("Failed to mark notifications as read", error);
      }
    }
  };

  const handleLogout = () => {
    logout();
    disconnectSocket();
    navigate("/login");
  };

  if (!showNavbar) {
    return null;
  }

  return (
    <header className="h-20 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-40 px-8 flex items-center justify-between dark-header">
      <div className="flex-1 max-w-xl">
        {showSearch && (
          <div className="relative group">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors"
              size={20}
            />
            <input
              type="text"
              placeholder="Search by location, city, or zip..."
              className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              onKeyDown={(e) => e.key === "Enter" && navigate("/search")}
            />
          </div>
        )}
        {!showSearch && <div />}
      </div>

      <div className="flex items-center gap-4">
        {canShowNotifications && (
          <div className="relative" ref={notificationRef}>
            <button
              type="button"
              onClick={handleOpenNotifications}
              className="relative p-2 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <Bell className="text-slate-500" size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            {showNotificationsPanel && (
              <div className="absolute right-0 mt-3 w-80 bg-white shadow-lg rounded-2xl border border-slate-100 py-2 z-50">
                <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Notifications
                  </span>
                  {loadingNotifications && (
                    <span className="text-[10px] text-slate-400">Loading...</span>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-slate-400 text-center">
                      No notifications yet.
                    </p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n._id}
                        className={`px-4 py-3 text-sm border-b border-slate-50 ${!n.read ? "bg-slate-50" : ""}`}
                      >
                        <p className="font-semibold text-slate-800">{n.title}</p>
                        <p className="text-xs text-slate-500 mt-1">{n.message}</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div ref={profileMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setShowProfileMenu((prev) => !prev)}
            className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded-xl transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary">
              {user?.avatar ? (
                <img
                  src={getImageUrl(user.avatar)}
                  alt="Avatar"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User size={16} />
              )}
            </div>
            <p className="text-sm font-bold text-slate-700 hidden md:block">
              {user?.name || "Profile"}
            </p>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-52 rounded-xl border border-slate-200 bg-white shadow-lg z-50 py-1">
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  navigate("/profile");
                }}
                className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <CircleUser size={15} />
                Profile
              </button>
              <button
                onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
                className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
                {theme === "dark" ? "Light Theme" : "Dark Theme"}
              </button>
              <button
                onClick={handleLogout}
                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <LogOut size={15} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
