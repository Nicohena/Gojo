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

  const inputClass =
    "w-full bg-[#1a1a1a] border border-[#d4af37]/10 text-[#f8f6f3] placeholder-[#9a9a9a]/50 px-4 py-3.5 text-sm focus:border-[#d4af37]/50 focus:outline-none transition-all tracking-wide";

  return (
    <div
      className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4"
      style={{
        backgroundImage: `url('https://images.unsplash.com/photo-1616651283320-ee68a1113d94?auto=format&fit=crop&q=80&w=1600')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-[#0a0a0a]/88" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="flex flex-col items-center gap-3 mb-10">
          <img src="/logo-mark.svg" alt="Logo" className="w-12 h-12" />
          <span
            className="text-[#d4af37] tracking-[0.4em] text-2xl"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            SMART RENT
          </span>
        </Link>

        {/* Card */}
        <div className="border border-[#d4af37]/20 bg-[#111]/80 backdrop-blur-xl p-10">
          {success ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 border border-[#d4af37]/30 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="text-[#d4af37]" size={28} />
              </div>
              <h2
                className="text-2xl text-[#f8f6f3] mb-3"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Password Updated
              </h2>
              <p className="text-[#9a9a9a] text-sm mb-8">
                Your password has been reset successfully. Redirecting to login...
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-8 py-3 border border-[#d4af37] text-[#d4af37] text-sm tracking-widest hover:bg-[#d4af37] hover:text-[#0a0a0a] transition-all"
              >
                <ArrowLeft size={14} />
                Go to Login
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <div className="w-12 h-12 border border-[#d4af37]/30 flex items-center justify-center mb-6">
                  <Lock className="text-[#d4af37]" size={22} />
                </div>
                <h2
                  className="text-3xl text-[#f8f6f3] mb-2"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Reset Password
                </h2>
                <p className="text-[#9a9a9a] text-sm tracking-wide">
                  Enter your new password to complete account recovery.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-[#d4af37]/60 uppercase tracking-widest mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className={inputClass}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#d4af37]/60 uppercase tracking-widest mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className={inputClass}
                  />
                </div>

                {error && (
                  <div className="border border-red-500/30 bg-red-500/10 text-red-400 p-3 text-sm flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-red-400 shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#d4af37] text-[#0a0a0a] py-4 font-bold text-sm tracking-[0.1em] hover:bg-[#b8941f] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
    </div>
  );
};

export default ResetPassword;
