import React from "react";
import { MessageSquare, Star, ShieldCheck } from "lucide-react";
import { getImageUrl } from "../../utils/imageUtils";

/**
 * HostSection Component
 * Restyled for luxury dark theme.
 */
const HostSection = ({ owner, onStartChat }) => {
  const fallbackAvatar =
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100";

  return (
    <div className="p-10 bg-[#111] border border-[#d4af37]/10 rounded-[3rem] flex flex-col md:flex-row items-center justify-between gap-10 shadow-2xl relative overflow-hidden group">
      {/* Aesthetic Decoration */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#d4af37]/5 rounded-full blur-[80px] pointer-events-none" />
      
      <div className="flex items-center gap-6 relative z-10">
        <div className="relative">
           <div className="absolute inset-0 bg-[#d4af37]/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
           <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#d4af37]/20 relative z-10">
             <img
               src={getImageUrl(owner?.avatar || fallbackAvatar)}
               alt="Host"
               className="w-full h-full object-cover transition-transform group-hover:scale-110"
             />
           </div>
           <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-4 h-4 rounded-full border-4 border-[#111] z-20" title="Host Online" />
        </div>
        <div>
          <h4 className="text-xl font-bold text-[#f8f6f3] mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
            Host: {owner?.name}
          </h4>
          <div className="flex items-center gap-3 text-[9px] font-black text-[#9a9a9a] uppercase tracking-widest">
            <div className="flex items-center gap-1.5 text-amber-500">
               <Star size={10} className="fill-current" />
               <span>Host Rating: {owner?.rating?.average || "New"}</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-white/20" />
            <div className="flex items-center gap-1.5 text-emerald-400">
               <ShieldCheck size={10} />
               <span>Verified Host</span>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onStartChat}
        className="relative z-10 px-10 py-4 bg-[#d4af37] text-[#0a0a0a] text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl flex items-center gap-3 hover:bg-[#b8941f] hover:shadow-xl hover:shadow-[#d4af37]/20 transition-all active:scale-95 group/btn"
      >
        <MessageSquare size={16} className="group-hover/btn:rotate-12 transition-transform" />
        <span>Message Host</span>
      </button>
    </div>
  );
};

export default HostSection;
