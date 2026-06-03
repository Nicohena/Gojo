import React, { useState, useEffect } from "react";
import { SlidersHorizontal } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import userService from "../../api/userService";
import toast from "react-hot-toast";

const CORAL = "#E67E5F";

// ─── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className="relative inline-flex items-center w-11 h-6 rounded-full transition-colors focus:outline-none focus-visible:ring-2 shrink-0 disabled:opacity-50"
      style={{ background: checked ? CORAL : "#D1D5DB" }}
    >
      <span
        className="absolute left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
        style={{ transform: checked ? "translateX(20px)" : "translateX(0)" }}
      />
    </button>
  );
}

const PREFS = [
  {
    key: "emailNotifications",
    title: "Email Notifications",
    description: "Receive booking updates and promotions via email.",
  },
  {
    key: "smsAlerts",
    title: "SMS Alerts",
    description: "Get instant text messages for urgent host communications.",
  },
];

const PreferencesSettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [prefs, setPrefs] = useState({
    emailNotifications: true,
    smsAlerts: false,
  });

  useEffect(() => {
    const load = async () => {
      const userId = user?.id || user?._id;
      if (!userId) return;
      try {
        const res = await userService.getPreferences(userId);
        const saved = res?.data?.preferences || {};
        setPrefs((p) => ({
          emailNotifications: typeof saved.emailNotifications === "boolean" ? saved.emailNotifications : p.emailNotifications,
          smsAlerts: typeof saved.smsAlerts === "boolean" ? saved.smsAlerts : (typeof saved.marketingEmails === "boolean" ? saved.marketingEmails : p.smsAlerts),
        }));
      } catch { /* keep defaults */ }
    };
    load();
  }, [user]);

  const handleToggle = async (key) => {
    const userId = user?.id || user?._id;
    if (!userId) { toast.error("Not authenticated"); return; }
    const next = !prefs[key];
    setPrefs((p) => ({ ...p, [key]: next }));
    try {
      setLoading(true);
      await userService.updatePreferences(userId, { [key]: next });
      toast.success("Preferences saved");
    } catch (err) {
      setPrefs((p) => ({ ...p, [key]: !next }));
      toast.error(err.response?.data?.message || "Failed to save preferences");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Section heading */}
      <div className="flex items-center gap-2 mb-6">
        <SlidersHorizontal size={18} style={{ color: CORAL }} />
        <h2 className="text-lg font-bold text-gray-900">Communication Preferences</h2>
      </div>

      <div className="space-y-3">
        {PREFS.map(({ key, title, description }) => (
          <div
            key={key}
            className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-4"
          >
            <div className="flex-1 min-w-0 pr-4">
              <p className="text-sm font-semibold text-gray-800">{title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{description}</p>
            </div>
            <Toggle
              checked={prefs[key]}
              onChange={() => handleToggle(key)}
              disabled={loading}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default PreferencesSettings;
