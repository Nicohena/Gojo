import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { authService } from "../../api/authService";
import { Lock, Loader2, CheckCircle, ArrowLeft, Eye, EyeOff } from "lucide-react";

const CORAL = "#E67E5F";
const BROWN = "#3D2C29";

function GojoLogo({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <polygon points="50,10 95,48 5,48" fill={BROWN} />
      <rect x="18" y="44" width="64" height="46" fill={CORAL} />
      <rect x="38" y="62" width="24" height="28" rx="2" fill="white" />
    </svg>
  );
}

const ResetPassword = () => {
  const navigate = useNavigate();
  const { token } = useParams();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const inputCls = "w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition bg-white";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!token) { setError("Reset token is missing or invalid."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      await authService.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Reset link is invalid or expired. Please request a new one.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#EBF3FB" }}>
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        <button onClick={() => navigate("/")} className="flex flex-col items-center gap-1.5 mb-8">
          <GojoLogo size={52} />
          <span className="text-xl font-bold tracking-tight" style={{ color: CORAL }}>Gojo</span>
        </button>

        <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8">
          {success ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={28} className="text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Password Updated</h2>
              <p className="text-sm text-gray-500 mb-6">Your password has been reset. Redirecting to login...</p>
              <Link to="/login" className="inline-flex items-center gap-2 text-sm font-semibold hover:underline" style={{ color: CORAL }}>
                <ArrowLeft size={14} /> Go to Login
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-4">
                  <Lock size={22} style={{ color: CORAL }} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Reset Password</h2>
                <p className="text-sm text-gray-500 mt-1">Enter your new password below.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" autoFocus className={`${inputCls} pr-10`} />
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat new password" className={inputCls} />
                </div>

                {error && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

                <button type="submit" disabled={loading} className="w-full py-3 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60" style={{ background: CORAL }}>
                  {loading ? <><Loader2 size={16} className="animate-spin" /> Updating...</> : "Reset Password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <span className="text-base font-bold" style={{ color: CORAL }}>Gojo</span>
          <p className="text-xs text-gray-400">© 2024 Gojo Inc.</p>
        </div>
      </footer>
    </div>
  );
};

export default ResetPassword;
