import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import paymentService from "../../api/paymentService";
import Navbar from "../../components/layout/Navbar";
import { TableRowSkeleton } from "../../components/ui/Skeleton";
import { Receipt, RotateCcw, Loader2, Filter, Search, ChevronLeft, ChevronRight, Info, ExternalLink, CheckCircle2, AlertCircle, Clock, ShieldCheck, X } from "lucide-react";
import logger from "../../utils/logger";
import { useAuth } from "../../context/AuthContext";
import socket from "../../utils/socket";
import { motion, AnimatePresence } from "framer-motion";

const PaymentHistory = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refundingId, setRefundingId] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [filters, setFilters] = useState({ status: "", method: "" });
  const [showRefundModal, setShowRefundModal] = useState(null);
  const [refundReason, setRefundReason] = useState("");
  
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isOwner = user?.role === "owner";

  const fetchPayments = useCallback(async (page = pagination.page) => {
    try {
      setLoading(true);
      const result = await paymentService.getPaymentHistory({
        page,
        limit: pagination.limit,
        ...filters
      });
      
      if (result.success) {
        const fetchedPayments = result.data.payments || [];
        setPayments(fetchedPayments);
        setPagination(result.data.pagination);

        // Re-check processing payments to prevent stale "processing" state.
        const processingPayments = fetchedPayments.filter(
          (p) => p.status === "processing"
        );

        if (processingPayments.length > 0) {
          const statusChecks = await Promise.allSettled(
            processingPayments.map((p) => paymentService.getPaymentStatus(p._id))
          );

          const statusMap = {};
          statusChecks.forEach((check, index) => {
            if (check.status === "fulfilled") {
              const paymentId = processingPayments[index]._id;
              const updatedStatus = check.value?.data?.status;
              if (updatedStatus) statusMap[paymentId] = updatedStatus;
            }
          });

          if (Object.keys(statusMap).length > 0) {
            setPayments((prev) =>
              prev.map((p) =>
                statusMap[p._id] ? { ...p, status: statusMap[p._id] } : p
              )
            );
          }
        }
      }
    } catch (err) {
      logger.error("Failed to fetch payments", err);
      toast.error("Failed to load payment history.");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Real-time updates via WebSockets
  useEffect(() => {
    if (!socket.connected) return;

    const handlePaymentUpdate = (data) => {
      console.log("[Socket] Payment update received:", data);
      setPayments(prev => prev.map(p => 
        p._id === data.paymentId ? { ...p, status: data.status } : p
      ));
      
      if (data.status === 'succeeded') {
        toast.success(`Payment ETB ${data.amount?.toLocaleString()} succeeded!`, { icon: '💰' });
      }
    };

    socket.on('payment:success', (data) => handlePaymentUpdate({ ...data, status: 'succeeded' }));
    socket.on('payment:failed', (data) => handlePaymentUpdate({ ...data, status: 'failed' }));
    socket.on('payment:update', handlePaymentUpdate);
    socket.on('refund:processed', (data) => handlePaymentUpdate({ ...data, status: 'refunded' }));

    return () => {
      socket.off('payment:success');
      socket.off('payment:failed');
      socket.off('payment:update');
      socket.off('refund:processed');
    };
  }, []);

  const handleRefundSubmit = async () => {
    if (!refundReason) {
      toast.error("Please provide a reason for the refund.");
      return;
    }

    setRefundingId(showRefundModal._id);
    try {
      await paymentService.processRefund(showRefundModal._id, { reason: refundReason });
      toast.success("Refund processed successfully!");
      setShowRefundModal(null);
      setRefundReason("");
      fetchPayments();
    } catch (err) {
      logger.error("Failed to refund", err);
      toast.error(err.response?.data?.message || "Failed to process refund.");
    } finally {
      setRefundingId(null);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      succeeded: { color: "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400", icon: <CheckCircle2 size={12} /> },
      processing: { color: "border border-blue-500/20 bg-blue-500/10 text-blue-400", icon: <Clock size={12} className="animate-pulse" /> },
      pending: { color: "border border-amber-500/20 bg-amber-500/10 text-amber-400", icon: <Clock size={12} /> },
      failed: { color: "border border-red-500/20 bg-red-500/10 text-red-400", icon: <AlertCircle size={12} /> },
      refunded: { color: "border border-[#d4af37]/20 bg-[#d4af37]/5 text-[#d4af37]/80", icon: <RotateCcw size={12} /> },
      cancelled: { color: "border border-[#9a9a9a]/20 bg-[#9a9a9a]/5 text-[#9a9a9a]", icon: <X size={12} /> }
    };

    const cur = config[status] || config.pending;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold ${cur.color}`}>
        {cur.icon}
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        
        {/* HeaderSection */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl text-[#f8f6f3] flex items-center gap-3" style={{ fontFamily: "'Playfair Display', serif" }}>
              <Receipt className="text-[#d4af37]" />
              Transaction Ledger
            </h1>
            <p className="mt-2 text-[#9a9a9a] tracking-wide">
              Manage and track all financial activities across the platform.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-[#111] border border-[#d4af37]/10">
              <select 
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="bg-transparent text-sm text-[#9a9a9a] px-3 py-2 outline-none cursor-pointer focus:text-[#f8f6f3]"
              >
                <option value="">All Statuses</option>
                <option value="succeeded">Succeeded</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
              <div className="w-px bg-[#d4af37]/10 self-stretch mx-1" />
              <select 
                value={filters.method}
                onChange={(e) => setFilters(prev => ({ ...prev, method: e.target.value }))}
                className="bg-transparent text-sm text-[#9a9a9a] px-3 py-2 outline-none cursor-pointer focus:text-[#f8f6f3]"
              >
                <option value="">All Gateways</option>
                <option value="chapa">Chapa</option>
                <option value="stripe">Stripe</option>
              </select>
            </div>
            
            <button 
              onClick={() => fetchPayments(1)}
              className="p-2.5 border border-[#d4af37]/15 text-[#9a9a9a] hover:border-[#d4af37]/40 hover:text-[#d4af37] transition-colors"
            >
              <Filter size={18} />
            </button>
          </div>
        </div>

        {/* Content Section */}
        <div className="bg-[#111] border border-[#d4af37]/10 overflow-hidden">
          {loading ? (
            <div className="p-8">
              <table className="min-w-full">
                <tbody className="divide-y divide-[#d4af37]/5">
                  {[1, 2, 3, 4, 5].map((i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-6 px-4"><div className="h-4 bg-[#1a1a1a] w-24"></div></td>
                        <td className="py-6 px-4"><div className="h-4 bg-[#1a1a1a] w-32"></div></td>
                        <td className="py-6 px-4"><div className="h-4 bg-[#1a1a1a] w-16"></div></td>
                        <td className="py-6 px-4"><div className="h-6 bg-[#1a1a1a] w-20"></div></td>
                        <td className="py-6 px-4"><div className="h-4 bg-[#1a1a1a] w-24"></div></td>
                      </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#d4af37]/5">
                <thead className="bg-[#0f0f0f]">
                  <tr>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-[#d4af37]/50 uppercase tracking-widest">Transaction Info</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-[#d4af37]/50 uppercase tracking-widest">Property & User</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-[#d4af37]/50 uppercase tracking-widest">Amount</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-[#d4af37]/50 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-[#d4af37]/50 uppercase tracking-widest">Gateway</th>
                    <th className="px-6 py-4 text-right text-[10px] font-bold text-[#d4af37]/50 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d4af37]/5">
                  {payments.map((payment) => (
                    <tr key={payment._id} className="hover:bg-[#d4af37]/3 transition-colors group">
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-mono text-[#9a9a9a] group-hover:text-[#d4af37] transition-colors">
                            #{payment.transactionId || payment._id.substring(0, 10).toUpperCase()}
                          </span>
                          <span className="text-xs text-[#9a9a9a]/50 mt-1 flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(payment.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm text-[#f8f6f3] group-hover:text-[#d4af37] transition-colors">
                            {payment.houseId?.title || "Property Payment"}
                          </span>
                          <span className="text-xs text-[#9a9a9a]">
                            {isAdmin || isOwner ? `By: ${payment.userId?.name || 'User'}` : `To: ${payment.ownerId?.name || 'Owner'}`}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-[#f8f6f3]">
                            {payment.currency} {payment.amount?.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-[#9a9a9a]/50">Total Charged</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        {getStatusBadge(payment.status)}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                           <div className={`p-1 border ${payment.method === 'stripe' ? 'border-indigo-500/20 text-indigo-400' : 'border-[#d4af37]/20 text-[#d4af37]'}`}>
                             {payment.method === 'stripe' ? <ShieldCheck size={14} /> : <div className="text-[8px] font-black uppercase">CHP</div>}
                           </div>
                           <span className="text-xs text-[#9a9a9a] capitalize">{payment.method}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2 text-[#9a9a9a] opacity-0 group-hover:opacity-100 transition-opacity">
                          {isAdmin && (payment.status === "succeeded") && (
                            <button
                              onClick={() => setShowRefundModal(payment)}
                              className="p-2 hover:text-red-400 transition-colors"
                              title="Process Refund"
                            >
                              <RotateCcw size={16} />
                            </button>
                          )}
                          <button className="p-2 hover:text-[#d4af37] transition-colors">
                            <ExternalLink size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-20 text-center">
              <div className="inline-block p-4 border border-[#d4af37]/10 mb-4">
                <Receipt size={36} className="text-[#d4af37]/30" />
              </div>
              <h3 className="text-xl text-[#f8f6f3] mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>No Transactions Found</h3>
              <p className="text-[#9a9a9a] max-w-xs mx-auto tracking-wide">
                No payment history recorded for your selection. Try adjusting your filters.
              </p>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="px-6 py-5 bg-[#0f0f0f] border-t border-[#d4af37]/5 flex items-center justify-between">
              <span className="text-xs text-[#9a9a9a]/50">
                Page {pagination.page} of {pagination.pages}
              </span>
              <div className="flex items-center gap-2">
                <button 
                  disabled={pagination.page === 1 || loading}
                  onClick={() => fetchPayments(pagination.page - 1)}
                  className="p-2 border border-[#d4af37]/10 text-[#9a9a9a] disabled:opacity-30 hover:border-[#d4af37]/40 hover:text-[#f8f6f3] transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="flex gap-1">
                  {[...Array(pagination.pages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => fetchPayments(i + 1)}
                      className={`h-9 w-9 text-xs font-bold transition-all border ${
                        pagination.page === i + 1 
                          ? 'border-[#d4af37] bg-[#d4af37] text-[#0a0a0a]' 
                          : 'border-[#d4af37]/10 text-[#9a9a9a] hover:border-[#d4af37]/40'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button 
                  disabled={pagination.page === pagination.pages || loading}
                  onClick={() => fetchPayments(pagination.page + 1)}
                  className="p-2 border border-[#d4af37]/10 text-[#9a9a9a] disabled:opacity-30 hover:border-[#d4af37]/40 hover:text-[#f8f6f3] transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Admin Refund Modal */}
      <AnimatePresence>
        {showRefundModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="bg-[#111] border border-[#d4af37]/20 max-w-md w-full p-8 overflow-hidden relative"
            >
              <button 
                onClick={() => setShowRefundModal(null)}
                className="absolute top-6 right-6 p-2 text-[#9a9a9a] hover:text-[#f8f6f3] transition-colors"
              >
                <X size={18} />
              </button>

              <div className="mb-8">
                <div className="w-14 h-14 border border-red-500/20 flex items-center justify-center mb-6">
                  <RotateCcw size={24} className="text-red-400" />
                </div>
                <h2 className="text-2xl text-[#f8f6f3]" style={{ fontFamily: "'Playfair Display', serif" }}>Process Refund</h2>
                <p className="text-[#9a9a9a] text-sm mt-2 tracking-wide">
                  You are about to refund <span className="text-[#f8f6f3] font-bold">ETB {showRefundModal.amount.toLocaleString()}</span> for <span className="text-[#d4af37]">{showRefundModal.houseId?.title}</span>.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-[#d4af37]/50 uppercase tracking-widest block mb-2">Refund Reason</label>
                  <textarea 
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="e.g., Booking cancellation by owner, system error..."
                    className="w-full bg-[#1a1a1a] border border-[#d4af37]/10 px-4 py-3 focus:border-[#d4af37]/40 outline-none transition-all resize-none h-28 text-sm text-[#f8f6f3] placeholder-[#9a9a9a]/40"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setShowRefundModal(null)}
                    className="flex-1 py-3 border border-[#d4af37]/15 text-[#9a9a9a] hover:border-[#d4af37]/40 transition-all text-xs tracking-widest uppercase"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleRefundSubmit}
                    disabled={refundingId || !refundReason}
                    className="flex-[2] py-3 bg-red-600/90 text-white font-bold hover:bg-red-600 disabled:opacity-40 transition-all text-xs tracking-widest uppercase flex items-center justify-center gap-2"
                  >
                    {refundingId ? <Loader2 size={16} className="animate-spin" /> : "Confirm Full Refund"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PaymentHistory;
