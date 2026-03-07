import React from "react";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import BookingList from "../../components/booking/BookingList";

const OwnerBookings = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1
            className="text-4xl text-[#f8f6f3]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Bookings
          </h1>
          <p className="text-[#9a9a9a] tracking-wide text-sm mt-2">
            Manage your booking requests and history.
          </p>
        </div>

        <div className="border border-[#d4af37]/10 bg-[#111] p-6">
          <BookingList role="owner" />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OwnerBookings;
