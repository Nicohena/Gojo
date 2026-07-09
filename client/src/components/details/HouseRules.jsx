import React from "react";
import { PawPrint, Cigarette, Users, ShieldAlert } from "lucide-react";

/**
 * RuleCard Component
 * Refined for luxury dark theme.
 */
const RuleCard = ({ icon: Icon, allowed, label, value }) => {
  return (
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 flex items-center justify-center border rounded-xl ${
        allowed === true ? "text-emerald-600 border-emerald-200 bg-emerald-50" :
        allowed === false ? "text-red-600 border-red-200 bg-red-50" :
        "text-slate-900 border-slate-200 bg-slate-50"
      }`}>
        <Icon size={24} />
      </div>
      <div>
        <p className={`text-sm font-semibold tracking-tight ${
          allowed === true ? "text-emerald-700" :
          allowed === false ? "text-red-700" :
          "text-slate-900"
        }`}>
          {value}
        </p>
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
      </div>
    </div>
  );
};

/**
 * HouseRules Component
 * Overhauled for clean light theme consistency.
 */
const HouseRules = ({ rules }) => {
  if (!rules) return null;

  return (
    <div>
      <h3 className="text-[1.375rem] font-semibold text-slate-900 mb-6">
        House Rules
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
