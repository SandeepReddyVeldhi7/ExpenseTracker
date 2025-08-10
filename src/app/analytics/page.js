"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
} from "recharts";
import toast, { Toaster } from "react-hot-toast";

export default function PieAnalyticsPage() {
  // ---- Dates (defaults to this month → today) ----
  const initialStart = useMemo(() => {
    const now = new Date();
    const s = new Date(now.getFullYear(), now.getMonth(), 1);
    return s.toISOString().slice(0, 10);
  }, []);
  const initialEnd = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);

  // ---- Basis (dynamic) ----
  const [basis, setBasis] = useState("accrual"); // "accrual" | "cash"
  const [showBasisInfo, setShowBasisInfo] = useState(false);

  // ---- Data state ----
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

  // ---- Dynamic behavior ----
  const [autoRefresh, setAutoRefresh] = useState(false);
  const debounceRef = useRef(null);
  const intervalRef = useRef(null);
  const firstLoadDone = useRef(false);

  const INR = useMemo(
    () =>
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }),
    []
  );

  const load = async (s, e, b) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (s) params.set("start", s);
      if (e) params.set("end", e);
      if (b) params.set("basis", b);

      const res = await fetch(`/api/v1/analytics/pie?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch analysis");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to load analysis");
    } finally {
      setLoading(false);
    }
  };

  // Initial load (once)
  useEffect(() => {
    if (!firstLoadDone.current) {
      firstLoadDone.current = true;
      load(start, end, basis);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Dynamic debounced load on start/end/basis change
  useEffect(() => {
    // Validate dates quickly; if invalid order, skip and show toast
    if (new Date(end) < new Date(start)) {
      toast.error("End date cannot be before Start date.");
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      load(start, end, basis);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [start, end, basis]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh every 60s (optional)
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        load(start, end, basis);
      }, 60000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, start, end, basis]); // eslint-disable-line react-hooks/exhaustive-deps

  // Presets
  const setThisMonth = () => {
    const now = new Date();
    const s = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const e = new Date().toISOString().slice(0, 10);
    setStart(s);
    setEnd(e);
  };
  const setLastMonth = () => {
    const now = new Date();
    const firstThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastPrevMonth = new Date(firstThisMonth.getTime() - 1); // last day of prev month
    const firstPrevMonth = new Date(lastPrevMonth.getFullYear(), lastPrevMonth.getMonth(), 1);
    setStart(firstPrevMonth.toISOString().slice(0, 10));
    setEnd(new Date(lastPrevMonth.getFullYear(), lastPrevMonth.getMonth(), lastPrevMonth.getDate()).toISOString().slice(0, 10));
  };
  const setLast7Days = () => {
    const today = new Date();
    const start7 = new Date(today);
    start7.setDate(today.getDate() - 6);
    setStart(start7.toISOString().slice(0, 10));
    setEnd(today.toISOString().slice(0, 10));
  };

  const pieData = stats?.pie || [];
  const COLORS = ["#3b82f6", "#9ca3af", stats?.profit >= 0 ? "#10b981" : "#ef4444"];

  const totals = useMemo(() => {
    if (!stats) return null;
    return [
      { label: "Revenue", value: stats.revenue },
      { label: "Staff Salary", value: stats.salaryPaid },
      { label: "Other Expenses", value: stats.otherExpenses },
      { label: stats.profit >= 0 ? "Profit" : "Loss", value: Math.abs(stats.profit) },
    ];
  }, [stats]);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 font-sans">
      <Toaster />
      <h1 className="text-xl sm:text-2xl font-bold mb-4">📊 Business Pie Analysis</h1>

      {/* Controls */}
      <div className="flex flex-col gap-3 mb-6">
        {/* Row 1: Date pickers + Basis + Info + Auto-refresh */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Start:</label>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="border p-1 rounded text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">End:</label>
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="border p-1 rounded text-sm"
            />
          </div>

          <div className="flex items-center gap-2 relative">
            <span className="text-sm font-medium">Basis:</span>
            <div className="inline-flex overflow-hidden rounded border">
              <button
                type="button"
                onClick={() => setBasis("accrual")}
                className={`px-3 py-1 text-sm ${basis === "accrual" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-800"}`}
              >
                Accrual
              </button>
              <button
                type="button"
                onClick={() => setBasis("cash")}
                className={`px-3 py-1 text-sm ${basis === "cash" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-800"}`}
              >
                Cash
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowBasisInfo((s) => !s)}
              className="ml-1 text-xs px-2 py-1 rounded border bg-white hover:bg-gray-50"
              title="What’s the difference?"
              aria-expanded={showBasisInfo}
              aria-controls="basis-help"
            >
              ⓘ
            </button>

            {showBasisInfo && (
              <div
                id="basis-help"
                className="absolute top-full left-0 z-10 mt-2 w-80 rounded border bg-white p-3 text-xs shadow"
              >
                <div className="font-semibold mb-1">Accrual vs Cash</div>
                <ul className="space-y-1 text-gray-700">
                  <li>
                    <span className="font-medium">Accrual:</span> Salary is counted in the{" "}
                    <span className="font-medium">salary month</span>.
                    <br />
                    <span className="text-gray-600">
                      e.g. June salary paid on July 5 → shows in <b>June</b>.
                    </span>
                  </li>
                  <li>
                    <span className="font-medium">Cash:</span> Salary is counted on the{" "}
                    <span className="font-medium">date it was paid</span>.
                    <br />
                    <span className="text-gray-600">
                      e.g. June salary paid on July 5 → shows in <b>July</b>.
                    </span>
                  </li>
                  <li className="text-gray-600">
                    Advances are included only through salary (never double-counted).
                  </li>
                </ul>
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowBasisInfo(false)}
                    className="text-[11px] px-2 py-1 rounded border bg-gray-50 hover:bg-gray-100"
                  >
                    Got it
                  </button>
                </div>
              </div>
            )}
          </div>

          <label className="inline-flex items-center gap-2 text-sm select-none">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh (60s)
          </label>
        </div>

        {/* Row 2: Quick presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-600">Quick ranges:</span>
          <button onClick={setThisMonth} className="px-3 py-1 rounded border text-sm bg-white hover:bg-gray-50">
            This Month
          </button>
          <button onClick={setLastMonth} className="px-3 py-1 rounded border text-sm bg-white hover:bg-gray-50">
            Last Month
          </button>
          <button onClick={setLast7Days} className="px-3 py-1 rounded border text-sm bg-white hover:bg-gray-50">
            Last 7 Days
          </button>
        </div>
      </div>

      {/* Chart + Totals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie */}
        <div className="relative border rounded p-3">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  innerRadius={55}
                  label={(entry) => `${entry.name}: ${INR.format(entry.value)}`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={["#3b82f6", "#9ca3af", stats?.profit >= 0 ? "#10b981" : "#ef4444"][index % 3]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [INR.format(value), name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm rounded">
              <div className="flex flex-col items-center gap-3">
                <div className="h-10 w-10 rounded-full border-4 border-gray-300 border-t-transparent animate-spin" />
                <div className="text-sm">Loading…</div>
              </div>
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="border rounded p-3">
          <h2 className="font-semibold mb-3">
            Totals ({stats?.start} → {stats?.end}) · Basis: <span className="uppercase">{stats?.basis}</span>
          </h2>
          {stats ? (
            <ul className="space-y-2">
              {[
                { label: "Revenue", value: stats.revenue },
                { label: "Staff Salary", value: stats.salaryPaid },
                { label: "Other Expenses", value: stats.otherExpenses },
                { label: stats.profit >= 0 ? "Profit" : "Loss", value: Math.abs(stats.profit) },
              ].map((t) => (
                <li key={t.label} className="flex items-center justify-between border-b pb-2">
                  <span className="text-gray-700">{t.label}</span>
                  <span className="font-semibold">{INR.format(t.value || 0)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No data.</p>
          )}

          <div className="mt-4 text-xs text-gray-500">
            * Staff advances are included in Salary only (not counted separately).
          </div>
        </div>
      </div>
    </div>
  );
}
