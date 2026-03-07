import React, { useEffect, useCallback } from "react";
import { X, MapPin, Navigation } from "lucide-react";

/**
 * PropertyMapModal Component
 * Restyled for luxury dark theme.
 */
const PropertyMapModal = ({ isOpen, onClose, location }) => {
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const coords = location?.coordinates?.coordinates;
  let mapSrc = "";

  if (coords && coords.length === 2 && coords[0] !== 0 && coords[1] !== 0) {
    const [lng, lat] = coords;
    mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`;
  } else {
    const addressParts = [
      location?.address,
      location?.city,
      location?.state,
      location?.country,
    ].filter(Boolean);
    const query = encodeURIComponent(addressParts.join(", "));
    if (addressParts.length > 0) {
      mapSrc = `https://maps.google.com/maps?q=${query}&t=&z=15&ie=UTF8&iwloc=&output=embed&invert_colors=true`;
    } else {
       mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=38.7,8.9,38.85,9.1&layer=mapnik`;
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-6"
      style={{ animation: "fadeIn 0.4s ease-out" }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#0a0a0a]/90 backdrop-blur-xl"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className="relative bg-[#111] border border-[#d4af37]/20 rounded-[3rem] shadow-[0_0_80px_rgba(0,0,0,1)] w-full max-w-5xl overflow-hidden"
        style={{ animation: "scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b border-[#d4af37]/10 bg-[#0a0a0a]/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#d4af37]/10 rounded-xl flex items-center justify-center text-[#d4af37]">
                <Navigation size={22} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-2xl text-[#f8f6f3]" style={{ fontFamily: "'Playfair Display', serif" }}>
                Property Location
              </h3>
              <p className="text-[10px] text-[#9a9a9a] font-black uppercase tracking-[0.3em]">Interactive Map View</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-4 bg-white/5 hover:bg-red-500/10 hover:text-red-500 rounded-2xl transition-all border border-white/5 active:scale-95"
          >
            <X size={22} />
          </button>
        </div>

        {/* Address Bar */}
        <div className="px-8 py-5 bg-[#d4af37]/5 border-b border-[#d4af37]/10">
          <div className="flex items-center gap-3">
             <MapPin size={14} className="text-[#d4af37]" />
             <p className="text-[11px] text-[#f8f6f3] font-bold uppercase tracking-widest truncate">
               {[
                 location?.address,
                 location?.city,
                 location?.state,
                 location?.country,
               ]
                 .filter(Boolean)
                 .join(" — ")}
             </p>
          </div>
        </div>

        {/* Map View */}
        <div className="relative w-full h-[600px] bg-[#0a0a0a]">
          <iframe
            title="Property Location Map"
            src={mapSrc}
            width="100%"
            height="100%"
            style={{ border: 0, filter: "grayscale(1) invert(0.92) contrast(1.2) brightness(0.9)" }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          {/* Decorative Corner Framing */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#d4af37]/20 rounded-tl-xl pointer-events-none" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#d4af37]/20 rounded-tr-xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#d4af37]/20 rounded-bl-xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#d4af37]/20 rounded-br-xl pointer-events-none" />
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default PropertyMapModal;
