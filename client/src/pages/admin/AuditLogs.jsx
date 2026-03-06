import React, { useState, useEffect } from "react";
import adminService from "../../api/adminService";
import Navbar from "../../components/layout/Navbar";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Shield,
  AlertTriangle,
  Info,
  Loader2,
  Download,
  ChevronDown,
} from "lucide-react";

const severityConfig = {
  low: { color: "bg-blue-100 text-blue-700", icon: Info },
  medium: { color: "bg-yellow-100 text-yellow-700", icon: AlertTriangle },
  high: { color: "bg-red-100 text-red-700", icon: Shield },
  critical: { color: "bg-red-200 text-red-800", icon: Shield },
};

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
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pages: 1,
    limit: 25,
  });
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, [filterAction, filterSeverity, filterTargetType, startDate, endDate, page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await adminService.getLogs({
        action: filterAction || undefined,
        severity: filterSeverity || undefined,
        targetType: filterTargetType || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        limit,
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
    const text = [
      log.action,
      log.targetType,
      log.performedBy?.name,
      log.performedBy?.email,
      log.details?.reason,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return text.includes(searchTerm.toLowerCase());
  });

  const uniqueActions = [...new Set(logs.map((l) => l.action).filter(Boolean))];
  const severityCounts = logs.reduce(
    (acc, log) => {
      const key = log?.severity || "low";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    { low: 0, medium: 0, high: 0, critical: 0 }
  );

  const exportCsv = () => {
    if (!filteredLogs.length) return;
    const rows = [
      ["Action", "Severity", "TargetType", "PerformedBy", "Reason", "CreatedAt"],
      ...filteredLogs.map((log) => [
        log.action || "",
        log.severity || "",
        log.targetType || "",
        log.performedBy?.name || log.performedBy?.email || "System",
        log.details?.reason || "",
        log.createdAt ? new Date(log.createdAt).toISOString() : "",
      ]),
    ];
    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-page-${pagination.page}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-slate-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
              <p className="text-sm text-slate-500 mt-1">
                Track all admin actions across the platform
              </p>
            </div>
          </div>
          <span className="text-sm text-slate-400">
            {filteredLogs.length} entries
          </span>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-white border rounded-xl p-3">
            <p className="text-xs uppercase text-slate-500 font-semibold">Low</p>
            <p className="text-xl font-bold text-slate-900">{severityCounts.low || 0}</p>
          </div>
          <div className="bg-white border rounded-xl p-3">
            <p className="text-xs uppercase text-slate-500 font-semibold">Medium</p>
            <p className="text-xl font-bold text-slate-900">{severityCounts.medium || 0}</p>
          </div>
          <div className="bg-white border rounded-xl p-3">
            <p className="text-xs uppercase text-slate-500 font-semibold">High</p>
            <p className="text-xl font-bold text-slate-900">{severityCounts.high || 0}</p>
          </div>
          <div className="bg-white border rounded-xl p-3">
            <p className="text-xs uppercase text-slate-500 font-semibold">Critical</p>
            <p className="text-xl font-bold text-slate-900">{severityCounts.critical || 0}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search logs"
            className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium text-slate-700"
          />
          <div className="relative">
            <select
              value={filterAction}
              onChange={(e) => {
                setPage(1);
                setFilterAction(e.target.value);
              }}
              className="appearance-none bg-white border border-slate-200 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">All Actions</option>
              {uniqueActions.map((a) => (
                <option key={a} value={a}>
                  {a.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2.5 top-3 text-slate-400 pointer-events-none"
            />
          </div>
          <div className="relative">
            <select
              value={filterTargetType}
              onChange={(e) => {
                setPage(1);
                setFilterTargetType(e.target.value);
              }}
              className="appearance-none bg-white border border-slate-200 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">All Target Types</option>
              <option value="User">User</option>
              <option value="House">House</option>
              <option value="BookingRequest">BookingRequest</option>
              <option value="Payment">Payment</option>
              <option value="System">System</option>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2.5 top-3 text-slate-400 pointer-events-none"
            />
          </div>
          <div className="relative">
            <select
              value={filterSeverity}
              onChange={(e) => {
                setPage(1);
                setFilterSeverity(e.target.value);
              }}
              className="appearance-none bg-white border border-slate-200 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">All Severity</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2.5 top-3 text-slate-400 pointer-events-none"
            />
          </div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setPage(1);
              setStartDate(e.target.value);
            }}
            className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium text-slate-700"
            aria-label="Start date"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setPage(1);
              setEndDate(e.target.value);
            }}
            className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium text-slate-700"
            aria-label="End date"
          />
          {(filterAction || filterSeverity || filterTargetType || startDate || endDate || searchTerm) && (
            <button
              onClick={() => {
                setFilterAction("");
                setFilterSeverity("");
                setFilterTargetType("");
                setStartDate("");
                setEndDate("");
                setSearchTerm("");
                setPage(1);
              }}
              className="text-sm text-blue-600 font-medium hover:underline"
            >
              Clear filters
            </button>
          )}
          <button
            onClick={exportCsv}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border bg-white hover:bg-slate-50"
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>

        {/* Log Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-blue-600" size={40} />
            <span className="ml-3 text-slate-600">Loading logs...</span>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Performed By
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Target
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredLogs.map((log, idx) => {
                    const sev =
                      severityConfig[log.severity] || severityConfig.low;
                    const SevIcon = sev.icon;
                    return (
                      <tr
                        key={idx}
                        className="hover:bg-slate-25 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-slate-900">
                            {log.action?.replace(/_/g, " ")}
                          </span>
                          {log.details?.reason && (
                            <p className="text-xs text-slate-500 mt-1">
                              Reason: {log.details.reason}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-600">
                            {log.performedBy?.name ||
                              log.performedBy?.email ||
                              "System"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-500">
                            {log.targetType || "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${sev.color}`}
                          >
                            <SevIcon size={12} />
                            {log.severity || "low"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-400">
                            {log.createdAt
                              ? new Date(log.createdAt).toLocaleString()
                              : "—"}
                          </span>
                          <button
                            onClick={() =>
                              setExpandedId((prev) => (prev === log._id ? null : log._id))
                            }
                            className="block text-xs text-blue-600 mt-1"
                          >
                            {expandedId === log._id ? "Hide details" : "View details"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {expandedId &&
                    filteredLogs
                      .filter((l) => l._id === expandedId)
                      .map((log) => (
                        <tr key={`${log._id}-details`} className="bg-slate-50">
                          <td colSpan={5} className="px-6 py-3 text-xs text-slate-600">
                            <pre className="whitespace-pre-wrap break-all font-mono text-[11px]">
                              {JSON.stringify(
                                {
                                  details: log.details || {},
                                  metadata: log.metadata || {},
                                },
                                null,
                                2
                              )}
                            </pre>
                          </td>
                        </tr>
                      ))}
                  {filteredLogs.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-slate-400"
                      >
                        No audit logs found
                        {filterAction || filterSeverity || filterTargetType || startDate || endDate
                          ? " for the selected filters"
                          : ""}
                        .
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && pagination.pages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-4 py-2 rounded-lg border bg-white text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-slate-600">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              disabled={pagination.page >= pagination.pages}
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              className="px-4 py-2 rounded-lg border bg-white text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
