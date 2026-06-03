import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import paymentService from "../../api/paymentService";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import {
  Receipt,
  RotateCcw,
  Loader2,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  X,
  Plus,
  Download,
  SlidersHorizontal,
  Home,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import socket from "../../utils/socket";
import { motion, AnimatePresence } from "framer-motion";

const CORAL = "#E67E5F";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function StatusBadge({ status }) {
  const map = {
    succeeded: { bg: "#D1FAE5", color: "#065F46", label: "Paid" },
    paid:      { bg: "#D1FAE5", color: "#065F46", label: "Paid" },
    processing:{ bg: "#FEF3C7", color: "#92400E", label: "Processing" },
    pending:   { bg: "#FEF3C7", color: "#92400E", label: "Pending" },
    failed:    { bg: "#FEE2E2", color: "#991B1B", label: "Failed" },
    refunded:  { bg: "#E0E7FF", color: "#3730A3", label: "Refunded" },
    cancelled: { bg: "#F3F4F6", color: "#6B7280", label: "Cancelled" },
  };
  const s = map[status] || map.pending;
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full"
      style={{ background: s.bg, color: s.color }}
    >
      <CheckCircle2 size={11} />
      {s.label}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const PaymentHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [filters, setFilters] = useState({ status: "", method: "" });
  const [showRefundModal, setShowRefundModal] = useState(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundingId, setRefundingId] = useState(null);

  const fetchPayments = useCallback(async (page = pagination.page) => {
    try {
      setLoading(true);
      const result = await paymentService.getPaymentHistory({
        page,
        limit: pagination.limit,
        ...filters,
      });
      if (result.success) {
        setPayments(result.data.payments || []);
        setPagination(result.data.pagination);
      }
    } catch {
      toast.error("Failed to load payment history.");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  // Socket live updates
  useEffect(() => {
    if (!socket.connected) return;
    const update = (data) => {
      setPayments((p) => p.map((x) => x._id === data.paymentId ? { ...x, status: data.status } : x));
    };
    socket.on("payment:success", (d) => update({ ...d, status: "succeeded" }));
    socket.on("payment:failed",  (d) => update({ ...d, status: "failed" }));
    socket.on("payment:update",  update);
    socket.on("refund:processed",(d) => update({ ...d, status: "refunded" }));
    return () => {
      socket.off("payment:success");
      socket.off("payment:failed");
      socket.off("payment:update");
      socket.off("refund:processed");
    };
  }, []);

  const handleRefundSubmit = async () => {
    if (!refundReason) { toast.error("Please provide a reason."); return; }
    setRefundingId(showRefundModal._id);
    try {
      await paymentService.processRefund(showRefundModal._id, { reason: refundReason });
      toast.success("Refund processed successfully.");
      setShowRefundModal(null);
      setRefundReason("");
      fetchPayments();
    } catch (err) {
      toast.error(err.response?.data?.message || "Refund failed.");
    } finally {
      setRefundingId(null);
    }
  };

  // ── Placeholder saved card (cosmetic) ──
  const savedCard = { last4: "4242", brand: "Visa", expires: "12/25" };

  // ── Footer ──
  const footer = (
    <footer className="border-t border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <button onClick={() => navigate("/")} className="text-base font-bold" style={{ color: CORAL }}>Gojo</button>
        <nav className="flex flex-wrap justify-center gap-5 text-xs text-gray-500">
          <a href="#support" className="hover:text-gray-800">Support Center</a>
          <a href="#trust"   className="hover:text-gray-800">Trust &amp; Safety</a>
          <a href="#terms"   className="hover:text-gray-800">Terms of Service</a>
          <a href="#privacy" className="hover:text-gray-800">Privacy Policy</a>
          <button onClick={() => navigate("/owner/dashboard")} className="hover:text-gray-800">List your Property</button>
        </nav>
        <p className="text-xs text-gray-400">© 2024 Gojo Ethiopia. All rights reserved. Built with hospitality.</p>
      </div>
    </footer>
  );

  return (
    <DashboardLayout footer={footer}>
      <div className="py-8 px-6 md:px-10">
        {/* ── Page heading ─────────────────────────────────────────── */}
        <div className="mb-7">
          <h1 className="text-3xl font-bold text-gray-900">Payment Methods</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your saved cards and view transaction history.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left: Saved Cards ──────────────────────────────────── */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Saved Cards</h2>

            {/* Card */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-3">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-7 rounded-md flex items-center justify-center" style={{ background: "#EBF3FB" }}>
                    <CreditCard size={16} style={{ color: CORAL }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {savedCard.brand} ending in {savedCard.last4}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  Default
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">Expires {savedCard.expires}</p>
                <button className="text-xs font-semibold hover:underline" style={{ color: CORAL }}>Edit</button>
              </div>
            </div>

            {/* Add payment method */}
            <button className="w-full border-2 border-dashed border-gray-200 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 text-gray-500 hover:border-gray-300 hover:bg-gray-50 transition-colors">
              <Plus size={20} className="text-gray-400" />
              <span className="text-sm font-medium">Add Payment Method</span>
            </button>
          </div>

          {/* ── Right: Recent Transactions ─────────────────────────── */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Recent Transactions</h2>
              <div className="flex items-center gap-2">
                {/* Status filter */}
                <select
                  value={filters.status}
                  onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 focus:outline-none"
                >
                  <option value="">All</option>
                  <option value="succeeded">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>
                <button
                  onClick={() => fetchPayments(1)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition-colors"
                >
                  <SlidersHorizontal size={13} />
                  Filter
                </button>
              </div>
            </div>

            {/* Transaction list */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: CORAL, borderTopColor: "transparent" }} />
                </div>
              ) : payments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                  <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center mb-3">
                    <Receipt size={24} style={{ color: CORAL }} />
                  </div>
                  <p className="text-sm font-semibold text-gray-700">No transactions yet</p>
                  <p className="text-xs text-gray-400 mt-1">Your payment history will appear here.</p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-gray-50">
                    {payments.map((payment) => (
                      <div key={payment._id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group">
                        {/* Icon */}
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#EBF3FB" }}>
                          <Home size={16} style={{ color: CORAL }} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {payment.houseId?.title || "Property Payment"}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{fmt(payment.createdAt)}</p>
                        </div>

                        {/* Amount + status */}
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-gray-900">
                            ${payment.amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <div className="flex items-center justify-end gap-1.5 mt-1">
                            <StatusBadge status={payment.status} />
                            {/* Download */}
                            <button className="p-1 text-gray-300 hover:text-gray-500 transition-colors" aria-label="Download receipt">
                              <Download size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Admin refund */}
                        {isAdmin && (payment.status === "succeeded" || payment.status === "paid") && (
                          <button
                            onClick={() => setShowRefundModal(payment)}
                            className="ml-2 p-1.5 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                            title="Process refund"
                          >
                            <RotateCcw size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* View all / pagination */}
                  {pagination.pages > 1 ? (
                    <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between">
                      <button
                        disabled={pagination.page === 1}
                        onClick={() => fetchPayments(pagination.page - 1)}
                        className="text-xs text-gray-500 disabled:opacity-30 hover:text-gray-800 transition-colors"
                      >
                        ← Prev
                      </button>
                      <span className="text-xs text-gray-400">
                        Page {pagination.page} of {pagination.pages}
                      </span>
                      <button
                        disabled={pagination.page === pagination.pages}
                        onClick={() => fetchPayments(pagination.page + 1)}
                        className="text-xs text-gray-500 disabled:opacity-30 hover:text-gray-800 transition-colors"
                      >
                        Next →
                      </button>
                    </div>
                  ) : (
                    <div className="px-5 py-3 border-t border-gray-50 text-center">
                      <button
                        className="text-sm font-semibold hover:underline"
                        style={{ color: CORAL }}
                        onClick={() => fetchPayments(1)}
                      >
                        View All Transactions
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Refund modal (admin) ────────────────────────────────────── */}
      <AnimatePresence>
        {showRefundModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md p-7"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-gray-900">Process Refund</h2>
                <button onClick={() => setShowRefundModal(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg">
                  <X size={16} />
                </button>
              </div>

              <p className="text-sm text-gray-600 mb-5">
                Refunding <strong className="text-gray-800">${showRefundModal.amount?.toLocaleString()}</strong> for{" "}
                <strong className="text-gray-800">{showRefundModal.houseId?.title || "this payment"}</strong>.
              </p>

              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Provide a reason for the refund..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowRefundModal(null); setRefundReason(""); }}
                  className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRefundSubmit}
                  disabled={!!refundingId || !refundReason}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {refundingId ? <Loader2 size={15} className="animate-spin" /> : "Confirm Refund"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default PaymentHistory;
