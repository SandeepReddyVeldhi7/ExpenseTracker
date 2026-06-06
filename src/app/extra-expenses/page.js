"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FaCalendarAlt } from "react-icons/fa";
import toast, { Toaster } from "react-hot-toast";

export default function ExtraExpensesHome() {
  const router = useRouter();
  
  // Default to current year and month
  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");

  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [loading, setLoading] = useState(false);

  const months = [
    { value: "01", name: "January" },
    { value: "02", name: "February" },
    { value: "03", name: "March" },
    { value: "04", name: "April" },
    { value: "05", name: "May" },
    { value: "06", name: "June" },
    { value: "07", name: "July" },
    { value: "08", name: "August" },
    { value: "09", name: "September" },
    { value: "10", name: "October" },
    { value: "11", name: "November" },
    { value: "12", name: "December" },
  ];

  const years = Array.from({ length: 7 }, (_, i) => String(currentYear - 3 + i)); // +/- 3 years

  const handleProceed = async () => {
    setLoading(true);
    const monthYear = `${selectedYear}-${selectedMonth}`;

    try {
      const res = await fetch(`/api/v1/monthly-expense/get-summary?monthYear=${monthYear}`);
      if (!res.ok) throw new Error("Failed to validate daily summaries");
      const data = await res.json();

      if (data.count < data.totalDays) {
        toast.error(`Daily summaries are incomplete for this month (recorded ${data.count} of ${data.totalDays} days). Please complete all entries first!`);
        setLoading(false);
        return;
      }

      router.push(`/extra-expenses/${monthYear}`);
    } catch (err) {
      console.error(err);
      toast.error("Error checking daily summaries for the selected month.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-800 to-lime-800 flex items-center justify-center p-4">
      <Toaster />
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-white/20 backdrop-blur-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          📅 Select Month & Year
        </h1>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Month
            </label>
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full text-black bg-white pl-4 pr-10 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <FaCalendarAlt />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Year
            </label>
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full text-black bg-white pl-4 pr-10 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <FaCalendarAlt />
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleProceed}
          disabled={loading}
          className="w-full py-3 rounded-xl text-white font-semibold transition bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Proceed"}
        </button>
      </div>
    </div>
  );
}
