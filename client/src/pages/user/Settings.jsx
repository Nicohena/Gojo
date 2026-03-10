import React, { useState } from "react";
import { User, Shield, Bell } from "lucide-react";
import Navbar from "../../components/layout/Navbar";
import GeneralProfile from "../../components/settings/GeneralProfile";
import SecuritySettings from "../../components/settings/SecuritySettings";
import PreferencesSettings from "../../components/settings/PreferencesSettings";
import "./Settings.css";

const Settings = () => {
  const [activeTab, setActiveTab] = useState("general");

  const tabs = [
    { id: "general", label: "Profile", icon: User },
    { id: "security", label: "Security", icon: Shield },
    { id: "preferences", label: "Preferences", icon: Bell },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "general":
        return <GeneralProfile />;
      case "security":
        return <SecuritySettings />;
      case "preferences":
        return <PreferencesSettings />;
      default:
        return <GeneralProfile />;
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-72 flex-shrink-0">
            <div className="rounded-2xl overflow-hidden sticky top-24" style={{ background: 'var(--panel)', border: '1px solid', borderColor: 'var(--panel-border)' }}>
              <nav className="flex flex-col p-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-4 px-6 py-4 rounded-xl text-sm font-bold transition-all duration-300`}
                      style={
                        activeTab === tab.id
                          ? { background: 'var(--accent)', color: 'var(--panel)', boxShadow: '0 0 20px rgba(212,175,55,0.2)' }
                          : { color: 'var(--muted)' }
                      }
                    >
                      <Icon size={18} />
                      <span className="tracking-wide">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <div className="rounded-2xl p-8 lg:p-10 shadow-2xl" style={{ background: 'var(--panel)', border: '1px solid', borderColor: 'var(--panel-border)' }}>
              {renderContent()}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Settings;
