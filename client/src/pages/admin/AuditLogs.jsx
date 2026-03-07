import React, { useState, useEffect } from "react";
import adminService from "../../api/adminService";
import Navbar from "../../components/layout/Navbar";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Shield, AlertTriangle, Info, Loader2, Download, ChevronDown,
} from "lucide-react";

const severityConfig = {
  low:      { color: "border border-cyan-500/20 bg-cyan-500/10 text-cyan-400", icon: Info },
  medium:   { color: "border border-amber-500/20 bg-amber-500/10 text-amber-400", icon: AlertTriangle },
  high:     { color: "border border-red-500/20 bg-red-500/10 text-red-400", icon: Shield },
  critical: { color: "border border-red-700/30 bg-red-600/10 text-red-300", icon: Shield },
};

const selectCls = "appearance-none bg-[#1a1a1a] border border-[#d4af37]/10 text-[#9a9a9a] px-4 py-2 text-sm focus:outline-none focus:border-[#d4af37]/40 hover:border-[#d4af37]/30 transition-all";

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");
  const [filterTargetType, setFilterTargetType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1, limit: 25 });
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { fetchLogs(); }, [filterAction, filterSeverity, filterTargetType, startDate, endDate, page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await adminService.getLogs({
        action: filterAction || undefined,
        severity: filterSeverity || undefined,
        targetType: filterTargetType || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page, limit,
      });
      const logsList = data?.data?.logs || data?.logs || data || [];
      setLogs(Array.isArray(logsList) ? logsList : []);
      setPagination({
        total: Number(data?.data?.pagination?.total || 0),
        page: Number(data?.data?.pagination?.page || page),
        pages: Number(data?.data?.pagination?.pages || 1),
        limit: Number(data?.data?.pagination?.limit || limit),
      });
    } catch (err) {
      console.error("Failed to fetch logs", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchTerm) return true;
    return [log.action, log.targetType, log.performedBy?.name, log.performedBy?.email, log.details?.reason]
      .filter(Boolean).join(" ").toLowerCase().includes(searchTerm.toLowerCase());
  });

  const uniqueActions = [...new Set(logs.map((l) => l.action).filter(Boolean))];
  const severityCounts = logs.reduce((acc, log) => {
    const key = log?.severity || "low"; acc[key] = (acc[key] || 0) + 1; return acc;
  }, { low: 0, medium: 0, high: 0, critical: 0 });

  const exportCsv = () => {
    if (!filteredLogs.length) return;
    const rows = [
      ["Action", "Severity", "TargetType", "PerformedBy", "Reason", "CreatedAt"],
      ...filteredLogs.map((log) => [
        log.action || "", log.severity || "", log.targetType || "",
        log.performedBy?.name || log.performedBy?.email || "System",
        log.details?.reason || "", log.createdAt ? new Date(log.createdAt).toISOString() : "",
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-page-${pagination.page}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="p-2 border border-[#d4af37]/15 text-[#9a9a9a] hover:border-[#d4af37]/40 hover:text-[#d4af37] transition-all">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-4xl text-[#f8f6f3]" style={{ fontFamily: "'Playfair Display', serif" }}>Audit Logs</h1>
              <p className="text-sm text-[#9a9a9a] mt-1 tracking-wide">Track all admin actions across the platform</p>
            </div>
          </div>
          <span className="text-sm text-[#9a9a9a]/50">{filteredLogs.length} entries</span>
        </div>

        {/* Severity Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Low", value: severityCounts.low || 0, cls: "text-cyan-400" },
            { label: "Medium", value: severityCounts.medium || 0, cls: "text-amber-400" },
            { label: "High", value: severityCounts.high || 0, cls: "text-red-400" },
            { label: "Critical", value: severityCounts.critical || 0, cls: "text-red-300" },
          ].map(({ label, value, cls }) => (
            <div key={label} className="bg-[#111] border border-[#d4af37]/10 p-4">
              <p className="text-[10px] uppercase tracking-widest font-bold text-[#d4af37]/50">{label}</p>
              <p className={`text-2xl mt-1 ${cls}`} style={{ fontFamily: "'Playfair Display', serif" }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search logs..."
            className="bg-[#1a1a1a] border border-[#d4af37]/10 text-[#f8f6f3] px-4 py-2 text-sm focus:outline-none focus:border-[#d4af37]/40 placeholder-[#9a9a9a]/40"
          />
          <div className="relative">
            <select value={filterAction} onChange={(e) => { setPage(1); setFilterAction(e.target.value); }} className={selectCls}>
              <option value="">All Actions</option>
              {uniqueActions.map((a) => <option key={a} value={a}>{a.replace(/_/g, " ")}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-3 top-3 text-[#9a9a9a] pointer-events-none" />
          </div>
          <div className="relative">
            <select value={filterTargetType} onChange={(e) => { setPage(1); setFilterTargetType(e.target.value); }} className={selectCls}>
              <option value="">All Target Types</option>
              <option value="User">User</option>
              <option value="House">House</option>
              <option value="BookingRequest">BookingRequest</option>
              <option value="Payment">Payment</option>
              <option value="System">System</option>
            </select>
            <ChevronDown size={12} className="absolute right-3 top-3 text-[#9a9a9a] pointer-events-none" />
          </div>
          <div className="relative">
            <select value={filterSeverity} onChange={(e) => { setPage(1); setFilterSeverity(e.target.value); }} className={selectCls}>
              <option value="">All Severity</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <ChevronDown size={12} className="absolute right-3 top-3 text-[#9a9a9a] pointer-events-none" />
          </div>
          <input type="date" value={startDate} onChange={(e) => { setPage(1); setStartDate(e.target.value); }} className={selectCls} aria-label="Start date" />
          <input type="date" value={endDate} onChange={(e) => { setPage(1); setEndDate(e.target.value); }} className={selectCls} aria-label="End date" />
          {(filterAction || filterSeverity || filterTargetType || startDate || endDate || searchTerm) && (
            <button onClick={() => { setFilterAction(""); setFilterSeverity(""); setFilterTargetType(""); setStartDate(""); setEndDate(""); setSearchTerm(""); setPage(1); }} className="text-xs text-[#d4af37] tracking-widest uppercase hover:text-[#b8941f]">
              Clear
            </button>
          )}
          <button onClick={exportCsv} className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 text-xs border border-[#d4af37]/20 text-[#d4af37]/70 hover:border-[#d4af37] hover:text-[#d4af37] tracking-wide transition-all">
            <Download size={12} /> Export CSV
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3">
            <Loader2 className="animate-spin text-[#d4af37]" size={36} />
            <span className="text-[#9a9a9a] tracking-wide">Loading logs...</span>
          </div>
        ) : (
          <div className="bg-[#111] border border-[#d4af37]/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#d4af37]/10">
                    {["Action", "Performed By", "Target", "Severity", "Date"].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-[10px] font-bold text-[#d4af37]/50 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d4af37]/5">
                  {filteredLogs.map((log, idx) => {
                    const sev = severityConfig[log.severity] || severityConfig.low;
                    const SevIcon = sev.icon;
                    return (
                      <React.Fragment key={idx}>
                        <tr className="hover:bg-[#d4af37]/3 transition-colors">
                          <td className="px-5 py-4">
                            <span className="text-sm text-[#f8f6f3]">{log.action?.replace(/_/g, " ")}</span>
                            {log.details?.reason && <p className="text-xs text-[#9a9a9a] mt-1">Reason: {log.details.reason}</p>}
                          </td>
                          <td className="px-5 py-4 text-sm text-[#9a9a9a]">{log.performedBy?.name || log.performedBy?.email || "System"}</td>
                          <td className="px-5 py-4 text-sm text-[#9a9a9a]">{log.targetType || "—"}</td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold ${sev.color}`}>
                              <SevIcon size={10} />
                              {log.severity || "low"}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-xs text-[#9a9a9a]/50">{log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}</span>
                            <button onClick={() => setExpandedId((prev) => (prev === log._id ? null : log._id))} className="block text-xs text-[#d4af37]/60 hover:text-[#d4af37] mt-1 tracking-wide">
                              {expandedId === log._id ? "Hide details" : "View details"}
                            </button>
                          </td>
                        </tr>
                        {expandedId === log._id && (
                          <tr className="bg-[#1a1a1a]">
                            <td colSpan={5} className="px-5 py-3 text-xs text-[#9a9a9a]">
                              <pre className="whitespace-pre-wrap break-all font-mono text-[11px]">
                                {JSON.stringify({ details: log.details || {}, metadata: log.metadata || {} }, null, 2)}
                              </pre>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {filteredLogs.length === 0 && (
                    <tr><td colSpan={5} className="px-5 py-12 text-center text-[#9a9a9a]/50">No audit logs found{filterAction || filterSeverity || filterTargetType || startDate || endDate ? " for the selected filters" : ""}.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && pagination.pages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <button disabled={pagination.page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-4 py-2 border border-[#d4af37]/15 text-[#9a9a9a] text-sm hover:border-[#d4af37]/40 hover:text-[#f8f6f3] disabled:opacity-30 transition-all">
              Previous
            </button>
            <span className="text-sm text-[#9a9a9a]">Page {pagination.page} of {pagination.pages}</span>
            <button disabled={pagination.page >= pagination.pages} onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} className="px-4 py-2 border border-[#d4af37]/15 text-[#9a9a9a] text-sm hover:border-[#d4af37]/40 hover:text-[#f8f6f3] disabled:opacity-30 transition-all">
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
