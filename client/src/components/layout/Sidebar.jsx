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

// ─── Single nav item ──────────────────────────────────────────────────────────
function NavItem({ icon: Icon, label, active = false, count, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all group"
      style={
        active
          ? { background: "#FEF0EC", color: CORAL }
          : { color: "#6B7280" }
      }
    >
      <div className="flex items-center gap-3">
        <Icon
          size={18}
          strokeWidth={active ? 2.5 : 1.8}
          style={{ color: active ? CORAL : "#9CA3AF" }}
        />
        <span className="text-sm font-medium">{label}</span>
      </div>
      {count > 0 && (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white min-w-[18px] text-center">
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const handleLogout = () => {
    logout();
    disconnectSocket();
    navigate("/");
  };

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
      className="w-52 h-screen flex flex-col sticky top-0 border-r"
      style={{ background: "white", borderColor: "#E5E7EB" }}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <button onClick={() => navigate("/")} className="flex items-center gap-2">
          <GojoLogo size={28} />
          <span className="text-lg font-bold tracking-tight" style={{ color: CORAL }}>
            Gojo
          </span>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {user?.role === "owner" ? (
          <>
            <NavItem icon={LayoutDashboard} label="Dashboard" active={path === "/owner/dashboard"} onClick={() => navigate("/owner/dashboard")} />
            <NavItem icon={Home} label="Listings" active={path === "/owner/listings"} onClick={() => navigate("/owner/listings")} />
            <NavItem icon={BookOpen} label="Bookings" active={path === "/owner/bookings"} onClick={() => navigate("/owner/bookings")} />
            <NavItem icon={MessageSquare} label="Messages" active={path === "/messages"} onClick={() => navigate("/messages")} count={unreadCount} />
            <NavItem icon={CreditCard} label="Payments" active={path === "/payments"} onClick={() => navigate("/payments")} />
            <NavItem icon={Settings} label="Settings" active={path === "/settings"} onClick={() => navigate("/settings")} />
          </>
        ) : user?.role === "admin" ? (
          <>
            <NavItem icon={LayoutDashboard} label="Dashboard" active={path === "/admin"} onClick={() => navigate("/admin")} />
            <NavItem icon={Home} label="Listings" active={path === "/admin/listings"} onClick={() => navigate("/admin/listings")} />
            <NavItem icon={Users} label="Users" active={path === "/admin/users"} onClick={() => navigate("/admin/users")} />
            <NavItem icon={BarChart2} label="Analytics" active={path === "/admin/analytics"} onClick={() => navigate("/admin/analytics")} />
            <NavItem icon={History} label="Audit Logs" active={path === "/admin/logs"} onClick={() => navigate("/admin/logs")} />
            <NavItem icon={Bell} label="Notifications" active={path === "/notifications"} onClick={() => navigate("/notifications")} />
            <NavItem icon={Settings} label="Settings" active={path === "/profile"} onClick={() => navigate("/profile")} />
          </>
        ) : (
          /* Tenant */
          <>
            <NavItem icon={Search} label="Explore" active={path === "/search"} onClick={() => navigate("/search")} />
            <NavItem icon={Heart} label="Saved Homes" active={path === "/saved"} onClick={() => navigate("/saved")} />
            <NavItem icon={BookOpen} label="My Bookings" active={path === "/tenant/dashboard"} onClick={() => navigate("/tenant/dashboard")} />
            <NavItem icon={MessageSquare} label="Messages" active={path === "/messages"} onClick={() => navigate("/messages")} count={unreadCount} />
            <NavItem icon={Bell} label="Notifications" active={path === "/notifications"} onClick={() => navigate("/notifications")} />
            <NavItem icon={CreditCard} label="Payments" active={path === "/payments"} onClick={() => navigate("/payments")} />
            <NavItem icon={Settings} label="Settings" active={path === "/profile"} onClick={() => navigate("/profile")} />
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <button
            onClick={() => navigate("/profile")}
            className="w-9 h-9 rounded-full overflow-hidden border-2 border-gray-200 flex items-center justify-center bg-gray-100 shrink-0"
          >
            {user?.avatar ? (
              <img src={getImageUrl(user.avatar)} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-gray-500">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </span>
            )}
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">
              {user?.name || "User"}
            </p>
            <p className="text-xs text-gray-400 capitalize">{user?.role || "Tenant"}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-red-500 transition-colors p-1"
            aria-label="Logout"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
};
