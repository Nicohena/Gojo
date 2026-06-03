import React, { useEffect, useRef, useState } from "react";
import { Bell, LogOut, CircleUser, ChevronDown, Search } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { getImageUrl } from "../../utils/imageUtils";
import { useAuth } from "../../context/AuthContext";
import userService from "../../api/userService";
import { disconnectSocket } from "../../utils/socket";

const CORAL = "#E67E5F";
const BROWN = "#3D2C29";

function GojoLogo({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <polygon points="50,10 95,48 5,48" fill={BROWN} />
      <rect x="18" y="44" width="64" height="46" fill={CORAL} />
      <rect x="38" y="62" width="24" height="28" rx="2" fill="white" />
    </svg>
  );
}

export const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const path = location.pathname;

  // Which paths show this navbar
  const showNavbar =
    path === "/search" ||
    path === "/tenant/dashboard" ||
    path.startsWith("/owner/") ||
    path.startsWith("/admin") ||
    path === "/messages" ||
    path === "/payments" ||
    path === "/notifications" ||
    path === "/saved";

  const showSearch = path === "/search" || path === "/tenant/dashboard" || path.startsWith("/owner/");

  const canShowNotifications =
    path === "/search" ||
    path.startsWith("/tenant") ||
    path.startsWith("/owner") ||
    path.startsWith("/admin") ||
    path === "/messages" ||
    path === "/payments" ||
    path === "/notifications" ||
    path === "/saved";

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfileMenu(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Load notifications
  useEffect(() => {
    const load = async () => {
      if (!user || !canShowNotifications) { setNotifications([]); return; }
      const userId = user.id || user._id;
      if (!userId) return;
      try {
        setLoadingNotifs(true);
        const res = await userService.getNotifications(userId);
        const list = res.data?.notifications || res.data?.data?.notifications || [];
        setNotifications(list);
      } catch { /* silent */ } finally { setLoadingNotifs(false); }
    };
    load();
  }, [user, path]);

  const handleOpenNotifications = async () => {
    if (!user) { navigate("/login"); return; }
    setShowNotifications((v) => !v);
    if (unreadCount > 0) {
      setNotifications((p) => p.map((n) => ({ ...n, read: true })));
      try {
        const userId = user.id || user._id;
        if (userId) await userService.markAllNotificationsRead(userId);
      } catch { /* silent */ }
    }
  };

  const handleLogout = () => {
    logout();
    disconnectSocket();
    navigate("/login");
  };

  if (!showNavbar) return null;

  return (
    <header className="h-14 bg-white border-b border-gray-100 sticky top-0 z-40 flex items-center justify-between px-6">
      {/* Logo */}
      <button onClick={() => navigate("/")} className="flex items-center gap-1.5 mr-6 shrink-0">
        <GojoLogo size={24} />
        <span className="text-base font-bold tracking-tight hidden lg:block" style={{ color: CORAL }}>Gojo</span>
      </button>

      {/* Search */}
      <div className="flex-1 max-w-md">
        {showSearch && (
          <div className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-2">
            <Search size={14} className="text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Search by location, city..."
              className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
              onKeyDown={(e) => e.key === "Enter" && navigate("/search")}
            />
          </div>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-1 ml-4">
        {/* Notifications */}
        {canShowNotifications && (
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={handleOpenNotifications}
              className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white" style={{ background: CORAL }}>
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications panel */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-lg z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-800">Notifications</span>
                  {loadingNotifs && <span className="text-xs text-gray-400">Loading...</span>}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-gray-400 text-center">No notifications yet.</p>
                  ) : (
                    notifications.map((n) => (
                      <div key={n._id} className={`px-4 py-3 text-sm border-b border-gray-50 ${!n.read ? "bg-orange-50/50" : ""}`}>
                        <p className="font-semibold text-gray-800">{n.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
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

        {/* Profile menu */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => setShowProfileMenu((v) => !v)}
            className="flex items-center gap-2 p-1.5 hover:bg-gray-100 rounded-full transition-colors"
          >
            <div className="w-7 h-7 rounded-full overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center">
              {user?.avatar ? (
                <img src={getImageUrl(user.avatar)} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-gray-500">{user?.name?.[0]?.toUpperCase() || "U"}</span>
              )}
            </div>
            <span className="text-sm font-medium text-gray-700 hidden md:block">{user?.name || "Profile"}</span>
            <ChevronDown size={12} className="text-gray-400" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-2xl shadow-lg z-50 py-1 overflow-hidden">
              <button
                onClick={() => { setShowProfileMenu(false); navigate("/profile"); }}
                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
              >
                <CircleUser size={14} className="text-gray-400" />
                Profile
              </button>
              <div className="border-t border-gray-100 my-1" />
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-50 flex items-center gap-2 transition-colors"
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
