import React, { useCallback, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getRedirectPath } from "../../utils/auth";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import GoogleAuthButton from "../../components/auth/GoogleAuthButton";

// ─── Brand colors ─────────────────────────────────────────────────────────────
const CORAL = "#E67E5F";
const BROWN = "#3D2C29";

function GojoLogo({ size = 44 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <polygon points="50,10 95,48 5,48" fill={BROWN} />
      <rect x="18" y="44" width="64" height="46" fill={CORAL} />
      <rect x="38" y="62" width="24" height="28" rx="2" fill="white" />
    </svg>
  );
}

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
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => setFormData((p) => ({ ...p, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreed) {
      setError("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }
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

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#EBF3FB" }}>
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        {/* Logo */}
        <button
          onClick={() => navigate("/")}
          className="flex flex-col items-center gap-1.5 mb-8 group"
        >
          <GojoLogo size={52} />
          <span
            className="text-xl font-bold tracking-tight"
            style={{ color: CORAL }}
          >
            Gojo
          </span>
        </button>

        {/* Card */}
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8">
          {/* Heading */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
            <p className="text-sm text-gray-500 mt-1">Join our community of hosts and guests.</p>
          </div>

          {/* Role toggle */}
          <div
            className="flex rounded-full overflow-hidden border border-gray-200 mb-5"
            role="group"
            aria-label="Account type"
          >
            <button
              type="button"
              onClick={() => setFormData((p) => ({ ...p, role: "tenant" }))}
              className="flex-1 py-2 text-sm font-semibold transition-colors"
              style={
                formData.role === "tenant"
                  ? { background: CORAL, color: "white" }
                  : { background: "white", color: "#6B7280" }
              }
            >
              I am a Tenant
            </button>
            <button
              type="button"
              onClick={() => setFormData((p) => ({ ...p, role: "owner" }))}
              className="flex-1 py-2 text-sm font-semibold transition-colors"
              style={
                formData.role === "owner"
                  ? { background: CORAL, color: "white" }
                  : { background: "white", color: "#6B7280" }
              }
            >
              I am an Owner
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={set("name")}
                placeholder="Abebe Bikila"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition"
                style={{ "--tw-ring-color": CORAL + "66" }}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={set("email")}
                placeholder="abebe@example.com"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden focus-within:ring-2 transition"
                style={{ "--tw-ring-color": CORAL + "66" }}>
                <span className="px-3 py-2.5 bg-gray-50 text-sm font-medium text-gray-600 border-r border-gray-200 shrink-0">
                  +251
                </span>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={set("phone")}
                  placeholder="911 234 567"
                  className="flex-1 px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none bg-white"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={set("password")}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-10 rounded-lg border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Must be at least 8 characters.</p>
            </div>

            {/* Terms */}
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-[#E67E5F]"
              />
              <span className="text-sm text-gray-600">
                I agree to the{" "}
                <a href="#terms" style={{ color: CORAL }} className="hover:underline">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="#privacy" style={{ color: CORAL }} className="hover:underline">
                  Privacy Policy
                </a>
              </span>
            </label>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full py-3 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: CORAL }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : "Create Account"}
            </button>

            {/* Divider */}
            <div className="relative my-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs text-gray-400">Or continue with</span>
              </div>
            </div>

            {/* Google */}
            <GoogleAuthButton
              mode="signup"
              onCredential={handleGoogleCredential}
              disabled={loading || googleLoading}
            />

            {/* Switch to login */}
            <p className="text-sm text-center text-gray-500">
              Already have an account?{" "}
              <Link to="/login" style={{ color: CORAL }} className="font-semibold hover:underline">
                Log in
              </Link>
            </p>
          </form>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={() => navigate("/")}
            className="text-lg font-bold tracking-tight"
            style={{ color: CORAL }}
          >
            Gojo
          </button>
          <p className="text-xs text-gray-400 text-center">
            © 2024 Gojo Inc. Supports Chapa &amp; Stripe
          </p>
          <nav className="flex items-center gap-5 text-sm text-gray-500">
            <a href="#support" className="hover:text-gray-800 transition-colors">Support</a>
            <a href="#community" className="hover:text-gray-800 transition-colors">Community</a>
            <button onClick={() => navigate("/owner/dashboard")} className="hover:text-gray-800 transition-colors">Hosting</button>
            <a href="#about" className="hover:text-gray-800 transition-colors">About</a>
          </nav>
        </div>
      </footer>
    </div>
  );
};

export default Register;
