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
  LayoutDashboard,
  Home,
  Users,
  BarChart2,
  History,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getImageUrl } from "../../utils/imageUtils";
import { disconnectSocket } from "../../utils/socket";
import chatService from "../../api/chatService";

// ─── Brand ───────────────────────────────────────────────────────────────────
const CORAL = "#E67E5F";
const BROWN = "#3D2C29";

function GojoLogo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <polygon points="50,10 95,48 5,48" fill={BROWN} />
      <rect x="18" y="44" width="64" height="46" fill={CORAL} />
      <rect x="38" y="62" width="24" height="28" rx="2" fill="white" />
    </svg>
  );
}

function NavItem({ icon: Icon, label, active = false, count, collapsed, onClick }) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : ""}
      aria-label={label}
      className={`group relative flex items-center justify-center rounded-2xl border border-transparent outline-none transition-none ${collapsed ? "mx-auto h-11 w-11 p-0" : "w-full justify-between px-3 py-3"}`}
      style={
        active
          ? {
              background: "rgba(230,126,95,0.12)",
              color: CORAL,
              borderColor: "rgba(230,126,95,0.18)",
            }
          : { color: "#6B7280", background: "transparent" }
      }
    >
      <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
        <Icon
          size={18}
          strokeWidth={active ? 2.4 : 1.8}
          style={{ color: active ? CORAL : "#9CA3AF" }}
        />
        {!collapsed && <span className="text-sm font-medium">{label}</span>}
      </div>
      {!collapsed && count > 0 && (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white min-w-[18px] text-center">
          {count}
        </span>
      )}
      {collapsed && count > 0 && (
        <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
      )}
    </button>
  );
}

export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    disconnectSocket();
    navigate("/");
  };

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    const fetchUnread = async () => {
      if (!user) return;
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const data = await chatService.getUnreadCount();
        setUnreadCount(data.data?.count || data.count || 0);
      } catch {
        // badge just won't show
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const path = location.pathname;

  return (
    <aside
      className={`sticky top-0 flex h-screen flex-shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-white/90 backdrop-blur-xl shadow-[8px_0_30px_rgba(15,23,42,0.04)] transition-none ${collapsed ? "w-20" : "w-72"}`}
    >
      <div className={`flex items-center border-b border-gray-100 px-3 py-4 ${collapsed ? "justify-center" : "justify-between"}`}>
        <button onClick={() => navigate("/")} className={`flex items-center ${collapsed ? "justify-center" : "gap-2"} ${collapsed ? "h-10 w-10" : "w-full"}`}>
          <GojoLogo size={collapsed ? 24 : 28} />
          {!collapsed && (
            <span className="text-lg font-semibold tracking-tight" style={{ color: CORAL }}>
              Gojo
            </span>
          )}
        </button>
        {!collapsed && (
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white p-0 text-gray-500 shadow-sm hover:text-gray-700"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose size={16} />
          </button>
        )}
        {collapsed && (
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white p-0 text-gray-500 shadow-sm hover:text-gray-700"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen size={16} />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {user?.role === "owner" ? (
          <>
            <NavItem icon={LayoutDashboard} label="Dashboard" active={path === "/owner/dashboard"} collapsed={collapsed} onClick={() => navigate("/owner/dashboard")} />
            <NavItem icon={Home} label="Listings" active={path === "/owner/listings"} collapsed={collapsed} onClick={() => navigate("/owner/listings")} />
            <NavItem icon={BookOpen} label="Bookings" active={path === "/owner/bookings"} collapsed={collapsed} onClick={() => navigate("/owner/bookings")} />
            <NavItem icon={MessageSquare} label="Messages" active={path === "/messages"} collapsed={collapsed} onClick={() => navigate("/messages")} count={unreadCount} />
            <NavItem icon={CreditCard} label="Payments" active={path === "/payments"} collapsed={collapsed} onClick={() => navigate("/payments")} />
            <NavItem icon={Settings} label="Settings" active={path === "/settings"} collapsed={collapsed} onClick={() => navigate("/settings")} />
          </>
        ) : user?.role === "admin" ? (
          <>
            <NavItem icon={LayoutDashboard} label="Dashboard" active={path === "/admin"} collapsed={collapsed} onClick={() => navigate("/admin")} />
            <NavItem icon={Home} label="Listings" active={path === "/admin/listings"} collapsed={collapsed} onClick={() => navigate("/admin/listings")} />
            <NavItem icon={Users} label="Users" active={path === "/admin/users"} collapsed={collapsed} onClick={() => navigate("/admin/users")} />
            <NavItem icon={BarChart2} label="Analytics" active={path === "/admin/analytics"} collapsed={collapsed} onClick={() => navigate("/admin/analytics")} />
            <NavItem icon={History} label="Audit Logs" active={path === "/admin/logs"} collapsed={collapsed} onClick={() => navigate("/admin/logs")} />
            <NavItem icon={Bell} label="Notifications" active={path === "/notifications"} collapsed={collapsed} onClick={() => navigate("/notifications")} />
            <NavItem icon={Settings} label="Settings" active={path === "/profile"} collapsed={collapsed} onClick={() => navigate("/profile")} />
          </>
        ) : (
          <>
            <NavItem icon={Search} label="Explore" active={path === "/search"} collapsed={collapsed} onClick={() => navigate("/search")} />
            <NavItem icon={Heart} label="Saved Homes" active={path === "/saved"} collapsed={collapsed} onClick={() => navigate("/saved")} />
            <NavItem icon={BookOpen} label="My Bookings" active={path === "/tenant/dashboard"} collapsed={collapsed} onClick={() => navigate("/tenant/dashboard")} />
            <NavItem icon={MessageSquare} label="Messages" active={path === "/messages"} collapsed={collapsed} onClick={() => navigate("/messages")} count={unreadCount} />
            <NavItem icon={Bell} label="Notifications" active={path === "/notifications"} collapsed={collapsed} onClick={() => navigate("/notifications")} />
            <NavItem icon={CreditCard} label="Payments" active={path === "/payments"} collapsed={collapsed} onClick={() => navigate("/payments")} />
            <NavItem icon={Settings} label="Settings" active={path === "/profile"} collapsed={collapsed} onClick={() => navigate("/profile")} />
          </>
        )}
      </nav>

      <div className="border-t border-gray-100 p-3">
        <div className={`flex items-center ${collapsed ? "justify-center" : "gap-2.5"} rounded-2xl border border-gray-100 bg-gray-50/80 px-2 py-2`}>
          <button
            onClick={() => navigate("/profile")}
            className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-gray-100"
          >
            {user?.avatar ? (
              <img src={getImageUrl(user.avatar)} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-gray-500">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </span>
            )}
          </button>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-800">{user?.name || "User"}</p>
              <p className="truncate text-xs capitalize text-gray-400">{user?.role || "Tenant"}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="rounded-full p-1.5 text-gray-400 transition hover:bg-white hover:text-red-500"
            aria-label="Logout"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
};
