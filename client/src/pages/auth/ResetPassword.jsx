import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { authService } from "../../api/authService";
import { Lock, Loader2, CheckCircle, ArrowLeft } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { token } = useParams();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Reset token is missing or invalid.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Reset link is invalid or expired. Please request a new one."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
        {success ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-emerald-600" size={32} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">
              Password Updated
            </h2>
            <p className="text-slate-500 mb-6">
              Your password has been reset successfully. Redirecting to login...
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft size={16} />
              Go to Login
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lock className="text-blue-600" size={28} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-1">
                Reset Password
              </h2>
              <p className="text-slate-500 text-sm">
                Enter your new password to complete account recovery.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 text-white rounded-xl py-3 font-bold text-sm hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Updating...
                  </>
                ) : (
                  "Reset Password"
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
