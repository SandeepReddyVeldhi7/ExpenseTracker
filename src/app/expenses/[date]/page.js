"use client";

import { useRouter, useParams } from "next/navigation";
import { FiArrowLeft, FiCoffee, FiFileText, FiDroplet } from "react-icons/fi";
import { MdPointOfSale } from "react-icons/md";

const categories = [
  { id: "casher1", label: "Casher 1", icon: <MdPointOfSale size={24} />, bg: "bg-[#D4FF00]" },
  { id: "casher2", label: "Casher 2", icon: <MdPointOfSale size={24} />, bg: "bg-[#00F0FF]" },
  { id: "casher3", label: "Casher 3", icon: <MdPointOfSale size={24} />, bg: "bg-[#FFDE59]" },
  { id: "tea", label: "Tea Counter", icon: <FiCoffee size={24} />, bg: "bg-[#FF7043]" },
  { id: "juice", label: "Juice Counter", icon: <FiDroplet size={24} />, bg: "bg-[#FF6B8B]" },
  { id: "totalDetails", label: "Total Report & Payout", icon: <FiFileText size={24} />, bg: "bg-[#B794F4]" },
];


export default function ExpensesForDate() {
  const router = useRouter();
  const { date } = useParams();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="neo-card p-6 sm:p-8 bg-white">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b-2 border-black">
          <button
            onClick={() => router.back()}
            className="neo-btn neo-btn-secondary px-3 py-2 text-xs flex items-center gap-1.5"
          >
            <FiArrowLeft size={16} />
            <span>Back</span>
          </button>

          <div className="text-right">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
              Entry Date
            </span>
            <span className="text-base sm:text-lg font-black text-black font-mono">
              {date}
            </span>
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
            Select Counter / Category
          </h1>
          <p className="text-xs sm:text-sm font-bold text-gray-600 mt-1">
            Fill cash registers & drink sales first, then review Total Report & submit
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => router.push(`/expenses/${date}/${cat.id}`)}
              className="neo-card neo-card-hover p-5 flex items-center justify-between group text-left cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-11 h-11 rounded-xl border-2 border-black flex items-center justify-center ${cat.bg} shadow-[2px_2px_0px_0px_#000]`}
                >
                  {cat.icon}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-black group-hover:text-blue-600 transition">
                    {cat.label}
                  </h3>
                  <span className="text-[11px] font-bold text-gray-500">
                    {cat.id === "totalDetails" ? "Final Calculation" : "Entry Module"}
                  </span>
                </div>
              </div>

              <span className="text-xs font-black px-2.5 py-1 rounded-md border-2 border-black bg-[#F4F4F0] group-hover:bg-[#D4FF00] transition">
                →
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
