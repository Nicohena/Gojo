import React, { useEffect, useRef, useState } from "react";
import { Bell, LogOut, Moon, Sun, CircleUser, ChevronDown } from "lucide-react";
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
  const showSearch =
    path === "/search" || path === "/tenant/dashboard" || path.startsWith("/owner/");
  const canShowNotifications =
    path === "/search" ||
    path.startsWith("/tenant") ||
    path.startsWith("/owner") ||
    path === "/messages" ||
    path === "/payments";

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
      const userId = user.id || user._id;
      if (!userId) return;

      try {
        setLoadingNotifications(true);
        const response = await userService.getNotifications(userId);
        const notifs =
          response.data?.notifications || response.data?.data?.notifications || [];
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

  if (!showNavbar) return null;

  return (
    <header className="h-16 border-b border-[#d4af37]/10 bg-[#0a0a0a]/90 backdrop-blur-md sticky top-0 z-40 px-8 flex items-center justify-between">
      {/* Search */}
      <div className="flex-1 max-w-xl">
        {showSearch && (
          <div className="relative group">
            <input
              type="text"
              placeholder="Search by location, city..."
              className="w-full bg-[#1a1a1a] border border-[#d4af37]/10 text-[#f8f6f3] placeholder-[#9a9a9a] rounded-none py-2.5 px-4 text-sm focus:border-[#d4af37]/40 focus:outline-none transition-all tracking-wide"
              onKeyDown={(e) => e.key === "Enter" && navigate("/search")}
            />
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        {canShowNotifications && (
          <div className="relative" ref={notificationRef}>
            <button
              type="button"
              onClick={handleOpenNotifications}
              className="relative p-2 text-[#9a9a9a] hover:text-[#d4af37] transition-colors"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 bg-[#d4af37] text-[#0a0a0a] text-[10px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            {showNotificationsPanel && (
              <div className="absolute right-0 mt-3 w-80 bg-[#111] border border-[#d4af37]/15 shadow-2xl z-50">
                <div className="px-4 py-3 border-b border-[#d4af37]/10 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#d4af37]/60 uppercase tracking-widest">
                    Notifications
                  </span>
                  {loadingNotifications && (
                    <span className="text-[10px] text-[#9a9a9a]">Loading...</span>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-[#9a9a9a] text-center">
                      No notifications yet.
                    </p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n._id}
                        className={`px-4 py-3 text-sm border-b border-[#d4af37]/5 ${
                          !n.read ? "bg-[#d4af37]/5" : ""
                        }`}
                      >
                        <p className="font-semibold text-[#f8f6f3]">{n.title}</p>
                        <p className="text-xs text-[#9a9a9a] mt-1">{n.message}</p>
                        <p className="text-[10px] text-[#9a9a9a]/60 mt-1">
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

        {/* Profile Menu */}
        <div ref={profileMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setShowProfileMenu((prev) => !prev)}
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity p-2"
          >
            <div className="w-8 h-8 border border-[#d4af37]/30 flex items-center justify-center overflow-hidden bg-[#1a1a1a]">
              {user?.avatar ? (
                <img
                  src={getImageUrl(user.avatar)}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span
                  className="text-[#d4af37] text-xs"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {user?.name?.[0]?.toUpperCase() || "A"}
                </span>
              )}
            </div>
            <p className="text-sm text-[#f8f6f3] hidden md:block tracking-wide">
              {user?.name || "Profile"}
            </p>
            <ChevronDown size={12} className="text-[#9a9a9a]" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-52 bg-[#111] border border-[#d4af37]/15 shadow-2xl z-50 py-1">
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  navigate("/profile");
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-[#f8f6f3] hover:bg-[#d4af37]/10 hover:text-[#d4af37] flex items-center gap-2 transition-colors tracking-wide"
              >
                <CircleUser size={14} />
                Profile
              </button>
              <button
                onClick={() =>
                  setTheme((prev) => (prev === "dark" ? "light" : "dark"))
                }
                className="w-full px-4 py-2.5 text-left text-sm text-[#f8f6f3] hover:bg-[#d4af37]/10 hover:text-[#d4af37] flex items-center gap-2 transition-colors tracking-wide"
              >
                {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
                {theme === "dark" ? "Light Theme" : "Dark Theme"}
              </button>
              <div className="border-t border-[#d4af37]/10 my-1" />
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors tracking-wide"
              >
                <LogOut size={14} />
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
