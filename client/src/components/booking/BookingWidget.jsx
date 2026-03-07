import React, { useState, useEffect, useMemo } from "react";
import {
  Star,
  Loader2,
  Calendar,
  Users,
  Info,
  AlertCircle,
  CreditCard,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { calculateTotalPrice } from "../../utils/priceUtils";
import bookingService from "../../api/bookingService";
import { useAuth } from "../../context/AuthContext";

/**
 * BookingWidget Component
 * Transformed into a floating "Commitment Node" for the luxury dark theme.
 */
const BookingWidget = ({ house, user: propUser, onBookingSuccess }) => {
  const { user: contextUser, loading: authLoading } = useAuth();
  const user = propUser || contextUser;

  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState("");
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [fetchingDates, setFetchingDates] = useState(true);
  const [fetchingUserBookings, setFetchingUserBookings] = useState(false);
  const [hasApprovedBookingForHouse, setHasApprovedBookingForHouse] =
    useState(false);
  const [occupants] = useState({ adults: 1, children: 0 });

  const isOwner = (user?._id || user?.id) === house.ownerId?._id;

  useEffect(() => {
    const fetchDates = async () => {
      try {
        const response = await bookingService.getUnavailableDates(house._id);
        const dates = response.data?.unavailableDates || [];
        setUnavailableDates(
          dates.map((range) => ({
            start: new Date(range.start).toISOString().split("T")[0],
            end: new Date(range.end).toISOString().split("T")[0],
          })),
        );
      } catch (err) {
        console.error("Failed to fetch unavailable dates", err);
      } finally {
        setFetchingDates(false);
      }
    };
    fetchDates();
  }, [house._id]);

  useEffect(() => {
    const checkExistingApprovedBooking = async () => {
      if (!user || user.role !== "tenant" || !house?._id) {
        setHasApprovedBookingForHouse(false);
        return;
      }

      try {
        setFetchingUserBookings(true);
        const response = await bookingService.getBookings();
        const bookings = response?.data?.bookings || [];
        const hasApproved = bookings.some((booking) => {
          const bookingHouseId =
            typeof booking.houseId === "string"
              ? booking.houseId
              : booking.houseId?._id;
          return bookingHouseId === house._id && booking.status === "approved";
        });
        setHasApprovedBookingForHouse(hasApproved);
      } catch {
        setHasApprovedBookingForHouse(false);
      } finally {
        setFetchingUserBookings(false);
      }
    };

    checkExistingApprovedBooking();
  }, [user, house?._id]);

  useEffect(() => {
    if (startDate && house.minLeaseDuration) {
      const start = new Date(startDate);
      const newEnd = new Date(start);
      newEnd.setMonth(newEnd.getMonth() + house.minLeaseDuration);
      setEndDate(newEnd.toISOString().split("T")[0]);
    } else if (startDate && !endDate) {
      const start = new Date(startDate);
      const newEnd = new Date(start);
      newEnd.setMonth(newEnd.getMonth() + 1);
      setEndDate(newEnd.toISOString().split("T")[0]);
    }
  }, [startDate, house.minLeaseDuration]);

  const { subtotal, total, diffDays } = useMemo(
    () => calculateTotalPrice(house.price, startDate, endDate, 350),
    [house.price, startDate, endDate],
  );

  const hasOverlapError = useMemo(() => {
    if (!startDate || !endDate) return false;
    const start = new Date(startDate);
    const end = new Date(endDate);

    return unavailableDates.some((range) => {
      const bookedStart = new Date(range.start);
      const bookedEnd = new Date(range.end);
      return start < bookedEnd && end > bookedStart;
    });
  }, [startDate, endDate, unavailableDates]);

  const handleBooking = async () => {
    if (!user) {
      toast.error("Please login to book this property.");
      return;
    }

    if (isOwner) {
      toast.error("You cannot book your own property.");
      return;
    }

    setBookingLoading(true);
    try {
      await bookingService.createBooking({
        houseId: house._id,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        occupants,
      });
      toast.success(
        "Booking request sent. Waiting for owner approval.",
      );
      if (onBookingSuccess) onBookingSuccess();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to send request";
      toast.error(msg);
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="bg-[#111] border border-[#d4af37]/20 rounded-[3rem] p-10 shadow-[0_0_100px_rgba(0,0,0,1)] w-full">
      <div className="flex justify-between items-start mb-10">
        <div className="flex flex-col">
          <span className="text-[10px] text-[#9a9a9a]/40 font-black uppercase tracking-[0.3em] mb-1">
            Rent
          </span>
          <div className="flex items-baseline gap-2">
            <span
              className="text-4xl font-bold text-[#d4af37]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              ETB {house.price?.toLocaleString()}
            </span>
            <span className="text-[10px] text-[#9a9a9a] font-bold uppercase tracking-widest">
              / Month
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1.5 bg-[#d4af37]/10 px-3 py-1.5 rounded-xl border border-[#d4af37]/10">
            <Star size={14} className="fill-amber-500 text-amber-500" />
            <span className="text-sm font-black text-[#f8f6f3]">
              {house.averageRating?.toFixed(1) || "New"}
            </span>
          </div>
          <span className="text-[9px] text-[#9a9a9a]/50 font-bold uppercase tracking-widest mt-2 underline">
            {house.ratings?.length || 0} Ratings
          </span>
        </div>
      </div>

      <div className="space-y-4 mb-10">
        <div className="grid grid-cols-1 border border-[#d4af37]/10 rounded-[2rem] overflow-hidden bg-[#0a0a0a]/50">
          <div className="p-5 border-b border-[#d4af37]/10 hover:bg-[#d4af37]/5 transition-all relative group">
            <p className="text-[9px] font-black text-[#d4af37]/40 uppercase tracking-[0.2em] mb-2">
              Move-in (Check-in)
            </p>
            <div className="flex items-center gap-4">
              <Calendar size={18} className="text-[#d4af37]/60" />
              <input
                type="date"
                value={startDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-sm font-bold text-[#f8f6f3] bg-transparent outline-none cursor-pointer selection:bg-[#d4af37]/20"
              />
            </div>
          </div>
          <div className="p-5 hover:bg-[#d4af37]/5 transition-all relative group">
            <p className="text-[9px] font-black text-[#d4af37]/40 uppercase tracking-[0.2em] mb-2">
              Move-out (Check-out)
            </p>
            <div className="flex items-center gap-4">
              <Calendar size={18} className="text-[#d4af37]/60" />
              <input
                type="date"
                value={endDate}
                min={startDate || new Date().toISOString().split("T")[0]}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-sm font-bold text-[#f8f6f3] bg-transparent outline-none cursor-pointer selection:bg-[#d4af37]/20"
              />
            </div>
          </div>
        </div>

        <AnimatePresence>
          {hasOverlapError && (
            <motion.div
              key="overlap-error"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-3 text-red-500 p-4 bg-red-500/5 rounded-2xl border border-red-500/20"
            >
              <AlertCircle size={18} className="shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                 Selected dates are already booked
              </span>
            </motion.div>
          )}

          {house.minLeaseDuration > 0 && (
            <motion.div
              key="min-lease-info"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 text-[#d4af37] p-4 bg-[#d4af37]/5 rounded-2xl border border-[#d4af37]/10"
            >
              <ShieldCheck size={18} className="shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                Minimum Rental Duration: {house.minLeaseDuration} Months
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button
        onClick={handleBooking}
        disabled={
          bookingLoading ||
          isOwner ||
          fetchingDates ||
          fetchingUserBookings ||
          hasOverlapError ||
          authLoading
        }
        className="w-full py-6 bg-[#d4af37] text-[#0a0a0a] text-[10px] font-black uppercase tracking-[0.3em] rounded-[2rem] hover:bg-[#b8941f] transition-all shadow-2xl shadow-[#d4af37]/20 mb-4 disabled:opacity-20 disabled:cursor-not-allowed group relative overflow-hidden"
      >
        <AnimatePresence mode="wait">
          {bookingLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center justify-center gap-3"
            >
              <Loader2 className="animate-spin" size={20} />
              <span>Sending Request...</span>
            </motion.div>
          ) : (
            <motion.div
              key="text"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center justify-center gap-3"
            >
              <CreditCard
                size={18}
                className="group-hover:rotate-12 transition-transform"
              />
              <span>
                {isOwner ? "Owner of Property" : "Request Booking"}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      <p className="text-[9px] text-center text-[#9a9a9a]/40 font-black uppercase tracking-[0.4em] mb-10">
        Money held securely until move-in
      </p>

      <AnimatePresence>
        {diffDays > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-5 pt-8 border-t border-[#d4af37]/10 overflow-hidden"
          >
            <div className="flex justify-between items-center text-[11px] font-bold tracking-widest uppercase">
              <span className="text-[#9a9a9a] underline decoration-[#d4af37]/20">
                Rental Period ({diffDays} nights)
              </span>
              <span className="text-[#f8f6f3]">
                ETB {subtotal.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px] font-bold tracking-widest uppercase">
              <span className="text-[#9a9a9a] underline decoration-[#d4af37]/20">
                Service Fee
              </span>
              <span className="text-[#f8f6f3]">ETB 350</span>
            </div>
            <div className="flex justify-between pt-6 border-t border-[#d4af37]/20">
              <span
                className="text-xl font-black text-[#d4af37] tracking-tighter"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Total Rent
              </span>
              <span
                className="text-xl font-black text-[#f8f6f3] tracking-tighter"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                ETB {total.toLocaleString()}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BookingWidget;
