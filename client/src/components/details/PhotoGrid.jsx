import React from "react";
import { getImageUrl } from "../../utils/imageUtils";

/**
 * PhotoGrid Component
 * Restyled for cinematic "Aura" luxury theme.
 */
const PhotoGrid = ({ images }) => {
  const fallback =
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=1200";

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-4 h-[600px] mb-20 rounded-[3rem] overflow-hidden border border-[#d4af37]/10 shadow-[0_0_50px_rgba(0,0,0,1)] group/grid">
      {/* Main Perspective */}
      <div className="md:col-span-2 md:row-span-2 relative overflow-hidden">
        <img
          src={getImageUrl(images?.[0]?.url || images?.[0] || fallback)}
          className="w-full h-full object-cover group-hover/grid:scale-105 transition-transform duration-[2000ms] ease-out cursor-pointer brightness-[0.85] hover:brightness-100 transition-all"
          alt="Main Property View"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0a0a0a]/40 to-transparent pointer-events-none" />
      </div>

      {/* Additional Perspectives */}
      {images?.slice(1, 5).map((img, idx) => (
        <div key={idx} className="hidden md:block relative overflow-hidden group">
          <img
            src={getImageUrl(img.url || img)}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out cursor-pointer brightness-[0.6] hover:brightness-100 transition-all opacity-80 hover:opacity-100"
            alt={`Property angle ${idx + 2}`}
          />
          <div className="absolute inset-0 bg-[#d4af37]/5 mix-blend-overlay opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        </div>
      ))}
      
      {/* Decorative Branding Element */}
      <div className="absolute bottom-6 right-8 pointer-events-none z-10 opacity-0 group-hover/grid:opacity-100 transition-opacity duration-700">
         <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.5em]">SMART RENTAL SYSTEM</p>
      </div>
    </div>
  );
};

export default PhotoGrid;
