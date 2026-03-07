import React, { useState, useEffect } from "react";
import LoadingSpinner from "../ui/LoadingSpinner";
import PaymentModal from "../payment/PaymentModal";
import toast from "react-hot-toast";
import bookingService from "../../api/bookingService";
import { Calendar, User, Home, CreditCard, ChevronRight, X, CheckCircle2, AlertCircle, Clock } from "lucide-react";

/**
 * BookingList Component
 * Overhauled for luxury dark theme.
 */
const BookingList = ({ role }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const data = await bookingService.getBookings();
      setBookings(data.data.bookings || []);
    } catch (err) {
      setError("Failed to load bookings");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await bookingService.updateBooking(id, { status });
      toast.success(`Booking ${status} successfully`);
      fetchBookings();
    } catch (err) {
      toast.error(`Failed to ${status} booking`);
    }
  };

  const handleCancel = async (id) => {
    if (window.confirm("Are you sure you want to cancel this booking?")) {
      try {
        await bookingService.cancelBooking(id);
        toast.success("Booking cancelled");
        fetchBookings();
      } catch (err) {
        toast.error("Failed to cancel booking");
      }
    }
  };

  const handlePayment = (booking) => {
    setSelectedBooking(booking);
    setShowPaymentModal(true);
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center p-24 opacity-50">
        <div className="w-10 h-10 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-[10px] uppercase font-black tracking-[0.3em] text-[#9a9a9a]">Loading Bookings...</span>
      </div>
    );
    
  if (error) return (
    <div className="p-12 text-center bg-red-500/5 border border-red-500/10 rounded-2xl">
      <AlertCircle className="mx-auto text-red-500 mb-4" size={32} />
      <p className="text-red-500 font-bold uppercase tracking-widest text-sm">{error}</p>
    </div>
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-[#d4af37]/10 bg-[#111] shadow-2xl">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-[#0a0a0a] border-b border-[#d4af37]/10">
            <tr>
              <th className="px-8 py-5 text-left text-[10px] font-black text-[#d4af37]/60 uppercase tracking-[0.2em]">Property</th>
              <th className="px-8 py-5 text-left text-[10px] font-black text-[#d4af37]/60 uppercase tracking-[0.2em]">{role === 'tenant' ? 'Owner' : 'Tenant'}</th>
              <th className="px-8 py-5 text-left text-[10px] font-black text-[#d4af37]/60 uppercase tracking-[0.2em]">Stay Dates</th>
              <th className="px-8 py-5 text-left text-[10px] font-black text-[#d4af37]/60 uppercase tracking-[0.2em]">Status</th>
              <th className="px-8 py-5 text-left text-[10px] font-black text-[#d4af37]/60 uppercase tracking-[0.2em]">Total Price</th>
              <th className="px-8 py-5 text-right text-[10px] font-black text-[#d4af37]/60 uppercase tracking-[0.2em]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#d4af37]/5">
            {bookings.map((booking) => (
              <tr key={booking._id} className="hover:bg-[#d4af37]/3 transition-colors group">
                <td className="px-8 py-6 whitespace-nowrap">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-[#d4af37]/5 border border-[#d4af37]/10 rounded-xl flex items-center justify-center shrink-0">
                         <Home size={18} className="text-[#d4af37]/60" />
                      </div>
                      <div className="text-sm font-bold text-[#f8f6f3] group-hover:text-[#d4af37] transition-colors" style={{ fontFamily: "'Playfair Display', serif" }}>
                        {booking.houseId?.title || "Unknown Property"}
                      </div>
                   </div>
                </td>
                <td className="px-8 py-6 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center">
                       <User size={14} className="text-[#9a9a9a]" />
                    </div>
                    <div className="text-[11px] font-bold text-[#9a9a9a] uppercase tracking-widest">
                      {role === "tenant"
                        ? booking.ownerId?.name || "Owner"
                        : booking.tenantId?.name || "Tenant"}
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6 whitespace-nowrap">
                  <div className="text-[10px] font-black text-[#9a9a9a]/60 uppercase tracking-tighter flex items-center gap-2">
                    <Calendar size={12} className="text-[#d4af37]/40" />
                    <span>{new Date(booking.startDate).toLocaleDateString()}</span>
                    <ChevronRight size={10} className="text-[#d4af37]/20" />
                    <span>{new Date(booking.endDate).toLocaleDateString()}</span>
                  </div>
                </td>
                <td className="px-8 py-6 whitespace-nowrap">
                  <div className="flex flex-col gap-2">
                    <span
                      className={`px-3 py-1 inline-flex text-[9px] font-black rounded-lg uppercase tracking-[0.15em] border ${
                        booking.status === "approved"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : booking.status === "pending"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : booking.status === "cancelled" || booking.status === "rejected"
                              ? "bg-red-500/10 text-red-500 border-red-500/20"
                              : "bg-white/5 text-[#9a9a9a] border-white/10"
                      }`}
                    >
                      {booking.status}
                    </span>
                    
                    {booking.paymentStatus === "paid" && (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 bg-[#d4af37] text-[#0a0a0a] text-[8px] font-black rounded-sm uppercase tracking-widest shadow-lg shadow-[#d4af37]/20">
                        <CheckCircle2 size={10} /> Paid
                      </span>
                    )}
                    {booking.paymentStatus !== "paid" && booking.paymentId && (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-500 text-[#0a0a0a] text-[8px] font-black rounded-sm uppercase tracking-widest">
                        <Clock size={10} /> Processing
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-8 py-6 whitespace-nowrap">
                   <div className="flex flex-col">
                      <span className="text-sm font-bold text-[#f8f6f3]">ETB {booking.totalAmount?.toLocaleString()}</span>
                      <span className="text-[8px] text-[#9a9a9a]/40 font-black uppercase tracking-widest">Aggregate Transfer</span>
                   </div>
                </td>
                <td className="px-8 py-6 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-3">
                    {role === "owner" && booking.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(booking._id, "approved")}
                          className="px-4 py-2 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/10"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(booking._id, "rejected")}
                          className="px-4 py-2 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500/10 transition-all"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {role === "tenant" &&
                      booking.status === "approved" &&
                      booking.paymentStatus !== "paid" &&
                      !booking.paymentId && (
                        <button
                          onClick={() => handlePayment(booking)}
                          className="px-6 py-2.5 bg-[#d4af37] text-[#0a0a0a] text-[10px] font-black uppercase tracking-[0.2em] rounded-xl shadow-xl shadow-[#d4af37]/20 hover:bg-[#b8941f] transition-all flex items-center gap-2 group/pay"
                        >
                          <CreditCard size={14} className="group-hover/pay:scale-110 transition-transform" />
                          Pay Now
                        </button>
                      )}
                    
                    {booking.status !== "cancelled" &&
                      booking.status !== "rejected" &&
                      booking.paymentStatus !== "paid" && (
                        <button
                          onClick={() => handleCancel(booking._id)}
                          className="p-2 text-[#9a9a9a]/40 hover:text-red-500 transition-colors"
                          title="Cancel Booking"
                        >
                          <X size={18} />
                        </button>
                      )}
                  </div>
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr>
                <td colSpan="6" className="px-8 py-24 text-center">
                   <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                      <Home size={32} className="text-[#9a9a9a]/20" />
                   </div>
                   <h3 className="text-xl text-[#f8f6f3] mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>No Active Bookings</h3>
                   <p className="text-[10px] text-[#9a9a9a] uppercase font-bold tracking-[0.3em]">Explore properties around you to book your next stay.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showPaymentModal && selectedBooking && (
        <PaymentModal
          booking={selectedBooking}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false);
            fetchBookings();
          }}
        />
      )}
    </div>
  );
};

export default BookingList;
