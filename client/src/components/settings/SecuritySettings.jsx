import React, { useState } from "react";
import { Eye, EyeOff, Shield, Trash2, Key, Info } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import userService from "../../api/userService";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const SecuritySettings = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, label: "", color: "" };

    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;

    if (strength <= 2) return { strength, label: "Vulnerable", color: "bg-red-500" };
    if (strength <= 3)
      return { strength, label: "Medium", color: "bg-amber-500" };
    if (strength <= 4) return { strength, label: "Secure", color: "bg-[#d4af37]" };
    return { strength, label: "Military-Grade", color: "bg-emerald-500" };
  };

  const passwordStrength = getPasswordStrength(passwordData.newPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    try {
      setLoading(true);
      await userService.updatePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      toast.success("Security credentials updated");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error("Invalid current credentials");
      } else {
        toast.error(
          error.response?.data?.message || "Failed to update security credentials",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      toast.error('Identity verification failed. Please type "DELETE"');
      return;
    }

    try {
      setDeleteLoading(true);
      const userId = user?.id || user?._id;
      await userService.deleteUser(userId);
      toast.success("Digital identity purged");
      logout();
      navigate("/");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to purge identity");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-10">
        <h2 className="text-3xl text-[#f8f6f3]" style={{ fontFamily: "'Playfair Display', serif" }}>
          Security Protocols
        </h2>
        <p className="text-[10px] text-[#9a9a9a] uppercase font-bold tracking-widest mt-2">
          Identity Encryption & Ledger Termination
        </p>
      </div>

      {/* Change Password Section */}
      <div className="mb-12 pb-12 border-b border-[#d4af37]/10">
        <h3 className="text-sm font-bold text-[#d4af37] mb-8 flex items-center gap-3 uppercase tracking-widest">
          <Key size={18} />
          Credential Encryption
        </h3>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Current Password */}
            <div className="settings-form-group">
              <label htmlFor="currentPassword" className="settings-form-label uppercase tracking-widest text-[10px] font-black text-[#9a9a9a] mb-2 block">
                Verify Identity (Current)
              </label>
              <div className="relative">
                <input
                  type={showPasswords.current ? "text" : "password"}
                  id="currentPassword"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  className="w-full bg-[#111] border border-[#d4af37]/10 rounded-xl px-5 py-3 text-[#f8f6f3] focus:border-[#d4af37]/40 outline-none transition-all pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("current")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#d4af37]/40 hover:text-[#d4af37] transition-colors"
                >
                  {showPasswords.current ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="settings-form-group">
              <label htmlFor="newPassword" className="settings-form-label uppercase tracking-widest text-[10px] font-black text-[#9a9a9a] mb-2 block">
                Establish New Encryption (New)
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? "text" : "password"}
                  id="newPassword"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  className="w-full bg-[#111] border border-[#d4af37]/10 rounded-xl px-5 py-3 text-[#f8f6f3] focus:border-[#d4af37]/40 outline-none transition-all pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("new")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#d4af37]/40 hover:text-[#d4af37] transition-colors"
                >
                  {showPasswords.new ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
              {/* Password Strength Indicator */}
              {passwordData.newPassword && (
                <div className="mt-4 animate-in fade-in duration-500">
                  <div className="flex gap-1.5 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all duration-700 ${
                          i < passwordStrength.strength
                            ? passwordStrength.color
                            : "bg-[#1a1a1a]"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-[#9a9a9a] font-bold uppercase tracking-widest flex items-center justify-between">
                    <span>Encryption Level: <span className={passwordStrength.color.replace('bg-', 'text-')}>{passwordStrength.label}</span></span>
                    <span>{passwordStrength.strength}/5</span>
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="settings-form-group">
              <label htmlFor="confirmPassword" className="settings-form-label uppercase tracking-widest text-[10px] font-black text-[#9a9a9a] mb-2 block">
                Verify Encryption (Confirm)
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  className="w-full bg-[#111] border border-[#d4af37]/10 rounded-xl px-5 py-3 text-[#f8f6f3] focus:border-[#d4af37]/40 outline-none transition-all pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("confirm")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#d4af37]/40 hover:text-[#d4af37] transition-colors"
                >
                  {showPasswords.confirm ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-[#d4af37] text-[#0a0a0a] font-black text-xs uppercase tracking-[0.2em] py-4 rounded-xl hover:bg-[#b8941f] transition-all disabled:opacity-50">
              {loading ? "Establishing..." : "Commit Credentials"}
            </button>
          </div>
        </form>
      </div>

      {/* Delete Account Section */}
      <div className="bg-red-500/5 border border-red-500/10 p-8 rounded-2xl">
        <h3 className="text-sm font-bold text-red-500 mb-2 flex items-center gap-3 uppercase tracking-widest">
          <Trash2 size={18} />
          Ledger Termination
        </h3>
        <p className="text-xs text-[#9a9a9a] mb-6 leading-relaxed">
          Permanently purge your identity matrix and all associated dossiers from our secure architecture. This action is irreversible.
        </p>

        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-6 py-3 text-[10px] font-black text-red-500 border border-red-500/20 rounded-xl hover:bg-red-500/10 transition-all uppercase tracking-widest"
          >
            Initiate Purge Sequence
          </button>
        ) : (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300">
            <p className="text-[10px] text-red-400 font-black uppercase tracking-widest mb-4 flex items-center gap-2">
              <Info size={12} />
              Verification Required: Type <strong>DELETE</strong>
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="VERIFY PROTOCOL"
              className="w-full bg-[#0a0a0a] border border-red-500/20 rounded-xl px-5 py-3 text-red-500 focus:border-red-500 outline-none transition-all mb-4 uppercase font-mono text-sm"
            />
            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteLoading || deleteConfirmText !== "DELETE"}
                className="flex-1 px-4 py-3 text-[10px] font-black text-[#0a0a0a] bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-all uppercase tracking-widest"
              >
                {deleteLoading ? "Purging..." : "Confirm Deletion"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText("");
                }}
                className="px-6 py-3 text-[10px] font-black text-[#9a9a9a] border border-[#d4af37]/10 rounded-xl hover:bg-white/5 transition-all uppercase tracking-widest"
              >
                Abort
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecuritySettings;
