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
        toast.success("Initializing secure encrypted payment gateway...");
        logger.info("Payment session initiated", { bookingId: booking._id, paymentMethod });
        setTimeout(() => { window.location.href = result.data.checkoutUrl; }, 1500);
      } else {
        throw new Error("Encrypted handshake failed with payment provider");
      }
    } catch (err) {
      logger.error("Financial transaction initiation failed", err);
      toast.error(err.response?.data?.message || "Transaction protocol failure");
    } finally {
      if (!redirecting) setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0a0a]/80 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 30 }}
        className="bg-[#111] rounded-[2rem] shadow-[0_0_80px_rgba(0,0,0,0.5)] max-w-lg w-full overflow-hidden border border-[#d4af37]/10"
      >
        {/* Luxury Header */}
        <div className="h-40 bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] relative flex items-end p-8 border-b border-[#d4af37]/10">
          <button
            onClick={onClose}
            disabled={loading}
            className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 text-[#d4af37] rounded-full transition-all border border-[#d4af37]/10"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-6">
            <div className="h-20 w-20 bg-[#0a0a0a] rounded-2xl overflow-hidden shadow-2xl border border-[#d4af37]/20 shrink-0">
              {booking.houseId?.images?.[0] ? (
                <img
                  src={booking.houseId.images[0]}
                  alt="Estate"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <MapPin size={28} className="text-[#d4af37]" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl text-white leading-tight truncate pr-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                {booking.houseId?.title || "Booking Payment"}
              </h2>
              <p className="text-[#d4af37]/60 text-[10px] uppercase font-bold tracking-[0.2em] flex items-center gap-2 mt-2">
                <MapPin size={12} className="text-[#d4af37]" />{" "}
                {booking.houseId?.location?.address || "Global Territory Address"}
              </p>
            </div>
          </div>
        </div>

        <div className="p-8">
          {/* Detailed Intelligence */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="p-4 bg-[#0a0a0a] rounded-2xl border border-[#d4af37]/5">
              <p className="text-[10px] font-black text-[#d4af37]/40 uppercase tracking-widest mb-2">
                Commencement
              </p>
              <p className="text-sm font-bold text-[#f8f6f3] flex items-center gap-3">
                <Calendar size={16} className="text-[#d4af37]" />
                {new Date(booking.startDate).toLocaleDateString(undefined, {
                  month: "short", day: "numeric", year: "numeric",
                })}
              </p>
            </div>
            <div className="p-4 bg-[#0a0a0a] rounded-2xl border border-[#d4af37]/5">
              <p className="text-[10px] font-black text-[#d4af37]/40 uppercase tracking-widest mb-2">
                Termination
              </p>
              <p className="text-sm font-bold text-[#f8f6f3] flex items-center gap-3">
                <Calendar size={16} className="text-[#d4af37]" />
                {new Date(booking.endDate).toLocaleDateString(undefined, {
                  month: "short", day: "numeric", year: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Pricing Ledger */}
          <div className="space-y-4 mb-10">
            <h3 className="text-[10px] font-black text-[#9a9a9a] uppercase tracking-[0.3em] border-b border-[#d4af37]/10 pb-3">
              Financial Specifications
            </h3>
            <div className="flex justify-between text-base">
              <span className="text-[#9a9a9a] font-medium tracking-tight">Base Estate Fee</span>
              <span className="font-bold text-[#f8f6f3]">
                ETB {rentAmount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-base">
              <div className="flex items-center gap-2 group cursor-help">
                <span className="text-[#9a9a9a] font-medium tracking-tight">Security & Logistics ({Math.round(SERVICE_FEE_RATE * 100)}%)</span>
                <Info size={14} className="text-[#d4af37]/40 group-hover:text-[#d4af37] transition-colors" />
              </div>
              <span className="font-bold text-[#f8f6f3]">
                ETB {serviceFee.toLocaleString()}
              </span>
            </div>
            <div className="pt-5 border-t border-[#d4af37]/10 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black text-[#9a9a9a] uppercase tracking-widest block mb-1">Total Amount</span>
                <span className="text-3xl font-bold text-[#d4af37]" style={{ fontFamily: "'Playfair Display', serif" }}>
                  ETB {totalAmount.toLocaleString()}
                </span>
              </div>
              <div className="bg-[#d4af37]/10 p-3 rounded-full">
                 <TrendingUp size={24} className="text-[#d4af37]" />
              </div>
            </div>
          </div>

          {/* Secure Protocols */}
          <div className="space-y-6">
            <div className="flex items-center gap-5 bg-[#d4af37]/5 p-5 rounded-2xl border border-[#d4af37]/10">
              <div className="bg-[#d4af37] p-3 rounded-xl text-[#0a0a0a] shadow-lg shadow-[#d4af37]/20">
                <Shield size={24} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-[#f8f6f3] uppercase tracking-widest">
                  Secure Encryption
                </p>
                <p className="text-[11px] text-[#9a9a9a]/80 leading-relaxed mt-1">
                  End-to-end encrypted ledger verification via 256-bit secure gateway.
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-[#0a0a0a] border border-[#d4af37]/5 p-6">
              <p className="text-[10px] font-black text-[#9a9a9a] uppercase tracking-[0.2em] mb-4">
                Encryption Method
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("chapa")}
                  disabled={loading || redirecting}
                  className={`rounded-xl border py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                    paymentMethod === "chapa"
                      ? "border-[#d4af37] bg-[#d4af37] text-[#0a0a0a]"
                      : "border-[#d4af37]/10 text-[#9a9a9a] hover:border-[#d4af37]/40"
                  }`}
                >
                  Chapa Core
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("stripe")}
                  disabled={loading || redirecting}
                  className={`rounded-xl border py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                    paymentMethod === "stripe"
                      ? "border-[#d4af37] bg-[#d4af37] text-[#0a0a0a]"
                      : "border-[#d4af37]/10 text-[#9a9a9a] hover:border-[#d4af37]/40"
                  }`}
                >
                  Stripe Global
                </button>
              </div>
            </div>

            <button
              onClick={handleInitiatePayment}
              disabled={loading || redirecting}
              className="w-full bg-[#d4af37] hover:bg-[#b8941f] text-[#0a0a0a] font-black text-xs uppercase tracking-[0.3em] py-5 rounded-2xl shadow-xl shadow-[#d4af37]/10 transition-all flex items-center justify-center gap-4 disabled:opacity-50 group"
            >
              {loading || redirecting ? (
                <>
                  <LoadingSpinner size="sm" variant="secondary" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CreditCard size={18} />
                  <span>Pay Now</span>
                  <ArrowRight size={18} className="translate-x-0 group-hover:translate-x-1.5 transition-transform" />
                </>
              )}
            </button>

            <p className="text-[10px] text-center text-[#9a9a9a]/40 px-10 leading-relaxed">
              By paying, you consent to our terms of service and booking agreements.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentModal;
