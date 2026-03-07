import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import LoadingSpinner from "../ui/LoadingSpinner";
import { ShieldAlert, Home } from "lucide-react";

/**
 * Protected Route Component
 * Wraps routes that require authentication and/or specific roles
 * Restyled for luxury dark theme.
 */

const ProtectedRoute = ({ children, roles = [], redirectTo = "/login" }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center animate-pulse">
          <LoadingSpinner size="lg" />
          <p className="mt-6 text-[#9a9a9a] text-[10px] uppercase font-bold tracking-[0.2em]">Verifying Authorization...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (roles.length > 0 && !roles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="max-w-md w-full bg-[#111] border border-[#d4af37]/10 rounded-2xl shadow-2xl p-10 text-center animate-in fade-in zoom-in duration-500">
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-500/10 border border-red-500/20 mb-8">
            <ShieldAlert className="h-10 w-10 text-red-500" />
          </div>
          <h2 className="text-3xl text-[#f8f6f3] mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
            Classification Error
          </h2>
          <p className="text-[#9a9a9a] mb-10 leading-relaxed text-sm">
            Access denied. Your current clearance level is insufficient to access this secure intelligence vector.
          </p>
          <button
            onClick={() => window.history.back()}
            className="w-full px-8 py-3 bg-[#d4af37] text-[#0a0a0a] text-xs font-bold uppercase tracking-widest hover:bg-[#b8941f] transition-all flex items-center justify-center gap-2"
          >
            Withdraw to Safety
          </button>
          <button
            onClick={() => (window.location.href = "/")}
            className="w-full mt-4 px-8 py-3 bg-transparent border border-[#d4af37]/20 text-[#d4af37] text-xs font-bold uppercase tracking-widest hover:bg-[#d4af37]/5 transition-all"
          >
            Return to Command Center
          </button>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
