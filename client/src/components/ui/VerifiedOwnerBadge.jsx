import React from "react";
import { BadgeCheck } from "lucide-react";

const VerifiedOwnerBadge = ({ className = "" }) => {
  return (
    <span
      title="Verified Owner"
      aria-label="Verified Owner"
      className={`inline-flex items-center gap-1 rounded-full border border-blue-400/40 bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-300 ${className}`}
    >
      <BadgeCheck size={12} className="text-blue-300" />
      <span>Verified Owner</span>
    </span>
  );
};

export default VerifiedOwnerBadge;
