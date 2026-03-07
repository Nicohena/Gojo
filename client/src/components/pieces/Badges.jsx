import React from "react";
import { CheckCircle, ShieldCheck, TrendingUp, Sparkles } from "lucide-react";

/**
 * Verified Badge Component
 * Restyled for luxury dark theme.
 */
export const VerifiedBadge = () => (
  <div className="inline-flex items-center gap-1.5 bg-[#d4af37] px-2.5 py-1 rounded-lg shadow-[0_0_15px_rgba(212,175,55,0.3)] border border-[#f8f6f3]/20">
    <ShieldCheck size={12} className="text-[#0a0a0a]" />
    <span className="text-[9px] font-black text-[#0a0a0a] tracking-[0.1em] uppercase">
      Verified
    </span>
  </div>
);

/**
 * Smart Match Badge Component
 * Restyled for luxury dark theme.
 */
export const SmartMatchBadge = ({ percentage }) => (
  <div className="inline-flex items-center gap-1.5 bg-[#0a0a0a]/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-[#d4af37]/40 shadow-xl">
    <Sparkles size={12} className="text-[#d4af37]" />
    <span className="text-[9px] font-black text-[#d4af37] tracking-[0.1em] uppercase">
      {percentage}% Match
    </span>
  </div>
);

/**
 * Fair Price Badge Component
 * Restyled for luxury dark theme.
 */
export const FairPriceBadge = () => (
  <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
    <TrendingUp size={12} className="text-emerald-400" />
    <span className="text-[9px] font-black text-emerald-400 tracking-[0.1em] uppercase">Fair Price</span>
  </div>
);
