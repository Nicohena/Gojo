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
  <div className="flex items-center gap-6 p-6 bg-[#111] border border-[#d4af37]/5 rounded-3xl group hover:border-[#d4af37]/30 transition-all shadow-xl hover:-translate-y-1 duration-500">
    <div className="w-14 h-14 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-center text-[#d4af37] group-hover:bg-[#d4af37]/10 group-hover:text-[#d4af37] transition-all shadow-lg group-hover:scale-110">
      <Icon size={24} />
    </div>
    <div>
      <p className="text-[10px] text-[#9a9a9a]/40 font-black uppercase tracking-[0.3em] mb-1">
        {label}
      </p>
      <p className="font-bold text-[#f8f6f3] text-lg capitalize tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
        {value}
      </p>
    </div>
  </div>
);

/**
 * PropertyDetails Component
 * Overhauled for luxury dark theme consistency.
 */
const PropertyDetails = ({ house }) => {
  const totalRooms =
    house.rooms?.totalRooms ||
    (house.rooms?.bedrooms || 0) + (house.rooms?.bathrooms || 0) ||
    "—";

  return (
    <div className="pt-20 border-t border-[#d4af37]/10">
      <div className="flex items-center gap-4 mb-12">
         <div className="w-12 h-12 bg-[#d4af37]/10 rounded-xl flex items-center justify-center border border-[#d4af37]/20">
            <TrendingUp size={24} className="text-[#d4af37]" />
         </div>
         <div>
            <h3 className="text-3xl text-[#f8f6f3]" style={{ fontFamily: "'Playfair Display', serif" }}>
              Property Details
            </h3>
            <p className="text-[10px] text-[#9a9a9a] uppercase font-bold tracking-[0.3em] mt-1">
               Official Property Specifications
            </p>
         </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
