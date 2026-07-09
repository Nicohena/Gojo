import React from "react";
import { Star, Loader2, User } from "lucide-react";

/**
 * Review Card Component
 * Restyled for luxury dark theme.
 */
const ReviewCard = ({ review }) => (
  <div className="border border-slate-200 rounded-2xl p-6 shadow-sm">
    <div className="flex items-center gap-4 mb-4">
      <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center text-slate-700 font-bold text-lg">
        {review.tenantId?.name?.charAt(0)?.toUpperCase() || "?"}
      </div>
      <div>
        <p className="font-semibold text-slate-900 text-base">
          {review.tenantId?.name || "Guest"}
        </p>
        <p className="text-sm text-slate-500 font-normal">
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
              ? "text-slate-900 fill-slate-900"
              : "text-slate-200 fill-slate-200"
          }
        />
      ))}
    </div>
    {review.comment && (
      <p className="text-base text-slate-700 leading-relaxed">{review.comment}</p>
    )}
  </div>
);

const ratingLabels = ["", "Terrible", "Bad", "Okay", "Good", "Excellent"];

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
    <div>
      <div className="flex items-center gap-2 mb-8">
        <Star className="text-slate-900 fill-slate-900" size={24} />
        <h3 className="text-[1.375rem] font-semibold text-slate-900">
          {averageRating?.toFixed(1) || "New"} · {ratings?.length || 0} reviews
        </h3>
      </div>

      {/* Existing Reviews */}
      {ratings?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {ratings.map((review, idx) => (
            <ReviewCard key={idx} review={review} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border border-slate-200 rounded-2xl mb-12 bg-slate-50">
           <Star size={32} className="mx-auto text-slate-300 mb-3" />
           <p className="text-sm text-slate-500 font-semibold uppercase tracking-wide">No Reviews Yet</p>
        </div>
      )}

      {/* Submit Review Form */}
      {user && user.role === "tenant" && (
        <div className="border border-slate-200 rounded-2xl p-8 bg-white shadow-sm">
          <h4 className="text-xl font-semibold text-slate-900 mb-6">Write a Review</h4>
          
          <div className="flex items-center gap-6 mb-6">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRatingScore(s)}
                  onMouseEnter={() => setRatingHover(s)}
                  onMouseLeave={() => setRatingHover(0)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    size={28}
                    className={
                      s <= (ratingHover || ratingScore)
                        ? "text-slate-900 fill-slate-900"
                        : "text-slate-200 fill-none"
                    }
                  />
                </button>
              ))}
            </div>
            {ratingScore > 0 && (
              <span className="text-sm font-semibold text-slate-900 bg-slate-100 px-4 py-1.5 rounded-full">
                {ratingLabels[ratingScore]}
              </span>
            )}
          </div>

          <div className="mb-6">
            <textarea
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              placeholder="Tell us about your stay..."
              rows={4}
              className="w-full border border-slate-300 rounded-xl p-4 text-slate-900 placeholder-slate-400 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all text-base leading-relaxed"
            />
          </div>

          <button
            onClick={onSubmitRating}
            disabled={ratingLoading || ratingScore === 0}
            className="px-8 py-3 bg-[#E67E5F] text-white rounded-xl font-semibold hover:bg-[#d97153] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {ratingLoading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : null}
            Submit Review
          </button>
        </div>
      )}
    </div>
  );
};

export default ReviewsSection;
