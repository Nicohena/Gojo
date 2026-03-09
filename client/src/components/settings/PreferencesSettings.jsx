import React, { useState, useEffect } from "react";
import { Bell, Mail } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import userService from "../../api/userService";
import toast from "react-hot-toast";

const PreferencesSettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    marketingEmails: false,
  });

  useEffect(() => {
    const loadPreferences = async () => {
      const userId = user?.id || user?._id;
      if (!userId) return;

      try {
        const response = await userService.getPreferences(userId);
        const saved = response?.data?.preferences || {};
        setPreferences((prev) => ({
          ...prev,
          emailNotifications:
            typeof saved.emailNotifications === "boolean"
              ? saved.emailNotifications
              : prev.emailNotifications,
          marketingEmails:
            typeof saved.marketingEmails === "boolean"
              ? saved.marketingEmails
              : prev.marketingEmails,
        }));
      } catch (error) {
        // Keep local defaults if fetch fails.
      }
    };

    loadPreferences();
  }, [user]);

  const handleToggle = async (key) => {
    const userId = user?.id || user?._id;
    if (!userId) {
      toast.error("User not authenticated");
      return;
    }

    const newValue = !preferences[key];

    try {
      setLoading(true);
      setPreferences((prev) => ({
        ...prev,
        [key]: newValue,
      }));

      await userService.updatePreferences(userId, { [key]: newValue });
      toast.success("Notification preferences updated");
    } catch (error) {
      setPreferences((prev) => ({
        ...prev,
        [key]: !newValue,
      }));
      toast.error(
        error.response?.data?.message || "Failed to update preferences"
      );
    } finally {
      setLoading(false);
    }
  };

  const preferenceItems = [
    {
      key: "emailNotifications",
      icon: Bell,
      title: "Booking Alerts",
      description: "Receive updates regarding your booking requests and status changes.",
    },
    {
      key: "marketingEmails",
      icon: Mail,
      title: "Offers & Listings",
      description: "Receive information regarding new property listings and exclusive alerts.",
    },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-10">
        <h2 className="text-3xl text-[#f8f6f3]" style={{ fontFamily: "'Playfair Display', serif" }}>
          Notification Preferences
        </h2>
        <p className="text-sm text-[#9a9a9a] mt-2 tracking-wide">
          Configure your notification preferences to stay informed on system activity.
        </p>
      </div>

      <div className="space-y-6">
        {preferenceItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.key}
              className="flex items-center justify-between p-6 bg-[#0a0a0a] border border-[#d4af37]/10 rounded-xl transition-all hover:border-[#d4af37]/30"
            >
              <div className="flex items-start gap-4 flex-1">
                <div className="mt-1 p-2 bg-[#d4af37]/10 rounded-lg">
                  <Icon className="w-5 h-5 text-[#d4af37]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#f8f6f3]">
                    {item.title}
                  </p>
                  <p className="text-xs text-[#9a9a9a] mt-1 pr-4">
                    {item.description}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={preferences[item.key]}
                  onChange={() => handleToggle(item.key)}
                  disabled={loading}
                />
                <div className="w-11 h-6 bg-[#1a1a1a] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#d4af37]"></div>
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PreferencesSettings;
