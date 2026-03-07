import React from "react";
import { PawPrint, Cigarette, Users, ShieldAlert } from "lucide-react";

/**
 * RuleCard Component
 * Refined for luxury dark theme.
 */
const RuleCard = ({ icon: Icon, allowed, label, value }) => {
  return (
    <div className="flex items-center gap-6 p-8 bg-[#111] border border-[#d4af37]/5 rounded-[2.5rem] hover:border-[#d4af37]/20 transition-all group shadow-2xl">
      <div
        className={`w-16 h-16 rounded-2xl flex items-center justify-center border transition-all duration-500 ${
          allowed === true
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/20 group-hover:scale-110"
            : allowed === false
              ? "bg-red-500/10 border-red-500/20 text-red-500 group-hover:bg-red-500/20 group-hover:scale-110"
              : "bg-white/5 border-white/10 text-[#9a9a9a] group-hover:bg-[#d4af37]/10 group-hover:text-[#d4af37] group-hover:scale-110"
        }`}
      >
        <Icon size={28} />
      </div>
      <div>
        <p className="text-[10px] font-black text-[#9a9a9a]/40 uppercase tracking-[0.3em] mb-1">{label}</p>
        <p
          className={`text-xl font-bold tracking-tight ${
            allowed === true
              ? "text-emerald-400"
              : allowed === false
                ? "text-red-500"
                : "text-[#f8f6f3]"
          }`}
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {value}
        </p>
      </div>
    </div>
  );
};

/**
 * HouseRules Component
 * Overhauled for luxury dark theme consistency.
 */
const HouseRules = ({ rules }) => {
  if (!rules) return null;

  return (
    <div className="pt-24 border-t border-[#d4af37]/10">
      <div className="flex items-center gap-4 mb-20 px-2">
         <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20">
            <ShieldAlert size={28} className="text-red-500 animate-pulse" />
         </div>
         <div>
            <h3 className="text-4xl text-[#f8f6f3] tracking-tighter" style={{ fontFamily: "'Playfair Display', serif" }}>
              House Rules
            </h3>
            <p className="text-[10px] text-[#9a9a9a] uppercase font-bold tracking-[0.3em] mt-1">
               General rules and stay restrictions
            </p>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        <RuleCard
          icon={PawPrint}
          allowed={rules.petsAllowed}
          label="Pets"
          value={rules.petsAllowed ? "Allowed" : "Not Allowed"}
        />
        <RuleCard
          icon={Cigarette}
          allowed={rules.smokingAllowed}
          label="Smoking"
          value={rules.smokingAllowed ? "Allowed" : "Not Allowed"}
        />
        <RuleCard
          icon={Users}
          allowed={null}
          label="Occupancy Limit"
          value={
            rules.maxOccupants
              ? `${rules.maxOccupants} Guests`
              : "Unrestricted"
          }
        />
      </div>
    </div>
  );
};

export default HouseRules;
