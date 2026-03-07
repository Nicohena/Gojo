import React, { useCallback, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getRedirectPath } from "../../utils/auth";
import { User, Mail, Lock, Phone, Loader2, ArrowRight, ShieldCheck } from "lucide-react";
import GoogleAuthButton from "../../components/auth/GoogleAuthButton";

const Register = () => {
  const navigate = useNavigate();
  const { register, googleAuth } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "tenant",
  });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await register(formData);
      navigate(getRedirectPath(user.role));
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = useCallback(
    async (idToken) => {
      setError("");
      setGoogleLoading(true);
      try {
        const user = await googleAuth({ idToken, mode: "signup", role: formData.role });
        navigate(getRedirectPath(user.role));
      } catch (err) {
        setError(err.response?.data?.message || "Google signup failed");
      } finally {
        setGoogleLoading(false);
      }
    },
    [googleAuth, navigate, formData.role],
  );

  const inputClass =
    "block w-full pl-10 pr-4 py-3.5 bg-[#1a1a1a] border border-[#d4af37]/10 text-[#f8f6f3] placeholder-[#9a9a9a]/50 focus:border-[#d4af37]/50 focus:outline-none transition-all text-sm tracking-wide";
  const labelClass =
    "block text-[10px] font-bold text-[#d4af37]/60 uppercase tracking-widest mb-2";

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

      <div className="relative z-10 w-full max-w-md py-8">
        {/* Logo */}
        <div
          onClick={() => navigate("/")}
          className="flex justify-center mb-10 cursor-pointer"
        >
          <span
            className="text-[#d4af37] tracking-[0.4em] text-2xl"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            SMART RENT
          </span>
        </div>

        {/* Card */}
        <div className="border border-[#d4af37]/20 bg-[#111]/80 backdrop-blur-xl p-10">
          <div className="mb-8">
            <h2
              className="text-3xl text-[#f8f6f3] mb-2"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Create Account.
            </h2>
            <p className="text-[#9a9a9a] text-sm tracking-wide">
              Already have an account?{" "}
              <Link to="/login" className="text-[#d4af37] hover:underline">
                Sign in here
              </Link>
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Role Selector */}
            <div className="grid grid-cols-2 gap-1 p-1 border border-[#d4af37]/10 bg-[#1a1a1a] mb-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: "tenant" })}
                className={`py-2.5 text-xs tracking-widest uppercase font-bold transition-all ${
                  formData.role === "tenant"
                    ? "bg-[#d4af37] text-[#0a0a0a]"
                    : "text-[#9a9a9a] hover:text-[#f8f6f3]"
                }`}
              >
                I'm a Tenant
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: "owner" })}
                className={`py-2.5 text-xs tracking-widest uppercase font-bold transition-all ${
                  formData.role === "owner"
                    ? "bg-[#d4af37] text-[#0a0a0a]"
                    : "text-[#9a9a9a] hover:text-[#f8f6f3]"
                }`}
              >
                I'm an Owner
              </button>
            </div>

            {/* Full Name */}
            <div>
              <label className={labelClass}>Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#9a9a9a]">
                  <User size={16} />
                </div>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={inputClass}
                  placeholder="Full Name"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className={labelClass}>Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#9a9a9a]">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={inputClass}
                  placeholder="Email Address"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className={labelClass}>Phone Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#9a9a9a]">
                  <Phone size={16} />
                </div>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={inputClass}
                  placeholder="+251 ..."
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className={labelClass}>Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#9a9a9a]">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={inputClass}
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
                  Create Account
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
              mode="signup"
              onCredential={handleGoogleCredential}
              disabled={loading || googleLoading}
            />
          </form>

          {/* Trust Badge */}
          <div className="mt-8 pt-6 border-t border-[#d4af37]/10 flex items-center gap-3 text-[#9a9a9a]/50">
            <ShieldCheck size={16} className="shrink-0" />
            <p className="text-[10px] uppercase tracking-widest leading-relaxed">
              By creating an account, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
