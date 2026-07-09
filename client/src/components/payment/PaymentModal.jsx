import React, { useState } from "react";
import toast from "react-hot-toast";
import paymentService from "../../api/paymentService";
import LoadingSpinner from "../ui/LoadingSpinner";
import {
  Shield,
  CreditCard,
  X,
  Info,
  MapPin,
  Calendar,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import logger from "../../utils/logger";
import { motion } from "framer-motion";
import { SERVICE_FEE_RATE, calculateServiceFee } from "../../utils/priceUtils";

const PaymentModal = ({ booking, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("chapa");

  const rentAmount = booking.totalAmount || 0;
  const serviceFee = calculateServiceFee(rentAmount);
  const totalAmount = rentAmount + serviceFee;

  const handleInitiatePayment = async () => {
    try {
      setLoading(true);
      if (!booking?._id) {
        toast.error("Protocol error: Invalid booking identifier");
        return;
      }
      const payload = { bookingId: booking._id, paymentMethod };
      const result = await paymentService.initiatePayment(payload);
      if (result.data?.checkoutUrl) {
        setRedirecting(true);
        toast.success("Initializing secure payment gateway...");
        logger.info("Payment session initiated", { bookingId: booking._id, paymentMethod });
        setTimeout(() => { window.location.href = result.data.checkoutUrl; }, 1500);
      } else {
        throw new Error("Handshake failed with payment provider");
      }
    } catch (err) {
      logger.error("Financial transaction initiation failed", err);
      toast.error(err.response?.data?.message || "Transaction protocol failure");
    } finally {
      if (!redirecting) setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100"
      >
        {/* Premium Light Header */}
        <div className="h-28 bg-gradient-to-br from-[#FFF5F2] to-white relative flex items-end p-6 border-b border-[#E67E5F]/10">
          <button
            onClick={onClose}
            disabled={loading}
            className="absolute top-4 right-4 p-2 bg-white hover:bg-gray-50 text-gray-500 hover:text-[#E67E5F] rounded-full transition-all shadow-sm border border-gray-100"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-4">
            <div className="h-14 w-14 bg-gray-100 rounded-xl overflow-hidden shadow-md border border-white shrink-0">
              {booking.houseId?.images?.[0] ? (
                <img
                  src={booking.houseId.images[0]}
                  alt="Estate"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <MapPin size={24} className="text-[#E67E5F]/50" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl text-[#3D2C29] font-bold leading-tight truncate pr-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                {booking.houseId?.title || "Booking Payment"}
              </h2>
              <p className="text-[#E67E5F] text-[10px] uppercase font-bold tracking-[0.1em] flex items-center gap-1.5 mt-1">
                <MapPin size={10} />
                {booking.houseId?.location?.address || "Location Details"}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Detailed Intelligence */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                Check-in
              </p>
              <p className="text-xs font-bold text-[#3D2C29] flex items-center gap-1.5">
                <Calendar size={14} className="text-[#E67E5F]" />
                {new Date(booking.startDate).toLocaleDateString(undefined, {
                  month: "short", day: "numeric", year: "numeric",
                })}
              </p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                Check-out
              </p>
              <p className="text-xs font-bold text-[#3D2C29] flex items-center gap-1.5">
                <Calendar size={14} className="text-[#E67E5F]" />
                {new Date(booking.endDate).toLocaleDateString(undefined, {
                  month: "short", day: "numeric", year: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Pricing Ledger */}
          <div className="space-y-2.5 mb-6">
            <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em] border-b border-gray-100 pb-2">
              Payment Summary
            </h3>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 font-medium tracking-tight">Base Rent</span>
              <span className="font-bold text-[#3D2C29]">
                ETB {rentAmount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <div className="flex items-center gap-1.5 group cursor-help">
                <span className="text-gray-600 font-medium tracking-tight">Service Fee ({Math.round(SERVICE_FEE_RATE * 100)}%)</span>
                <Info size={12} className="text-gray-300 group-hover:text-[#E67E5F] transition-colors" />
              </div>
              <span className="font-bold text-[#3D2C29]">
                ETB {serviceFee.toLocaleString()}
              </span>
            </div>
            <div className="pt-3 border-t border-gray-100 flex justify-between items-center bg-[#FFF5F2]/50 -mx-3 px-3 py-2.5 rounded-lg mt-1">
              <div>
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-0.5">Total Amount</span>
                <span className="text-xl font-bold text-[#E67E5F]" style={{ fontFamily: "'Playfair Display', serif" }}>
                  ETB {totalAmount.toLocaleString()}
                </span>
              </div>
              <div className="bg-white p-2 rounded-full shadow-sm text-[#E67E5F]">
                 <TrendingUp size={16} />
              </div>
            </div>
          </div>

          {/* Secure Protocols */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
              <div className="bg-[#FFF5F2] p-2 rounded-lg text-[#E67E5F]">
                <Shield size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#3D2C29] tracking-tight">
                  Secure Payment
                </p>
                <p className="text-[10px] text-gray-500 leading-tight mt-0.5">
                  Processed securely. We don't store card details.
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-gray-50 border border-gray-100 p-3.5">
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.1em] mb-2.5">
                Payment Method
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("chapa")}
                  disabled={loading || redirecting}
                  className={`rounded-lg border py-2.5 text-xs font-bold transition-all shadow-sm ${
                    paymentMethod === "chapa"
                      ? "border-[#E67E5F] bg-[#FFF5F2] text-[#E67E5F]"
                      : "border-gray-200 bg-white text-gray-600 hover:border-[#E67E5F]/30"
                  }`}
                >
                  Chapa
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("stripe")}
                  disabled={loading || redirecting}
                  className={`rounded-lg border py-2.5 text-xs font-bold transition-all shadow-sm ${
                    paymentMethod === "stripe"
                      ? "border-[#E67E5F] bg-[#FFF5F2] text-[#E67E5F]"
                      : "border-gray-200 bg-white text-gray-600 hover:border-[#E67E5F]/30"
                  }`}
                >
                  Stripe
                </button>
              </div>
            </div>

            <button
              onClick={handleInitiatePayment}
              disabled={loading || redirecting}
              className="w-full bg-[#E67E5F] hover:bg-[#d96a4a] text-white font-bold text-sm tracking-wide py-3 rounded-lg shadow-lg shadow-[#E67E5F]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 group"
            >
              {loading || redirecting ? (
                <>
                  <LoadingSpinner size="sm" variant="secondary" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CreditCard size={16} />
                  <span>Pay ETB {totalAmount.toLocaleString()}</span>
                  <ArrowRight size={16} className="translate-x-0 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <p className="text-[9px] text-center text-gray-400 px-4 leading-tight">
              By proceeding, you agree to our Terms of Service & Privacy Policy.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentModal;
