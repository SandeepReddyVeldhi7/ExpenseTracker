"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Poppins } from "next/font/google";
import { FaArrowLeft, FaTrash, FaPlus, FaCheck } from "react-icons/fa";
import toast, { Toaster } from "react-hot-toast";
import { useSession } from "next-auth/react";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export default function ExtraExpensesCategoryPage() {
  const { monthYear } = useParams(); // format: YYYY-MM
  const router = useRouter();
  const { data: session } = useSession();

  const [items, setItems] = useState([{ id: Date.now(), name: "", price: "" }]);
  const [totalSales, setTotalSales] = useState(0);
  const [totalPayout, setTotalPayout] = useState(0);
  const [totalOnline, setTotalOnline] = useState(0);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState("edit"); // "edit" | "review"

  const localKey = `extra-expense-${monthYear}`;

  // 1) Fetch month sales/payout from DailySummary collection
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

  // 2) Load items from localStorage on mount
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

  // Helper to save to localStorage
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

  // Format Month-Year for header
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
      minimumFractionDigits: 2,
    }).format(num || 0);

  const handleContinue = () => {
    // Basic validation: filter empty items first or warn user
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

      if (!res.ok) {
        throw new Error("Failed to submit");
      }

      // Clear localStorage
      localStorage.removeItem(localKey);
      toast.success("Monthly expenses submitted successfully!", { id: toastId });
      
      // Redirect
      router.push("/extra-expenses");
    } catch (err) {
      console.error(err);
      toast.error("Error submitting monthly expenses.", { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`min-h-screen bg-cover bg-center bg-no-repeat ${poppins.className}`}
      style={{ backgroundImage: "url('/image1.jpg')" }}
    >
      <Toaster />
      <div className="min-h-screen lg:mt-14 overflow-y-auto bg-black/40 backdrop-blur-sm sm:mt-8 flex items-center justify-center p-4">
        <div className="w-full relative max-w-2xl bg-white/30 backdrop-blur-md rounded-2xl p-6 shadow-2xl border border-white/20">
          
          {/* Back button */}
          <button
            onClick={() => {
              if (step === "review") {
                setStep("edit");
              } else {
                router.back();
              }
            }}
            className="text-white absolute mt-2 mb-3 hover:bg-black/30 px-3 py-1.5 text-xl -top-2 -left-1 rounded-lg flex items-center"
          >
            <FaArrowLeft className="mr-2" />
            <span className="text-sm font-semibold">Back</span>
          </button>

          <h1 className="text-xl sm:text-2xl font-bold text-center text-white drop-shadow mb-6 mt-8">
            {getFormattedMonthName(monthYear)}
          </h1>

          {loadingSummary ? (
            <div className="text-center text-white py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
              <p className="font-semibold">Loading monthly summary data...</p>
            </div>
          ) : step === "edit" ? (
            /* --- STEP 1: EDIT ITEMS --- */
            <div>
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 text-white space-y-1 sm:space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span>📈 Prefilled Total Sales:</span>
                  <span className="font-bold">{formatINR(totalSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span>💰 Prefilled Total Payout:</span>
                  <span className="font-bold">{formatINR(totalPayout)}</span>
                </div>
                <div className="flex justify-between">
                  <span>💳 Prefilled Online Amount:</span>
                  <span className="font-bold">{formatINR(totalOnline)}</span>
                </div>
              </div>

              <h2 className="text-sm sm:text-lg font-semibold text-white mb-4">Add Extra Monthly Expenses</h2>

              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 sm:gap-3 bg-white/5 p-2 rounded-xl border border-white/10 text-xs sm:text-sm">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleItemChange(item.id, "name", e.target.value)}
                      placeholder="Expense Name (e.g. Electric Bill)"
                      className="flex-1 p-2 sm:p-2.5 rounded-xl border border-white/20 bg-white/25 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-xs sm:text-sm"
                    />
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) => handleItemChange(item.id, "price", e.target.value)}
                      placeholder="Amount"
                      className="w-1/3 p-2 sm:p-2.5 rounded-xl border border-white/20 bg-white/25 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-xs sm:text-sm"
                    />
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-2 sm:p-3 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition duration-150"
                      title="Delete expense item"
                    >
                      <FaTrash size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center mt-6">
                <button
                  onClick={handleAddItem}
                  className="flex items-center gap-2 bg-lime-600 hover:bg-lime-700 text-white font-bold py-2 px-3 sm:py-2.5 sm:px-4 rounded-xl shadow transition duration-200 text-xs sm:text-sm"
                >
                  <FaPlus size={12} /> Add Item
                </button>
                <div className="text-white text-right">
                  <p className="text-3xs sm:text-xs text-white/70">Total Added Items:</p>
                  <p className="text-base sm:text-xl font-bold">{formatINR(itemsTotal)}</p>
                </div>
              </div>

              <button
                onClick={handleContinue}
                className="w-full mt-6 sm:mt-8 py-2.5 sm:py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm sm:text-lg shadow-lg hover:shadow-xl transition duration-200"
              >
                Continue
              </button>
            </div>
          ) : (
            /* --- STEP 2: SUMMARY REVIEW --- */
            <div className="text-white">
              <h2 className="text-lg sm:text-xl font-bold text-center mb-6">Review Submission</h2>

              <div className="space-y-3 sm:space-y-4 bg-white/10 backdrop-blur-sm p-4 sm:p-6 rounded-2xl border border-white/10 mb-6 sm:mb-8 text-xs sm:text-sm">
                <div className="flex justify-between border-b border-white/15 pb-2">
                  <span className="text-white/80">📈 Prefilled Total Sales:</span>
                  <span className="font-semibold">{formatINR(totalSales)}</span>
                </div>
                <div className="flex justify-between border-b border-white/15 pb-2">
                  <span className="text-white/80">💰 Prefilled Total Payout:</span>
                  <span className="font-semibold">{formatINR(totalPayout)}</span>
                </div>
                <div className="flex justify-between border-b border-white/15 pb-2">
                  <span className="text-white/80">💳 Prefilled Online Amount:</span>
                  <span className="font-semibold">{formatINR(totalOnline)}</span>
                </div>
                <div className="flex justify-between border-b border-white/15 pb-2">
                  <span className="text-white/80">💸 Total Added Expenses:</span>
                  <span className="font-semibold text-yellow-300">-{formatINR(itemsTotal)}</span>
                </div>
                <div className="flex justify-between pt-2 text-base sm:text-lg font-bold">
                  <span>Balance:</span>
                  <span className={remainingBalance >= 0 ? "text-lime-300" : "text-red-300"}>
                    {formatINR(remainingBalance)}
                  </span>
                </div>
              </div>

              <h3 className="text-sm sm:text-base font-semibold mb-2 sm:mb-3">Itemized Expenses Detail:</h3>
              <div className="max-h-[30vh] overflow-y-auto space-y-2 mb-6 sm:mb-8 pr-1">
                {items
                  .filter((i) => i.name.trim() !== "" && parseFloat(i.price) > 0)
                  .map((item, index) => (
                    <div key={item.id} className="flex justify-between bg-white/5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg border border-white/5 text-xs sm:text-sm">
                      <span className="font-medium text-white/90">
                        {index + 1}. {item.name}
                      </span>
                      <span className="font-bold">{formatINR(parseFloat(item.price))}</span>
                    </div>
                  ))}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep("edit")}
                  className="flex-1 py-2.5 sm:py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold transition duration-200 text-sm sm:text-base"
                >
                  Edit Items
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 py-2.5 sm:py-3 rounded-xl bg-lime-600 hover:bg-lime-700 disabled:opacity-50 text-white font-bold transition duration-200 flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <FaCheck size={12} /> {submitting ? "Submitting..." : "Submit Report"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
