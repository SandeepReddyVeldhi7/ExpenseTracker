"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiCalendar,
  FiArrowRight,
  FiDollarSign,
  FiLock,
  FiCheckCircle,
  FiCheck,
  FiEye,
} from "react-icons/fi";
import toast, { Toaster } from "react-hot-toast";

export default function ExtraExpensesHome() {
  const router = useRouter();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth() + 1; // 1 - 12
  const currentMonthStr = String(currentMonthNum).padStart(2, "0");

  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [submittedMonths, setSubmittedMonths] = useState([]);
  const [loadingSubmitted, setLoadingSubmitted] = useState(true);
  const [loading, setLoading] = useState(false);

  const months = [
    { value: "01", name: "January", short: "Jan" },
    { value: "02", name: "February", short: "Feb" },
    { value: "03", name: "March", short: "Mar" },
    { value: "04", name: "April", short: "Apr" },
    { value: "05", name: "May", short: "May" },
    { value: "06", name: "June", short: "Jun" },
    { value: "07", name: "July", short: "Jul" },
    { value: "08", name: "August", short: "Aug" },
    { value: "09", name: "September", short: "Sep" },
    { value: "10", name: "October", short: "Oct" },
    { value: "11", name: "November", short: "Nov" },
    { value: "12", name: "December", short: "Dec" },
  ];

  const START_YEAR = 2026;
  // Dynamic years list starting from 2026 up to current year (e.g. 2026, 2027 in 2027, etc.)
  const years = Array.from(
    { length: Math.max(1, currentYear - START_YEAR + 1) },
    (_, i) => String(START_YEAR + i)
  );

  // Fetch already submitted months from database
  useEffect(() => {
    const fetchSubmittedMonths = async () => {
      try {
        const res = await fetch("/api/v1/monthly-expense/list");
        if (res.ok) {
          const data = await res.json();
          const keys = (data.list || []).map((item) => item.key).filter(Boolean);
          setSubmittedMonths(keys);

          // If current selection is already submitted or in future, auto-pick first available month
          const isCurrentSubmitted = keys.includes(`${currentYear}-${currentMonthStr}`);
          if (isCurrentSubmitted) {
            const available = months.find((m) => {
              const k = `${currentYear}-${m.value}`;
              const mNum = parseInt(m.value, 10);
              return !keys.includes(k) && mNum <= currentMonthNum;
            });
            if (available) setSelectedMonth(available.value);
          }
        }
      } catch (err) {
        console.error("Error fetching submitted months:", err);
      } finally {
        setLoadingSubmitted(false);
      }
    };
    fetchSubmittedMonths();
  }, []);

  // Check if a month is already submitted in database
  const isMonthSubmitted = (mValue, yValue = selectedYear) => {
    const key = `${yValue}-${mValue}`;
    return submittedMonths.includes(key);
  };

  // Check if a month is in the future
  const isMonthFuture = (mValue, yValue = selectedYear) => {
    const y = parseInt(yValue, 10);
    const m = parseInt(mValue, 10);
    if (y > currentYear) return true;
    if (y === currentYear && m > currentMonthNum) return true;
    return false;
  };

  // Combined check: month is disabled if either already submitted or in future
  const isMonthDisabled = (mValue, yValue = selectedYear) => {
    return isMonthSubmitted(mValue, yValue) || isMonthFuture(mValue, yValue);
  };

  // If user changes year, ensure selectedMonth is an available month
  const handleYearChange = (newYear) => {
    setSelectedYear(newYear);
    const y = parseInt(newYear, 10);
    const available = months.find((m) => {
      const k = `${newYear}-${m.value}`;
      const mNum = parseInt(m.value, 10);
      const isFut = y > currentYear || (y === currentYear && mNum > currentMonthNum);
      const isSub = submittedMonths.includes(k);
      return !isFut && !isSub;
    });

    if (available) {
      setSelectedMonth(available.value);
    }
  };

  const handleProceed = async () => {
    if (isMonthSubmitted(selectedMonth, selectedYear)) {
      toast.error("This month is already submitted! View it in Monthly Reports.");
      return;
    }

    if (isMonthFuture(selectedMonth, selectedYear)) {
      toast.error("Cannot select a future month that has not occurred yet!");
      return;
    }

    setLoading(true);
    const monthYear = `${selectedYear}-${selectedMonth}`;

    try {
      const res = await fetch(`/api/v1/monthly-expense/get-summary?monthYear=${monthYear}`);
      if (!res.ok) throw new Error("Failed to validate daily summaries");
      const data = await res.json();

      if (data.count < data.totalDays) {
        toast.error(
          `Daily summaries are incomplete for this month (recorded ${data.count} of ${data.totalDays} days). Please complete all entries first!`
        );
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

  const selectedMonthObj = months.find((m) => m.value === selectedMonth);
  const isSelectedDisabled = isMonthDisabled(selectedMonth, selectedYear);
  const isSelectedSubmitted = isMonthSubmitted(selectedMonth, selectedYear);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12 pb-28">
      <Toaster position="top-right" />

      <div className="neo-card p-6 sm:p-8 bg-white">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-[#FFDE59] border-2 border-black shadow-[3px_3px_0px_0px_#000] mb-3">
            <FiDollarSign size={30} className="text-black" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
            Monthly Extra Expenses
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-gray-600 mt-1">
            Audit and record month-end fixed costs, vendor bills & deductions
          </p>
        </div>

        <div className="space-y-6 mb-8">
          {/* 1. SELECT YEAR (Shown First on Top) */}
          <div className="p-4 rounded-xl border-2 border-black bg-[#F4F4F0] shadow-[2px_2px_0px_0px_#000]">
            <label className="block text-xs font-black uppercase tracking-wider text-black mb-2 flex items-center justify-between">
              <span>1️⃣ Select Year</span>
              <span className="text-[11px] font-bold text-gray-600 font-mono">Current: {currentYear}</span>
            </label>

            <div className="flex flex-wrap gap-2.5">
              {years.map((y) => {
                const isSelected = selectedYear === y;
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => handleYearChange(y)}
                    className={`py-2 px-5 min-w-[90px] text-xs sm:text-sm font-black rounded-lg border-2 border-black transition cursor-pointer ${
                      isSelected
                        ? "bg-[#D4FF00] shadow-[2px_2px_0px_0px_#000] text-black scale-102"
                        : "bg-white hover:bg-gray-100 text-black shadow-[1px_1px_0px_0px_#000]"
                    }`}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. SELECT MONTH (Shown Below Year with Submitted & Future Months Disabled) */}
          <div className="p-4 rounded-xl border-2 border-black bg-[#F4F4F0] shadow-[2px_2px_0px_0px_#000]">
            <label className="block text-xs font-black uppercase tracking-wider text-black mb-2 flex items-center justify-between">
              <span>2️⃣ Select Month</span>
              <span className="text-[11px] font-bold text-gray-600">
                {loadingSubmitted ? "Checking submitted months..." : `${submittedMonths.length} Months Recorded`}
              </span>
            </label>

            {/* Interactive Month Cards Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {months.map((m) => {
                const isSubmitted = isMonthSubmitted(m.value, selectedYear);
                const isFuture = isMonthFuture(m.value, selectedYear);
                const disabled = isSubmitted || isFuture;
                const isSelected = selectedMonth === m.value && !disabled;

                return (
                  <button
                    key={m.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => !disabled && setSelectedMonth(m.value)}
                    className={`p-2.5 rounded-xl border-2 transition flex flex-col items-center justify-center text-center ${
                      isSubmitted
                        ? "bg-[#E2D9F3] border-[#7C3AED] text-[#5B21B6] cursor-not-allowed opacity-90 shadow-[1px_1px_0px_0px_#7C3AED]"
                        : isFuture
                        ? "bg-gray-200 border-gray-400 text-gray-400 cursor-not-allowed opacity-50"
                        : isSelected
                        ? "bg-[#00F0FF] border-black shadow-[3px_3px_0px_0px_#000] text-black font-black scale-102 cursor-pointer"
                        : "bg-white border-black hover:bg-[#D4FF00] text-black font-bold shadow-[2px_2px_0px_0px_#000] cursor-pointer"
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-black">{m.name}</span>

                    {isSubmitted ? (
                      <span className="text-[9px] font-black uppercase tracking-tight flex items-center gap-0.5 text-[#5B21B6] mt-0.5">
                        <FiCheck size={10} /> Submitted
                      </span>
                    ) : isFuture ? (
                      <span className="text-[9px] font-extrabold uppercase tracking-tight flex items-center gap-0.5 text-gray-500 mt-0.5">
                        <FiLock size={9} /> Locked
                      </span>
                    ) : isSelected ? (
                      <span className="text-[9px] font-black uppercase tracking-tight text-black mt-0.5 flex items-center gap-0.5">
                        <FiCheckCircle size={9} /> Selected
                      </span>
                    ) : (
                      <span className="text-[9px] font-semibold text-gray-500 mt-0.5">Available</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend / Status indicator */}
            <div className="mt-3 pt-3 border-t border-gray-300 flex flex-wrap items-center gap-3 text-[11px] font-bold text-gray-600">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-md bg-white border border-black inline-block" /> Available
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-md bg-[#00F0FF] border border-black inline-block" /> Selected
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-md bg-[#E2D9F3] border border-[#7C3AED] inline-block" /> Already Submitted
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-md bg-gray-200 border border-gray-400 inline-block" /> Locked (Future)
              </span>
            </div>
          </div>
        </div>

        {/* Selected Month-Year Summary Badge */}
        <div
          className={`mb-6 p-4 rounded-xl border-2 border-black text-black shadow-[3px_3px_0px_0px_#000] flex items-center justify-between ${
            isSelectedSubmitted ? "bg-[#E2D9F3]" : "bg-[#D4FF00]"
          }`}
        >
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-black block">
              {isSelectedSubmitted ? "Month Status: Already Recorded" : "Target Audit Period"}
            </span>
            <span className="text-lg sm:text-xl font-black text-black">
              {selectedMonthObj?.name} {selectedYear}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isSelectedSubmitted ? (
              <Link
                href="/monthly-reports"
                className="neo-btn neo-btn-cyan text-xs font-black px-3 py-1.5 flex items-center gap-1"
              >
                <FiEye size={13} /> View in Reports
              </Link>
            ) : (
              <div className="font-mono font-black text-sm px-3 py-1 bg-black text-[#D4FF00] rounded-lg">
                {selectedYear}-{selectedMonth}
              </div>
            )}
          </div>
        </div>

        {/* Proceed Action Button */}
        {isSelectedSubmitted ? (
          <div className="text-center p-3 rounded-xl border-2 border-[#7C3AED] bg-[#E2D9F3] text-[#5B21B6] font-black text-xs">
            ⚠️ {selectedMonthObj?.name} {selectedYear} extra expenses have already been submitted and locked. You can review the details in{" "}
            <Link href="/monthly-reports" className="underline font-black">
              Monthly Reports
            </Link>
            .
          </div>
        ) : (
          <button
            onClick={handleProceed}
            disabled={loading || isSelectedDisabled}
            className={`w-full py-3.5 neo-btn neo-btn-primary text-base font-black flex items-center justify-center gap-2 ${
              loading || isSelectedDisabled ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            <span>
              {loading
                ? "Validating Daily Summaries..."
                : `Proceed to ${selectedMonthObj?.name} ${selectedYear} Sheet`}
            </span>
            <FiArrowRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
