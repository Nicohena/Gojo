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

  useEffect(() => {
    if (!socket.connected) return;

    const handlePaymentUpdate = (data) => {
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
      processing: { color: "border border-[#d4af37]/20 bg-[#d4af37]/10 text-[#d4af37]", icon: <Clock size={12} className="animate-pulse" /> },
      pending: { color: "border border-amber-500/20 bg-amber-500/10 text-amber-400", icon: <Clock size={12} /> },
      failed: { color: "border border-red-500/20 bg-red-500/10 text-red-400", icon: <AlertCircle size={12} /> },
      refunded: { color: "border border-[#d4af37]/20 bg-[#d4af37]/5 text-[#d4af37]/80", icon: <RotateCcw size={12} /> },
      cancelled: { color: "border border-[#9a9a9a]/20 bg-[#9a9a9a]/5 text-[#9a9a9a]", icon: <X size={12} /> }
    };

    const cur = config[status] || config.pending;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black tracking-widest ${cur.color}`}>
        {cur.icon}
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        
        {/* HeaderSection */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          <div>
            <h1 className="text-4xl text-[#f8f6f3]" style={{ fontFamily: "'Playfair Display', serif" }}>
              Financial Ledger
            </h1>
            <p className="mt-2 text-[#9a9a9a] text-[10px] uppercase font-bold tracking-[0.2em]">
              Real-time audit of all secure estate transactions.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex bg-[#111] border border-[#d4af37]/10 rounded-xl overflow-hidden shadow-2xl">
              <select 
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="bg-transparent text-[10px] font-black uppercase tracking-widest text-[#9a9a9a] px-5 py-3 outline-none cursor-pointer focus:text-[#d4af37] transition-colors"
              >
                <option value="">Status: All</option>
                <option value="succeeded">Succeeded</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
              <div className="w-px bg-[#d4af37]/10 self-stretch" />
              <select 
                value={filters.method}
                onChange={(e) => setFilters(prev => ({ ...prev, method: e.target.value }))}
                className="bg-transparent text-[10px] font-black uppercase tracking-widest text-[#9a9a9a] px-5 py-3 outline-none cursor-pointer focus:text-[#d4af37] transition-colors"
              >
                <option value="">Gateway: All</option>
                <option value="chapa">Chapa Core</option>
                <option value="stripe">Stripe Global</option>
              </select>
            </div>
            
            <button 
              onClick={() => fetchPayments(1)}
              className="p-3 bg-[#d4af37]/10 border border-[#d4af37]/20 text-[#d4af37] hover:bg-[#d4af37]/20 transition-all rounded-xl"
            >
              <Filter size={18} />
            </button>
          </div>
        </div>

        {/* Content Section */}
        <div className="bg-[#111] border border-[#d4af37]/10 rounded-2xl overflow-hidden shadow-2xl">
          {loading ? (
            <div className="p-8">
              <table className="min-w-full">
                <tbody className="divide-y divide-[#d4af37]/5">
                  {[1, 2, 3, 4, 5].map((i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-8 px-6"><div className="h-4 bg-white/5 w-24 rounded-full"></div></td>
                        <td className="py-8 px-6"><div className="h-4 bg-white/5 w-40 rounded-full"></div></td>
                        <td className="py-8 px-6"><div className="h-4 bg-white/5 w-16 rounded-full"></div></td>
                        <td className="py-8 px-6"><div className="h-6 bg-white/5 w-24 rounded-full"></div></td>
                        <td className="py-8 px-6"><div className="h-4 bg-white/5 w-24 rounded-full"></div></td>
                      </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#d4af37]/5">
                <thead className="bg-[#0a0a0a]">
                  <tr>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-[#d4af37]/50 uppercase tracking-widest">Descriptor</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-[#d4af37]/50 uppercase tracking-widest">Entity Intelligence</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-[#d4af37]/50 uppercase tracking-widest">Bond Value</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-[#d4af37]/50 uppercase tracking-widest">Clearance</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-[#d4af37]/50 uppercase tracking-widest">Vector</th>
                    <th className="px-8 py-5 text-right text-[10px] font-black text-[#d4af37]/50 uppercase tracking-widest">Diagnostics</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d4af37]/5">
                  {payments.map((payment) => (
                    <tr key={payment._id} className="hover:bg-[#d4af37]/3 transition-colors group">
                      <td className="px-8 py-6 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-[#d4af37] tracking-widest uppercase">
                            #{payment.transactionId || payment._id.substring(0, 10).toUpperCase()}
                          </span>
                          <span className="text-[10px] text-[#9a9a9a]/40 mt-1 flex items-center gap-1 font-bold uppercase tracking-tight">
                            <Clock size={10} />
                            {new Date(payment.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-[#f8f6f3] group-hover:text-[#d4af37] transition-colors" style={{ fontFamily: "'Playfair Display', serif" }}>
                            {payment.houseId?.title || "Establishment Bond"}
                          </span>
                          <span className="text-[10px] text-[#9a9a9a] uppercase font-bold tracking-widest mt-1">
                            {isAdmin || isOwner ? `Identity: ${payment.userId?.name || 'Authorized User'}` : `Target: ${payment.ownerId?.name || 'Estate Owner'}`}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-[#f8f6f3]">
                            {payment.currency} {payment.amount?.toLocaleString()}
                          </span>
                          <span className="text-[8px] text-[#9a9a9a]/40 uppercase font-bold tracking-widest mt-1">Total Payload</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 whitespace-nowrap">
                        {getStatusBadge(payment.status)}
                      </td>
                      <td className="px-8 py-6 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                           <div className={`p-1.5 border rounded-lg ${payment.method === 'stripe' ? 'border-indigo-500/20 text-indigo-400 bg-indigo-500/5' : 'border-[#d4af37]/20 text-[#d4af37] bg-[#d4af37]/5'}`}>
                             {payment.method === 'stripe' ? <ShieldCheck size={14} /> : <div className="text-[7px] font-black uppercase">CHP</div>}
                           </div>
                           <span className="text-[10px] text-[#9a9a9a] uppercase font-bold tracking-widest">{payment.method} Interface</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-3 text-[#9a9a9a] opacity-0 group-hover:opacity-100 transition-opacity">
                          {isAdmin && (payment.status === "succeeded") && (
                            <button
                              onClick={() => setShowRefundModal(payment)}
                              className="p-2 border border-red-500/10 hover:bg-red-500/10 hover:text-red-400 transition-all rounded-lg"
                              title="Initiate Reversal"
                            >
                              <RotateCcw size={14} />
                            </button>
                          )}
                          <button className="p-2 border border-[#d4af37]/10 hover:bg-[#d4af37]/10 hover:text-[#d4af37] transition-all rounded-lg">
                            <ExternalLink size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-24 text-center">
              <div className="inline-block p-6 bg-[#0a0a0a] border border-[#d4af37]/10 rounded-[2rem] mb-6">
                <Receipt size={48} className="text-[#d4af37]/20" />
              </div>
              <h3 className="text-2xl text-[#f8f6f3] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>Ledger Empty</h3>
              <p className="text-[#9a9a9a] max-w-xs mx-auto text-sm tracking-wide">
                No financial history has been committed to this ledger search.
              </p>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="px-8 py-6 bg-[#0a0a0a] border-t border-[#d4af37]/5 flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#9a9a9a]/40 uppercase tracking-widest">
                Dossier {pagination.page} / {pagination.pages}
              </span>
              <div className="flex items-center gap-3">
                <button 
                  disabled={pagination.page === 1 || loading}
                  onClick={() => fetchPayments(pagination.page - 1)}
                  className="p-2 border border-[#d4af37]/10 text-[#9a9a9a] disabled:opacity-20 hover:border-[#d4af37]/40 hover:text-[#d4af37] transition-all rounded-lg"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="flex gap-2">
                  {[...Array(pagination.pages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => fetchPayments(i + 1)}
                      className={`h-10 w-10 text-[10px] font-black transition-all border rounded-lg ${
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
                  className="p-2 border border-[#d4af37]/10 text-[#9a9a9a] disabled:opacity-20 hover:border-[#d4af37]/40 hover:text-[#d4af37] transition-all rounded-lg"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0a0a]/90 backdrop-blur-xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="bg-[#111] border border-[#d4af37]/20 max-w-md w-full p-10 rounded-[2rem] overflow-hidden relative shadow-2xl"
            >
              <button 
                onClick={() => setShowRefundModal(null)}
                className="absolute top-8 right-8 p-2 text-[#9a9a9a] hover:text-[#d4af37] transition-colors"
              >
                <X size={20} />
              </button>

              <div className="mb-10">
                <div className="w-16 h-16 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-center justify-center mb-6">
                  <RotateCcw size={28} className="text-red-400" />
                </div>
                <h2 className="text-3xl text-[#f8f6f3]" style={{ fontFamily: "'Playfair Display', serif" }}>Reversal Audit</h2>
                <p className="text-[#9a9a9a] text-sm mt-3 leading-relaxed">
                  Executing a complete reversal of <span className="text-[#f8f6f3] font-bold">ETB {showRefundModal.amount.toLocaleString()}</span> for <span className="text-[#d4af37]">{showRefundModal.houseId?.title}</span>.
                </p>
              </div>

              <div className="space-y-8">
                <div>
                  <label className="text-[10px] font-black text-[#d4af37]/40 uppercase tracking-[0.2em] block mb-3">Reversal Justification</label>
                  <textarea 
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="Provide detailed reasoning for final record..."
                    className="w-full bg-[#0a0a0a] border border-[#d4af37]/10 rounded-xl px-4 py-4 focus:border-[#d4af37]/40 outline-none transition-all resize-none h-32 text-sm text-[#f8f6f3] placeholder-[#9a9a9a]/20 font-medium"
                  />
                </div>

                <div className="flex gap-4 pt-2">
                  <button 
                    onClick={() => setShowRefundModal(null)}
                    className="flex-1 py-4 border border-[#d4af37]/10 text-[#9a9a9a] hover:bg-white/5 transition-all text-[10px] font-black tracking-widest uppercase rounded-xl"
                  >
                    Abort
                  </button>
                  <button 
                    onClick={handleRefundSubmit}
                    disabled={refundingId || !refundReason}
                    className="flex-[2] py-4 bg-red-600 text-white font-black hover:bg-red-700 disabled:opacity-30 transition-all text-[10px] tracking-[0.2em] uppercase flex items-center justify-center gap-3 rounded-xl shadow-lg shadow-red-600/10"
                  >
                    {refundingId ? <Loader2 size={16} className="animate-spin" /> : "Commit Reversal"}
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
