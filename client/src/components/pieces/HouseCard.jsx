import React from "react";
import { SmartMatchBadge, VerifiedBadge, FairPriceBadge } from "./Badges";
import { Star, MapPin, Heart, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getImageUrl } from "../../utils/imageUtils";

/**
 * HouseCard Component
 * Restyled for luxury dark theme with premium "Aura" aesthetic.
 */
export const HouseCard = ({ house, isSaved = false, onToggleSave }) => {
  const navigate = useNavigate();
  const isVerified =
    typeof house.verified === "boolean" ? house.verified : !!house.verified?.status;
  const views = Number(house.views || house.viewCount || 0);

  return (
    <div
      className="group cursor-pointer bg-[#111] rounded-[2rem] overflow-hidden border border-[#d4af37]/5 hover:border-[#d4af37]/30 transition-all duration-700 shadow-2xl animate-in fade-in slide-in-from-bottom-4"
      onClick={() => navigate(`/details/${house.id || house._id}`)}
    >
      {/* Visual Asset Container */}
      <div className="relative aspect-[4/5] overflow-hidden">
        <img
          src={
            getImageUrl(house.image) ||
            "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&q=80&w=800"
          }
          alt={house.title}
          className="w-full h-full object-cover group-hover:scale-115 transition-transform duration-1000"
        />
        
        {/* Cinematic Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-[#0a0a0a]/40 opacity-80 group-hover:opacity-60 transition-opacity duration-700" />
        <div className="absolute inset-0 bg-[#d4af37]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

        {/* Intelligence Badges */}
        <div className="absolute top-6 left-6 flex flex-col gap-2.5 z-10 translate-y-0 group-hover:-translate-y-1 transition-transform duration-700">
          {isVerified && <VerifiedBadge />}
          {house.match && <SmartMatchBadge percentage={house.match} />}
        </div>

        {/* Interaction Node: Save */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onToggleSave) {
              onToggleSave(house.id || house._id);
            }
          }}
          aria-pressed={isSaved}
          className={`absolute top-6 right-6 p-3 backdrop-blur-xl border rounded-[1rem] shadow-2xl transition-all duration-500 z-10 flex items-center justify-center hover:scale-110 active:scale-95 ${
            isSaved 
              ? "bg-red-500/20 border-red-500/40 text-red-500 shadow-red-500/20" 
              : "bg-[#0a0a0a]/40 border-[#d4af37]/10 text-[#d4af37]/60 hover:text-[#d4af37] hover:border-[#d4af37]/40"
          }`}
        >
          <Heart size={18} fill={isSaved ? "currentColor" : "none"} className="transition-all duration-500" />
        </button>

        {/* Property Specs Overlay */}
        <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between z-10 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 delay-75">
           <div className="flex items-center gap-4 text-[10px] font-black text-[#f8f6f3] uppercase tracking-[0.2em] bg-[#0a0a0a]/60 backdrop-blur-md px-4 py-2.5 rounded-xl border border-[#d4af37]/10">
              <span className="flex items-center gap-1.5"><Eye size={12} className="text-[#d4af37]" /> {views}</span>
              <div className="w-px h-3 bg-[#d4af37]/20" />
              <span>{house.sqft} SQFT</span>
           </div>
        </div>
      </div>

      {/* Intelligence Data Section */}
      <div className="p-8 space-y-5">
        <div className="flex justify-between items-start gap-4">
          <div className="min-w-0">
            <h3 className="text-2xl font-bold text-[#f8f6f3] group-hover:text-[#d4af37] transition-colors truncate mb-2 leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              {house.title}
            </h3>
            <div className="flex items-center gap-2 text-[#9a9a9a] text-[10px] font-black uppercase tracking-[0.2em]">
              <MapPin size={12} className="text-[#d4af37]/60" />
              <span className="truncate">{house.location}</span>
            </div>
          </div>
          <div className="flex flex-col items-end shrink-0">
             <div className="flex items-center gap-1.5 bg-[#d4af37]/10 px-2 py-1 rounded-lg border border-[#d4af37]/10">
                <Star size={14} className="fill-amber-500 text-amber-500" />
                <span className="text-xs font-black text-[#f8f6f3]">{house.rating?.toFixed(1) || "New"}</span>
             </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-[#d4af37]/10">
          <div className="flex flex-col">
            <span className="text-[10px] text-[#9a9a9a]/40 font-black uppercase tracking-[0.3em] mb-1">Rent Price</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-[#d4af37]" style={{ fontFamily: "'Playfair Display', serif" }}>
                ETB {house.price.toLocaleString()}
              </span>
              <span className="text-[10px] text-[#9a9a9a] font-bold uppercase tracking-widest">/ Month</span>
            </div>
          </div>
          {house.isFair && <FairPriceBadge />}
        </div>
        
        {/* Subtle Bed count and additional info */}
        <div className="flex items-center gap-3 text-[10px] text-[#9a9a9a] font-bold uppercase tracking-[0.1em] opacity-40 group-hover:opacity-100 transition-opacity duration-700">
           <span>{house.beds} Beds</span>
           
        </div>
      </div>
    </div>
  );
};
