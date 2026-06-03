import React, { useState } from "react";

const CORAL = "#E67E5F";

export const RevenueChart = ({ data = [], loading = false }) => {
  const [timeRange, setTimeRange] = useState("6m");
  const maxVal = data.length ? Math.max(...data.map((d) => d.value), 1) : 1;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-base font-bold text-gray-900">Wealth Analytics</h3>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mt-0.5">
            Accumulated Capital Trajectory
          </p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-600 focus:outline-none"
        >
          <option value="6m">Last 6 months</option>
          <option value="1y">Annual</option>
        </select>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: CORAL, borderTopColor: "transparent" }} />
        </div>
      ) : (
        <div className="flex-1 flex items-end gap-3 pb-6 relative min-h-[160px]">
          {/* Horizontal grid lines */}
          <div className="absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between pointer-events-none">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-full border-t border-gray-100" />
            ))}
          </div>

          {data.map((item, i) => {
            const pct = Math.max((item.value / maxVal) * 100, 4);
            const isLast = i === data.length - 1;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative justify-end h-full">
                {/* Tooltip */}
                <div className="absolute bottom-[calc(100%+4px)] left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-gray-800 text-white text-[10px] font-semibold px-2 py-1 rounded-md whitespace-nowrap z-10">
                  ETB {item.value.toLocaleString()}
                </div>

                {/* Bar */}
                <div
                  className="w-full max-w-[36px] rounded-t-lg transition-all duration-500"
                  style={{
                    height: `${pct}%`,
                    background: isLast ? CORAL : "#D1D5DB",
                    opacity: isLast ? 1 : 0.7,
                  }}
                />

                {/* Label */}
                <span className="text-[10px] font-semibold text-gray-400 uppercase absolute bottom-0">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
