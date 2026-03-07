import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle, Loader2, ArrowRight } from "lucide-react";
import paymentService from "../../api/paymentService";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(false);
  const [verifiedStatus, setVerifiedStatus] = useState(null);

  const status = searchParams.get("status");
  const provider = (searchParams.get("provider") || "").toLowerCase();
  const trxRef = searchParams.get("trx_ref") || searchParams.get("tx_ref") || searchParams.get("txRef");
  const stripeSessionId = searchParams.get("session_id") || searchParams.get("sessionId");
  const paymentId = searchParams.get("paymentId");
  const activeProvider = provider || (stripeSessionId || paymentId ? "stripe" : trxRef ? "chapa" : "");

  const isSuccess = status === "success";

  useEffect(() => {
    const verifyReturnedPayment = async () => {
      if (!isSuccess) return;
      if (activeProvider === "chapa" && !trxRef) return;
      if (activeProvider === "stripe" && !stripeSessionId && !paymentId) return;
      if (!activeProvider) return;

      try {
        setVerifying(true);
        let latestStatus = null;
        for (let attempt = 0; attempt < 5; attempt += 1) {
          const result = activeProvider === "stripe"
            ? await paymentService.verifyStripePayment({ sessionId: stripeSessionId, paymentId })
            : await paymentService.verifyChapaPayment({ txRef: trxRef });
          latestStatus = result?.data?.status || null;
          setVerifiedStatus(latestStatus);
          if (latestStatus && latestStatus !== "processing" && latestStatus !== "pending") break;
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } catch (error) {
        setVerifiedStatus(null);
      } finally {
        setVerifying(false);
      }
    };
    verifyReturnedPayment();
  }, [isSuccess, activeProvider, trxRef, stripeSessionId, paymentId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-6"
      style={{
        backgroundImage: `url('https://images.unsplash.com/photo-1616651283320-ee68a1113d94?auto=format&fit=crop&q=80&w=1600')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-[#0a0a0a]/88" />
      <div className="relative z-10 bg-[#111]/80 backdrop-blur-xl border border-[#d4af37]/20 max-w-md w-full p-10 text-center">
        {/* Logo */}
        <div className="mb-8 cursor-pointer" onClick={() => navigate("/")}>
          <span className="text-[#d4af37] tracking-[0.4em] text-xl" style={{ fontFamily: "'Playfair Display', serif" }}>
            AURA
          </span>
        </div>

        {isSuccess ? (
          <>
            <div className="w-16 h-16 border border-[#d4af37]/30 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="text-[#d4af37]" size={28} strokeWidth={1.5} />
            </div>
            <h1 className="text-3xl text-[#f8f6f3] mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              Payment Confirmed.
            </h1>
            <p className="text-[#9a9a9a] text-sm mb-2 tracking-wide">
              {verifiedStatus === "succeeded"
                ? "Your rental payment has been confirmed and recorded."
                : "Your rental payment has been received and is being verified."}
            </p>
            {verifying && (
              <div className="inline-flex items-center gap-2 text-xs text-[#d4af37]/60 mb-2">
                <Loader2 size={12} className="animate-spin" />
                Verifying payment status...
              </div>
            )}
            {(trxRef || stripeSessionId || paymentId) && (
              <p className="text-xs text-[#9a9a9a]/50 mb-8 font-mono bg-[#1a1a1a] p-3 border border-[#d4af37]/5 mt-4">
                Ref: {trxRef || stripeSessionId || paymentId}
              </p>
            )}
          </>
        ) : (
          <>
            <div className="w-16 h-16 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
              <XCircle className="text-red-400" size={28} strokeWidth={1.5} />
            </div>
            <h1 className="text-3xl text-[#f8f6f3] mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              Payment Cancelled.
            </h1>
            <p className="text-[#9a9a9a] text-sm mb-8 tracking-wide">
              Your payment was not completed. You can try again from your bookings.
            </p>
          </>
        )}

        <div className="flex flex-col gap-3 mt-4">
          <button
            onClick={() => navigate("/payments")}
            className="w-full py-3.5 bg-[#d4af37] text-[#0a0a0a] font-bold tracking-[0.1em] hover:bg-[#b8941f] transition-all flex items-center justify-center gap-2 text-sm"
          >
            View Payment History
            <ArrowRight size={16} />
          </button>
          <button
            onClick={() => navigate("/tenant/dashboard")}
            className="w-full py-3.5 border border-[#d4af37]/20 text-[#9a9a9a] text-sm tracking-wide hover:border-[#d4af37]/40 hover:text-[#f8f6f3] transition-all"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
