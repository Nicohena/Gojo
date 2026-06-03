import React from "react";
import { TrendingUp, TrendingDown, CheckCircle } from "lucide-react";

const CORAL = "#E67E5F";

const ICON_STYLES = {
  coral:  { bg: "#FEF0EC", color: CORAL },
  amber:  { bg: "#FFFBEB", color: "#F59E0B" },
  blue:   { bg: "#EFF6FF", color: "#3B82F6" },
  purple: { bg: "#F5F3FF", color: "#8B5CF6" },
  green:  { bg: "#F0FDF4", color: "#22C55E" },
};

export const StatCard = ({ icon: Icon, label, value, trend, trendValue, color = "coral" }) => {
  const style = ICON_STYLES[color] || ICON_STYLES.coral;
  const isUp      = trend === "up";
  const isNeutral = trend === "neutral";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
      {/* Top row */}
      <div className="flex items-start justify-between mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: style.bg }}>
          <Icon size={18} style={{ color: style.color }} />
        </div>
      </div>

      {/* Value */}
      <p className="text-3xl font-bold text-gray-900">{value}</p>

      {/* Trend */}
      {trendValue && (
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-50">
          {isNeutral ? (
            <CheckCircle size={13} className="text-green-500" />
          ) : isUp ? (
            <TrendingUp size={13} className="text-green-500" />
          ) : (
            <TrendingDown size={13} className="text-red-400" />
          )}
          <span className={`text-xs font-semibold ${isNeutral ? "text-green-600" : isUp ? "text-green-600" : "text-red-500"}`}>
            {trendValue}
          </span>
          {!isNeutral && <span className="text-xs text-gray-400">vs last cycle</span>}
        </div>
      )}
    </div>
  );
};
