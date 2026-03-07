import React, { useCallback, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Mail, Lock, Loader2, ArrowRight, ShieldCheck } from "lucide-react";
import { getRedirectPath } from "../../utils/auth";
import GoogleAuthButton from "../../components/auth/GoogleAuthButton";

const Login = () => {
  const navigate = useNavigate();
  const { login, googleAuth } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(formData.email, formData.password);
      navigate(getRedirectPath(user.role));
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = useCallback(
    async (idToken) => {
      setError("");
      setGoogleLoading(true);
      try {
        const user = await googleAuth({ idToken, mode: "login" });
        navigate(getRedirectPath(user.role));
      } catch (err) {
        setError(err.response?.data?.message || "Google sign-in failed");
      } finally {
        setGoogleLoading(false);
      }
    },
    [googleAuth, navigate],
  );

  return (
    <div
      className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4"
      style={{
        backgroundImage: `url('https://images.unsplash.com/photo-1616651283320-ee68a1113d94?auto=format&fit=crop&q=80&w=1600')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-[#0a0a0a]/85" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div
          onClick={() => navigate("/")}
          className="flex justify-center mb-10 cursor-pointer"
        >
          <span
            className="text-[#d4af37] tracking-[0.4em] text-2xl"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            AURA
          </span>
        </div>

        {/* Card */}
        <div className="border border-[#d4af37]/20 bg-[#111]/80 backdrop-blur-xl p-10">
          <div className="mb-8">
            <h2
              className="text-3xl text-[#f8f6f3] mb-2"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Welcome Back
            </h2>
            <p className="text-[#9a9a9a] text-sm tracking-wide">
              Don't have an account?{" "}
              <Link to="/register" className="text-[#d4af37] hover:underline">
                Create Account
              </Link>
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Email */}
            <div>
              <label className="block text-[10px] font-bold text-[#d4af37]/60 uppercase tracking-widest mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#9a9a9a]">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="block w-full pl-10 pr-4 py-3.5 bg-[#1a1a1a] border border-[#d4af37]/10 text-[#f8f6f3] placeholder-[#9a9a9a]/50 focus:border-[#d4af37]/50 focus:outline-none transition-all text-sm tracking-wide"
                  placeholder="Email address"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[10px] font-bold text-[#d4af37]/60 uppercase tracking-widest mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#9a9a9a]">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="block w-full pl-10 pr-4 py-3.5 bg-[#1a1a1a] border border-[#d4af37]/10 text-[#f8f6f3] placeholder-[#9a9a9a]/50 focus:border-[#d4af37]/50 focus:outline-none transition-all text-sm tracking-wide"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="border border-red-500/30 bg-red-500/10 text-red-400 p-3 text-sm flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-red-400 shrink-0" />
                {error}
              </div>
            )}

            {/* Forgot Password */}
            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-xs text-[#d4af37]/60 hover:text-[#d4af37] transition-colors tracking-wide"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full flex justify-center items-center gap-2 py-4 bg-[#d4af37] text-[#0a0a0a] font-bold tracking-[0.1em] hover:bg-[#b8941f] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  Sign In
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#d4af37]/10" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#111] px-3 text-[10px] tracking-widest text-[#9a9a9a] uppercase">
                  Or continue with
                </span>
              </div>
            </div>

            <GoogleAuthButton
              mode="login"
              onCredential={handleGoogleCredential}
              disabled={loading || googleLoading}
            />
          </form>

          {/* Trust Badge */}
          <div className="mt-8 pt-6 border-t border-[#d4af37]/10 flex items-center gap-3 text-[#9a9a9a]/50">
            <ShieldCheck size={16} className="shrink-0" />
            <p className="text-[10px] uppercase tracking-widest leading-relaxed">
              Protected by industry-standard SSL encryption.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
