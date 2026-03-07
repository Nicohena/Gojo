import React, { useState } from "react";
import { Link } from "react-router-dom";
import { authService } from "../../api/authService";
import { Mail, ArrowLeft, Loader2, CheckCircle } from "lucide-react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to send reset email. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

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
        <Link to="/" className="flex justify-center mb-10">
          <span
            className="text-[#d4af37] tracking-[0.4em] text-2xl"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            AURA
          </span>
        </Link>

        {/* Card */}
        <div className="border border-[#d4af37]/20 bg-[#111]/80 backdrop-blur-xl p-10">
          {sent ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 border border-[#d4af37]/30 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="text-[#d4af37]" size={28} />
              </div>
              <h2
                className="text-2xl text-[#f8f6f3] mb-3"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Check Your Email
              </h2>
              <p className="text-[#9a9a9a] text-sm mb-8 leading-relaxed">
                If an account exists with <strong className="text-[#f8f6f3]">{email}</strong>, we've sent password reset instructions to your inbox.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-8 py-3 border border-[#d4af37] text-[#d4af37] text-sm tracking-widest hover:bg-[#d4af37] hover:text-[#0a0a0a] transition-all"
              >
                <ArrowLeft size={14} />
                Back to Login
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <div className="w-12 h-12 border border-[#d4af37]/30 flex items-center justify-center mb-6">
                  <Mail className="text-[#d4af37]" size={22} />
                </div>
                <h2
                  className="text-3xl text-[#f8f6f3] mb-2"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Forgot Password?
                </h2>
                <p className="text-[#9a9a9a] text-sm tracking-wide">
                  Enter your email and we'll send you a link to reset your password.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-[#d4af37]/60 uppercase tracking-widest mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-[#1a1a1a] border border-[#d4af37]/10 text-[#f8f6f3] placeholder-[#9a9a9a]/50 px-4 py-3.5 text-sm focus:border-[#d4af37]/50 focus:outline-none transition-all tracking-wide"
                    autoFocus
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
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="text-sm text-[#9a9a9a] hover:text-[#d4af37] transition-colors inline-flex items-center gap-1 tracking-wide"
                >
                  <ArrowLeft size={14} />
                  Back to Login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
