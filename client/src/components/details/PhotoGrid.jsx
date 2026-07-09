import React from "react";
import { getImageUrl } from "../../utils/imageUtils";

/**
 * PhotoGrid Component
 * Restyled for a clean, modern, Airbnb-style layout.
 */
const PhotoGrid = ({ images }) => {
  const fallback =
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=1200";

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-2 h-[400px] md:h-[500px] mb-10 rounded-2xl overflow-hidden">
      <div className="md:col-span-2 md:row-span-2 relative overflow-hidden bg-gray-200 group cursor-pointer">
        <img
          src={getImageUrl(images?.[0]?.url || images?.[0] || fallback)}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          alt="Main Property View"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
      </div>

      {images?.slice(1, 5).map((img, idx) => (
        <div key={idx} className="hidden md:block relative overflow-hidden bg-gray-200 group cursor-pointer">
          <img
            src={getImageUrl(img.url || img)}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            alt={`Property angle ${idx + 2}`}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
        </div>
      ))}
    </div>
  );
};

export default PhotoGrid;
