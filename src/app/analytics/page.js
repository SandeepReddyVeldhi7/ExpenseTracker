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
import { FiBarChart2, FiCalendar } from "react-icons/fi";

export default function PieAnalyticsPage() {
  const initialStart = useMemo(() => {
    const now = new Date();
    const s = new Date(now.getFullYear(), now.getMonth(), 1);
    return s.toISOString().slice(0, 10);
  }, []);
  const initialEnd = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

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
      if (!res.ok) throw new Error("Failed to fetch analytics");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!firstLoadDone.current) {
      firstLoadDone.current = true;
      load(start, end);
    }
  }, []);

  useEffect(() => {
    if (new Date(end) < new Date(start)) {
      toast.error("End date cannot be before Start date.");
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(start, end), 300);
    return () => clearTimeout(debounceRef.current);
  }, [start, end]);

  const pieData = stats?.pie || [];
  const COLORS = ["#00F0FF", "#B794F4", stats?.profit >= 0 ? "#D4FF00" : "#FF5A5F"];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <Toaster position="top-right" />

      {/* Header Banner */}
      <div className="neo-card p-6 sm:p-8 bg-white mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#D4FF00] border-2 border-black rounded-full text-xs font-black uppercase tracking-wider mb-2">
              <FiBarChart2 />
              <span>Profit & Expense Breakdown</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
              Business Analytics & Visuals
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-gray-600 mt-1">
              Real-time revenue vs salary payouts vs operating expenses
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-black">From:</span>
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="neo-input text-xs font-bold py-1.5 px-3"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-black">To:</span>
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="neo-input text-xs font-bold py-1.5 px-3"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart Card */}
        <div className="neo-card p-6 bg-white relative">
          <h2 className="text-base font-extrabold text-black mb-4 flex items-center justify-between">
            <span>Visual Share Breakdown</span>
            {loading && (
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#FFDE59] border border-black animate-pulse">
                Updating...
              </span>
            )}
          </h2>

          <div className="h-72 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={105}
                  innerRadius={50}
                  paddingAngle={3}
                  stroke="#0A0A0A"
                  strokeWidth={2}
                >
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [INR.format(value), name]}
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    border: "2px solid #0A0A0A",
                    borderRadius: "8px",
                    fontWeight: "bold",
                    boxShadow: "3px 3px 0px 0px #0A0A0A",
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Totals & Breakdown Card */}
        <div className="neo-card p-6 bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-black">
              <h2 className="text-base font-extrabold text-black">
                Summary Metrics
              </h2>
              <span className="text-xs font-mono font-bold bg-[#F4F4F0] px-2 py-0.5 rounded border border-black">
                {stats?.start} → {stats?.end}
              </span>
            </div>

            {stats ? (
              <div className="space-y-3">
                {[
                  { label: "Gross Sales Revenue", value: stats.revenue, bg: "bg-[#F4F4F0]" },
                  { label: "Staff Salary Total", value: stats.salaryPaid, bg: "bg-[#00F0FF]" },
                  { label: "Other Daily Expenses", value: stats.otherExpenses, bg: "bg-[#B794F4]" },
                  {
                    label: stats.profit >= 0 ? "Net Profit Payout" : "Net Loss",
                    value: Math.abs(stats.profit),
                    bg: stats.profit >= 0 ? "bg-[#D4FF00]" : "bg-[#FF5A5F] text-white",
                  },
                ].map((t) => (
                  <div
                    key={t.label}
                    className={`flex items-center justify-between p-3 rounded-xl border-2 border-black ${t.bg} shadow-[2px_2px_0px_0px_#000]`}
                  >
                    <span className="font-extrabold text-sm">{t.label}</span>
                    <span className="font-black font-mono text-base">{INR.format(t.value || 0)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 font-bold py-6 text-center text-sm">
                No analytics available for this range.
              </p>
            )}
          </div>

          <div className="mt-6 pt-3 border-t-2 border-dashed border-gray-200">
            <p className="text-[11px] font-bold text-gray-500">
              * Calculations include carry-forward adjustments and reconciled cashier deductions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
