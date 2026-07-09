import React from "react";
import { MessageSquare, Star, ShieldCheck } from "lucide-react";
import { getImageUrl } from "../../utils/imageUtils";
import VerifiedOwnerBadge from "../ui/VerifiedOwnerBadge";

/**
 * HostSection Component
 * Restyled for luxury dark theme.
 */
const HostSection = ({ owner, onStartChat }) => {
  const fallbackAvatar =
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100";

  return (
    <div className="py-2 flex flex-col md:flex-row items-start justify-between gap-6">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full overflow-hidden relative shrink-0">
          <img
            src={getImageUrl(owner?.avatar || fallbackAvatar)}
            alt="Host"
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h4 className="text-[1.375rem] font-semibold text-slate-900 mb-1">
            Hosted by {owner?.name}
          </h4>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            {owner?.isVerifiedOwner && (
              <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                <ShieldCheck size={16} />
                <span>Superhost</span>
              </div>
            )}
            {owner?.isVerifiedOwner && <div className="w-1 h-1 rounded-full bg-slate-400" />}
            <div className="flex items-center gap-1.5">
               <Star size={16} className="text-slate-900 fill-slate-900" />
               <span className="font-semibold text-slate-900">{owner?.rating?.average || "New"}</span>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onStartChat}
        className="px-6 py-3 border border-slate-900 text-slate-900 font-semibold rounded-lg flex items-center gap-2 hover:bg-slate-50 transition-all active:scale-95 whitespace-nowrap"
      >
        <MessageSquare size={18} />
        <span>Message Host</span>
      </button>
    </div>
  );
};

export default HostSection;
