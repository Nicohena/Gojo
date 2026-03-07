import React from "react";
import { Star, Loader2, User } from "lucide-react";

/**
 * Review Card Component
 * Restyled for luxury dark theme.
 */
const ReviewCard = ({ review }) => (
  <div className="bg-[#111] border border-[#d4af37]/5 rounded-2xl p-6 hover:border-[#d4af37]/20 transition-all group shadow-xl">
    <div className="flex items-center gap-4 mb-4">
      <div className="w-12 h-12 bg-gradient-to-br from-[#d4af37] to-[#b8941f] rounded-full flex items-center justify-center text-[#0a0a0a] font-black text-lg border-2 border-[#111] shadow-lg group-hover:scale-105 transition-transform" style={{ fontFamily: "'Playfair Display', serif" }}>
        {review.tenantId?.name?.charAt(0)?.toUpperCase() || "?"}
      </div>
      <div>
        <p className="font-bold text-[#f8f6f3] text-sm group-hover:text-[#d4af37] transition-colors">
          {review.tenantId?.name || "Guest"}
        </p>
        <p className="text-[10px] text-[#9a9a9a]/60 uppercase font-black tracking-widest mt-0.5">
          {new Date(review.createdAt).toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>
    </div>
    <div className="flex gap-1 mb-4">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={14}
          className={
            s <= review.score
              ? "text-amber-500 fill-amber-500"
              : "text-[#1a1a1a] fill-none"
          }
        />
      ))}
    </div>
    {review.comment && (
      <p className="text-sm text-[#9a9a9a] leading-relaxed italic border-l-2 border-[#d4af37]/20 pl-4 py-1 group-hover:border-[#d4af37] transition-colors">{review.comment}</p>
    )}
  </div>
);

const ratingLabels = ["", "Vulnerable", "Neutral", "Refined", "Superior", "Elite"];

const ReviewsSection = ({
  ratings,
  averageRating,
  user,
  ratingScore,
  setRatingScore,
  ratingHover,
  setRatingHover,
  ratingComment,
  setRatingComment,
  ratingLoading,
  onSubmitRating,
}) => {
  return (
    <div className="pt-20 border-t border-[#d4af37]/10">
      <div className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[#d4af37]/10 rounded-2xl flex items-center justify-center border border-[#d4af37]/20">
             <Star className="text-[#d4af37] fill-[#d4af37]/20" size={28} />
          </div>
          <div>
            <h3 className="text-3xl text-[#f8f6f3]" style={{ fontFamily: "'Playfair Display', serif" }}>
              Reviews
            </h3>
            <p className="text-[10px] text-[#9a9a9a] uppercase font-bold tracking-[0.2em] mt-1">
              {averageRating?.toFixed(1) || "New"} Rating · {ratings?.length || 0} Reviews
            </p>
          </div>
        </div>
      </div>

      {/* Existing Reviews */}
      {ratings?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {ratings.map((review, idx) => (
            <ReviewCard key={idx} review={review} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-[#111] border border-[#d4af37]/5 rounded-[2rem] mb-16 shadow-inner">
           <Star size={40} className="mx-auto text-[#9a9a9a]/20 mb-4" />
           <p className="text-[10px] text-[#9a9a9a] uppercase font-bold tracking-[0.3em]">No Reviews Yet</p>
        </div>
      )}

      {/* Submit Review Form */}
      {user && user.role === "tenant" && (
        <div className="bg-[#111] border border-[#d4af37]/10 rounded-3xl p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
             <User size={120} className="text-[#d4af37]" />
          </div>
          
          <h4 className="text-2xl text-[#f8f6f3] mb-8" style={{ fontFamily: "'Playfair Display', serif" }}>Write a Review</h4>
          
          <div className="flex flex-col md:flex-row md:items-center gap-6 mb-10">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRatingScore(s)}
                  onMouseEnter={() => setRatingHover(s)}
                  onMouseLeave={() => setRatingHover(0)}
                  className="transition-all hover:scale-125 focus:outline-none"
                >
                  <Star
                    size={32}
                    className={`transition-all duration-300 ${
                      s <= (ratingHover || ratingScore)
                        ? "text-amber-500 fill-amber-500 shadow-lg"
                        : "text-[#1a1a1a] fill-none"
                    }`}
                  />
                </button>
              ))}
            </div>
            {ratingScore > 0 && (
              <span className="text-[10px] font-black text-[#d4af37] uppercase tracking-[0.3em] bg-[#1a1a1a] px-5 py-2 rounded-full border border-[#d4af37]/10 animate-in fade-in zoom-in duration-300">
                Rating: {ratingLabels[ratingScore]}
              </span>
            )}
          </div>

          <div className="relative mb-8">
            <textarea
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              placeholder="Tell us about your stay..."
              rows={4}
              className="w-full bg-[#0a0a0a] border border-[#d4af37]/10 rounded-2xl p-5 text-[#f8f6f3] placeholder-[#9a9a9a]/20 outline-none focus:border-[#d4af37]/40 focus:ring-4 focus:ring-[#d4af37]/5 transition-all text-sm leading-relaxed"
            />
            <div className="absolute bottom-4 right-4 text-[10px] font-bold text-[#9a9a9a]/40 uppercase tracking-widest">Share your experience</div>
          </div>

          <button
            onClick={onSubmitRating}
            disabled={ratingLoading || ratingScore === 0}
            className="w-full md:w-auto px-10 py-4 bg-[#d4af37] text-[#0a0a0a] rounded-xl font-black text-[10px] uppercase tracking-[0.3em] hover:bg-[#b8941f] transition-all disabled:opacity-40 flex items-center justify-center gap-4 shadow-xl shadow-[#d4af37]/10"
          >
            {ratingLoading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Star size={18} />
            )}
            Submit Review
          </button>
        </div>
      )}
    </div>
  );
};

export default ReviewsSection;
