import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import Navbar from "../../components/layout/Navbar";
import { User, Shield, Bell, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import GeneralProfile from "../../components/settings/GeneralProfile";
import SecuritySettings from "../../components/settings/SecuritySettings";
import PreferencesSettings from "../../components/settings/PreferencesSettings";
import VerifiedOwnerBadge from "../../components/ui/VerifiedOwnerBadge";
import "../user/Settings.css";

const Profile = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("general");
  const navigate = useNavigate();

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
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium"
            style={{ border: '1px solid', borderColor: 'var(--panel-border)', background: 'transparent', color: 'var(--text)' }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <h1
            className="text-4xl"
            style={{ fontFamily: "'Playfair Display', serif", color: 'var(--text)' }}
          >
            Account Settings
          </h1>
          {user?.role === "owner" && user?.isVerifiedOwner && <VerifiedOwnerBadge />}
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Tab Sidebar */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="overflow-hidden" style={{ background: 'var(--panel)', border: '1px solid', borderColor: 'var(--panel-border)' }}>
              <nav>
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-5 py-4 text-sm text-left transition-all border-l-2`}
                      style={isActive ? { borderColor: 'var(--accent)', color: 'var(--accent)', background: 'rgba(212,175,55,0.05)' } : { borderColor: 'transparent', color: 'var(--muted)' }}
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
            <div className="p-6" style={{ background: 'var(--panel)', border: '1px solid', borderColor: 'var(--panel-border)' }}>
              {renderContent()}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Profile;
