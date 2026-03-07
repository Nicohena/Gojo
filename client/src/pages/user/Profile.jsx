import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import Navbar from "../../components/layout/Navbar";
import { User, Shield, Bell } from "lucide-react";
import GeneralProfile from "../../components/settings/GeneralProfile";
import SecuritySettings from "../../components/settings/SecuritySettings";
import PreferencesSettings from "../../components/settings/PreferencesSettings";
import "../user/Settings.css";

const Profile = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("general");

  const tabs = [
    { id: "general", label: "General Profile", icon: User },
    { id: "security", label: "Security", icon: Shield },
    { id: "preferences", label: "Preferences", icon: Bell },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "general": return <GeneralProfile />;
      case "security": return <SecuritySettings />;
      case "preferences": return <PreferencesSettings />;
      default: return <GeneralProfile />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1
          className="text-4xl text-[#f8f6f3] mb-8"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Account Settings
        </h1>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Tab Sidebar */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="bg-[#111] border border-[#d4af37]/10 overflow-hidden">
              <nav>
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-5 py-4 text-sm text-left transition-all border-l-2 ${
                        isActive
                          ? "border-[#d4af37] text-[#d4af37] bg-[#d4af37]/5"
                          : "border-transparent text-[#9a9a9a] hover:text-[#f8f6f3] hover:border-[#d4af37]/30"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="tracking-wide">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <div className="bg-[#111] border border-[#d4af37]/10 p-6">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Profile;
