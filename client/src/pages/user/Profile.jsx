import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { User, Shield, SlidersHorizontal } from "lucide-react";
import GeneralProfile from "../../components/settings/GeneralProfile";
import SecuritySettings from "../../components/settings/SecuritySettings";
import PreferencesSettings from "../../components/settings/PreferencesSettings";
import VerifiedOwnerBadge from "../../components/ui/VerifiedOwnerBadge";
import { Navbar } from "../../components/layout/Navbar";

const CORAL = "#E67E5F";

const TABS = [
  { id: "profile",     label: "Profile",     icon: User },
  { id: "security",    label: "Security",    icon: Shield },
  { id: "preferences", label: "Preferences", icon: SlidersHorizontal },
];

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const profileRef  = useRef(null);
  const securityRef = useRef(null);
  const prefsRef    = useRef(null);

  const scrollTo = (id) => {
    const map = { profile: profileRef, security: securityRef, preferences: prefsRef };
    map[id]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#EBF3FB" }}>
      <Navbar />

      <div className="flex flex-1">
        {/* Left sidebar */}
        <aside className="w-44 shrink-0 bg-white border-r border-gray-100 sticky top-14 h-[calc(100vh-3.5rem)] py-6 px-3">
          <nav className="space-y-0.5">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-orange-50 hover:text-orange-600 group transition-colors"
              >
                <Icon size={16} className="shrink-0 text-gray-400 group-hover:text-orange-500 transition-colors" />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1 py-8 px-6 md:px-10 max-w-3xl">
          <div className="mb-8 flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
            {user?.role === "owner" && user?.isVerifiedOwner && <VerifiedOwnerBadge />}
          </div>

          <div ref={profileRef} className="scroll-mt-20 mb-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
              <GeneralProfile />
            </div>
          </div>

          <div ref={securityRef} className="scroll-mt-20 mb-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
              <SecuritySettings />
            </div>
          </div>

          <div ref={prefsRef} className="scroll-mt-20 mb-10">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
              <PreferencesSettings />
            </div>
          </div>
        </main>
      </div>

      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button onClick={() => navigate("/")} className="text-base font-bold" style={{ color: CORAL }}>Gojo</button>
          <nav className="flex flex-wrap justify-center gap-5 text-xs text-gray-500">
            <a href="#support" className="hover:text-gray-800">Support Center</a>
            <a href="#terms" className="hover:text-gray-800">Terms of Service</a>
            <a href="#privacy" className="hover:text-gray-800">Privacy Policy</a>
            <button onClick={() => navigate("/owner/dashboard")} className="hover:text-gray-800">List your Property</button>
          </nav>
          <p className="text-xs text-gray-400">© 2024 Gojo Ethiopia. Built with hospitality.</p>
        </div>
      </footer>
    </div>
  );
};

export default Profile;
