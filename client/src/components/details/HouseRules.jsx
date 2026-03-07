import React from "react";
import { PawPrint, Cigarette, Users, Check, X } from "lucide-react";

const RuleCard = ({ icon: Icon, allowed, label, value }) => {
  const isNeutral = allowed === null || allowed === undefined;
  
  return (
    <div className="flex items-center gap-5 p-6 bg-[#111] border border-[#d4af37]/5 rounded-xl hover:border-[#d4af37]/20 transition-all group">
      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center border ${
          allowed === true
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            : allowed === false
              ? "bg-red-500/10 border-red-500/20 text-red-400"
              : "bg-[#d4af37]/10 border-[#d4af37]/20 text-[#d4af37]"
        }`}
      >
        <Icon size={24} className="group-hover:scale-110 transition-transform" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-[#d4af37]/50 uppercase tracking-widest mb-1">{label}</p>
        <p
          className={`text-lg font-bold ${
            allowed === true
              ? "text-emerald-400"
              : allowed === false
                ? "text-red-400"
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

const HouseRules = ({ rules }) => {
  if (!rules) return null;

  return (
    <div className="pt-16 border-t border-[#d4af37]/10">
      <h3 className="text-2xl text-[#f8f6f3] mb-10" style={{ fontFamily: "'Playfair Display', serif" }}>
        Conduct & Protocols
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <RuleCard
          icon={PawPrint}
          allowed={rules.petsAllowed}
          label="Animal Companions"
          value={rules.petsAllowed ? "Permitted" : "Prohibited"}
        />
        <RuleCard
          icon={Cigarette}
          allowed={rules.smokingAllowed}
          label="Combustion (Smoking)"
          value={rules.smokingAllowed ? "Permitted" : "Prohibited"}
        />
        <RuleCard
          icon={Users}
          allowed={null}
          label="Occupancy Limit"
          value={
            rules.maxOccupants
              ? `${rules.maxOccupants} Individuals`
              : "Undisclosed"
          }
        />
      </div>
    </div>
  );
};

export default HouseRules;
