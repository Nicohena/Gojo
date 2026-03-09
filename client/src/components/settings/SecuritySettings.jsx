import React, { useState } from "react";
import { Shield, Trash2, Mail, Info, CheckCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../api/authService";
import userService from "../../api/userService";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const SecuritySettings = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const handleSendResetEmail = async () => {
    if (!user?.email) {
      toast.error("No email address found for your account");
      return;
    }

    try {
      setLoading(true);
      await authService.forgotPassword(user.email);
      setEmailSent(true);
      toast.success("Password reset link sent to your email");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to send password reset email"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      toast.error('Please type "DELETE" to confirm');
      return;
    }

    try {
      setDeleteLoading(true);
      const userId = user?.id || user?._id;
      await userService.deleteUser(userId);
      toast.success("Your account has been deleted");
      logout();
      navigate("/");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete account");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-10">
        <h2 className="text-3xl text-[#f8f6f3]" style={{ fontFamily: "'Playfair Display', serif" }}>
          Security Settings
        </h2>
        <p className="text-sm text-[#9a9a9a] mt-2 tracking-wide">
          Maintain your account security and authentication credentials.
        </p>
      </div>

      {/* Change Password Section */}
      <div className="mb-12 pb-12 border-b border-[#d4af37]/10">
        <h3 className="text-sm font-bold text-[#d4af37] mb-6 flex items-center gap-3 uppercase tracking-widest">
          <Mail size={18} />
          Update Password
        </h3>

        <p className="text-sm text-[#9a9a9a] mb-6 leading-relaxed">
          To update your password, a secure reset link will be dispatched to your registered email address.
          Follow the instructions provided in the correspondence to establish new credentials.
        </p>

        <div className="bg-[#111] border border-[#d4af37]/10 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-1">
            <Mail size={14} className="text-[#d4af37]/60" />
            <span className="text-[10px] uppercase font-bold text-[#9a9a9a] tracking-widest">
              Registered Email
            </span>
          </div>
          <p className="text-sm text-[#f8f6f3] pl-[26px]">{user?.email || "—"}</p>
        </div>

        {emailSent ? (
          <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 animate-in fade-in duration-500">
            <CheckCircle size={20} className="text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-emerald-400">Reset link sent</p>
              <p className="text-xs text-[#9a9a9a] mt-1">
                Check your inbox at <span className="text-[#f8f6f3]">{user?.email}</span>. The link will expire in 30 minutes.
              </p>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSendResetEmail}
            disabled={loading}
            className="w-full bg-[#d4af37] text-[#0a0a0a] font-bold text-xs uppercase tracking-[0.2em] py-4 rounded-xl hover:bg-[#b8941f] transition-all disabled:opacity-50"
          >
            {loading ? "Dispatching..." : "Dispatch Reset Link"}
          </button>
        )}
      </div>

      {/* Delete Account Section */}
      <div className="bg-red-500/5 border border-red-500/10 p-8 rounded-2xl">
        <h3 className="text-sm font-bold text-red-500 mb-2 flex items-center gap-3 uppercase tracking-widest">
          <Trash2 size={18} />
          Delete Account
        </h3>
        <p className="text-xs text-[#9a9a9a] mb-6 leading-relaxed">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>

        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-6 py-3 text-[10px] font-bold text-red-500 border border-red-500/20 rounded-xl hover:bg-red-500/10 transition-all uppercase tracking-widest"
          >
            Delete My Account
          </button>
        ) : (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300">
            <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
              <Info size={12} />
              Type <strong>DELETE</strong> to confirm
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE"
              className="w-full bg-[#0a0a0a] border border-red-500/20 rounded-xl px-5 py-3 text-red-500 focus:border-red-500 outline-none transition-all mb-4 uppercase font-mono text-sm"
            />
            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteLoading || deleteConfirmText !== "DELETE"}
                className="flex-1 px-4 py-3 text-[10px] font-bold text-[#0a0a0a] bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-all uppercase tracking-widest"
              >
                {deleteLoading ? "Deleting..." : "Confirm Deletion"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText("");
                }}
                className="px-6 py-3 text-[10px] font-bold text-[#9a9a9a] border border-[#d4af37]/10 rounded-xl hover:bg-white/5 transition-all uppercase tracking-widest"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecuritySettings;
