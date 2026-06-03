import React from "react";
import { User, Check, X } from "lucide-react";
import { getImageUrl } from "../../utils/imageUtils";

const CORAL = "#E67E5F";

export const BookingRequestCard = ({ request, onAccept, onDecline, processing }) => {
  const isProcessing = processing === request._id;

  return (
    <div className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-sm transition-all">
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full border border-gray-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
        {request.tenantId?.avatar ? (
          <img src={getImageUrl(request.tenantId.avatar)} alt={request.tenantId.name} className="w-full h-full object-cover" />
        ) : (
          <User size={16} className="text-gray-400" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-gray-800 truncate">
            {request.tenantId?.name || "Unknown Tenant"}
          </p>
          <span className="text-[10px] text-gray-400 shrink-0">
            {new Date(request.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </div>
        <p className="text-xs text-gray-500 truncate mt-0.5">
          {request.houseId?.title || request.house?.title || "Property"}
        </p>
        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-400">
          <span>{new Date(request.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          <span>→</span>
          <span>{new Date(request.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          <span className="ml-1 font-semibold" style={{ color: CORAL }}>ETB {request.totalAmount?.toLocaleString()}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-2.5">
          <button
            onClick={() => onAccept(request._id)}
            disabled={isProcessing}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: CORAL }}
          >
            {isProcessing ? <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <Check size={12} />}
            Approve
          </button>
          <button
            onClick={() => onDecline(request._id)}
            disabled={isProcessing}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-500 border border-red-200 hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            <X size={12} />
            Decline
          </button>
        </div>
      </div>
    </div>
  );
};
