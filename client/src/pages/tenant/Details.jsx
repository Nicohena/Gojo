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

  const hostAvatar = getImageUrl(
    house.ownerId?.avatar ||
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100",
  );

  return (
    <div className="bg-[#f8fafc] min-h-screen text-[#0f172a] selection:bg-[#d4af37]/20">
      {/* ── Navigation Node ── */}
      <nav className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-8 h-24 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-3 text-slate-600 hover:text-slate-900 text-sm font-semibold uppercase tracking-[0.3em] transition-all"
          >
            <ChevronLeft size={18} className="text-slate-600" />
            <span>Back to listings</span>
          </button>
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="p-3.5 bg-slate-100 border border-slate-200 rounded-2xl hover:bg-slate-200 transition-all"
              onClick={() => {
                const link = window.location.href;
                navigator.clipboard.writeText(link).then(() => toast.success("Property link copied to clipboard."));
              }}
            >
              <Share size={18} className="text-slate-700" />
            </button>
            <button
              type="button"
              onClick={handleToggleSave}
              disabled={saving}
              className={`p-3.5 rounded-2xl border transition-all ${
                isSaved
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-600"
                  : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Heart size={18} className={isSaved ? "fill-current" : "text-slate-700"} />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 pb-24 pt-8">
        <div className="mb-6">
          <h1 className="text-[2rem] font-bold text-slate-900 mb-2">
            {house.title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-slate-900 font-semibold">
            <div className="flex items-center gap-1">
              <Star size={16} className="fill-slate-900" />
              <span>{house.averageRating?.toFixed(1) || "New"}</span>
            </div>
            <span className="underline cursor-pointer">{house.ratings?.length || 0} reviews</span>
            <span>·</span>
            <div className="flex items-center gap-1">
              <MapPin size={16} className="text-slate-500" />
              <span className="underline cursor-pointer">{fullAddress}</span>
            </div>
          </div>
        </div>

        <PhotoGrid images={house.images} />

        <div className="grid gap-20 lg:grid-cols-[2fr_1fr] mt-12">
          {/* Left Column */}
          <div className="space-y-8">
            <div className="flex items-center justify-between pb-6 border-b border-gray-200">
              <div>
                <h2 className="text-[1.375rem] font-semibold text-slate-900 mb-1">
                  Entire rental unit hosted by {house.ownerId?.name || "Host"}
                </h2>
                <div className="flex items-center gap-2 text-base text-slate-600">
                  <span>{house.rooms?.bedrooms || 0} bedrooms</span>
                  <span>·</span>
                  <span>{house.rooms?.bathrooms || 0} bathrooms</span>
                  <span>·</span>
                  <span>{house.size?.toLocaleString() || "N/A"} sqft</span>
                </div>
              </div>
              <div className="w-14 h-14 rounded-full overflow-hidden shrink-0">
                <img src={hostAvatar} alt="Host avatar" className="w-full h-full object-cover" />
              </div>
            </div>

            <div className="py-6 border-b border-gray-200 space-y-6">
              {[
                {
                  icon: ShieldCheck,
                  label: "Verified host",
                  text: "Host has completed identity verification.",
                },
                {
                  icon: MapPin,
                  label: "Great location",
                  text: "Recent guests gave the location a 5-star rating.",
                },
                {
                  icon: Calendar,
                  label: "Flexible dates",
                  text: "Easily update your schedule before booking.",
                },
              ].map((item, idx) => (
                <div key={idx} className="flex gap-4">
                  <item.icon size={28} className="text-slate-900 shrink-0" />
                  <div>
                    <div className="font-semibold text-base text-slate-900">{item.label}</div>
                    <div className="text-slate-500 text-sm mt-0.5">{item.text}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="py-6 border-b border-gray-200">
              <h2 className="text-[1.375rem] font-semibold text-slate-900 mb-4">About this space</h2>
              <p className="text-base text-slate-700 leading-relaxed whitespace-pre-wrap">{house.description}</p>
            </div>

            <div className="py-6 border-b border-gray-200">
              <PropertyDetails house={house} />
            </div>

            <div className="py-6 border-b border-gray-200">
              <h3 className="text-[1.375rem] font-semibold text-slate-900 mb-6">What this place offers</h3>
              <div className="grid sm:grid-cols-2 gap-y-4 gap-x-6">
                {house.amenities?.map((amenity, idx) => (
                  <div key={idx} className="flex items-center gap-4 text-slate-700 text-base">
                    <Wifi size={24} className="text-slate-900 shrink-0" />
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="py-6 border-b border-gray-200">
              <HouseRules rules={house.rules} />
            </div>

            <div className="py-6 border-b border-gray-200">
              <HostSection owner={house.ownerId} onStartChat={handleStartChat} />
            </div>
            
            <div className="py-6 border-b border-gray-200">
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
          </div>

          {/* Right Column */}
          <div className="relative">
            <div className="sticky top-28 space-y-6">
              <BookingWidget house={house} user={user} />
              <div className="border border-slate-200 bg-white p-6 rounded-2xl shadow-sm flex items-start gap-4">
                <Info size={24} className="text-[#E67E5F] shrink-0" />
                <div>
                  <div className="font-semibold text-slate-900 mb-1">Booking security</div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Your payment is held securely and only released to the host after the booking is finalized.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
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
