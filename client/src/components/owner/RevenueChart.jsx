import React, { useState } from "react";

/**
 * Revenue Chart Component
 * Restyled for luxury dark theme.
 */

export const RevenueChart = ({ data, loading }) => {
  const [timeRange, setTimeRange] = useState("6m");

  const maxValue = data?.length ? Math.max(...data.map((d) => d.value)) : 10000;

  return (
    <div className="bg-[#111] rounded-2xl border border-[#d4af37]/5 p-8 shadow-2xl h-full flex flex-col hover:border-[#d4af37]/20 transition-all duration-500">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h3 className="text-xl font-bold text-[#f8f6f3]" style={{ fontFamily: "'Playfair Display', serif" }}>Wealth Analytics</h3>
          <p className="text-[9px] text-[#9a9a9a] font-bold uppercase tracking-widest mt-1">Accumulated Capital Trajectory</p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="text-[10px] font-black uppercase tracking-widest bg-[#0a0a0a] border border-[#d4af37]/10 rounded-xl px-4 py-2 text-[#d4af37] outline-none focus:border-[#d4af37]/40 transition-all cursor-pointer shadow-inner"
        >
          <option value="6m">Last 6 Iterations</option>
          <option value="1y">Annual Cycle</option>
        </select>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#d4af37] border-t-transparent shadow-[0_0_15px_rgba(212,175,55,0.2)]"></div>
        </div>
      ) : (
        <div className="flex-1 flex items-end justify-between gap-3 md:gap-6 relative px-4 pb-10">
          {/* Vertical Grid lines - sophisticated look */}
          <div className="absolute inset-x-0 bottom-10 top-0 flex flex-col justify-between pointer-events-none -z-10 h-full">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-full border-t border-[#d4af37]/10 h-0" />
            ))}
          </div>

          {data.map((item, index) => {
            const heightPercentage = Math.max(
              (item.value / maxValue) * 100,
              6,
            );

            return (
              <div
                key={index}
                className="flex-1 flex flex-col items-center gap-4 group cursor-pointer h-full justify-end relative"
              >
                {/* Tooltip on hover */}
                <div className="opacity-0 group-hover:opacity-100 absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 bg-[#d4af37] text-[#0a0a0a] text-[10px] font-black py-2 px-3 rounded-lg transition-all duration-300 pointer-events-none whitespace-nowrap z-20 shadow-xl scale-90 group-hover:scale-100 uppercase tracking-widest">
                  ETB {item.value.toLocaleString()}
                </div>

                {/* Bar */}
                <div
                  className={`w-full max-w-[45px] rounded-t-lg transition-all duration-700 relative overflow-hidden group-hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] ${
                    index === data.length - 1 
                      ? "bg-gradient-to-t from-[#d4af37] to-[#f8f6f3]/40 shadow-lg shadow-[#d4af37]/20" 
                      : "bg-[#2a2a2a] group-hover:bg-[#333] border border-[#d4af37]/15"
                  }`}
                  style={{ height: `${heightPercentage}%` }}
                >
                   {/* Scanning animation on hover for current bar */}
                   {index === data.length - 1 && (
                     <div className="absolute inset-0 bg-white/10 animate-pulse" />
                   )}
                </div>

                {/* Label */}
                <span className="text-[10px] font-black text-[#9a9a9a]/60 uppercase tracking-widest absolute bottom-0">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-4 text-[9px] text-center text-[#9a9a9a]/20 uppercase font-black tracking-[0.4em]">Secure Analytic Ledger Matrix 4.0</div>
    </div>
  );
};
