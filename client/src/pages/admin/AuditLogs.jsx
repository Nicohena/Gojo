import React, { useState, useEffect } from "react";
import adminService from "../../api/adminService";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { Navbar } from "../../components/layout/Navbar";
import { Shield, AlertTriangle, Info, Loader2, Download, ChevronDown, Search, ChevronLeft, ChevronRight } from "lucide-react";

const CORAL = "#E67E5F";

const severityConfig = {
  low:      { bg: "bg-blue-50",   text: "text-blue-600",  icon: Info },
  medium:   { bg: "bg-amber-50",  text: "text-amber-600", icon: AlertTriangle },
  high:     { bg: "bg-red-50",    text: "text-red-600",   icon: Shield },
  critical: { bg: "bg-red-100",   text: "text-red-700",   icon: Shield },
};

const inputCls = "bg-white border border-gray-200 text-gray-700 px-3 py-2 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E67E5F]/30 focus:border-[#E67E5F] placeholder-gray-300 transition-all";
const selectCls = "bg-white border border-gray-200 text-gray-600 px-3 py-2 text-sm rounded-xl focus:outline-none cursor-pointer appearance-none";

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
        action: filterAction || undefined, severity: filterSeverity || undefined,
        targetType: filterTargetType || undefined, startDate: startDate || undefined,
        endDate: endDate || undefined, page, limit,
      });
      const logsList = data?.data?.logs || data?.logs || data || [];
      setLogs(Array.isArray(logsList) ? logsList : []);
      setPagination({ total: Number(data?.data?.pagination?.total || 0), page: Number(data?.data?.pagination?.page || page), pages: Number(data?.data?.pagination?.pages || 1), limit: Number(data?.data?.pagination?.limit || limit) });
    } catch (err) { console.error("Failed to fetch logs", err); }
    finally { setLoading(false); }
  };

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    return [log.action, log.targetType, log.performedBy?.name, log.performedBy?.email, log.details?.reason]
      .filter(Boolean).join(" ").toLowerCase().includes(searchTerm.toLowerCase());
  });

  const uniqueActions = [...new Set(logs.map(l => l.action).filter(Boolean))];
  const severityCounts = logs.reduce((acc, log) => {
    const k = log?.severity || "low"; acc[k] = (acc[k] || 0) + 1; return acc;
  }, { low: 0, medium: 0, high: 0, critical: 0 });

  const exportCsv = () => {
    if (!filteredLogs.length) return;
    const rows = [["Action","Severity","TargetType","PerformedBy","Reason","CreatedAt"],
      ...filteredLogs.map(log => [log.action || "", log.severity || "", log.targetType || "", log.performedBy?.name || log.performedBy?.email || "System", log.details?.reason || "", log.createdAt ? new Date(log.createdAt).toISOString() : ""])];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `audit-logs-p${pagination.page}-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const hasFilters = filterAction || filterSeverity || filterTargetType || startDate || endDate || searchTerm;

  return (
    <DashboardLayout>
      <Navbar />
      <div className="px-6 py-6 max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Audit Logs</h1>
            <p className="text-sm text-gray-400 mt-0.5">Monitor all administrative actions and system events.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">{filteredLogs.length} entries</span>
            <button onClick={exportCsv}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-gray-200 text-gray-600 rounded-xl hover:border-gray-300 transition-all">
              <Download size={12} /> Export CSV
            </button>
          </div>
        </div>

        {/* Severity summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Low",      value: severityCounts.low || 0,      bg: "bg-blue-50",   text: "text-blue-600" },
            { label: "Medium",   value: severityCounts.medium || 0,   bg: "bg-amber-50",  text: "text-amber-600" },
            { label: "High",     value: severityCounts.high || 0,     bg: "bg-red-50",    text: "text-red-600" },
            { label: "Critical", value: severityCounts.critical || 0, bg: "bg-red-100",   text: "text-red-700" },
          ].map(({ label, value, bg, text }) => (
            <div key={label} className={`rounded-2xl border border-gray-100 shadow-sm p-4 ${bg}`}>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{label}</p>
              <p className={`text-2xl font-bold mt-1 ${text}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-300" />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search logs…" className={`${inputCls} pl-9 w-full`} />
            </div>

            {/* Action */}
            <div className="relative">
              <select value={filterAction} onChange={e => { setPage(1); setFilterAction(e.target.value); }} className={selectCls}>
                <option value="">All Actions</option>
                {uniqueActions.map(a => <option key={a} value={a}>{a.replace(/_/g," ")}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-3 text-gray-400 pointer-events-none" />
            </div>

            {/* Target */}
            <div className="relative">
              <select value={filterTargetType} onChange={e => { setPage(1); setFilterTargetType(e.target.value); }} className={selectCls}>
                <option value="">All Targets</option>
                <option value="User">User</option>
                <option value="House">House</option>
                <option value="BookingRequest">Booking</option>
                <option value="Payment">Payment</option>
                <option value="System">System</option>
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-3 text-gray-400 pointer-events-none" />
            </div>

            {/* Severity */}
            <div className="relative">
              <select value={filterSeverity} onChange={e => { setPage(1); setFilterSeverity(e.target.value); }} className={selectCls}>
                <option value="">All Severity</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-3 text-gray-400 pointer-events-none" />
            </div>

            {/* Date range */}
            <input type="date" value={startDate} onChange={e => { setPage(1); setStartDate(e.target.value); }} className={selectCls} aria-label="Start date" />
            <input type="date" value={endDate}   onChange={e => { setPage(1); setEndDate(e.target.value); }}   className={selectCls} aria-label="End date" />

            {hasFilters && (
              <button onClick={() => { setFilterAction(""); setFilterSeverity(""); setFilterTargetType(""); setStartDate(""); setEndDate(""); setSearchTerm(""); setPage(1); }}
                className="text-xs font-medium text-gray-400 hover:text-gray-700 transition-colors">
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex items-center gap-3">
              <Loader2 className="animate-spin" size={26} style={{ color: CORAL }} />
              <span className="text-gray-500 text-sm">Loading logs...</span>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["Action","Performed By","Target Type","Severity","Date / Details"].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredLogs.length === 0 ? (
                    <tr><td colSpan={5} className="px-5 py-16 text-center text-gray-400">
                      No audit logs found{hasFilters ? " for the selected filters" : ""}.
                    </td></tr>
                  ) : (
                    filteredLogs.map((log, idx) => {
                      const sev = severityConfig[log.severity] || severityConfig.low;
                      const SevIcon = sev.icon;
                      const isExpanded = expandedId === (log._id || idx);
                      return (
                        <React.Fragment key={log._id || idx}>
                          <tr className="hover:bg-gray-50/60 transition-colors">
                            {/* Action */}
                            <td className="px-5 py-4">
                              <p className="font-medium text-gray-800">{log.action?.replace(/_/g, " ")}</p>
                              {log.details?.reason && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{log.details.reason}</p>}
                            </td>
                            {/* Performed by */}
                            <td className="px-5 py-4 text-gray-500">
                              {log.performedBy?.name || log.performedBy?.email || "System"}
                            </td>
                            {/* Target type */}
                            <td className="px-5 py-4">
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg">
                                {log.targetType || "—"}
                              </span>
                            </td>
                            {/* Severity */}
                            <td className="px-5 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ${sev.bg} ${sev.text}`}>
                                <SevIcon size={10} />
                                {log.severity || "low"}
                              </span>
                            </td>
                            {/* Date + expand */}
                            <td className="px-5 py-4">
                              <p className="text-xs text-gray-400">
                                {log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}
                              </p>
                              <button
                                onClick={() => setExpandedId(prev => (prev === (log._id || idx) ? null : (log._id || idx)))}
                                className="text-xs font-medium mt-1 transition-colors"
                                style={{ color: CORAL }}
                              >
                                {isExpanded ? "Hide details" : "View details"}
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-gray-50">
                              <td colSpan={5} className="px-5 py-3">
                                <pre className="whitespace-pre-wrap break-all font-mono text-[11px] text-gray-600 bg-white border border-gray-100 rounded-xl p-4">
                                  {JSON.stringify({ details: log.details || {}, metadata: log.metadata || {} }, null, 2)}
                                </pre>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.pages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <button disabled={pagination.page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}
              className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:border-gray-300 disabled:opacity-30 transition-all">
              <ChevronLeft size={14} /> Previous
            </button>
            <span className="text-sm text-gray-500">Page {pagination.page} of {pagination.pages}</span>
            <button disabled={pagination.page >= pagination.pages} onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
              className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:border-gray-300 disabled:opacity-30 transition-all">
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AuditLogs;
