"use client";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Poppins } from "next/font/google";
import { FaArrowLeft } from "react-icons/fa";
import toast, { Toaster } from "react-hot-toast";
import dayjs from "dayjs";

// ✅ Google Font
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

// ✅ Utility functions
const isCasher = (cat) => ["casher1", "casher2", "casher3"].includes(cat);
const isDrink = (cat) => cat === "tea" || cat === "juice";
const isTotalDetails = (cat) => cat === "totalDetails";

// ✅ Wrapper with forced remount
export default function CategoryPage() {
  const router = useRouter();
  const { date, category } = useParams();
  return (
    <CategoryPageContent
      key={router.asPath} // force remount
      date={date}
      category={category}
    />
  );
}

// ✅ Actual page logic here
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
  const [showUploadGuide, setShowUploadGuide] = useState(false);
const fileInputRef = useRef(null);
  const [staffAdvances, setStaffAdvances] = useState([]);
  const [drinkTotal, setDrinkTotal] = useState(0);
  const [commission, setCommission] = useState("");
  const [staffList, setStaffList] = useState([]);
  const [totalSale, setTotalSale] = useState("");
  const [moneyLift, setMoneyLift] = useState("");
  const [loading, setLoading] = useState(true);
  const localKey = `expense-form-${date}-${category}`;
const [ocrImage, setOcrImage] = useState(null);
const [ocrLines, setOcrLines] = useState([]);
const [ocrLoading, setOcrLoading] = useState(false);

  // ✅ Helper: save all data
  const saveToLocalStorage = (newFields = {}) => {
    // Always merge possible new changes
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
  useEffect(() => {
    if (!isDrink(category) || !hasMounted) return;
    handleSaveDrink();
  }, [soldAmount, commission, drinkTotal, previousCarryLoss, hasMounted]);
  // ✅ Fetch staff list once
  useEffect(() => {
    const fetchStaffList = async () => {
      try {
        const response = await fetch("/api/v1/staff/get-staff-for-form");
        if (!response.ok) throw new Error("Failed to fetch staff list");
        const data = await response.json();
        setStaffList(data);
      } catch (error) {
        console.error(error);
        setStaffList([]);
      }
    };
    fetchStaffList();
  }, []);

  useEffect(() => {
    if (!isTotalDetails(category)) return;

    const buildLiveSummary = async () => {
      setLoading(true);
      try {
        // ✅ 1) Backend fallback
        const res = await fetch(`/api/v1/expense/get-by-date?date=${date}`);
        const backend = res.ok ? await res.json() : { cashers: [], drinks: [] };

        let cashers = backend.cashers || [];
        let drinks = backend.drinks || [];

        // ✅ 2) Merge local storage cashers
        ["casher1", "casher2", "casher3"].forEach((key) => {
          const localKey = `expense-form-${date}-${key}`;
          const raw = localStorage.getItem(localKey);
          if (raw) {
            const data = JSON.parse(raw);
            console.log("data", data);
            const items = data.items || [];
            const addons = (data.dropdownInputs || []).map((a) => ({
              name: a.value,
              price: a.price,
            }));
            const advances = data.staffAdvances || [];

            const totalItems = items.reduce(
              (sum, i) => sum + (parseFloat(i.price) || 0),
              0
            );
            const totalAddons = addons.reduce(
              (sum, i) => sum + (parseFloat(i.price) || 0),
              0
            );
            const totalAdvances = advances.reduce(
              (sum, i) => sum + (parseFloat(i.amount) || 0),
              0
            );
            const totalExpenses = totalItems + totalAddons + totalAdvances;

            const casherData = {
              casherName: data.casherName || key,
              category: key,
              items,
              addons,
              staffAdvances: advances,
              totalCashersAmount: totalExpenses,
              totalSealAmount: parseFloat(data.totalSale || 0),
              totalMoneyLift: parseFloat(data.moneyLift || 0),
              shot:
                parseFloat(data.totalSale || 0) -
                totalExpenses -
                parseFloat(data.moneyLift || 0),
            };

            const index = cashers.findIndex(
              (c) => c.casherName === casherData.casherName
            );
            if (index >= 0) {
              cashers[index] = casherData;
            } else {
              cashers.push(casherData);
            }
          }
        });

      
        // ✅ Step 3) Calculate drinkTotals from cashers
        const drinkTotals = { tea: 0, juice: 0 };
        cashers.forEach((c) => {
          c.addons.forEach((a) => {
            if (a.name === "tea" || a.name === "juice") {
              drinkTotals[a.name] += parseFloat(a.price || 0);
            }
          });
        });

        // ✅ Step 3) Build the new drinks array
        const newDrinks = [];

        ["tea", "juice"].forEach((key) => {
          const localKey = `expense-form-${date}-${key}`;
          const raw = localStorage.getItem(localKey);

          if (raw) {
            const data = JSON.parse(raw);
            const soldAmount = parseFloat(data.soldAmount || 0);
            const commissionPercent = parseFloat(data.commission || 0);
            const commissionValue = parseFloat(data.commissionValue || 0);
            const previousCarryLoss = parseFloat(data.carryLoss || 0);
            const finalNetAmount = parseFloat(data.finalNetAmount || 0);
            const savedDrinkTotal = parseFloat(data.drinkTotal || 0);

            newDrinks.push({
              drinkType: key,
              soldAmount,
              commissionPercent: key === "tea" ? commissionPercent : undefined,
              commissionValue,
              finalNetAmount,
              carryLoss: previousCarryLoss,
              drinkTotal: savedDrinkTotal,
            });
          } else {
            newDrinks.push({
              drinkType: key,
              soldAmount: 0,
              commissionPercent: key === "tea" ? 0 : undefined,
              commissionValue: 0,
              finalNetAmount: 0,
              carryLoss: 0,
              drinkTotal: parseFloat(drinkTotals[key].toFixed(2)),
            });
          }
        });

        drinks = newDrinks;

        // ✅ 4) Totals
        const totalCashersAmount = cashers.reduce(
          (s, c) => s + (c.totalCashersAmount || 0),
          0
        );
        console.log("totalCashersAmount", totalCashersAmount);
        const tea = drinks.find((d) => d.drinkType === "tea");
        const juice = drinks.find((d) => d.drinkType === "juice");

        const totalDrinksAmount =
          (tea?.finalNetAmount || 0) + (juice?.finalNetAmount || 0);

          console.log("totalDrinks:::::::::::::",totalDrinksAmount)
        const totalCashersSale = cashers.reduce(
          (s, c) => s + (c.
totalSealAmount || 0),
          0
        );
        console.log("totalCashersSale", totalCashersSale);
        console.log("totalCashersAmount", totalCashersAmount);
        const totalShot = cashers.reduce(
          (sum, c) => sum + (parseFloat(c.shot) || 0),
          0
        );
        console.log("totalShot", totalShot);
        //  Add totalOnlineSale here
        const totalOnlineSale = cashers.reduce((sum, c) => {
          const onlineTotal = c.addons
            .filter((a) => a.name === "online")
            .reduce((s, a) => s + (parseFloat(a.price) || 0), 0);
          return sum + onlineTotal;
        }, 0);
        const totalTeaJuiceInCashers = cashers.reduce((s, c) => {
          const teaJuice = c.addons
            .filter((a) => a.name === "tea" || a.name === "juice")
            .reduce((sum, a) => sum + (parseFloat(a.price) || 0), 0);
          return s + teaJuice;
        }, 0);

        console.log("totalTeaJuiceInCashers", totalTeaJuiceInCashers);
        const totalCashersExpensesExclTeaJuice = cashers.reduce((s, c) => {
          const items = c.items.reduce(
            (sum, i) => sum + (parseFloat(i.price) || 0),
            0
          );
          const otherAddons = c.addons
            .filter((a) => a.name !== "tea" && a.name !== "juice")
            .reduce((sum, a) => sum + (parseFloat(a.price) || 0), 0);
          const advances = c.staffAdvances
            ? c.staffAdvances.reduce(
                (sum, a) => sum + (parseFloat(a.amount) || 0),
                0
              )
            : 0;
          return s + items + otherAddons + advances;
        }, 0);
        console.log(
          "totalCashersExpensesExclTeaJuice",
          totalCashersExpensesExclTeaJuice
        );

        const totalBusiness = totalCashersSale + totalDrinksAmount;
        const payout = parseFloat(
          (
            totalCashersSale -
            Math.max(0, totalDrinksAmount) -
            totalCashersAmount -
            totalShot
          ).toFixed(2)
        );

        console.log("payout", payout);
        // ✅ 5) Save all to state
        setTotalDetails({
          date,
          cashers,
          totalShot,
          drinks,
          totalCashersAmount,
          totalDrinksAmount,
          grandTotal: totalCashersAmount + totalDrinksAmount,
          totalCashersSale,
          totalOnlineSale,
          totalTeaJuiceInCashers,
          totalCashersExpensesExclTeaJuice,
          totalBusiness,
          payout,
        });
      } catch (err) {
        console.error(err);
        setTotalDetails(null);
      } finally {
        setLoading(false);
      }
    };

    buildLiveSummary();
  }, [category, date]);

  //  Load saved form from localStorage every time path changes
  useEffect(() => {
    if (!date || !category) return;
    const saved = localStorage.getItem(localKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      console.log("parsed", parsed);
      setCasherName(parsed.casherName || "");
      setItems(parsed.items || [{ id: 1, name: "", price: "" }]);
      setDropdownInputs(parsed.dropdownInputs || []);
      setStaffAdvances(parsed.staffAdvances || []);
      setTotalSale(parsed.totalSale || "");
      setMoneyLift(parsed.moneyLift || "");
      setSoldAmount(parsed.soldAmount || "");
      setCommission(parsed.commission || "");
    }
  }, [localKey, router.asPath]);
const handleRunOCR = async () => {
  if (!ocrImage) {
    toast.error("Please select an image first");
    return;
  }

  try {
    setOcrLoading(true);

    const formData = new FormData();
    formData.append("image", ocrImage);

    const res = await fetch("/api/ocr/azure/azure", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const { error } = await res.json();
      throw new Error(error || "Server error");
    }

    const data = await res.json();
    console.log("OCR lines:", data.lines);
    const parsed = parseOcrLines(data.lines);

  // 🟢 Update states
  setItems(parsed.items);
  setDropdownInputs(parsed.dropdownInputs);
  setStaffAdvances(parsed.staffAdvances);
  setTotalSale(parsed.totalSale);
  setMoneyLift(parsed.moneyLift);

  // 🟢 Save to local storage
  saveToLocalStorage({
    items: parsed.items,
    dropdownInputs: parsed.dropdownInputs,
    staffAdvances: parsed.staffAdvances,
    totalSale: parsed.totalSale,
    moneyLift: parsed.moneyLift
  });

  toast.success("OCR extraction and auto-fill complete!");
  } catch (err) {
    console.error(err);
    toast.error(err.message);
  } finally {
    setOcrLoading(false);
  }
};



 // ✅ Flexible line parser for OCR
function parseAmountLine(line) {
  // Normalize separators like = /- ₹ :
  line = line
    .replace(/[₹=:/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!line) return null;

  const parts = line.split(" ");
  if (parts.length < 2) return null;

  const amount = parseFloat(parts[parts.length - 1]);
  if (isNaN(amount)) return null;

  const name = parts.slice(0, -1).join(" ").trim();
  if (!name) return null;

  return { name, amount };
}

// ✅ OCR lines parser using above
function parseOcrLines(lines) {
  let mode = "";
  let items = [];
  let dropdownInputs = [];
  let staffAdvances = [];
  let totalSale = "";
  let moneyLift = "";

  lines.forEach((line) => {
    line = line.trim();
    if (!line) return;

    const normalized = line.toLowerCase().replace(/\s+/g, "");

    if (normalized.startsWith("items")) {
      mode = "items";
      return;
    } 
    if (normalized.startsWith("dropdown")) {
      mode = "dropdown";
      return;
    } 
    if (normalized.startsWith("staffadvances")) {
      mode = "staff";
      return;
    } 
    if (normalized.startsWith("totalsale") || normalized.startsWith("total")) {
      mode = "totalSale";
      return;
    } 
    if (normalized.startsWith("moneylift")) {
      mode = "moneyLift";
      return;
    } 

    // Normalize for numeric parsing
    const cleanNumberText = line.replace(/[₹=:/-]/g, " ").trim();
    const numberPart = parseFloat(cleanNumberText);

    if (!isNaN(numberPart)) {
      if (mode === "totalSale") {
        totalSale = `${numberPart}`;
      } else if (mode === "moneyLift") {
        moneyLift = `${numberPart}`;
      }
      return;
    }

    // Fallback for name + amount lines
    const parsed = parseAmountLine(line);
    if (!parsed) return;

    const { name, amount } = parsed;

    if (mode === "items") {
      items.push({ id: Date.now() + Math.random(), name, price: amount });
    } 
    else if (mode === "dropdown") {
      dropdownInputs.push({ id: Date.now() + Math.random(), value: name.toLowerCase(), price: amount });
    } 
    else if (mode === "staff") {
      staffAdvances.push({ id: Date.now() + Math.random(), staffName: name, staffId: "", amount });
    } 
    else if (mode === "totalSale") {
      totalSale = `${amount}`;
    } 
    else if (mode === "moneyLift") {
      moneyLift = `${amount}`;
    }
  });

  return {
    items,
    dropdownInputs,
    staffAdvances,
    totalSale,
    moneyLift
  };
}











 

 


  //   const needed=["tea","juice"]
  // const filter= dropdownInputs.filter(e =>needed.includes(e.value)).reduce((sum,item)=>sum+item.price)

  // console.log("filters::::::::::::::::::::",filter)

  //  Calculate totals
  const itemsTotal = items.reduce(
    (sum, item) => sum + (parseFloat(item.price) || 0),
    0
  );
  const dropdownTotal = dropdownInputs.reduce(
    (sum, d) => sum + (parseFloat(d.price) || 0),
    0
  );
  const staffAdvanceTotal = staffAdvances.reduce(
    (sum, s) => sum + (parseFloat(s.amount) || 0),
    0
  );
  const total = itemsTotal + dropdownTotal + staffAdvanceTotal;

  useEffect(() => {
    if (!isDrink(category)) return;

    const updateFinalNetAndCarryLoss = () => {
      const sold = parseFloat(soldAmount) || 0;
      const comm = parseFloat(commission) || 0;
      const commValue = category === "tea" ? (sold * comm) / 100 : comm;

      // Calculate today before applying carry
      const todayNet = sold - drinkTotal - commValue;

      // Apply previous carryLoss from yesterday
      const combinedNet = todayNet + previousCarryLoss;

      // Determine new carryLoss
      const newCarryLoss = combinedNet < 0 ? combinedNet : 0;

      // Save both in localStorage
      const localKey = `expense-form-${date}-${category}`;
      const data = JSON.parse(localStorage.getItem(localKey) || "{}");
      data.remaining = combinedNet;
      data.finalNetAmount = combinedNet;
      data.carryLoss = newCarryLoss;
      localStorage.setItem(localKey, JSON.stringify(data));
    };

    updateFinalNetAndCarryLoss();
  }, [soldAmount, commission, drinkTotal, category, date, previousCarryLoss]);

  useEffect(() => {
    if (!isDrink(category)) return;

    const getDrinkTotal = () => {
      const sources = ["casher1", "casher2", "casher3"];
      let total = 0;

      sources.forEach((src) => {
        const key = `expense-form-${date}-${src}`;
        const data = JSON.parse(localStorage.getItem(key) || "{}");
        const addons = data.dropdownInputs || [];

        addons.forEach((addon) => {
          if (addon.value?.toLowerCase() === category.toLowerCase()) {
            total += parseFloat(addon.price) || 0;
          }
        });
      });

      setDrinkTotal(total);
    };

    getDrinkTotal();
  }, [category, date]);

  useEffect(() => {
    if (!isDrink(category)) return;

    const localKey = `expense-form-${date}-${category}`;
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const data = JSON.parse(raw);
      setSavedFinalNetAmount(parseFloat(data.finalNetAmount || 0));
    }
  }, [soldAmount, commission, drinkTotal, previousCarryLoss, category, date]);

  useEffect(() => {
    if (!isDrink(category) || !date) return;

    const fetchYesterdayCarryLoss = async () => {
      try {
        const yesterdayDate = dayjs(date)
          .subtract(1, "day")
          .format("YYYY-MM-DD");
        const res = await fetch(
          `/api/v1/expense/daily-carryLoss-check?date=${yesterdayDate}`
        );
        if (!res.ok) {
          setPreviousCarryLoss(0);
          return;
        }

        const data = await res.json();
        const drink = (data.drinks || []).find((d) => d.drinkType === category);

        if (drink && drink.carryLoss && drink.carryLoss < 0) {
          setPreviousCarryLoss(drink.carryLoss);
        } else {
          setPreviousCarryLoss(0);
        }
      } catch (err) {
        console.error("Error fetching yesterday carryLoss", err);
        setPreviousCarryLoss(0);
      }
    };

    fetchYesterdayCarryLoss();
  }, [category, date]);

  // ✅ Handlers that save instantly
  const handleCasherNameChange = (value) => {
    setCasherName(value);
    saveToLocalStorage({ casherName: value });
  };

  const handleAdd = () => {
    const updated = [...items, { id: Date.now(), name: "", price: "" }];
    setItems(updated);
    saveToLocalStorage({ items: updated });
  };

  const handleRemove = (id) => {
    const updated = items.filter((item) => item.id !== id);
    setItems(updated);
    saveToLocalStorage({ items: updated });
  };

  const handleChange = (id, field, value) => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    );
    setItems(updated);
    saveToLocalStorage({ items: updated });
  };

  const addDropdownInput = () => {
    const updated = [
      ...dropdownInputs,
      { id: Date.now(), value: "tea", price: "" },
    ];
    setDropdownInputs(updated);
    saveToLocalStorage({ dropdownInputs: updated });
  };

  const updateDropdownInput = (id, field, value) => {
    const updated = dropdownInputs.map((d) =>
      d.id === id ? { ...d, [field]: value } : d
    );
    setDropdownInputs(updated);
    saveToLocalStorage({ dropdownInputs: updated });
  };

  const removeDropdownInput = (id) => {
    const updated = dropdownInputs.filter((d) => d.id !== id);
    setDropdownInputs(updated);
    saveToLocalStorage({ dropdownInputs: updated });
  };

  const addStaffAdvance = () => {
    const updated = [
      ...staffAdvances,
      { id: Date.now(), staffId: "", amount: "" },
    ];
    setStaffAdvances(updated);
    saveToLocalStorage({ staffAdvances: updated });
  };


  const updateStaffAdvance = (id, field, value) => {
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

  const removeStaffAdvance = (id) => {
    const updated = staffAdvances.filter((entry) => entry.id !== id);
    setStaffAdvances(updated);
    saveToLocalStorage({ staffAdvances: updated });
  };

  const handleTotalSaleChange = (value) => {
    setTotalSale(value);
    saveToLocalStorage({ totalSale: value });
  };

  const handleMoneyLiftChange = (value) => {
    setMoneyLift(value);
    saveToLocalStorage({ moneyLift: value });
  };

  const handleSoldAmountChange = (value) => {
    setSoldAmount(value);
    saveToLocalStorage({ soldAmount: value });
  };

  const handleCommissionChange = (value) => {
    setCommission(value);
    saveToLocalStorage({ commission: value });
  };

//   const handleFinalSubmit = async () => {
//     const toastId = toast.loading("Submitting all data...");

//     try {
//       await fetch("/api/v1/expense/add-expense", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//        body: JSON.stringify({
//   ...totalDetails,
//   drinks: totalDetails.drinks.map((d) => ({
//     drinkType: d.drinkType,
//     soldAmount: d.soldAmount,
//     commissionPercent: d.commissionPercent,
//     commissionValue: d.commissionValue
//   }))
// }),
//       });

//       // clear localStorage
//       ["casher1", "casher2", "casher3", "tea", "juice"].forEach((key) => {
//         localStorage.removeItem(`expense-form-${date}-${key}`);
//       });

//       toast.success("All expenses submitted!", { id: toastId });
//       router.push("/expenses");
//     } catch (error) {
//       console.error(error);
//       toast.error("Error submitting expenses", { id: toastId });
//     }
//   };


const handleFinalSubmit = async () => {
  const toastId = toast.loading("Submitting all data...");

  try {
    // Remove computed/carry fields from drinks before submitting
    const filteredData = {
      ...totalDetails,
      drinks: totalDetails.drinks.map((d) => ({
        drinkType: d.drinkType,
        soldAmount: d.soldAmount,
        commissionPercent: d.commissionPercent,
        commissionValue: d.commissionValue,
      })),
    };

    await fetch("/api/v1/expense/add-expense", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(filteredData),
    });

    // clear localStorage
    ["casher1", "casher2", "casher3", "tea", "juice"].forEach((key) => {
      localStorage.removeItem(`expense-form-${date}-${key}`);
    });

    toast.success("All expenses submitted!", { id: toastId });
    router.push("/expenses");
  } catch (error) {
    console.error(error);
    toast.error("Error submitting expenses", { id: toastId });
  }
};

  const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

  const formatINR = (num) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(num || 0);

  const handleSaveDrink = () => {
    const sold = parseFloat(soldAmount) || 0;
    const comm = parseFloat(commission) || 0;
    const commValue = category === "tea" ? (sold * comm) / 100 : comm;

    const todayNet = sold - drinkTotal - commValue;
    const combinedNet = todayNet + previousCarryLoss;

    const localKey = `expense-form-${date}-${category}`;
    const data = {
      soldAmount: sold,
      commission: comm,
      commissionValue: parseFloat(commValue.toFixed(2)),
      finalNetAmount: parseFloat(combinedNet.toFixed(2)),
      previousCarryLoss,
      drinkTotal,
    };

    // For tea, store commissionPercent
    if (category === "tea") {
      data.commissionPercent = comm;
    }

    localStorage.setItem(localKey, JSON.stringify(data));
    // toast.success("Drink entry saved!");
  };

  return (
    <div
      className={` bg-cover bg-center bg-no-repeat ${poppins.className}`}
      style={{ backgroundImage: "url('/image1.jpg')" }}
    >
      <Toaster />
      <div className=" min-h-screen  overflow-y-auto bg-black/40 backdrop-blur-sm sm:mt-8 flex items-center justify-center p-4">
        <div className="w-full relative max-w-2xl bg-white/30 backdrop-blur-md rounded-xl p-6 shadow-lg">
          <button
            onClick={() => router.back()}
            className="text-black absolute  mt-2 mb-3 hover:bg-black/50 px-2 py-1 text-2xl  -top-2 -left-1 rounded "
          >
            <FaArrowLeft className="mr-2" />
          </button>

          <div className="flex justify-between items-center mb-4 mt-4 gap-2 flex-wrap">
            {isCasher(category) && (
              <input
                type="text"
                value={casherName}
                onChange={(e) => handleCasherNameChange(e.target.value)}
                placeholder="Cashier name"
                className="p-2 rounded border text-black flex-1 min-w-[150px]"
              />
            )}
          </div>

          <h1 className="text-xl font-semibold capitalize mb-6 text-center text-white drop-shadow">
            {category} – {date}
          </h1>

          {/* Casher UI */}
          {isCasher(category) && (
            <>
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-2 mb-4">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) =>
                      handleChange(item.id, "name", e.target.value.trim())
                    }
                    className="border p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="Item name"
                  />
                  <input
                    type="number"
                    value={item.price}
                    onChange={(e) =>
                      handleChange(item.id, "price", e.target.value.trim())
                    }
                    className="border p-2 w-1/3 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="Price"
                  />
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="text-red-600 text-xl"
                    title="Remove"
                  >
                    ❌
                  </button>
                </div>
              ))}

              <button
                onClick={handleAdd}
                className="bg-[#d72cba] text-white px-4 py-2 rounded-md hover:opacity-90 font-semibold transition mb-4 w-full"
              >
                ➕ Add Item
              </button>
<div className="flex flex-col mb-6 gap-4">
<button
    onClick={() => setShowUploadGuide(true)}
    className="bg-yellow-500 text-black py-3 rounded-lg font-semibold hover:bg-yellow-600 transition w-full"
  >
    📖 View Upload Instructions
  </button>

  {!ocrImage && (
    <button
      onClick={() => fileInputRef.current?.click()}
      className="bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
    >
      📸 Scan Handwritten Note
    </button>
  )}

  <input
    type="file"
    accept="image/*"
    capture="environment"
    ref={fileInputRef}
    className="hidden"
    onChange={(e) => {
      if (e.target.files && e.target.files[0]) {
        setOcrImage(e.target.files[0]);
        toast.success("Image selected! Ready to extract.");
      }
    }}
  />

  {ocrImage && (
    <div className="flex flex-col items-center gap-4">
      <img
        src={URL.createObjectURL(ocrImage)}
        alt="Selected"
        className="max-w-xs rounded shadow-md"
      />

      <button
        onClick={handleRunOCR}
        disabled={ocrLoading}
        className="bg-purple-700 text-white py-3 rounded-lg font-semibold hover:bg-purple-800 transition w-full max-w-xs"
      >
        {ocrLoading ? "Processing..." : "✅ Extract Text from Image"}
      </button>

      <button
        onClick={() => setOcrImage(null)}
        className="text-red-500 underline text-sm mt-2"
      >
        Remove Image
      </button>
    </div>
  )}
</div>


              <button
                onClick={addDropdownInput}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:opacity-90 font-semibold transition w-full mb-4"
              >
                ➕ Add Tea, Juice, Other
              </button>

              {dropdownInputs.map((input) => (
                <div key={input.id} className="flex items-center gap-2 mb-4">
                  <select
                    value={input.value}
                    onChange={(e) =>
                      updateDropdownInput(input.id, "value", e.target.value)
                    }
                    className="p-2 rounded border bg-white text-gray-800 w-1/2 sm:w-1/3"
                  >
                    <option value="tea">Tea</option>
                    <option value="juice">Juice</option>
                    <option value="other">Other</option>
                    <option value="online">Online</option>
                  </select>
                  <input
                    type="number"
                    value={input.price}
                    onChange={(e) =>
                      updateDropdownInput(input.id, "price", e.target.value)
                    }
                    className="p-2 rounded border w-1/3"
                    placeholder="Enter price"
                  />
                  <button
                    onClick={() => removeDropdownInput(input.id)}
                    className="text-red-600 text-xl"
                    title="Remove"
                  >
                    ❌
                  </button>
                </div>
              ))}

              {/* Staff Advance */}
              <button
                onClick={addStaffAdvance}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:opacity-90 font-semibold transition w-full mb-4"
              >
                ➕ Add Staff Advance
              </button>

              {staffAdvances.map((entry) => (
                <div key={entry.id} className="flex items-center gap-2 mb-4">
                  <select
                    value={entry.staffId}
                    onChange={(e) =>
                      updateStaffAdvance(entry.id, "staffId", e.target.value)
                    }
                    className="p-2 rounded border bg-white text-black w-1/2"
                  >
                    <option value="">Select staff</option>
                    {staffList.map((s, index) => (
                      <option key={index} value={s._id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={entry.amount}
                    onChange={(e) =>
                      updateStaffAdvance(entry.id, "amount", e.target.value)
                    }
                    className="p-2 rounded border w-1/3 text-black"
                    placeholder="Advance amount"
                  />
                  <button
                    onClick={() => removeStaffAdvance(entry.id)}
                    className="text-red-600 text-xl"
                  >
                    ❌
                  </button>
                </div>
              ))}

              <label className="block mb-1 text-white">Total Sale</label>
              <input
                type="number"
                value={totalSale}
                required
                onChange={(e) => handleTotalSaleChange(e.target.value)}
                placeholder="Enter total sale"
                className="p-2 rounded w-full border text-black mb-4"
              />
              <label className="block mb-1 text-white">Remaining Money </label>
              <input
                type="number"
                readOnly
                value={totalSale - total}
                // onChange={(e) => setTotalSale(e.target.value)}
                placeholder="Enter total sale"
                className="p-2 rounded w-full border text-black mb-4"
              />

              <label className="block mb-1 text-white">
                Money Left In Counter
              </label>
              <input
                type="number"
                required
                value={moneyLift}
                onChange={(e) => handleMoneyLiftChange(e.target.value)}
                placeholder="Enter money left"
                className="p-2 rounded w-full border text-black mb-4"
              />

              <label className="block mb-1 text-white">Shot</label>
              <input
                type="number"
                readOnly
                value={
                  totalSale && moneyLift
                    ? parseFloat(totalSale) -
                      parseFloat(total) -
                      parseFloat(moneyLift)
                    : 0
                }
                className="p-2 rounded w-full border text-black mb-4"
              />

              <div className="text-right text-xl font-bold text-white drop-shadow border-t border-white/30 pt-4">
                Total: {total.toFixed(2)}
              </div>
            </>
          )}

          {/* Tea/Juice UI */}
          {isDrink(category) && (
            <div className="flex flex-col justify-between min-h-[70vh] w-full max-w-md mx-auto px-4 py-6">
              <div className="space-y-4">
                <div className="bg-black/40 p-4 rounded text-white">
                  <p className="font-medium">
                    Total {capitalize(category)} from Cashers:
                  </p>
                  <p className="text-xl">{drinkTotal.toFixed(2)}</p>
                </div>

                <input
                  type="number"
                  value={soldAmount}
                  onChange={(e) => handleSoldAmountChange(e.target.value)}
                  placeholder="Enter total sold"
                  className="p-3 rounded w-full border text-black"
                />

                {category === "tea" ? (
                  <input
                    type="number"
                    value={commission}
                    onChange={(e) => handleCommissionChange(e.target.value)}
                    placeholder="Enter commission %"
                    className="p-3 rounded w-full border text-black"
                  />
                ) : (
                  <input
                    type="number"
                    value={commission}
                    onChange={(e) => handleCommissionChange(e.target.value)}
                    placeholder="Enter fixed commission amount"
                    className="p-3 rounded w-full border text-black"
                  />
                )}

                {soldAmount && (
                  <div className="bg-black/40 p-4 rounded text-white space-y-2">
                    {category === "tea" ? (
                      <p>
                        Commission ({commission}% of {soldAmount}):
                        {((soldAmount * commission) / 100).toFixed(2)}
                      </p>
                    ) : (
                      <p>Fixed Commission: {commission}</p>
                    )}

                    <p>Raw Total from Cashers: {drinkTotal.toFixed(2)}</p>
                    <hr className="border-white/20 my-2" />

                    
                    <p className="font-bold text-lg">
                      Final Net = {savedFinalNetAmount.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {isTotalDetails(category) && (
            <div className="flex flex-col justify-between min-h-[70vh] w-full max-w-2xl mx-auto px-4 py-6">
              {totalDetails ? (
                <div className="space-y-6 text-white">
                  <h2 className="sm:text-xl font-bold mb-2">
                    Daily Summary — {totalDetails.date}
                  </h2>

                  <div className="bg-black/40 p-4 rounded space-y-2">
                    <p>
                      <strong> 1) Total Cashers Sale:</strong>
                      {formatINR(totalDetails?.totalCashersSale?.toFixed(2))}
                    </p>

                    <p>
                      <strong>2) Total Drinks Amount:</strong>
                      {formatINR(totalDetails?.totalDrinksAmount?.toFixed(2))}
                    </p>

                    <p>
                      <strong>3) Total Shot :</strong>
                      {formatINR(totalDetails?.totalShot?.toFixed(2))}
                    </p>
                    <p>
                      <strong>
                        4) Total Cashers Expenses (Including Tea/Juice):
                      </strong>{" "}
                      {formatINR(totalDetails?.totalCashersAmount?.toFixed(2))}
                    </p>
                    <p className="bg-[white] text-black">
                      <strong>Remaining / Payout:</strong>
                      {formatINR((totalDetails?.payout || 0).toFixed(2))}
                    </p>
                    <p>
                      <strong>5) Total Online Sale:</strong>
                      {formatINR(totalDetails?.totalOnlineSale?.toFixed(2))}
                    </p>

                 
                  </div>

                  {/* CASHERS DETAIL */}
                  <div className="bg-black/40 p-4 rounded">
                    <h3 className="text-lg font-bold mb-2">Cashers</h3>
                    {totalDetails.cashers.length > 0 ? (
                      totalDetails.cashers.map((c, idx) => (
                        <div
                          key={idx}
                          className="mb-4 border-b border-white/20 pb-2"
                        >
                          <p className="font-semibold mb-1">{c.casherName}</p>

                          {/* Main items */}
                          {c.items.length > 0 && (
                            <>
                              <p className="underline text-sm">Main Items:</p>
                              <ul className="ml-4 list-disc">
                                {c.items.map((item, i) => (
                                  <li key={i}>
                                    {item.name}: {item.price}
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}

                          {/* Addons */}
                          {c.addons.length > 0 && (
                            <>
                              <p className="underline text-sm mt-2">
                                Addons (Tea/Juice/Other):
                              </p>
                              <ul className="ml-4 list-disc">
                                {c.addons.map((addon, i) => (
                                  <li key={i}>
                                    {addon.name}: {addon.price}
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}

                          {/* Cashier totals */}
                          <div className="mt-2 text-sm">
                            <p>
                              Total Cashers (expenses) Amount:
                              {formatINR(c.totalCashersAmount)}
                            </p>
                            <p>Total Sale: {formatINR(c.totalSealAmount)}</p>
                            <p>Money Lift: {formatINR(c.totalMoneyLift)}</p>
                            <p>Shot: {formatINR(c.shot)}</p>
                          </div>
                          {c.staffAdvances && c.staffAdvances.length > 0 && (
                            <>
                              <p className="underline text-sm mt-2">
                                Staff Advances:
                              </p>
                              <ul className="ml-4 list-disc">
                                {c.staffAdvances.map((adv, i) => (
                                  <li key={i}>
                                    {adv?.staffName || "N/A"}:{" "}
                                    {formatINR(adv?.amount)}
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}
                        </div>
                      ))
                    ) : (
                      <p>No cashers recorded.</p>
                    )}
                  </div>

                  {/* DRINKS DETAIL */}
                  <div className="bg-black/40 p-4 rounded">
                    <h3 className="text-lg font-bold mb-2">Drinks</h3>
                    {totalDetails.drinks.length > 0 ? (
                      totalDetails.drinks.map((d, idx) => (
                       

                        <div className="bg-black/40 p-4 rounded text-white space-y-2">
                          <p className="font-medium text-lg">
                            {d.drinkType.toUpperCase()}
                          </p>
                          <p>Sold Amount: {d.soldAmount}</p>

                          {d.drinkType === "tea" ? (
                            <p>
                              Commission ({d.commissionPercent}% of{" "}
                              {d.soldAmount}): {d.commissionValue}
                            </p>
                          ) : (
                            <p>Fixed Commission: {d.commissionValue}</p>
                          )}

                          <p>Raw Total from Cashers: {d.drinkTotal}</p>

                          <hr className="border-white/20 my-2" />

                          <p className="font-bold text-lg">
                            Final Net = {d.finalNetAmount}
                          </p>

                          <p className="text-sm text-yellow-300">
                            (Includes carry forward from yesterday:{" "}
                            {d.carryLoss || 0})
                          </p>
                        </div>
                      ))
                    ) : (
                      <p>No drinks recorded.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="min-h-screen flex items-center justify-center bg-white">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-gray-600 font-medium">
                      Loading Details list...
                    </p>
                  </div>
                </div>
              )}
              <button
                onClick={handleFinalSubmit}
                className="bg-green-700 text-white px-4 py-3 mt-6 rounded-md w-full font-semibold"
              >
                Final Submit All Expenses
              </button>
            </div>
          )}


{showUploadGuide && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 max-w-lg w-full shadow-lg relative">
      <button
        onClick={() => setShowUploadGuide(false)}
        className="absolute top-2 right-2 text-gray-500 hover:text-red-700 text-3xl"
      >
        &times;
      </button>

      <h2 className="text-lg text-black font-semibold mb-4">
        📸 Before uploading your photo, please check:
      </h2>

      <ul className="list-disc pl-5 space-y-2 text-gray-800 text-sm">
        <li>✅ Write clearly in plain handwriting</li>
        <li>✅ One item per line only</li>
        <li>✅ Prices can use = /- : ₹ (all accepted!)</li>
        <li>✅ Use these exact headings (case-insensitive):</li>
        <div className="ml-4 mt-2 space-y-1">
          <p className="font-bold">• Items</p>
          <p className="font-bold">• Dropdown</p>
          <p className="font-bold">• Staff Advances</p>
          <p className="font-bold">• Total Sale</p>
          <p className="font-bold">• Money Lift</p>
        </div>
      </ul>

      <p className="mt-4 text-sm font-medium text-gray-700">
        ✅ Best to write like this example:
      </p>

      <pre className="bg-gray-100 text-black p-3 rounded text-sm mt-2 overflow-x-auto">
{`Items
Pen = 10 /-
Pencil : 5 /-
Eraser ₹ 3
Dropdown
Tea = 50 /-
Juice : 40
Staff Advances
John 200
Jane 300
Total Sale 3000
Money Lift 2000`}
      </pre>

      <p className="text-xs text-gray-500 mt-3">
        Once ready, choose your image below.
      </p>

      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          setOcrImage(e.target.files[0]);
          setShowUploadGuide(false);
        }}
        className="mt-4 p-2 rounded w-full border text-black"
      />
    </div>
  </div>
)}



        </div>
      </div>
    </div>
  );
}
