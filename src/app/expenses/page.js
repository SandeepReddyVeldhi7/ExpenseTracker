"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DatePicker from "react-datepicker";
import { FiCalendar, FiArrowRight, FiCheckCircle } from "react-icons/fi";
import "react-datepicker/dist/react-datepicker.css";

export default function ExpensesHome() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const router = useRouter();
  const [submittedDates, setSubmittedDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  const handleNext = () => {
    if (!selectedDate || submitLoading) return;
    setSubmitLoading(true);
    const formatted = selectedDate.toLocaleDateString("en-CA");
    router.push(`/expenses/${formatted}`);
  };

  useEffect(() => {
    const fetchSubmittedDates = async () => {
      try {
        const res = await fetch("/api/v1/expense/check-date");
        if (res.ok) {
          const data = await res.json();
          const dates = (data.dates || []).map((d) => new Date(d));
          setSubmittedDates(dates);
        }
      } catch (err) {
        console.error("Error fetching submitted dates:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmittedDates();
  }, []);

  return (
    <div className="max-w-xl mx-auto px-4 py-8 sm:py-14">
      <div className="neo-card p-6 sm:p-8 bg-white">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-[#D4FF00] border-2 border-black shadow-[3px_3px_0px_0px_#000] mb-3">
            <FiCalendar size={28} className="text-black" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
            Daily Expense Entry
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-gray-600 mt-1">
            Pick a date to enter cashiers, drinks sales, deductions and payouts
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-xs font-black uppercase tracking-wider text-black mb-2">
            Select Date
          </label>
          <div className="relative">
            <DatePicker
              selected={selectedDate}
              onChange={(date) => setSelectedDate(date)}
              placeholderText="Pick an entry date"
              dateFormat="yyyy-MM-dd"
              maxDate={new Date()}
              excludeDates={submittedDates}
              className="neo-input text-base font-bold pl-4"
              wrapperClassName="w-full"
            />
          </div>
          <p className="text-xs font-bold text-gray-500 mt-2">
            * Dates already submitted are disabled to prevent duplicate entries.
          </p>
        </div>

        <button
          onClick={handleNext}
          disabled={!selectedDate || submitLoading}
          className="w-full py-3.5 neo-btn neo-btn-primary text-base flex items-center justify-center gap-2"
        >
          <span>{submitLoading ? "Opening Form..." : "Proceed to Entry Form"}</span>
          <FiArrowRight />
        </button>

        {submittedDates.length > 0 && (
          <div className="mt-6 pt-4 border-t-2 border-gray-200">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-600 mb-2">
              <FiCheckCircle className="text-green-600" />
              <span>Recently Submitted Dates:</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {submittedDates.slice(-6).map((d, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 text-xs font-bold bg-[#F4F4F0] border border-black rounded-md"
                >
                  {d.toISOString().slice(0, 10)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
