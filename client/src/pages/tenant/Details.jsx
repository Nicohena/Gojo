import React, { useState, useEffect, useMemo } from "react";
import {
  Star,
  Share,
  Heart,
  MapPin,
  ShieldCheck,
  Calendar,
  Wifi,
  ChevronLeft,
  Loader2,
  Info,
} from "lucide-react";
import { getImageUrl } from "../../utils/imageUtils";
import {
  SmartMatchBadge,
  FairPriceBadge,
  VerifiedBadge,
} from "../../components/pieces/Badges";
import { useNavigate, useParams } from "react-router-dom";
import { houseService } from "../../api/houseService";
import { useAuth } from "../../context/AuthContext";
import bookingService from "../../api/bookingService";
import recommendationService from "../../api/recommendationService";
import { HouseCard } from "../../components/pieces/HouseCard";
import PaymentModal from "../../components/payment/PaymentModal";
import userService from "../../api/userService";
import toast from "react-hot-toast";

// Extracted sub-components
import {
  PhotoGrid,
  PropertyDetails,
  HouseRules,
  HostSection,
  ReviewsSection,
  PropertyMapModal,
} from "../../components/details";
import BookingWidget from "../../components/booking/BookingWidget";

/**
 * DetailsPage Component
 * Fully overhauled for the cinematic "Aura" luxury dark theme.
 */
const DetailsPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [currentBooking, setCurrentBooking] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [similarHouses, setSimilarHouses] = useState([]);
  const [showMap, setShowMap] = useState(false);

  // Rating states
  const [ratingScore, setRatingScore] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingLoading, setRatingLoading] = useState(false);

  // Fetch house details
  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const response = await houseService.getHouseById(id);
        setData(response.data.data);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch house details", err);
        setError("Property details could not be found.");
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

  // Fetch similar properties
  useEffect(() => {
    const fetchSimilar = async () => {
      if (!id) return;
      try {
        const response = await recommendationService.getSimilarHouses(id);
        setSimilarHouses(response.data?.similar || response.data?.houses || []);
      } catch (err) {
        setSimilarHouses([]);
      }
    };
    fetchSimilar();
  }, [id]);

  useEffect(() => {
    const checkSaved = async () => {
      if (!user || !data?.house?._id) {
        setIsSaved(false);
        return;
      }
      try {
        const response = await userService.getSavedHomes(user.id);
        const houses =
          response.data?.houses || response.data?.data?.houses || [];
        const savedIds = houses.map((h) => h._id);
        setIsSaved(savedIds.includes(data.house._id));
      } catch (err) {
        console.error("Failed to check saved state", err);
      }
    };

    checkSaved();
  }, [user, data?.house?._id]);

  const isOwner = user?.id === data?.house?.ownerId?._id;

  const displayedSimilarHouses = useMemo(
    () => (Array.isArray(similarHouses) ? similarHouses.slice(0, 3) : []),
    [similarHouses],
  );

  const handleStartChat = () => {
    if (!user) {
      toast.error("Please login to message the host.");
      return;
    }

    const currentUserId = user.id || user._id;
    const ownerId = data?.house?.ownerId?._id;
    if (currentUserId && ownerId && currentUserId === ownerId) {
      toast.error("You cannot message yourself.");
      return;
    }

    navigate("/messages", {
      state: {
        owner: data.house.ownerId,
        houseId: data.house._id,
        initialMessage: `Hi, I'm interested in your property: ${data.house.title}`,
      },
    });
  };

  const handleToggleSave = async () => {
    if (!user) {
      toast.error("Please login to save this property.");
      return;
    }

    if (!data?.house?._id) return;

    try {
      setSaving(true);
      if (isSaved) {
        await userService.removeSavedHome(user.id, data.house._id);
        setIsSaved(false);
        toast.success("Property removed from saved homes.");
      } else {
        await userService.addSavedHome(user.id, data.house._id);
        setIsSaved(true);
        toast.success("Property added to saved homes.");
      }
    } catch (err) {
      toast.error("Could not update saved homes.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitRating = async () => {
    if (!user) {
      toast.error("Please login to submit a review.");
      return;
    }
    if (ratingScore === 0) {
      toast.error("Please select a star rating.");
      return;
    }
    setRatingLoading(true);
    try {
      const response = await houseService.addRating(id, {
        score: ratingScore,
        comment: ratingComment,
      });
      setData((prev) => ({
        ...prev,
        house: {
          ...prev.house,
          ratings: response.data?.data?.house?.ratings || [
            ...prev.house.ratings,
            {
              tenantId: { _id: user.id, name: user.name, avatar: user.avatar },
              score: ratingScore,
              comment: ratingComment,
              createdAt: new Date(),
            },
          ],
          averageRating:
            response.data?.data?.house?.averageRating ||
            prev.house.averageRating,
        },
      }));
      setRatingScore(0);
      setRatingComment("");
      toast.success("Review submitted successfully.");
    } catch (err) {
      toast.error("Failed to submit review.");
    } finally {
      setRatingLoading(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[#0a0a0a]">
        <div className="w-16 h-16 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#d4af37] font-black uppercase tracking-[0.4em] text-[10px] animate-pulse">Loading Details...</p>
      </div>
    );

  if (error || !data)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-8 bg-[#0a0a0a] p-8">
        <div className="bg-red-500/5 border border-red-500/20 p-12 rounded-[3rem] text-center max-w-lg shadow-2xl">
          <h2 className="text-3xl font-black text-red-500 mb-4 tracking-tighter" style={{ fontFamily: "'Playfair Display', serif" }}>Property Not Found</h2>
          <p className="text-[#9a9a9a] font-medium mb-8 uppercase tracking-widest text-xs leading-loose">{error}</p>
          <button 
            onClick={() => navigate("/search")} 
            className="px-10 py-4 bg-red-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-red-600 transition-all shadow-xl shadow-red-500/20"
          >
            Go Back to Search
          </button>
        </div>
      </div>
    );

  const { house, priceFairness, matchScore } = data;

  const fullAddress = [
    house.location?.address,
    house.location?.city,
    house.location?.state,
    house.location?.country,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="bg-[#0a0a0a] min-h-screen pb-32 text-[#f8f6f3] selection:bg-[#d4af37]/30">
      {/* ── Navigation Node ── */}
      <nav className="sticky top-0 z-40 w-full bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-[#d4af37]/10">
        <div className="max-w-7xl mx-auto px-8 h-24 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-3 text-[#9a9a9a] hover:text-[#d4af37] text-[10px] font-black uppercase tracking-[0.3em] transition-all group"
          >
            <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span>Go Back</span>
          </button>
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="p-3.5 bg-white/5 border border-white/10 rounded-2xl hover:border-[#d4af37]/40 hover:text-[#d4af37] transition-all"
              onClick={() => {
                const link = window.location.href;
                navigator.clipboard.writeText(link).then(() => toast.success("Property link copied to clipboard."));
              }}
            >
              <Share size={18} />
            </button>
            <button
              type="button"
              onClick={handleToggleSave}
              disabled={saving}
              className={`p-3.5 rounded-2xl border transition-all ${
                isSaved
                  ? "bg-red-500/10 border-red-500/30 text-red-500"
                  : "bg-white/5 border-white/10 text-[#9a9a9a] hover:border-[#d4af37]/40 hover:text-[#d4af37]"
              }`}
            >
              <Heart size={18} className={isSaved ? "fill-current" : ""} />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 pt-16">
        {/* ── Asset Identification ── */}
        <div className="flex flex-col xl:flex-row justify-between items-start gap-8 mb-16">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-4 mb-6">
               {house.verified?.status && <VerifiedBadge />}
               {matchScore && <SmartMatchBadge percentage={matchScore} />}
               <FairPriceBadge score={priceFairness?.score} />
            </div>
            <h1 className="text-6xl font-black text-[#f8f6f3] tracking-tighter mb-4 leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              {house.title}
            </h1>
            <div className="flex items-center gap-8 text-[11px] font-black uppercase tracking-[0.2em] text-[#9a9a9a]">
              <div className="flex items-center gap-2">
                <Star size={16} className="fill-amber-500 text-amber-500" />
                <span className="text-[#f8f6f3]">{house.averageRating?.toFixed(1) || "New Property"}</span>
                <span className="opacity-40 underline cursor-pointer hover:text-[#d4af37] transition-colors">
                  {house.ratings?.length || 0} reviews
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowMap(true)}
                className="flex items-center gap-2 hover:text-[#d4af37] transition-all group"
              >
                <MapPin size={16} className="text-[#d4af37]/60" />
                <span className="underline decoration-[#d4af37]/20 group-hover:decoration-[#d4af37]">
                  {fullAddress}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Visual Assets ── */}
        <PhotoGrid images={house.images} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-20">
          <div className="lg:col-span-8 space-y-20">
            {/* ── Property Details ── */}
            <div className="flex justify-between items-center pb-12 border-b border-[#d4af37]/10">
              <div>
                <h2 className="text-3xl text-[#f8f6f3] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {house.propertyType}
                </h2>
                <div className="flex items-center gap-4 text-[10px] text-[#9a9a9a] font-black uppercase tracking-[0.3em]">
                   <span>{house.rooms?.bedrooms} Bedrooms</span>
                   <div className="w-1.5 h-1.5 rounded-full bg-[#d4af37]/40" />
                   <span>{house.rooms?.bathrooms} Bathrooms</span>
                   <div className="w-1.5 h-1.5 rounded-full bg-[#d4af37]/40" />
                   <span>{house.size?.toLocaleString()} SQFT</span>
                </div>
              </div>
              <div className="group relative">
                <div className="absolute inset-0 bg-[#d4af37] rounded-full blur-xl opacity-0 group-hover:opacity-20 transition-opacity" />
                <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-[#d4af37]/20 shadow-2xl">
                  <img
                    src={getImageUrl(house.ownerId?.avatar || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100")}
                    alt="Owner"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
              </div>
            </div>

            {/* ── Highlights ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {[
                { icon: ShieldCheck, label: "Verified Property", sub: "Physically audited for your safety." },
                { icon: MapPin, label: "Great Location", sub: "Prime area with easy access." },
                { icon: Calendar, label: "Flexible Cancellation", sub: "Full refund within 48h." }
              ].map((item, i) => (
                <div key={i} className="flex flex-col gap-4 p-8 bg-[#111] border border-[#d4af37]/5 rounded-[2rem] hover:border-[#d4af37]/20 transition-all">
                  <div className="w-12 h-12 bg-[#d4af37]/10 rounded-xl flex items-center justify-center text-[#d4af37]">
                    <item.icon size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-[#f8f6f3] text-sm mb-1">{item.label}</p>
                    <p className="text-[10px] text-[#9a9a9a] uppercase font-bold tracking-widest leading-relaxed">
                      {item.sub}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Property Description ── */}
            <div className="space-y-8 pt-12 border-t border-[#d4af37]/10">
              <h3 className="text-2xl text-[#f8f6f3]" style={{ fontFamily: "'Playfair Display', serif" }}>About this property</h3>
              <p className="text-[#9a9a9a] leading-[2] font-medium text-lg italic">
                {house.description}
              </p>
            </div>

            <PropertyDetails house={house} />

            {/* ── Operational Utilities ── */}
            <div className="pt-20 border-t border-[#d4af37]/10">
              <h3 className="text-3xl font-black text-[#f8f6f3] mb-12" style={{ fontFamily: "'Playfair Display', serif" }}>
                Prime Amenities
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
                {house.amenities?.map((amenity, idx) => (
                  <div key={idx} className="flex items-center gap-5 group">
                    <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-[#9a9a9a] group-hover:bg-[#d4af37]/10 group-hover:text-[#d4af37] transition-all">
                       <Wifi size={20} />
                    </div>
                    <span className="font-bold text-[#9a9a9a] uppercase tracking-widest text-[11px] group-hover:text-[#f8f6f3] transition-colors">{amenity}</span>
                  </div>
                ))}
              </div>
              {house.amenities?.length > 6 && (
                <button className="mt-16 px-12 py-4 border border-[#d4af37]/20 rounded-2xl font-black text-[10px] text-[#d4af37] uppercase tracking-[0.3em] hover:bg-[#d4af37]/5 hover:border-[#d4af37]/60 transition-all shadow-xl">
                  Show all {house.amenities?.length} amenities
                </button>
              )}
            </div>

            <HouseRules rules={house.rules} />

            <HostSection owner={house.ownerId} onStartChat={handleStartChat} />

            <ReviewsSection
              ratings={house.ratings}
              averageRating={house.averageRating}
              user={user}
              ratingScore={ratingScore}
              setRatingScore={setRatingScore}
              ratingHover={ratingHover}
              setRatingHover={setRatingHover}
              ratingComment={ratingComment}
              setRatingComment={setRatingComment}
              ratingLoading={ratingLoading}
              onSubmitRating={handleSubmitRating}
            />
          </div>

          {/* ── Commitment Widget ── */}
          <div className="lg:col-span-4 relative">
            <div className="sticky top-32">
              <BookingWidget house={house} user={user} />
              
              <div className="mt-10 p-8 bg-amber-500/5 border border-amber-500/10 rounded-[2rem]">
                 <div className="flex items-center gap-3 text-amber-500 mb-4">
                    <Info size={18} />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Booking Security</span>
                 </div>
                 <p className="text-[10px] text-amber-500/60 font-bold leading-relaxed uppercase tracking-widest">
                    Your payment is held securely and only released to the host after the booking is finalized.
                 </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Similar Properties ── */}
        {displayedSimilarHouses.length > 0 && (
          <div className="mt-40 border-t border-[#d4af37]/10 pt-24 pb-20">
            <div className="flex justify-between items-end mb-16">
               <div>
                  <p className="text-[#d4af37] text-[10px] font-black uppercase tracking-[0.4em] mb-4">Recommendations</p>
                  <h2 className="text-5xl font-black text-[#f8f6f3] tracking-tighter" style={{ fontFamily: "'Playfair Display', serif" }}>
                    Similar Properties
                  </h2>
               </div>
               <button onClick={() => navigate("/search")} className="text-[10px] font-black text-[#9a9a9a] hover:text-[#d4af37] uppercase tracking-[0.3em] transition-all">View All Properties</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {displayedSimilarHouses.map((h) => (
                <HouseCard
                  key={h._id}
                  house={{
                    id: h._id,
                    title: h.title,
                    location: `${h.location?.city || "Global"}, ${h.location?.state || "Territory"}`,
                    price: h.price,
                    rating: h.averageRating || 0,
                    beds: h.rooms?.bedrooms || 0,
                    sqft: h.size || 0,
                    verified: h.verified?.status,
                    match: h.matchScore,
                    isFair: h.price < 5000,
                    image: h.images?.[0]?.url || h.images?.[0],
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      <PropertyMapModal
        isOpen={showMap}
        onClose={() => setShowMap(false)}
        location={house.location}
      />

      {showPayment && (
        <PaymentModal
          booking={currentBooking}
          onClose={() => setShowPayment(false)}
          onSuccess={() => {
            setShowPayment(false);
            navigate("/payments");
          }}
        />
      )}
    </div>
  );
};

export default DetailsPage;
