"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FiCalendar, FiArrowRight, FiDollarSign } from "react-icons/fi";
import toast, { Toaster } from "react-hot-toast";

export default function ExtraExpensesHome() {
  const router = useRouter();

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

  const years = Array.from({ length: 7 }, (_, i) => String(currentYear - 3 + i));

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
    <div className="max-w-xl mx-auto px-4 py-8 sm:py-14">
      <Toaster position="top-right" />
      <div className="neo-card p-6 sm:p-8 bg-white">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-[#FFDE59] border-2 border-black shadow-[3px_3px_0px_0px_#000] mb-3">
            <FiDollarSign size={28} className="text-black" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
            Monthly Extra Expenses
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-gray-600 mt-1">
            Audit and record month-end fixed costs, vendor bills & deductions
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">
              Select Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="neo-input text-sm font-bold cursor-pointer"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">
              Select Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="neo-input text-sm font-bold cursor-pointer"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleProceed}
          disabled={loading}
          className="w-full py-3.5 neo-btn neo-btn-primary text-base flex items-center justify-center gap-2"
        >
          <span>{loading ? "Checking Month..." : "Proceed to Monthly Sheet"}</span>
          <FiArrowRight />
        </button>
      </div>
    </div>
  );
}
