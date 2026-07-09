import React from "react";
import {
  Home,
  BedDouble,
  DollarSign,
  Clock,
  Calendar,
  MapPin,
  TrendingUp,
} from "lucide-react";

/**
 * DetailCard Component
 * Refined for "Aura" luxury dark theme.
 */
const DetailCard = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-4">
    <div className="w-12 h-12 flex items-center justify-center text-slate-900 border border-slate-200 rounded-xl">
      <Icon size={24} />
    </div>
    <div>
      <p className="text-sm font-semibold text-slate-900 capitalize tracking-tight">
        {value}
      </p>
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
        {label}
      </p>
    </div>
  </div>
);

/**
 * PropertyDetails Component
 * Overhauled for clean light theme consistency.
 */
const PropertyDetails = ({ house }) => {
  const totalRooms =
    house.rooms?.totalRooms ||
    (house.rooms?.bedrooms || 0) + (house.rooms?.bathrooms || 0) ||
    "—";

  return (
    <div>
      <h3 className="text-[1.375rem] font-semibold text-slate-900 mb-6">
        Property Details
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DetailCard
          icon={Home}
          label="Property Type"
          value={house.propertyType}
        />
        <DetailCard
          icon={BedDouble}
          label="Room Count"
          value={`${totalRooms} Rooms`}
        />
        {house.deposit > 0 && (
          <DetailCard
            icon={DollarSign}
            label="Security Deposit"
            value={`ETB ${house.deposit?.toLocaleString()}`}
          />
        )}
        {house.minLeaseDuration > 0 && (
          <DetailCard
            icon={Clock}
            label="Minimum Rent"
            value={`${house.minLeaseDuration} Month Minimum`}
          />
        )}
        {house.availableFrom && (
          <DetailCard
            icon={Calendar}
            label="Available From"
            value={new Date(house.availableFrom).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          />
        )}
        {house.size > 0 && (
          <DetailCard
            icon={MapPin}
            label="Property Size"
            value={`${house.size?.toLocaleString()} SQFT`}
          />
        )}
      </div>
    </div>
  );
};

export default PropertyDetails;
