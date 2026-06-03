import React, { useState } from "react";
import { Shield, Eye, EyeOff, Trash2, CheckCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import userService from "../../api/userService";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const CORAL = "#E67E5F";

const inputCls =
  "w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition bg-white";
const labelCls = "block text-sm font-medium text-gray-700 mb-1";

const SecuritySettings = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [passwords, setPasswords] = useState({ current: "", newPass: "", confirm: "" });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const setPass = (key) => (e) => setPasswords((p) => ({ ...p, [key]: e.target.value }));

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPass !== passwords.confirm) { toast.error("New passwords don't match"); return; }
    if (passwords.newPass.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    try {
      setLoading(true);
      await userService.updatePassword({
        currentPassword: passwords.current,
        newPassword: passwords.newPass,
      });
      setSuccess(true);
      setPasswords({ current: "", newPass: "", confirm: "" });
      toast.success("Password updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleteText !== "DELETE") { toast.error('Type "DELETE" to confirm'); return; }
    try {
      setDeleteLoading(true);
      const userId = user?.id || user?._id;
      await userService.deleteUser(userId);
      toast.success("Account deleted");
      logout();
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete account");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      {/* Section heading */}
      <div className="flex items-center gap-2 mb-6">
        <Shield size={18} style={{ color: CORAL }} />
        <h2 className="text-lg font-bold text-gray-900">Security Settings</h2>
      </div>

      <form onSubmit={handleUpdatePassword} className="space-y-4">
        {/* Current password */}
        <div>
          <label className={labelCls}>Current Password</label>
          <div className="relative">
            <input
              type={showCurrent ? "text" : "password"}
              value={passwords.current}
              onChange={setPass("current")}
              placeholder="••••••••"
              required
              className={`${inputCls} pr-10`}
            />
            <button type="button" onClick={() => setShowCurrent((v) => !v)} className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600">
              {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* New + Confirm */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>New Password</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={passwords.newPass}
                onChange={setPass("newPass")}
                placeholder="Min 8 characters"
                required
                className={`${inputCls} pr-10`}
              />
              <button type="button" onClick={() => setShowNew((v) => !v)} className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600">
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className={labelCls}>Confirm New Password</label>
            <input
              type="password"
              value={passwords.confirm}
              onChange={setPass("confirm")}
              placeholder="Repeat password"
              required
              className={inputCls}
            />
          </div>
        </div>

        {success && (
          <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 text-sm">
            <CheckCircle size={15} />
            Password updated successfully.
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: CORAL }}
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </div>
      </form>

      {/* ── Delete account ──────────────────────────────────────────── */}
      <div className="mt-8 pt-6 border-t border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <Trash2 size={16} className="text-red-500" />
          <h3 className="text-sm font-bold text-red-600">Delete Account</h3>
        </div>
        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>

        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 text-xs font-semibold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            Delete My Account
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-red-500 font-medium">Type <strong>DELETE</strong> to confirm:</p>
            <input
              type="text"
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder="DELETE"
              className="w-full px-4 py-2.5 rounded-lg border border-red-200 text-sm text-red-600 focus:outline-none focus:ring-2 focus:ring-red-200 bg-white"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteLoading || deleteText !== "DELETE"}
                className="px-5 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleteLoading ? "Deleting..." : "Confirm Delete"}
              </button>
              <button
                type="button"
                onClick={() => { setShowDeleteConfirm(false); setDeleteText(""); }}
                className="px-5 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
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
