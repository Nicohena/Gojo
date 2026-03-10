import React from "react";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import BookingList from "../../components/booking/BookingList";

const OwnerBookings = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1
            className="text-4xl"
            style={{ fontFamily: "'Playfair Display', serif", color: 'var(--text)' }}
          >
            Bookings
          </h1>
          <p className="tracking-wide text-sm mt-2" style={{ color: 'var(--muted)' }}>
            Manage your booking requests and history.
          </p>
        </div>

        <div className="p-6" style={{ background: 'var(--panel)', border: '1px solid', borderColor: 'var(--panel-border)' }}>
          <BookingList role="owner" />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OwnerBookings;
