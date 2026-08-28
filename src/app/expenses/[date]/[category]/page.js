"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import {
  FiArrowLeft,
  FiPlus,
  FiTrash2,
  FiCheck,
  FiDollarSign,
  FiInfo,
  FiCoffee,
  FiDroplet,
  FiFileText,
  FiCreditCard,
  FiTrendingUp,
} from "react-icons/fi";
import { MdPointOfSale } from "react-icons/md";
import toast, { Toaster } from "react-hot-toast";
import dayjs from "dayjs";

const isCasher = (cat) => ["casher1", "casher2", "casher3"].includes(cat);
const isDrink = (cat) => cat === "tea" || cat === "juice";
const isTotalDetails = (cat) => cat === "totalDetails";

export default function CategoryPage() {
  const router = useRouter();
  const { date, category } = useParams();

  return (
    <CategoryPageContent
      key={`${date}-${category}`}
      date={date}
      category={category}
    />
  );
}

function CategoryPageContent({ date, category }) {
  const router = useRouter();
  const [previousCarryLoss, setPreviousCarryLoss] = useState(0);
  const [soldAmount, setSoldAmount] = useState("");
  const [casherName, setCasherName] = useState("");
  const [items, setItems] = useState([{ id: 1, name: "", price: "" }]);
  const [totalDetails, setTotalDetails] = useState(null);
  const [hasMounted, setHasMounted] = useState(false);
  const [savedFinalNetAmount, setSavedFinalNetAmount] = useState(0);
  const [dropdownInputs, setDropdownInputs] = useState([]);
  const [staffAdvances, setStaffAdvances] = useState([]);
  const [drinkTotal, setDrinkTotal] = useState(0);
  const [commission, setCommission] = useState("");
  const [staffList, setStaffList] = useState([]);
  const [totalSale, setTotalSale] = useState("");
  const [moneyLift, setMoneyLift] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const localKey = `expense-form-${date}-${category}`;

  const formatINR = (num) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num || 0);

  const saveToLocalStorage = (newFields = {}) => {
    const localCasherName = newFields.casherName ?? casherName;
    const localItems = newFields.items ?? items;
    const localDropdownInputs = newFields.dropdownInputs ?? dropdownInputs;
    const localStaffAdvances = newFields.staffAdvances ?? staffAdvances;
    const localTotalSale = newFields.totalSale ?? totalSale;
    const localMoneyLift = newFields.moneyLift ?? moneyLift;

    const itemsTotal = localItems.reduce(
      (sum, i) => sum + (parseFloat(i.price) || 0),
      0
    );
    const dropdownTotal = localDropdownInputs.reduce(
      (sum, d) => sum + (parseFloat(d.price) || 0),
      0
    );
    const staffAdvanceTotal = localStaffAdvances.reduce(
      (sum, s) => sum + (parseFloat(s.amount) || 0),
      0
    );
    const total = itemsTotal + dropdownTotal + staffAdvanceTotal;

    const remaining = parseFloat(localTotalSale || 0) - total;
    const shot = remaining - parseFloat(localMoneyLift || 0);

    const data = {
      casherName: localCasherName,
      items: localItems,
      dropdownInputs: localDropdownInputs,
      staffAdvances: localStaffAdvances,
      totalSale: localTotalSale,
      moneyLift: localMoneyLift,
      soldAmount,
      commission,
      category,
      remaining,
      shot,
      ...newFields,
    };

    localStorage.setItem(localKey, JSON.stringify(data));
  };

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Fetch staff list for advance dropdowns
  useEffect(() => {
    const fetchStaffList = async () => {
      try {
        const response = await fetch("/api/v1/staff/get-staff-for-form");
        if (response.ok) {
          const data = await response.json();
          setStaffList(data || []);
        }
      } catch (error) {
        console.error("Staff list fetch error:", error);
      }
    };
    fetchStaffList();
  }, []);

  // Drink auto-calculation
  const handleSaveDrink = () => {
    const sold = parseFloat(soldAmount) || 0;
    const comm = parseFloat(commission) || 0;
    const commValue = category === "tea" ? (sold * comm) / 100 : comm;

    const todayNet = sold - drinkTotal - commValue;
    const combinedNet = todayNet + previousCarryLoss;

    setSavedFinalNetAmount(combinedNet);

    const data = {
      soldAmount: sold,
      commission: comm,
      commissionValue: parseFloat(commValue.toFixed(2)),
      finalNetAmount: parseFloat(combinedNet.toFixed(2)),
      carryLoss: combinedNet < 0 ? combinedNet : 0,
      previousCarryLoss,
      drinkTotal,
      category,
    };

    if (category === "tea") {
      data.commissionPercent = comm;
    }

    localStorage.setItem(localKey, JSON.stringify(data));
  };

  useEffect(() => {
    if (!isDrink(category) || !hasMounted) return;
    handleSaveDrink();
  }, [soldAmount, commission, drinkTotal, previousCarryLoss, hasMounted]);

  // Load live drink totals from cashers & yesterday carry
  useEffect(() => {
    if (!isDrink(category)) return;

    let sumDrinkFromCashers = 0;
    ["casher1", "casher2", "casher3"].forEach((key) => {
      const raw = localStorage.getItem(`expense-form-${date}-${key}`);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          (parsed.dropdownInputs || []).forEach((a) => {
            if (a.value === category) {
              sumDrinkFromCashers += parseFloat(a.price) || 0;
            }
          });
        } catch (e) {}
      }
    });

    setDrinkTotal(sumDrinkFromCashers);

    // Fetch yesterday's carryLoss for this drink type
    const fetchCarry = async () => {
      try {
        const yesterday = dayjs(date).subtract(1, "day").format("YYYY-MM-DD");
        const res = await fetch(`/api/v1/expense/get-by-date?date=${yesterday}`);
        if (res.ok) {
          const data = await res.json();
          const yesterdayDrink = (data.drinks || []).find((d) => d.drinkType === category);
          if (yesterdayDrink && yesterdayDrink.carryLoss < 0) {
            setPreviousCarryLoss(yesterdayDrink.carryLoss);
          }
        }
      } catch (err) {
        console.error("Error fetching carry loss:", err);
      }
    };

    fetchCarry();
  }, [category, date]);

  // Total Details builder (ALL calculations preserved completely)
  useEffect(() => {
    if (!isTotalDetails(category)) return;

    const buildLiveSummary = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/expense/get-by-date?date=${date}`);
        const backend = res.ok ? await res.json() : { cashers: [], drinks: [] };

        let cashers = backend.cashers || [];
        let drinks = [];

        // 1) Merge local storage cashers
        ["casher1", "casher2", "casher3"].forEach((key) => {
          const raw = localStorage.getItem(`expense-form-${date}-${key}`);
          if (raw) {
            try {
              const data = JSON.parse(raw);
              const localItems = data.items || [];
              const addons = (data.dropdownInputs || []).map((a) => ({
                name: a.value,
                price: parseFloat(a.price) || 0,
              }));
              const advances = data.staffAdvances || [];

              const totalItems = localItems.reduce((s, i) => s + (parseFloat(i.price) || 0), 0);
              const totalAddons = addons.reduce((s, i) => s + (parseFloat(i.price) || 0), 0);
              const totalAdvances = advances.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
              const totalExpenses = totalItems + totalAddons + totalAdvances;

              const totalSaleVal = parseFloat(data.totalSale) || 0;
              const moneyLiftVal = parseFloat(data.moneyLift) || 0;
              const shotVal = totalSaleVal - totalExpenses - moneyLiftVal;

              const casherData = {
                casherName: data.casherName || key,
                category: key,
                items: localItems,
                addons,
                staffAdvances: advances,
                totalCashersAmount: totalExpenses,
                totalSealAmount: totalSaleVal,
                totalMoneyLift: moneyLiftVal,
                shot: shotVal,
              };

              const idx = cashers.findIndex((c) => c.category === key || c.casherName === casherData.casherName);
              if (idx >= 0) cashers[idx] = casherData;
              else cashers.push(casherData);
            } catch (e) {}
          }
        });

        // 2) Drinks
        ["tea", "juice"].forEach((key) => {
          const raw = localStorage.getItem(`expense-form-${date}-${key}`);
          if (raw) {
            try {
              const data = JSON.parse(raw);
              drinks.push({
                drinkType: key,
                soldAmount: parseFloat(data.soldAmount) || 0,
                commissionPercent: key === "tea" ? parseFloat(data.commission) || 0 : undefined,
                commissionValue: parseFloat(data.commissionValue) || 0,
                finalNetAmount: parseFloat(data.finalNetAmount) || 0,
                carryLoss: parseFloat(data.carryLoss) || 0,
                drinkTotal: parseFloat(data.drinkTotal) || 0,
              });
            } catch (e) {}
          }
        });

        // 3) Calculate all financial audit figures
        const totalCashersAmount = cashers.reduce((s, c) => s + (c.totalCashersAmount || 0), 0);
        const totalCashersSale = cashers.reduce((s, c) => s + (c.totalSealAmount || 0), 0);
        const totalShot = cashers.reduce((s, c) => s + (c.shot || 0), 0);
        const totalDrinksAmount = drinks.reduce((s, d) => s + Math.max(0, d.finalNetAmount || 0), 0);

        const totalOnlineSale = cashers.reduce((sum, c) => {
          const onlineTotal = (c.addons || [])
            .filter((a) => a.name?.toLowerCase() === "online")
            .reduce((s, a) => s + (parseFloat(a.price) || 0), 0);
          return sum + onlineTotal;
        }, 0);

        const totalTeaJuiceInCashers = cashers.reduce((s, c) => {
          const teaJuice = (c.addons || [])
            .filter((a) => a.name?.toLowerCase() === "tea" || a.name?.toLowerCase() === "juice")
            .reduce((sum, a) => sum + (parseFloat(a.price) || 0), 0);
          return s + teaJuice;
        }, 0);

        const totalCashersExpensesExclTeaJuice = cashers.reduce((s, c) => {
          const itemsCost = (c.items || []).reduce((sum, i) => sum + (parseFloat(i.price) || 0), 0);
          const otherAddons = (c.addons || [])
            .filter((a) => a.name?.toLowerCase() !== "tea" && a.name?.toLowerCase() !== "juice")
            .reduce((sum, a) => sum + (parseFloat(a.price) || 0), 0);
          const advs = (c.staffAdvances || []).reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
          return s + itemsCost + otherAddons + advs;
        }, 0);

        const totalBusiness = totalCashersSale + totalDrinksAmount;

        const payout = parseFloat(
          (totalCashersSale - totalDrinksAmount - totalCashersAmount - totalShot).toFixed(2)
        );

        setTotalDetails({
          date,
          cashers,
          drinks,
          totalCashersAmount,
          totalDrinksAmount,
          totalCashersSale,
          totalShot,
          payout,
          totalOnlineSale,
          totalTeaJuiceInCashers,
          totalCashersExpensesExclTeaJuice,
          totalBusiness,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    buildLiveSummary();
  }, [category, date]);

  // Load saved form on initial render
  useEffect(() => {
    if (!date || !category) return;
    const saved = localStorage.getItem(localKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCasherName(parsed.casherName || "");
        setItems(parsed.items || [{ id: 1, name: "", price: "" }]);
        setDropdownInputs(parsed.dropdownInputs || []);
        setStaffAdvances(parsed.staffAdvances || []);
        setTotalSale(parsed.totalSale || "");
        setMoneyLift(parsed.moneyLift || "");
        setSoldAmount(parsed.soldAmount || "");
        setCommission(parsed.commission || "");
        if (parsed.finalNetAmount) setSavedFinalNetAmount(parsed.finalNetAmount);
      } catch (e) {}
    }
  }, [localKey]);

  // Item handlers
  const handleItemChange = (id, field, value) => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    );
    setItems(updated);
    saveToLocalStorage({ items: updated });
  };

  const handleAddItem = () => {
    const updated = [...items, { id: Date.now(), name: "", price: "" }];
    setItems(updated);
    saveToLocalStorage({ items: updated });
  };

  const handleRemoveItem = (id) => {
    if (items.length <= 1) {
      setItems([{ id: Date.now(), name: "", price: "" }]);
      saveToLocalStorage({ items: [{ id: Date.now(), name: "", price: "" }] });
      return;
    }
    const updated = items.filter((item) => item.id !== id);
    setItems(updated);
    saveToLocalStorage({ items: updated });
  };

  // Dropdown addons handlers
  const handleAddDropdown = () => {
    const updated = [...dropdownInputs, { id: Date.now(), value: "tea", price: "" }];
    setDropdownInputs(updated);
    saveToLocalStorage({ dropdownInputs: updated });
  };

  const handleUpdateDropdown = (id, field, value) => {
    const updated = dropdownInputs.map((d) =>
      d.id === id ? { ...d, [field]: value } : d
    );
    setDropdownInputs(updated);
    saveToLocalStorage({ dropdownInputs: updated });
  };

  const handleRemoveDropdown = (id) => {
    const updated = dropdownInputs.filter((d) => d.id !== id);
    setDropdownInputs(updated);
    saveToLocalStorage({ dropdownInputs: updated });
  };

  // Staff advances handlers
  const handleAddStaffAdvance = () => {
    const updated = [...staffAdvances, { id: Date.now(), staffId: "", amount: "" }];
    setStaffAdvances(updated);
    saveToLocalStorage({ staffAdvances: updated });
  };

  const handleUpdateStaffAdvance = (id, field, value) => {
    const updated = staffAdvances.map((entry) => {
      if (entry.id === id) {
        const updatedEntry = { ...entry, [field]: value };
        if (field === "staffId") {
          const staff = staffList.find((s) => s._id === value);
          updatedEntry.staffName = staff ? staff.name : "";
        }
        return updatedEntry;
      }
      return entry;
    });
    setStaffAdvances(updated);
    saveToLocalStorage({ staffAdvances: updated });
  };

  const handleRemoveStaffAdvance = (id) => {
    const updated = staffAdvances.filter((entry) => entry.id !== id);
    setStaffAdvances(updated);
    saveToLocalStorage({ staffAdvances: updated });
  };

  // Calculations for Casher view
  const currentTotalItems = useMemo(
    () => items.reduce((sum, i) => sum + (parseFloat(i.price) || 0), 0),
    [items]
  );
  const currentTotalAddons = useMemo(
    () => dropdownInputs.reduce((sum, d) => sum + (parseFloat(d.price) || 0), 0),
    [dropdownInputs]
  );
  const currentTotalAdvances = useMemo(
    () => staffAdvances.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0),
    [staffAdvances]
  );
  const currentTotalExpenses = currentTotalItems + currentTotalAddons + currentTotalAdvances;
  const currentRemaining = (parseFloat(totalSale) || 0) - currentTotalExpenses;
  const currentShot = currentRemaining - (parseFloat(moneyLift) || 0);

  // Final Submit
  const handleFinalSubmit = async () => {
    if (!totalDetails || submitting) return;
    setSubmitting(true);
    const toastId = toast.loading("Submitting all expenses...");

    try {
      const res = await fetch("/api/v1/expense/add-expense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(totalDetails),
      });

      if (!res.ok) throw new Error("Failed to save summary");

      // Clear local storage for this date
      ["casher1", "casher2", "casher3", "tea", "juice"].forEach((key) => {
        localStorage.removeItem(`expense-form-${date}-${key}`);
      });

      toast.success("Daily summary submitted successfully!", { id: toastId });
      router.push("/expenses");
    } catch (error) {
      console.error(error);
      toast.error("Error submitting expenses", { id: toastId });
      setSubmitting(false);
    }
  };

  const getCategoryTitle = () => {
    if (category === "casher1") return "Casher 1 Counter";
    if (category === "casher2") return "Casher 2 Counter";
    if (category === "casher3") return "Casher 3 Counter";
    if (category === "tea") return "Tea Counter Details";
    if (category === "juice") return "Juice Counter Details";
    if (category === "totalDetails") return "Total Day Summary & Payout";
    return category;
  };

  const getCategoryIcon = () => {
    if (isCasher(category)) return <MdPointOfSale size={26} />;
    if (category === "tea") return <FiCoffee size={26} />;
    if (category === "juice") return <FiDroplet size={26} />;
    return <FiFileText size={26} />;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <Toaster position="top-right" />

      {/* Main Container Card */}
      <div className="neo-card p-6 sm:p-8 bg-white mb-6">
        {/* Header with Back & Date Pill */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b-2 border-black flex-wrap gap-3">
          <button
            onClick={() => router.back()}
            className="neo-btn neo-btn-secondary px-3.5 py-2 text-xs flex items-center gap-1.5"
          >
            <FiArrowLeft size={16} />
            <span>Back to Categories</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="neo-badge bg-[#D4FF00] text-black">
              {date}
            </span>
          </div>
        </div>

        {/* Title */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-12 h-12 rounded-xl border-2 border-black bg-[#D4FF00] shadow-[3px_3px_0px_0px_#000] flex items-center justify-center text-black">
            {getCategoryIcon()}
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
              {getCategoryTitle()}
            </h1>
            <p className="text-xs sm:text-sm font-bold text-gray-600">
              {isCasher(category)
                ? "Enter cashier expense items, tea/juice deductions, advances, and sales"
                : isDrink(category)
                ? "Input drink counter sales and commission rates"
                : "Review all cashier & drink totals before final submission"}
            </p>
          </div>
        </div>

        {/* ----------------- CASHER VIEW ----------------- */}
        {isCasher(category) && (
          <div className="space-y-6">
            {/* Cashier Name */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">
                Cashier Name / Shift Identifier
              </label>
              <input
                type="text"
                value={casherName}
                onChange={(e) => {
                  setCasherName(e.target.value);
                  saveToLocalStorage({ casherName: e.target.value });
                }}
                placeholder="e.g. Ramesh / Morning Shift"
                className="neo-input text-sm font-bold"
              />
            </div>

            {/* Main Items Section */}
            <div className="p-4 sm:p-5 rounded-xl border-2 border-black bg-[#F4F4F0] shadow-[3px_3px_0px_0px_#000]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase tracking-wider text-black">
                  1. Expense Items Breakdown
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white border border-black">
                  Total: {formatINR(currentTotalItems)}
                </span>
              </div>

              <div className="space-y-2.5">
                {items.map((item) => (
                  <div key={item.id} className="grid grid-cols-[1fr_100px_42px] items-center gap-2">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleItemChange(item.id, "name", e.target.value)}
                      placeholder="Item name (e.g. Milk, Gas, Veg)"
                      className="neo-input text-sm bg-white"
                    />
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) => handleItemChange(item.id, "price", e.target.value)}
                      placeholder="₹ Price"
                      className="neo-input text-sm font-mono font-bold bg-white"
                    />
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="h-[42px] w-[42px] flex items-center justify-center rounded-lg border-2 border-black bg-white hover:bg-red-100 text-red-600 transition shadow-[1px_1px_0px_0px_#000]"
                      title="Remove item"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={handleAddItem}
                className="mt-3.5 py-2 px-4 neo-btn neo-btn-secondary text-xs flex items-center gap-1.5"
              >
                <FiPlus size={14} />
                <span>Add Item Line</span>
              </button>
            </div>

            {/* Dropdown Addons (Tea, Juice, Other, Online) */}
            <div className="p-4 sm:p-5 rounded-xl border-2 border-black bg-[#F4F4F0] shadow-[3px_3px_0px_0px_#000]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase tracking-wider text-black">
                  2. Counter Addons (Tea, Juice, Online, Other)
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white border border-black">
                  Total: {formatINR(currentTotalAddons)}
                </span>
              </div>

              <div className="space-y-2.5">
                {dropdownInputs.map((input) => (
                  <div key={input.id} className="grid grid-cols-[130px_1fr_42px] items-center gap-2">
                    <select
                      value={input.value}
                      onChange={(e) => handleUpdateDropdown(input.id, "value", e.target.value)}
                      className="neo-input text-sm font-bold bg-white cursor-pointer"
                    >
                      <option value="tea">☕ Tea</option>
                      <option value="juice">🥤 Juice</option>
                      <option value="online">💳 Online</option>
                      <option value="other">📦 Other</option>
                    </select>
                    <input
                      type="number"
                      value={input.price}
                      onChange={(e) => handleUpdateDropdown(input.id, "price", e.target.value)}
                      placeholder="₹ Amount"
                      className="neo-input text-sm font-mono font-bold bg-white"
                    />
                    <button
                      onClick={() => handleRemoveDropdown(input.id)}
                      className="h-[42px] w-[42px] flex items-center justify-center rounded-lg border-2 border-black bg-white hover:bg-red-100 text-red-600 transition shadow-[1px_1px_0px_0px_#000]"
                      title="Remove addon"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={handleAddDropdown}
                className="mt-3.5 py-2 px-4 neo-btn neo-btn-cyan text-xs flex items-center gap-1.5"
              >
                <FiPlus size={14} />
                <span>Add Counter Addon</span>
              </button>
            </div>

            {/* Staff Advances */}
            <div className="p-4 sm:p-5 rounded-xl border-2 border-black bg-[#F4F4F0] shadow-[3px_3px_0px_0px_#000]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase tracking-wider text-black">
                  3. Staff Daily Advances
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white border border-black">
                  Total: {formatINR(currentTotalAdvances)}
                </span>
              </div>

              <div className="space-y-2.5">
                {staffAdvances.map((entry) => (
                  <div key={entry.id} className="grid grid-cols-[1fr_100px_42px] items-center gap-2">
                    <select
                      value={entry.staffId}
                      onChange={(e) => handleUpdateStaffAdvance(entry.id, "staffId", e.target.value)}
                      className="neo-input text-sm font-bold bg-white cursor-pointer"
                    >
                      <option value="">-- Select Staff --</option>
                      {staffList.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={entry.amount}
                      onChange={(e) => handleUpdateStaffAdvance(entry.id, "amount", e.target.value)}
                      placeholder="₹ Amount"
                      className="neo-input text-sm font-mono font-bold bg-white"
                    />
                    <button
                      onClick={() => handleRemoveStaffAdvance(entry.id)}
                      className="h-[42px] w-[42px] flex items-center justify-center rounded-lg border-2 border-black bg-white hover:bg-red-100 text-red-600 transition shadow-[1px_1px_0px_0px_#000]"
                      title="Remove advance"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={handleAddStaffAdvance}
                className="mt-3.5 py-2 px-4 neo-btn neo-btn-primary text-xs flex items-center gap-1.5"
              >
                <FiPlus size={14} />
                <span>Add Staff Advance</span>
              </button>
            </div>

            {/* Sales & Counter Reconciliation Card */}
            <div className="p-5 sm:p-6 rounded-xl border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000] space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-black border-b-2 border-black pb-2">
                4. Cash Register Balance & Shot Calculation
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                    Total Sale Recorded
                  </label>
                  <input
                    type="number"
                    value={totalSale}
                    onChange={(e) => {
                      setTotalSale(e.target.value);
                      saveToLocalStorage({ totalSale: e.target.value });
                    }}
                    placeholder="₹ Gross Sale"
                    className="neo-input font-mono font-bold text-base"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                    Money Left in Counter
                  </label>
                  <input
                    type="number"
                    value={moneyLift}
                    onChange={(e) => {
                      setMoneyLift(e.target.value);
                      saveToLocalStorage({ moneyLift: e.target.value });
                    }}
                    placeholder="₹ Physical cash left"
                    className="neo-input font-mono font-bold text-base"
                  />
                </div>
              </div>

              {/* Calculated Summary Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                <div className="p-3 rounded-lg border-2 border-black bg-[#F4F4F0]">
                  <span className="text-[10px] font-black uppercase text-gray-600 block">Total Expenses</span>
                  <span className="text-sm font-black font-mono text-black">{formatINR(currentTotalExpenses)}</span>
                </div>

                <div className="p-3 rounded-lg border-2 border-black bg-[#D4FF00]">
                  <span className="text-[10px] font-black uppercase text-black block">Remaining</span>
                  <span className="text-sm font-black font-mono text-black">{formatINR(currentRemaining)}</span>
                </div>

                <div className="p-3 rounded-lg border-2 border-black bg-[#00F0FF]">
                  <span className="text-[10px] font-black uppercase text-black block">Money Left</span>
                  <span className="text-sm font-black font-mono text-black">{formatINR(moneyLift || 0)}</span>
                </div>

                <div className={`p-3 rounded-lg border-2 border-black ${currentShot !== 0 ? "bg-[#FF6B8B]" : "bg-[#F4F4F0]"}`}>
                  <span className="text-[10px] font-black uppercase text-black block">Shot (Shortage)</span>
                  <span className="text-sm font-black font-mono text-black">{formatINR(currentShot)}</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  toast.success("Cashier form saved!");
                  router.push(`/expenses/${date}`);
                }}
                className="w-full py-3.5 neo-btn neo-btn-primary text-base flex items-center justify-center gap-2"
              >
                <FiCheck size={18} />
                <span>Save Cashier Entry & Return</span>
              </button>
            </div>
          </div>
        )}

        {/* ----------------- DRINK VIEW (TEA / JUICE) ----------------- */}
        {isDrink(category) && (
          <div className="space-y-6 max-w-xl mx-auto">
            {/* Raw Total From Cashiers */}
            <div className="p-4 rounded-xl border-2 border-black bg-[#F4F4F0] flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-gray-600 block uppercase tracking-wider">
                  Raw Total Deductions from Cashiers:
                </span>
                <span className="text-xl font-black font-mono text-black">
                  {formatINR(drinkTotal)}
                </span>
              </div>
              <span className="neo-badge bg-white text-black">
                {category.toUpperCase()}
              </span>
            </div>

            {/* Sold Amount */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">
                Total Sold Amount (Gross Counter Sale)
              </label>
              <input
                type="number"
                value={soldAmount}
                onChange={(e) => {
                  setSoldAmount(e.target.value);
                  saveToLocalStorage({ soldAmount: e.target.value });
                }}
                placeholder="₹ Gross sales for counter"
                className="neo-input font-mono font-bold text-base"
              />
            </div>

            {/* Commission */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">
                {category === "tea" ? "Commission Percentage (%)" : "Fixed Commission Amount (₹)"}
              </label>
              <input
                type="number"
                value={commission}
                onChange={(e) => {
                  setCommission(e.target.value);
                  saveToLocalStorage({ commission: e.target.value });
                }}
                placeholder={category === "tea" ? "e.g. 10" : "e.g. 500"}
                className="neo-input font-mono font-bold text-base"
              />
            </div>

            {/* Live Net Calculation Card */}
            <div className="p-5 rounded-xl border-2 border-black bg-[#D4FF00] shadow-[3px_3px_0px_0px_#000] space-y-2">
              <div className="flex justify-between items-center text-sm font-bold text-black">
                <span>Commission Value:</span>
                <span className="font-mono">
                  {category === "tea"
                    ? formatINR(((parseFloat(soldAmount) || 0) * (parseFloat(commission) || 0)) / 100)
                    : formatINR(parseFloat(commission) || 0)}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm font-bold text-black">
                <span>Yesterday Carry Forward:</span>
                <span className="font-mono">{formatINR(previousCarryLoss)}</span>
              </div>

              <div className="pt-2 border-t-2 border-black flex justify-between items-center">
                <span className="text-base font-black text-black">Final Net Amount:</span>
                <span className="text-2xl font-black font-mono text-black">
                  {formatINR(savedFinalNetAmount)}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                handleSaveDrink();
                toast.success(`${category.toUpperCase()} counter saved!`);
                router.push(`/expenses/${date}`);
              }}
              className="w-full py-3.5 neo-btn neo-btn-primary text-base flex items-center justify-center gap-2"
            >
              <FiCheck size={18} />
              <span>Save & Back to Categories</span>
            </button>
          </div>
        )}

        {/* ----------------- TOTAL DETAILS & SUBMIT VIEW ----------------- */}
        {isTotalDetails(category) && (
          <div className="space-y-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="font-bold text-sm text-gray-600">Calculating daily summary...</p>
              </div>
            ) : totalDetails ? (
              <div className="space-y-6">
                {/* 1. Core Summary Numbers */}
                <div className="p-5 sm:p-6 rounded-xl border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000] space-y-3">
                  <h2 className="text-base font-black uppercase tracking-wider text-black border-b-2 border-black pb-2">
                    Daily Financial Summary — {totalDetails.date}
                  </h2>

                  <div className="space-y-2 text-sm font-bold">
                    <div className="flex justify-between items-center p-2.5 rounded-lg bg-[#F4F4F0] border border-black">
                      <span className="text-gray-700">1) Total Cashers Sale:</span>
                      <span className="font-mono text-base text-black">{formatINR(totalDetails.totalCashersSale)}</span>
                    </div>

                    <div className="flex justify-between items-center p-2.5 rounded-lg bg-[#F4F4F0] border border-black">
                      <span className="text-gray-700">2) Total Drinks Amount:</span>
                      <span className="font-mono text-base text-black">{formatINR(totalDetails.totalDrinksAmount)}</span>
                    </div>

                    <div className="flex justify-between items-center p-2.5 rounded-lg bg-[#FFDE59] border border-black">
                      <span className="text-black">3) Total Shot:</span>
                      <span className="font-mono text-base text-black">{formatINR(totalDetails.totalShot)}</span>
                    </div>

                    <div className="flex justify-between items-center p-2.5 rounded-lg bg-[#F4F4F0] border border-black">
                      <span className="text-gray-700">4) Total Cashers Expenses (Including Tea/Juice):</span>
                      <span className="font-mono text-base text-black">{formatINR(totalDetails.totalCashersAmount)}</span>
                    </div>

                    <div className="flex justify-between items-center p-3 rounded-lg bg-[#D4FF00] border-2 border-black shadow-[2px_2px_0px_0px_#000]">
                      <span className="text-base font-black text-black">Remaining / Net Payout:</span>
                      <span className="font-mono text-xl font-black text-black">{formatINR(totalDetails.payout)}</span>
                    </div>

                    <div className="flex justify-between items-center p-2.5 rounded-lg bg-[#00F0FF] border border-black">
                      <span className="text-black">5) Total Online Sale:</span>
                      <span className="font-mono text-base text-black">{formatINR(totalDetails.totalOnlineSale)}</span>
                    </div>

                    {totalDetails.totalTeaJuiceInCashers !== undefined && (
                      <div className="flex justify-between items-center p-2.5 rounded-lg bg-[#F4F4F0] border border-black">
                        <span className="text-gray-700">6) Total Tea/Juice in Cashers:</span>
                        <span className="font-mono text-base text-black">{formatINR(totalDetails.totalTeaJuiceInCashers)}</span>
                      </div>
                    )}

                    {totalDetails.totalCashersExpensesExclTeaJuice !== undefined && (
                      <div className="flex justify-between items-center p-2.5 rounded-lg bg-[#F4F4F0] border border-black">
                        <span className="text-gray-700">7) Total Cashers Expenses (Excl Tea/Juice):</span>
                        <span className="font-mono text-base text-black">{formatINR(totalDetails.totalCashersExpensesExclTeaJuice)}</span>
                      </div>
                    )}

                    {totalDetails.totalBusiness !== undefined && (
                      <div className="flex justify-between items-center p-2.5 rounded-lg bg-[#B794F4] border border-black">
                        <span className="text-black">8) Total Business (Sales + Drinks Net):</span>
                        <span className="font-mono text-base text-black">{formatINR(totalDetails.totalBusiness)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Cashiers Breakdown */}
                <div className="p-5 sm:p-6 rounded-xl border-2 border-black bg-[#F4F4F0] shadow-[4px_4px_0px_0px_#000] space-y-4">
                  <h3 className="text-base font-black uppercase tracking-wider text-black border-b-2 border-black pb-2">
                    Cashier Counters ({totalDetails.cashers.length})
                  </h3>

                  {totalDetails.cashers.length > 0 ? (
                    totalDetails.cashers.map((c, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border-2 border-black bg-white shadow-[2px_2px_0px_0px_#000] space-y-3"
                      >
                        <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                          <span className="font-black text-base text-black">{c.casherName}</span>
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#D4FF00] border border-black">
                            Sale: {formatINR(c.totalSealAmount)}
                          </span>
                        </div>

                        {/* Main Items */}
                        {c.items && c.items.length > 0 && (
                          <div>
                            <span className="text-xs font-bold uppercase text-gray-600 block mb-1">
                              Main Expense Items:
                            </span>
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs font-semibold text-gray-800">
                              {c.items.map((item, i) => (
                                <li key={i} className="flex justify-between p-1 rounded bg-[#F4F4F0] px-2">
                                  <span>{item.name}</span>
                                  <span className="font-mono font-bold">₹{item.price}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Addons */}
                        {c.addons && c.addons.length > 0 && (
                          <div>
                            <span className="text-xs font-bold uppercase text-gray-600 block mb-1">
                              Counter Addons (Tea / Juice / Other / Online):
                            </span>
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs font-semibold text-gray-800">
                              {c.addons.map((addon, i) => (
                                <li key={i} className="flex justify-between p-1 rounded bg-[#00F0FF]/20 px-2">
                                  <span className="capitalize">{addon.name}</span>
                                  <span className="font-mono font-bold">₹{addon.price}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Staff Advances */}
                        {c.staffAdvances && c.staffAdvances.length > 0 && (
                          <div>
                            <span className="text-xs font-bold uppercase text-gray-600 block mb-1">
                              Staff Advances:
                            </span>
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs font-semibold text-gray-800">
                              {c.staffAdvances.map((adv, i) => (
                                <li key={i} className="flex justify-between p-1 rounded bg-[#FFDE59]/30 px-2">
                                  <span>{adv.staffName || "Staff"}</span>
                                  <span className="font-mono font-bold">{formatINR(adv.amount)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Totals Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-gray-200 text-xs font-bold text-gray-700">
                          <div>Expenses: <span className="text-black font-mono">{formatINR(c.totalCashersAmount)}</span></div>
                          <div>Total Sale: <span className="text-black font-mono">{formatINR(c.totalSealAmount)}</span></div>
                          <div>Money Lift: <span className="text-black font-mono">{formatINR(c.totalMoneyLift)}</span></div>
                          <div>Shot: <span className="text-red-600 font-mono">{formatINR(c.shot)}</span></div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm font-bold text-gray-500">No cashiers recorded.</p>
                  )}
                </div>

                {/* 3. Drinks Breakdown */}
                <div className="p-5 sm:p-6 rounded-xl border-2 border-black bg-[#F4F4F0] shadow-[4px_4px_0px_0px_#000] space-y-4">
                  <h3 className="text-base font-black uppercase tracking-wider text-black border-b-2 border-black pb-2">
                    Drinks Breakdown
                  </h3>

                  {totalDetails.drinks.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {totalDetails.drinks.map((d, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-xl border-2 border-black bg-white shadow-[2px_2px_0px_0px_#000] space-y-2"
                        >
                          <div className="flex justify-between items-center border-b border-gray-200 pb-1.5">
                            <span className="font-black text-base uppercase text-black">{d.drinkType}</span>
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#D4FF00] border border-black">
                              Net: {formatINR(d.finalNetAmount)}
                            </span>
                          </div>

                          <div className="space-y-1 text-xs font-semibold text-gray-700">
                            <div className="flex justify-between">
                              <span>Sold Amount:</span>
                              <span className="font-mono font-bold text-black">{formatINR(d.soldAmount)}</span>
                            </div>

                            <div className="flex justify-between">
                              <span>Commission:</span>
                              <span className="font-mono text-black">
                                {d.drinkType === "tea" ? `${d.commissionPercent}% (₹${d.commissionValue})` : `₹${d.commissionValue}`}
                              </span>
                            </div>

                            <div className="flex justify-between">
                              <span>Raw Total from Cashers:</span>
                              <span className="font-mono text-black">{formatINR(d.drinkTotal)}</span>
                            </div>

                            <div className="flex justify-between pt-1 border-t border-gray-100 text-amber-700 font-bold">
                              <span>Yesterday Carry:</span>
                              <span className="font-mono">₹{d.carryLoss || 0}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm font-bold text-gray-500">No drinks recorded.</p>
                  )}
                </div>

                {/* Final Submit Action */}
                <div className="pt-2">
                  <button
                    onClick={handleFinalSubmit}
                    disabled={submitting}
                    className="w-full py-4 neo-btn neo-btn-primary text-base sm:text-lg flex items-center justify-center gap-2"
                  >
                    <span>{submitting ? "Submitting All Records..." : "🚀 Final Submit All Daily Expenses"}</span>
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-center py-8 font-bold text-gray-500">No details to display.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
