import React from "react";
import { VerifiedBadge } from "./Badges";
import {
  Eye,
  Star,
  Calendar,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Pencil,
  MapPin,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getImageUrl } from "../../utils/imageUtils";

/**
 * Owner Listing Card Component
 * Restyled for luxury dark theme.
 */

const OwnerListingCard = ({ house, onToggleAvailability, onDelete, onReportIssue }) => {
  const navigate = useNavigate();

  const imagePath =
    house.images?.[0]?.url ||
    house.images?.[0]?.primaryImage ||
    house.primaryImage;

  const image = imagePath
    ? getImageUrl(imagePath)
    : "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&q=80&w=800";

  const isAvailable = house.available;
  const isVerified = house.verified?.status || house.verified;
  const verificationDecision = house.verified?.decision || (isVerified ? "approved" : "pending");
  const rejectionReason = house.verified?.rejectionReason;

  const verificationBadge = {
    approved: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    rejected: "bg-red-500/20 text-red-400 border border-red-500/30",
    pending: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  };

  const verificationLabel = {
    approved: "Approved Dossier",
    rejected: "Rejected Analysis",
    pending: "Pending Clearance",
  };

  return (
    <div className="group bg-[#111] rounded-2xl shadow-2xl border border-[#d4af37]/5 overflow-hidden hover:border-[#d4af37]/30 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
      <div
        className="relative aspect-[4/3] overflow-hidden cursor-pointer"
        onClick={() => navigate(`/details/${house._id}`)}
      >
        <img
          src={image}
          alt={house.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent opacity-60" />

        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {isVerified && <VerifiedBadge />}
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
              verificationBadge[verificationDecision] || verificationBadge.pending
            }`}
          >
            {verificationLabel[verificationDecision] || verificationLabel.pending}
          </span>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
              isAvailable
                ? "bg-[#d4af37] text-[#0a0a0a]"
                : "bg-white/10 text-white/60 border border-white/10"
            }`}
          >
            {isAvailable ? "Active Estate" : "Archived Session"}
          </span>
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-xl font-bold text-[#f8f6f3] truncate group-hover:text-[#d4af37] transition-colors" style={{ fontFamily: "'Playfair Display', serif" }}>
              {house.title}
            </h3>
            <p className="text-[10px] text-[#9a9a9a] uppercase font-bold tracking-[0.2em] mt-2 flex items-center gap-2">
              <MapPin size={10} className="text-[#d4af37]/60" />
              {house.location?.city}, {house.location?.state}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xl font-bold text-[#d4af37]" style={{ fontFamily: "'Playfair Display', serif" }}>
              ETB {house.price?.toLocaleString()}
            </p>
            <p className="text-[8px] text-[#9a9a9a]/40 font-black uppercase tracking-widest mt-1">/ Month Rent</p>
          </div>
        </div>

        <div className="flex items-center justify-between py-4 border-y border-[#d4af37]/5">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
               <span className="text-[8px] text-[#9a9a9a]/40 font-black uppercase tracking-widest mb-1">Architecture</span>
               <span className="text-xs text-[#f8f6f3] font-bold">{house.rooms?.bedrooms} Beds • {house.rooms?.bathrooms} Baths</span>
            </div>
            {house.size && (
              <div className="flex flex-col">
                <span className="text-[8px] text-[#9a9a9a]/40 font-black uppercase tracking-widest mb-1">Total Area</span>
                <span className="text-xs text-[#f8f6f3] font-bold">{house.size.toLocaleString()} SQFT</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 text-[10px] font-bold text-[#9a9a9a] uppercase tracking-tighter">
              <Eye size={12} className="text-[#d4af37]/40" />
              {house.viewCount || 0}
            </span>
            <span className="flex items-center gap-2 text-[10px] font-bold text-[#9a9a9a] uppercase tracking-tighter">
              <Star size={12} className="text-amber-500 fill-amber-500/20" />
              {(house.averageRating || 0).toFixed(1)}
            </span>
          </div>
          <span className="flex items-center gap-2 text-[8px] font-black text-[#9a9a9a]/40 uppercase tracking-widest">
            <Calendar size={12} className="text-[#d4af37]/20" />
            {house.createdAt ? new Date(house.createdAt).toLocaleDateString() : 'N/A'}
          </span>
        </div>

        {verificationDecision === "rejected" && (
          <div className="text-[10px] font-bold text-red-400 bg-red-500/5 border border-red-500/10 rounded-xl px-4 py-3 leading-relaxed">
            <span className="text-red-500 block mb-1 uppercase tracking-widest text-[8px] font-black">Admin Intercept:</span>
            {rejectionReason || "Discrepancies detected in listing data. Manual intervention required."}
          </div>
        )}

        <div className="pt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onToggleAvailability(house)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              isAvailable
                ? "bg-white/5 text-[#9a9a9a] hover:bg-white/10"
                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
            }`}
          >
            {isAvailable ? <><ToggleLeft size={16} /> Hide Listing</> : <><ToggleRight size={16} /> Show Listing</>}
          </button>

          <button
            type="button"
            onClick={() => navigate(`/owner/listings/${house._id}/edit`)}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#d4af37] border border-[#d4af37]/10 hover:bg-[#d4af37]/5 transition-all"
          >
            <Pencil size={14} />
            <span>Edit</span>
          </button>

          <button
            type="button"
            onClick={() => onDelete(house)}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-500/60 border border-red-500/10 hover:bg-red-500/5 transition-all"
          >
            <Trash2 size={14} />
          </button>
        </div>

        {verificationDecision === "rejected" &&
          house.verified?.ownerReport?.status !== "submitted" && (
            <button
              type="button"
              onClick={() => onReportIssue(house)}
              className="w-full mt-3 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] bg-amber-500/5 text-amber-500 border border-amber-500/20 hover:bg-amber-500/10 transition-all"
            >
              Report Discrepancy
            </button>
          )}
      </div>
    </div>
  );
};

export default OwnerListingCard;
