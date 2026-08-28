"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  FiArrowLeft,
  FiTrash2,
  FiPlus,
  FiCheck,
  FiDollarSign,
  FiCalendar,
  FiFileText,
} from "react-icons/fi";
import toast, { Toaster } from "react-hot-toast";
import { useSession } from "next-auth/react";

export default function ExtraExpensesCategoryPage() {
  const { monthYear } = useParams();
  const router = useRouter();
  const { data: session } = useSession();

  const role = session?.user?.role || (typeof window !== "undefined" ? localStorage.getItem("userRole") : "");
  const isStaff = role === "staff" || role === "staff123";

  const [items, setItems] = useState([{ id: Date.now(), name: "", price: "" }]);
  const [totalSales, setTotalSales] = useState(0);
  const [totalPayout, setTotalPayout] = useState(0);
  const [totalOnline, setTotalOnline] = useState(0);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState("edit");

  const localKey = `extra-expense-${monthYear}`;

  useEffect(() => {
    if (!monthYear) return;
    const fetchSummary = async () => {
      try {
        const res = await fetch(`/api/v1/monthly-expense/get-summary?monthYear=${monthYear}`);
        if (!res.ok) throw new Error("Failed to fetch monthly summary data");
        const data = await res.json();
        setTotalSales(data.totalSales || 0);
        setTotalPayout(data.totalPayout || 0);
        setTotalOnline(data.totalOnline || 0);
      } catch (err) {
        console.error(err);
        toast.error("Error loading sales/payout summaries for this month");
      } finally {
        setLoadingSummary(false);
      }
    };
    fetchSummary();
  }, [monthYear]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(localKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setItems(parsed);
          }
        } catch (e) {
          console.error("Failed to parse localStorage items", e);
        }
      }
    }
  }, [localKey]);

  const saveToLocal = (updatedItems) => {
    setItems(updatedItems);
    localStorage.setItem(localKey, JSON.stringify(updatedItems));
  };

  const handleAddItem = () => {
    const updated = [...items, { id: Date.now(), name: "", price: "" }];
    saveToLocal(updated);
  };

  const handleRemoveItem = (id) => {
    if (items.length === 1) {
      saveToLocal([{ id: Date.now(), name: "", price: "" }]);
      return;
    }
    const updated = items.filter((item) => item.id !== id);
    saveToLocal(updated);
  };

  const handleItemChange = (id, field, value) => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    );
    saveToLocal(updated);
  };

  const itemsTotal = items.reduce(
    (sum, item) => sum + (parseFloat(item.price) || 0),
    0
  );

  const remainingBalance = totalPayout - itemsTotal;

  const getFormattedMonthName = (my) => {
    if (!my) return "";
    const [year, month] = my.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const formatINR = (num) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num || 0);

  const handleContinue = () => {
    const validItems = items.filter((i) => i.name.trim() !== "" && parseFloat(i.price) > 0);
    if (validItems.length === 0) {
      toast.error("Please add at least one item with a valid name and price.");
      return;
    }
    setStep("review");
  };

  const handleSubmit = async () => {
    const validItems = items.filter((i) => i.name.trim() !== "" && parseFloat(i.price) > 0);
    if (validItems.length === 0) {
      toast.error("Please add at least one valid item.");
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading("Submitting monthly expenses...");

    try {
      const res = await fetch("/api/v1/monthly-expense/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthYear,
          items: validItems,
          totalSales,
          totalPayout,
          totalOnline,
          submittedBy: session?.user?.username || session?.user?.email || "staff",
        }),
      });

      if (!res.ok) throw new Error("Failed to submit");

      localStorage.removeItem(localKey);
      toast.success("Monthly expenses submitted successfully!", { id: toastId });
      router.push("/extra-expenses");
    } catch (err) {
      console.error(err);
      toast.error("Error submitting monthly expenses.", { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <Toaster position="top-right" />

      {/* Main Neo-Card */}
      <div className="neo-card p-6 sm:p-8 bg-white mb-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b-2 border-black flex-wrap gap-3">
          <button
            onClick={() => {
              if (step === "review") setStep("edit");
              else router.back();
            }}
            className="neo-btn neo-btn-secondary px-3.5 py-2 text-xs flex items-center gap-1.5"
          >
            <FiArrowLeft size={16} />
            <span>{step === "review" ? "Back to Edit" : "Select Month"}</span>
          </button>

          <span className="neo-badge bg-[#D4FF00] text-black">
            {getFormattedMonthName(monthYear)}
          </span>
        </div>

        {loadingSummary ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="font-black text-xs uppercase tracking-wider text-black">
              Loading Monthly Summaries...
            </p>
          </div>
        ) : step === "edit" ? (
          <div className="space-y-6">
            {/* Prefilled Financial Summary */}
            <div className="p-5 rounded-xl border-2 border-black bg-[#F4F4F0] shadow-[3px_3px_0px_0px_#000] space-y-2.5">
              <span className="text-xs font-black uppercase tracking-wider text-black block mb-1">
                Month-End Totals from Daily Summaries
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-bold">
                {!isStaff && (
                  <div className="p-3 rounded-lg border border-black bg-white flex justify-between items-center">
                    <span className="text-gray-600">Total Sales:</span>
                    <span className="font-mono font-black text-black">{formatINR(totalSales)}</span>
                  </div>
                )}
                <div className="p-3 rounded-lg border border-black bg-[#D4FF00] flex justify-between items-center">
                  <span className="text-black">Total Payout:</span>
                  <span className="font-mono font-black text-black">{formatINR(totalPayout)}</span>
                </div>
                {!isStaff && (
                  <div className="p-3 rounded-lg border border-black bg-[#00F0FF] flex justify-between items-center">
                    <span className="text-black">Online Total:</span>
                    <span className="font-mono font-black text-black">{formatINR(totalOnline)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Itemized Extra Expenses */}
            <div className="p-5 rounded-xl border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000] space-y-4">
              <div className="flex justify-between items-center border-b-2 border-black pb-2">
                <h2 className="text-sm font-black uppercase tracking-wider text-black">
                  Itemized Fixed Expenses & Vendor Bills
                </h2>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#F4F4F0] border border-black">
                  Total: {formatINR(itemsTotal)}
                </span>
              </div>

              <div className="space-y-2.5">
                {items.map((item) => (
                  <div key={item.id} className="grid grid-cols-[1fr_110px_42px] items-center gap-2">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleItemChange(item.id, "name", e.target.value)}
                      placeholder="Expense Name (e.g. Electric Bill, Rent, Gas)"
                      className="neo-input text-sm bg-white font-semibold"
                    />
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) => handleItemChange(item.id, "price", e.target.value)}
                      placeholder="₹ Amount"
                      className="neo-input text-sm font-mono font-bold bg-white"
                    />
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="h-[42px] w-[42px] flex items-center justify-center rounded-lg border-2 border-black bg-white hover:bg-red-100 text-red-600 transition shadow-[1px_1px_0px_0px_#000]"
                      title="Delete expense"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={handleAddItem}
                className="mt-2 py-2 px-4 neo-btn neo-btn-secondary text-xs flex items-center gap-1.5"
              >
                <FiPlus size={14} />
                <span>Add Expense Line</span>
              </button>
            </div>

            {/* Action */}
            <div className="pt-2">
              <button
                onClick={handleContinue}
                className="w-full py-4 neo-btn neo-btn-primary text-base font-black flex items-center justify-center gap-2"
              >
                <span>Continue to Summary Review</span>
              </button>
            </div>
          </div>
        ) : (
          /* Step 2: Review */
          <div className="space-y-6">
            <h2 className="text-xl font-black text-black tracking-tight">
              Review Monthly Summary Before Final Submission
            </h2>

            <div className="p-5 rounded-xl border-2 border-black bg-[#F4F4F0] shadow-[3px_3px_0px_0px_#000] space-y-3 text-xs sm:text-sm font-bold">
              {!isStaff && (
                <div className="flex justify-between items-center pb-2 border-b border-gray-300">
                  <span className="text-gray-700">Gross Sales:</span>
                  <span className="font-mono font-black text-black">{formatINR(totalSales)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pb-2 border-b border-gray-300">
                <span className="text-gray-700">Total Payout:</span>
                <span className="font-mono font-black text-black">{formatINR(totalPayout)}</span>
              </div>
              {!isStaff && (
                <div className="flex justify-between items-center pb-2 border-b border-gray-300">
                  <span className="text-gray-700">Online Total:</span>
                  <span className="font-mono font-black text-black">{formatINR(totalOnline)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pb-2 border-b border-gray-300 text-red-600">
                <span>Total Extra Expenses:</span>
                <span className="font-mono font-black">-{formatINR(itemsTotal)}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-[#D4FF00] border-2 border-black mt-2">
                <span className="text-base font-black text-black">Remaining Balance:</span>
                <span className="text-xl font-mono font-black text-black">{formatINR(remainingBalance)}</span>
              </div>
            </div>

            {/* List */}
            <div className="p-5 rounded-xl border-2 border-black bg-white shadow-[3px_3px_0px_0px_#000] space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-black block mb-2">
                Itemized Expenses:
              </span>
              <div className="space-y-1.5 max-h-[30vh] overflow-y-auto">
                {items
                  .filter((i) => i.name.trim() !== "" && parseFloat(i.price) > 0)
                  .map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center p-2.5 rounded-lg border border-black bg-[#F4F4F0] text-xs font-bold"
                    >
                      <span className="text-black">{idx + 1}. {item.name}</span>
                      <span className="font-mono font-black text-black">{formatINR(parseFloat(item.price))}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => setStep("edit")}
                className="flex-1 py-3.5 neo-btn neo-btn-secondary text-sm font-black"
              >
                Edit Expenses
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-3.5 neo-btn neo-btn-primary text-sm font-black flex items-center justify-center gap-2"
              >
                <FiCheck size={16} />
                <span>{submitting ? "Submitting Report..." : "🚀 Submit Monthly Report"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
