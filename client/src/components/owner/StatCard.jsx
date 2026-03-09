import React from "react";
import { ArrowUp, ArrowDown } from "lucide-react";

/**
 * Stat Card Component
 * Restyled for luxury dark theme.
 */

export const StatCard = ({
  icon: Icon,
  label,
  value,
  trend,
  trendValue,
  color = "primary",
}) => {
  const isPositive = trend === "up";

  const colorClasses = {
    primary: "bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/20",
    blue: "bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/20", // Replaced blue with gold
    orange: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
    purple: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  };

  return (
    <div className="bg-[#111] rounded-2xl border border-[#d4af37]/5 p-8 flex flex-col justify-between h-full shadow-2xl hover:border-[#d4af37]/30 transition-all duration-500 group relative overflow-hidden">
      {/* Subtle Background Icon Decoration */}
      <div className="absolute right-[-10%] bottom-[-10%] opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-700 pointer-events-none">
         <Icon size={120} className="text-white" />
      </div>
      
      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="text-[#9a9a9a] text-[10px] font-bold uppercase tracking-[0.2em] mb-2">
            {label}
          </p>
          <h3 className="text-3xl font-bold text-[#f8f6f3] tracking-tight group-hover:text-[#d4af37] transition-colors" style={{ fontFamily: "'Playfair Display', serif" }}>
            {value}
          </h3>
        </div>
        <div className={`p-4 rounded-xl shadow-lg transition-transform duration-500 group-hover:scale-110 ${colorClasses[color]}`}>
          <Icon size={24} />
        </div>
      </div>

      {trendValue && (
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest pt-6 border-t border-[#d4af37]/5 mt-4">
          <span
            className={`flex items-center gap-1 bg-[#1a1a1a] px-2 py-0.5 rounded-full ${
              isPositive ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {isPositive ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
            {trendValue}
          </span>
          <span className="text-[#9a9a9a]/40">Comparative Cycle</span>
        </div>
      )}
    </div>
  );
};
