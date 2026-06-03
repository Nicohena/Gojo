import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService } from "../../api/authService";
import { Mail, ArrowLeft, Loader2, CheckCircle } from "lucide-react";

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

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError("Please enter your email address"); return; }
    setLoading(true);
    setError("");
    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#EBF3FB" }}>
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        {/* Logo */}
        <button onClick={() => navigate("/")} className="flex flex-col items-center gap-1.5 mb-8">
          <GojoLogo size={52} />
          <span className="text-xl font-bold tracking-tight" style={{ color: CORAL }}>Gojo</span>
        </button>

        {/* Card */}
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={28} className="text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Check Your Email</h2>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                If an account exists with <strong className="text-gray-800">{email}</strong>, we've sent password reset instructions to your inbox.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm font-semibold hover:underline"
                style={{ color: CORAL }}
              >
                <ArrowLeft size={14} /> Back to Login
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-4">
                  <Mail size={22} style={{ color: CORAL }} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Forgot Password?</h2>
                <p className="text-sm text-gray-500 mt-1">Enter your email and we'll send you a reset link.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="abebe@example.com"
                    autoFocus
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ background: CORAL }}
                >
                  {loading ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : "Send Reset Link"}
                </button>
              </form>

              <div className="mt-5 text-center">
                <Link to="/login" className="text-sm font-medium inline-flex items-center gap-1 hover:underline" style={{ color: CORAL }}>
                  <ArrowLeft size={14} /> Back to Login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-base font-bold tracking-tight" style={{ color: CORAL }}>Gojo</span>
          <p className="text-xs text-gray-400">© 2024 Gojo Inc. Supports Chapa &amp; Stripe</p>
          <nav className="flex items-center gap-5 text-sm text-gray-500">
            <a href="#support" className="hover:text-gray-800">Support</a>
            <a href="#about" className="hover:text-gray-800">About</a>
          </nav>
        </div>
      </footer>
    </div>
  );
};

export default ForgotPassword;
