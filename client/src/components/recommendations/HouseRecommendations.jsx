import React, { useState, useEffect } from "react";
import recommendationService from "../../api/recommendationService";
import { Link } from "react-router-dom";
import { getImageUrl } from "../../utils/imageUtils";

const HouseRecommendations = ({ userId, houseId, type = "personalized" }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, [userId, houseId, type]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      let data = [];
      if (type === "similar" && houseId) {
        data = await recommendationService.getSimilarHouses(houseId);
      } else if (userId) {
        data = await recommendationService.getRecommendations(userId);
      }
      setRecommendations(data.slice(0, 4)); // Show top 4
    } catch (err) {
      console.error("Failed to fetch recommendations", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="py-12 text-center">
        <div className="w-8 h-8 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <span className="text-[10px] text-[#9a9a9a] uppercase tracking-widest font-bold">Curating Recommendations...</span>
      </div>
    );
    
  if (recommendations.length === 0) return null;

  return (
    <div className="py-16 border-t border-[#d4af37]/10">
      <h2 className="text-3xl text-[#f8f6f3] mb-10" style={{ fontFamily: "'Playfair Display', serif" }}>
        {type === "similar"
          ? "Similar Estates"
          : "Personalized Portfolio"}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {recommendations.map((house) => (
          <Link
            key={house._id}
            to={`/details/${house._id}`}
            className="group block bg-[#111] border border-[#d4af37]/5 rounded-xl overflow-hidden hover:border-[#d4af37]/30 transition-all duration-500 shadow-2xl"
          >
            <div className="aspect-w-16 aspect-h-9 overflow-hidden relative">
              <img
                src={
                  house.images?.[0]
                    ? getImageUrl(house.images[0].url || house.images[0])
                    : "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=800&q=80"
                }
                alt={house.title}
                className="w-full h-56 object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
            </div>
            <div className="p-6">
              <h3 className="text-[#f8f6f3] font-bold truncate text-lg group-hover:text-[#d4af37] transition-colors" style={{ fontFamily: "'Playfair Display', serif" }}>
                {house.title}
              </h3>
              <p className="text-[#9a9a9a] text-[10px] uppercase font-bold tracking-widest mt-2">
                {house.location?.city || house.location}
              </p>
              <div className="mt-6 flex justify-between items-center pt-4 border-t border-[#d4af37]/10">
                <span className="text-[#d4af37] font-bold text-sm tracking-tight">
                  ETB {house.price?.toLocaleString()} <span className="text-[10px] text-[#9a9a9a]/60 uppercase">/ Mo</span>
                </span>
                <span className="text-amber-500 text-[10px] font-black tracking-widest flex items-center gap-1">
                  ★ {house.averageRating?.toFixed(1) || "NEW"}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default HouseRecommendations;
