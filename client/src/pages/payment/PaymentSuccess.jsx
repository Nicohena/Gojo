import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import paymentService from "../../api/paymentService";

/**
 * PaymentSuccess
 *
 * Payment providers redirect here after checkout.
 * Chapa may return trx_ref / tx_ref. Stripe returns session_id.
 *
 * We show an appropriate success / failure screen and let the user
 * navigate to their payment history.
 */
const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(false);
  const [verifiedStatus, setVerifiedStatus] = useState(null);

  // Chapa appends ?trx_ref=... and ?status=success|failed to the return_url
  const status = searchParams.get("status");
  const provider = (searchParams.get("provider") || "").toLowerCase();
  const trxRef =
    searchParams.get("trx_ref") ||
    searchParams.get("tx_ref") ||
    searchParams.get("txRef");
  const stripeSessionId =
    searchParams.get("session_id") ||
    searchParams.get("sessionId");
  const paymentId = searchParams.get("paymentId");
  const activeProvider =
    provider ||
    (stripeSessionId || paymentId ? "stripe" : trxRef ? "chapa" : "");

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

        // Poll a few times since gateway confirmation can arrive slightly late.
        for (let attempt = 0; attempt < 5; attempt += 1) {
          const result =
            activeProvider === "stripe"
              ? await paymentService.verifyStripePayment({
                  sessionId: stripeSessionId,
                  paymentId,
                })
              : await paymentService.verifyChapaPayment({ txRef: trxRef });
          latestStatus = result?.data?.status || null;
          setVerifiedStatus(latestStatus);

          if (latestStatus && latestStatus !== "processing" && latestStatus !== "pending") {
            break;
          }

          // Wait 2 seconds before next check.
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-10 text-center border border-slate-100">
        {isSuccess ? (
          <>
            <div className="flex justify-center mb-6">
              <CheckCircle
                className="text-green-500"
                size={72}
                strokeWidth={1.5}
              />
            </div>
            <h1 className="text-3xl font-black text-slate-900 mb-2">
              Payment Successful!
            </h1>
            <p className="text-slate-500 font-medium mb-2">
              {verifiedStatus === "succeeded"
                ? "Your rental payment has been confirmed and recorded."
                : "Your rental payment has been received and is being verified."}
            </p>
            {verifying && (
              <div className="inline-flex items-center gap-2 text-xs text-slate-500 mb-2">
                <Loader2 size={14} className="animate-spin" />
                Verifying payment status...
              </div>
            )}
            {(trxRef || stripeSessionId || paymentId) && (
              <p className="text-xs text-slate-400 mb-8 font-mono bg-slate-50 rounded-xl p-2 border border-slate-100">
                Reference: {trxRef || stripeSessionId || paymentId}
              </p>
            )}
          </>
        ) : (
          <>
            <div className="flex justify-center mb-6">
              <XCircle className="text-red-400" size={72} strokeWidth={1.5} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 mb-2">
              Payment Cancelled
            </h1>
            <p className="text-slate-500 font-medium mb-8">
              Your payment was not completed. You can try again from your
              bookings.
            </p>
          </>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate("/payments")}
            className="w-full py-3.5 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl transition-colors"
          >
            View Payment History
          </button>
          <button
            onClick={() => navigate("/tenant/dashboard")}
            className="w-full py-3.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-2xl transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
