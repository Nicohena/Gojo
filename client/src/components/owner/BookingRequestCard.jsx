import React from "react";
import { User, Check, X } from "lucide-react";
import { getImageUrl } from "../../utils/imageUtils";

export const BookingRequestCard = ({
  request,
  onAccept,
  onDecline,
  processing,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 rounded-2xl border border-[#d4af37]/10 hover:border-[#d4af37]/30 hover:shadow-[0_0_20px_rgba(212,175,55,0.05)] transition-all bg-[#1a1a1a] gap-5">
      <div className="flex items-start gap-4 flex-1">
        {/* Tenant Avatar */}
        <div className="w-12 h-12 rounded-full border border-[#d4af37]/20 flex items-center justify-center flex-shrink-0 overflow-hidden bg-[#0a0a0a]">
          {request.tenantId?.avatar ? (
            <img
              src={getImageUrl(request.tenantId.avatar)}
              alt={request.tenantId.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="text-[#d4af37]/40" size={24} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <h4 className="font-bold text-[#f8f6f3] truncate tracking-wide">
              {request.tenantId?.name || "Unknown Tenant"}
            </h4>
            <span className="text-[9px] uppercase font-black text-[#d4af37] bg-[#d4af37]/10 px-2 py-1 rounded-lg ml-2 whitespace-nowrap tracking-widest border border-[#d4af37]/10">
              {new Date(request.createdAt).toLocaleDateString()}
            </span>
          </div>

          <p className="text-xs text-[#9a9a9a] font-medium truncate mt-1">
            {request.house?.title || "Property Name"}
          </p>

          <div className="flex items-center gap-2 mt-3 text-[10px] font-bold text-[#9a9a9a]/60 uppercase tracking-widest">
            <span className="bg-[#0a0a0a] px-2 py-0.5 rounded border border-[#d4af37]/5">{new Date(request.startDate).toLocaleDateString()}</span>
            <span className="text-[#d4af37]">→</span>
            <span className="bg-[#0a0a0a] px-2 py-0.5 rounded border border-[#d4af37]/5">{new Date(request.endDate).toLocaleDateString()}</span>
            <span className="w-1 h-1 rounded-full bg-[#d4af37]/30 mx-1"></span>
            <span className="text-[#d4af37] font-black">
              ETB {request.totalAmount?.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-t-0 border-[#d4af37]/5">
        <button
          onClick={() => onAccept(request._id)}
          disabled={processing === request._id}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-[#d4af37] text-[#0a0a0a] rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-[#b8941f] disabled:opacity-50 transition-all shadow-lg shadow-[#d4af37]/10"
        >
          {processing === request._id ? (
            <span className="w-3 h-3 rounded-full border-2 border-[#0a0a0a]/30 border-t-[#0a0a0a] animate-spin" />
          ) : (
            <>
              <Check size={14} />
              <span>Approve</span>
            </>
          )}
        </button>
        <button
          onClick={() => onDecline(request._id)}
          disabled={processing === request._id}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1a1a1a] border border-red-500/30 text-red-400 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-red-500/5 hover:border-red-500/50 disabled:opacity-50 transition-all"
        >
          <X size={14} />
          <span>Decline</span>
        </button>
      </div>
    </div>
  );
};
