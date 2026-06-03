import React, { useState } from "react";
import { Star, MapPin, Heart, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getImageUrl } from "../../utils/imageUtils";

const CORAL = "#E67E5F";

export const HouseCard = ({ house, isSaved = false, onToggleSave }) => {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(isSaved);
  const isVerified = house.verified?.status || house.verified === true;

  const handleSave = (e) => {
    e.stopPropagation();
    setLiked((v) => !v);
    onToggleSave?.(house.id || house._id);
  };

  return (
    <div
      className="cursor-pointer group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300"
      onClick={() => navigate(`/details/${house.id || house._id}`)}
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden bg-gray-100">
        <img
          src={getImageUrl(house.image) || "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=600&q=80"}
          alt={house.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Verified badge */}
        {isVerified && (
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: CORAL }} />
            Verified
          </div>
        )}

        {/* Smart match */}
        {house.match && (
          <div className="absolute top-3 left-3 mt-6">
            <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {house.match}% Match
            </span>
          </div>
        )}

        {/* Heart */}
        <button
          type="button"
          className="absolute top-3 right-3 p-1.5 transition-transform hover:scale-110"
          onClick={handleSave}
          aria-label="Save property"
          aria-pressed={liked}
        >
          <Heart
            size={18}
            fill={liked ? CORAL : "none"}
            stroke={liked ? CORAL : "white"}
            strokeWidth={2}
          />
        </button>

        {/* Views */}
        {house.views > 0 && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-black/40 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
            <Eye size={10} />
            {house.views}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-gray-900 text-sm truncate">{house.title}</h3>
          <div className="flex items-center gap-0.5 shrink-0">
            <Star size={12} fill="#111" stroke="none" />
            <span className="text-xs font-semibold text-gray-800">{house.rating?.toFixed(1) || "New"}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-gray-500 text-xs mb-3">
          <MapPin size={11} />
          <span className="truncate">{house.location}</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-bold text-gray-900">ETB {house.price?.toLocaleString()}</span>
            <span className="text-xs text-gray-400"> / mo</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>{house.beds} beds</span>
            {house.isFair && (
              <span className="bg-green-100 text-green-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                Fair Price
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
