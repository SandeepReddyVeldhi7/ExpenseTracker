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

  // ---- Data state ----
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

  // ---- Debounce load on range change ----
  const debounceRef = useRef(null);
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

  const load = async (s, e) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (s) params.set("start", s);
      if (e) params.set("end", e);

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

  // Initial load
  useEffect(() => {
    if (!firstLoadDone.current) {
      firstLoadDone.current = true;
      load(start, end);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced reload when start/end change
  useEffect(() => {
    if (new Date(end) < new Date(start)) {
      toast.error("End date cannot be before Start date.");
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(start, end), 300);
    return () => clearTimeout(debounceRef.current);
  }, [start, end]); // eslint-disable-line react-hooks/exhaustive-deps

  const pieData = stats?.pie || [];
  const COLORS = ["#3b82f6", "#9ca3af", stats?.profit >= 0 ? "#10b981" : "#ef4444"];

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 font-sans">
      <Toaster />
      <h1 className="text-xl sm:text-2xl font-bold mb-4">📊 Business Pie Analysis</h1>

      {/* Date pickers */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-6">
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
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
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
            Totals ({stats?.start} → {stats?.end})
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
