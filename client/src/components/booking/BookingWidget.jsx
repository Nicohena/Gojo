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

  const { subtotal, serviceFee, total, diffDays, serviceFeeRate } = useMemo(
    () => calculateTotalPrice(house.price, startDate, endDate),
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
    <div className="bg-white text-slate-950 border border-slate-200 rounded-2xl p-6 shadow-xl w-full sticky top-28">
      <div className="flex justify-between items-end mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-slate-900">
            ETB {house.price?.toLocaleString()}
          </span>
          <span className="text-base text-slate-600 font-normal">
            / month
          </span>
        </div>
        <div className="flex items-center gap-1 mb-1 text-sm font-semibold text-slate-900">
          <Star size={14} className="fill-slate-900 text-slate-900" />
          <span>
            {house.averageRating?.toFixed(1) || "New"}
          </span>
          <span className="text-slate-500 font-normal underline decoration-slate-300 ml-1">
            {house.ratings?.length || 0} reviews
          </span>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-2 border border-gray-400 rounded-xl overflow-hidden bg-white">
          <div className="p-3 border-r border-gray-400 focus-within:ring-2 focus-within:ring-black relative">
            <p className="text-[10px] font-bold text-slate-900 uppercase tracking-wide mb-1">
              Check-in
            </p>
            <input
              type="date"
              value={startDate}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-sm font-normal text-slate-900 bg-transparent outline-none cursor-pointer"
            />
          </div>
          <div className="p-3 focus-within:ring-2 focus-within:ring-black relative">
            <p className="text-[10px] font-bold text-slate-900 uppercase tracking-wide mb-1">
              Check-out
            </p>
            <input
              type="date"
              value={endDate}
              min={startDate || new Date().toISOString().split("T")[0]}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-sm font-normal text-slate-900 bg-transparent outline-none cursor-pointer"
            />
          </div>
        </div>

        <AnimatePresence>
          {hasOverlapError && (
            <motion.div
              key="overlap-error"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-3 text-red-600 p-4 bg-red-50 rounded-xl border border-red-200"
            >
              <AlertCircle size={18} className="shrink-0" />
              <span className="text-xs font-semibold">
                Selected dates are already booked
              </span>
            </motion.div>
          )}

          {house.minLeaseDuration > 0 && (
            <motion.div
              key="min-lease-info"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 text-slate-800 p-4 bg-slate-100 rounded-xl"
            >
              <ShieldCheck size={18} className="shrink-0" />
              <span className="text-xs font-semibold">
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
        className="w-full py-3.5 bg-[#E67E5F] text-white text-base font-semibold rounded-xl hover:bg-[#d97153] transition-all mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {bookingLoading ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="animate-spin" size={20} />
            <span>Sending Request...</span>
          </div>
        ) : (
          <span>
            {isOwner ? "Owner of Property" : "Reserve"}
          </span>
        )}
      </button>

      <p className="text-sm text-slate-500 text-center mb-6">
        You won't be charged yet
      </p>

      <AnimatePresence>
        {diffDays > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-5 pt-8 border-t border-slate-200 overflow-hidden"
          >
            <div className="flex justify-between items-center text-base text-slate-600">
              <span className="underline">ETB {house.price?.toLocaleString()} x {diffDays} {diffDays === 1 ? 'month' : 'months'}</span>
              <span className="text-slate-900">ETB {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-base text-slate-600">
              <span className="underline">Service Fee</span>
              <span className="text-slate-900">ETB {serviceFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between pt-6 border-t border-slate-200">
              <span className="text-base font-bold text-slate-900">
                Total
              </span>
              <span className="text-base font-bold text-slate-900">
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
