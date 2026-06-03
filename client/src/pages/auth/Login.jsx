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

const Login = () => {
  const navigate = useNavigate();
  const { login, googleAuth } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => setFormData((p) => ({ ...p, [key]: e.target.value }));

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
            <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
            <p className="text-sm text-gray-500 mt-1">Sign in to your Gojo account.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium hover:underline"
                  style={{ color: CORAL }}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
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
            </div>

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
              {loading ? <Loader2 size={18} className="animate-spin" /> : "Log in"}
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
              mode="login"
              onCredential={handleGoogleCredential}
              disabled={loading || googleLoading}
            />

            {/* Switch to register */}
            <p className="text-sm text-center text-gray-500">
              Don't have an account?{" "}
              <Link
                to="/register"
                style={{ color: CORAL }}
                className="font-semibold hover:underline"
              >
                Sign up
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

export default Login;
