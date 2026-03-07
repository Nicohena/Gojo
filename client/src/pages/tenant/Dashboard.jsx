import React from "react";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import BookingList from "../../components/booking/BookingList";
import Navbar from "../../components/layout/Navbar";

const TenantDashboard = () => {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      <div className="max-w-7xl mx-auto py-8 px-6">
        <div className="mb-8">
          <h1
            className="text-4xl text-[#f8f6f3] mb-2"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            My Bookings
          </h1>
          <p className="text-[#9a9a9a] tracking-wide text-sm">
            Track and manage all your reservation requests.
          </p>
        </div>
        <BookingList role="tenant" />
      </div>
    </div>
  );
};

export default TenantDashboard;
