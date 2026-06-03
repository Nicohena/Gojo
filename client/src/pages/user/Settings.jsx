import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { User, Shield, SlidersHorizontal, Search, Bell, HelpCircle } from "lucide-react";
import GeneralProfile from "../../components/settings/GeneralProfile";
import SecuritySettings from "../../components/settings/SecuritySettings";
import PreferencesSettings from "../../components/settings/PreferencesSettings";
import { useAuth } from "../../context/AuthContext";
import { getImageUrl } from "../../utils/imageUtils";

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

const TABS = [
  { id: "profile",      label: "Profile",     icon: User },
  { id: "security",     label: "Security",    icon: Shield },
  { id: "preferences",  label: "Preferences", icon: SlidersHorizontal },
];

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Scroll refs for each section
  const profileRef     = useRef(null);
  const securityRef    = useRef(null);
  const prefsRef       = useRef(null);

  const scrollTo = (id) => {
    const refs = { profile: profileRef, security: securityRef, preferences: prefsRef };
    refs[id]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#EBF3FB" }}>
      {/* ── Top navbar ──────────────────────────────────────────────────── */}
      <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0 sticky top-0 z-40">
        <button onClick={() => navigate("/")} className="flex items-center gap-1.5">
          <GojoLogo size={24} />
          <span className="text-lg font-bold tracking-tight" style={{ color: CORAL }}>Gojo</span>
        </button>

        {/* Search */}
        <div className="hidden md:flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2 w-64">
          <Search size={14} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none flex-1"
          />
        </div>

        {/* Right icons */}
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/notifications")} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors" aria-label="Notifications">
            <Bell size={18} />
          </button>
          <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors" aria-label="Help">
            <HelpCircle size={18} />
          </button>
          <button onClick={() => navigate("/profile")} className="w-8 h-8 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-100">
            {user?.avatar
              ? <img src={getImageUrl(user.avatar)} alt="Avatar" className="w-full h-full object-cover" />
              : <span className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-500">{user?.name?.[0]?.toUpperCase() || "U"}</span>
            }
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* ── Left sidebar ────────────────────────────────────────────────── */}
        <aside className="w-44 shrink-0 bg-white border-r border-gray-100 sticky top-14 h-[calc(100vh-3.5rem)] py-6 px-3">
          <nav className="space-y-0.5">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-gray-600 hover:bg-orange-50 hover:text-orange-600 group"
              >
                <Icon size={16} className="shrink-0 text-gray-400 group-hover:text-orange-500 transition-colors" />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Main content ────────────────────────────────────────────────── */}
        <main className="flex-1 py-8 px-6 md:px-10 max-w-3xl">
          {/* Page heading */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your profile, security, and notification preferences.</p>
          </div>

          {/* Profile section */}
          <div ref={profileRef} className="scroll-mt-20 mb-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
              <GeneralProfile />
            </div>
          </div>

          {/* Security section */}
          <div ref={securityRef} className="scroll-mt-20 mb-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
              <SecuritySettings />
            </div>
          </div>

          {/* Preferences section */}
          <div ref={prefsRef} className="scroll-mt-20 mb-10">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
              <PreferencesSettings />
            </div>
          </div>
        </main>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button onClick={() => navigate("/")} className="text-base font-bold tracking-tight" style={{ color: CORAL }}>
            Gojo
          </button>
          <nav className="flex flex-wrap justify-center gap-5 text-xs text-gray-500">
            <a href="#support" className="hover:text-gray-800 transition-colors">Support Center</a>
            <a href="#trust" className="hover:text-gray-800 transition-colors">Trust &amp; Safety</a>
            <a href="#terms" className="hover:text-gray-800 transition-colors">Terms of Service</a>
            <a href="#privacy" className="hover:text-gray-800 transition-colors">Privacy Policy</a>
            <button onClick={() => navigate("/owner/dashboard")} className="hover:text-gray-800 transition-colors">List your Property</button>
          </nav>
          <p className="text-xs text-gray-400">© 2024 Gojo Ethiopia. All rights reserved. Built with hospitality.</p>
        </div>
      </footer>
    </div>
  );
};

export default Settings;
