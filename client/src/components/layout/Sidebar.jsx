import React, { useState, useEffect } from "react";
import {
  Search,
  Heart,
  BookOpen,
  MessageSquare,
  Bell,
  CreditCard,
  Settings,
  LogOut,
  User as UserIcon,
  LayoutDashboard,
  Home,
  Users,
  BarChart2,
  History,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getImageUrl } from "../../utils/imageUtils";
import chatService from "../../api/chatService";

const NavItem = ({ icon: Icon, label, active = false, count, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-4 py-3 transition-all duration-200 group border-l-2 ${
      active
        ? "border-[#d4af37] text-[#d4af37] bg-[#d4af37]/5"
        : "border-transparent text-[#9a9a9a] hover:text-[#f8f6f3] hover:border-[#d4af37]/40"
    }`}
  >
    <div className="flex items-center gap-3">
      <Icon
        size={18}
        className={active ? "text-[#d4af37]" : "group-hover:text-[#d4af37] transition-colors"}
      />
      <span className="text-sm tracking-[0.05em]">{label}</span>
    </div>
    {count > 0 && (
      <span
        className={`text-[10px] font-bold px-1.5 py-0.5 ${
          active
            ? "bg-[#d4af37]/20 text-[#d4af37]"
            : "bg-red-500/80 text-white"
        }`}
      >
        {count}
      </span>
    )}
  </button>
);

export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  useEffect(() => {
    const fetchUnread = async () => {
      if (!user) return;
      try {
        const data = await chatService.getUnreadCount();
        setUnreadCount(data.data?.count || data.count || 0);
      } catch (err) {
        // Silently fail — badge just won't show
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <aside className="w-64 border-r border-[#d4af37]/10 h-screen flex flex-col bg-[#0a0a0a] sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-[#d4af37]/10">
        <div
          onClick={() => navigate("/")}
          className="flex items-center gap-3 cursor-pointer"
        >
          <img src="/logo-mark.svg" alt="Logo" className="w-8 h-8" />
          <span
            className="text-[#d4af37] tracking-[0.2em] text-lg font-bold"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            SMART RENT
          </span>
        </div>
      </div>

      <nav className="flex-1 py-6 overflow-y-auto">
        {user?.role === "owner" ? (
          /* Owner Menu */
          <>
            <div className="mb-6">
              <p className="text-[10px] font-bold text-[#d4af37]/40 uppercase tracking-widest px-6 mb-3">
                Overview
              </p>
              <div>
                <NavItem
                  icon={BookOpen}
                  label="Dashboard"
                  active={location.pathname === "/owner/dashboard"}
                  onClick={() => navigate("/owner/dashboard")}
                />
                <NavItem
                  icon={Search}
                  label="Listings"
                  active={location.pathname === "/owner/listings"}
                  onClick={() => navigate("/owner/listings")}
                />
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-[#d4af37]/40 uppercase tracking-widest px-6 mb-3">
                Management
              </p>
              <div>
                <NavItem
                  icon={BookOpen}
                  label="Bookings"
                  active={location.pathname === "/owner/bookings"}
                  onClick={() => navigate("/owner/bookings")}
                />
                <NavItem
                  icon={MessageSquare}
                  label="Messages"
                  active={location.pathname === "/messages"}
                  onClick={() => navigate("/messages")}
                  count={unreadCount}
                />
                <NavItem
                  icon={CreditCard}
                  label="Payments"
                  active={location.pathname === "/payments"}
                  onClick={() => navigate("/payments")}
                />
                <NavItem
                  icon={Settings}
                  label="Settings"
                  active={location.pathname === "/settings"}
                  onClick={() => navigate("/settings")}
                />
              </div>
            </div>
          </>
        ) : user?.role === "admin" ? (
          /* Admin Menu */
          <>
            <div className="mb-6">
              <p className="text-[10px] font-bold text-[#d4af37]/40 uppercase tracking-widest px-6 mb-3">
                System Control
              </p>
              <div>
                <NavItem
                  icon={LayoutDashboard}
                  label="Dashboard"
                  active={location.pathname === "/admin"}
                  onClick={() => navigate("/admin")}
                />
                <NavItem
                  icon={Home}
                  label="Listings"
                  active={location.pathname === "/admin/listings"}
                  onClick={() => navigate("/admin/listings")}
                />
                <NavItem
                  icon={Users}
                  label="Users"
                  active={location.pathname === "/admin/users"}
                  onClick={() => navigate("/admin/users")}
                />
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-[#d4af37]/40 uppercase tracking-widest px-6 mb-3">
                Intelligence
              </p>
              <div>
                <NavItem
                  icon={BarChart2}
                  label="Analytics"
                  active={location.pathname === "/admin/analytics"}
                  onClick={() => navigate("/admin/analytics")}
                />
                <NavItem
                  icon={History}
                  label="Audit Logs"
                  active={location.pathname === "/admin/logs"}
                  onClick={() => navigate("/admin/logs")}
                />
                <NavItem
                  icon={Bell}
                  label="Notifications"
                  active={location.pathname === "/notifications"}
                  onClick={() => navigate("/notifications")}
                />
                <NavItem
                  icon={Settings}
                  label="Settings"
                  active={location.pathname === "/profile"}
                  onClick={() => navigate("/profile")}
                />
              </div>
            </div>
          </>
        ) : (
          /* Tenant Menu (Default) */
          <>
            <div className="mb-6">
              <p className="text-[10px] font-bold text-[#d4af37]/40 uppercase tracking-widest px-6 mb-3">
                Menu
              </p>
              <div>
                <NavItem
                  icon={Search}
                  label="Explore"
                  active={location.pathname === "/search"}
                  onClick={() => navigate("/search")}
                />
                <NavItem
                  icon={Heart}
                  label="Saved Homes"
                  active={location.pathname === "/saved"}
                  onClick={() => navigate("/saved")}
                />
                <NavItem
                  icon={BookOpen}
                  label="My Bookings"
                  active={location.pathname === "/tenant/dashboard"}
                  onClick={() => navigate("/tenant/dashboard")}
                />
                <NavItem
                  icon={MessageSquare}
                  label="Messages"
                  active={location.pathname === "/messages"}
                  onClick={() => navigate("/messages")}
                  count={unreadCount}
                />
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-[#d4af37]/40 uppercase tracking-widest px-6 mb-3">
                Preferences
              </p>
              <div>
                <NavItem
                  icon={Bell}
                  label="Notifications"
                  active={location.pathname === "/notifications"}
                  onClick={() => navigate("/notifications")}
                />
                {user?.role !== "owner" && (
                  <NavItem
                    icon={CreditCard}
                    label="Payments"
                    active={location.pathname === "/payments"}
                    onClick={() => navigate("/payments")}
                  />
                )}
                <NavItem
                  icon={Settings}
                  label="Settings"
                  active={location.pathname === "/profile"}
                  onClick={() => navigate("/profile")}
                />
              </div>
            </div>
          </>
        )}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-[#d4af37]/10">
        <div className="flex items-center gap-3 px-2 py-2">
          <div
            onClick={() => navigate("/profile")}
            className="w-9 h-9 rounded-full border border-[#d4af37]/30 overflow-hidden cursor-pointer flex items-center justify-center bg-[#1a1a1a] shrink-0"
          >
            {user?.avatar ? (
              <img src={getImageUrl(user.avatar)} alt="User" className="w-full h-full object-cover" />
            ) : (
              <span
                className="text-[#d4af37] text-sm font-bold"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {user?.name?.[0]?.toUpperCase() || "U"}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[#f8f6f3] truncate">
              {user?.name || "User Name"}
            </p>
            <p className="text-[10px] text-[#d4af37]/60 uppercase tracking-widest">
              {user?.role || "Tenant"}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-[#9a9a9a] hover:text-red-400 transition-colors"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
};
