"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DatePicker from "react-datepicker";
import { FiCalendar, FiArrowRight, FiImage, FiCheckCircle } from "react-icons/fi";
import "react-datepicker/dist/react-datepicker.css";

export default function ProofHome() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [submittedDates, setSubmittedDates] = useState([]);

  useEffect(() => {
    fetch("/api/v1/proof/get-submitted-dates")
      .then((r) => r.json())
      .then((d) => setSubmittedDates((d.dates || []).map((x) => new Date(x))))
      .catch((err) => console.error(err));
  }, []);

  const handleNext = () => {
    if (selectedDate) {
      const formatted = selectedDate.toLocaleDateString("en-CA");
      router.push(`/proof/${formatted}`);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8 sm:py-14">
      <div className="neo-card p-6 sm:p-8 bg-white">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-[#00F0FF] border-2 border-black shadow-[3px_3px_0px_0px_#000] mb-3">
            <FiImage size={28} className="text-black" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
            Upload Expense Proofs
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-gray-600 mt-1">
            Attach photo receipts, bills, and vendor invoice proofs for any date
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-xs font-black uppercase tracking-wider text-black mb-2">
            Select Expense Date
          </label>
          <div className="relative">
            <DatePicker
              selected={selectedDate}
              onChange={setSelectedDate}
              dateFormat="yyyy-MM-dd"
              maxDate={new Date()}
              excludeDates={submittedDates}
              placeholderText="Pick an expense date"
              className="neo-input text-base font-bold pl-4"
              wrapperClassName="w-full"
            />
          </div>
          <p className="text-xs font-bold text-gray-500 mt-2">
            * Select the date corresponding to your physical bill or cash voucher.
          </p>
        </div>

        <button
          onClick={handleNext}
          disabled={!selectedDate}
          className="w-full py-3.5 neo-btn neo-btn-cyan text-base flex items-center justify-center gap-2"
        >
          <span>Open Proof Upload Gallery</span>
          <FiArrowRight />
        </button>

        {submittedDates.length > 0 && (
          <div className="mt-6 pt-4 border-t-2 border-gray-200">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-600 mb-2">
              <FiCheckCircle className="text-cyan-600" />
              <span>Dates With Uploaded Proofs:</span>
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
