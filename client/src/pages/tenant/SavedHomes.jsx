import React, { useEffect, useState } from "react";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { HouseCard } from "../../components/pieces/HouseCard";
import { Loader2, Heart } from "lucide-react";
import userService from "../../api/userService";
import { useAuth } from "../../context/AuthContext";

const SavedHomesPage = () => {
  const { user } = useAuth();
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSavedHomes = async () => {
      if (!user) { setLoading(false); return; }
      try {
        setLoading(true);
        const response = await userService.getSavedHomes(user.id);
        const list = response.data?.houses || response.data?.data?.houses || [];
        setHouses(list);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load your saved homes. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchSavedHomes();
  }, [user]);

  const handleToggleSave = async (houseId) => {
    if (!user) return;
    try {
      await userService.removeSavedHome(user.id, houseId);
      setHouses((prev) => prev.filter((h) => h._id !== houseId));
    } catch (err) {
      alert(err.response?.data?.message || "Something went wrong while removing this home.");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl text-[#f8f6f3] flex items-center gap-3" style={{ fontFamily: "'Playfair Display', serif" }}>
              <Heart className="text-[#d4af37]" size={32} strokeWidth={1.5} />
              Saved Homes
            </h1>
            <p className="text-[#9a9a9a] tracking-wide text-sm mt-2">
              Quickly access homes you've favorited while exploring.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-[#d4af37]" size={40} />
            <p className="text-[#9a9a9a] tracking-wide">Loading your saved homes...</p>
          </div>
        ) : error ? (
          <div className="border border-red-500/30 bg-red-500/10 text-red-400 p-6 text-center">{error}</div>
        ) : houses.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#9a9a9a] text-lg mb-2">You have no saved homes yet.</p>
            <p className="text-[#9a9a9a]/60 text-sm">Tap the heart icon while exploring to add homes here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
            {houses.map((house) => (
              <HouseCard
                key={house._id}
                house={{
                  id: house._id,
                  title: house.title,
                  location: `${house.location.city}, ${house.location.state}`,
                  price: house.price,
                  rating: house.averageRating || 0,
                  beds: house.rooms?.bedrooms,
                  sqft: house.size || 0,
                  verified: house.verified?.status,
                  match: house.matchScore,
                  isFair: house.price < 3000,
                  image: house.images?.[0]?.url,
                  views: house.viewCount || 0,
                }}
                isSaved
                onToggleSave={handleToggleSave}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SavedHomesPage;
