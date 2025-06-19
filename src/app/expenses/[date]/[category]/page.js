"use client";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Poppins } from "next/font/google";
import { FaArrowLeft } from "react-icons/fa";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const isCasher = (cat) => cat === "casher1" || cat === "casher2";
const isDrink = (cat) => cat === "tea" || cat === "juice";
const isTotalDetails = (cat) => cat === "totalDetails";

export default function CategoryPage() {
  const { date, category } = useParams();
  const router = useRouter();
  const [soldAmount, setSoldAmount] = useState("");
  const [casherName, setCasherName] = useState("");
  const [items, setItems] = useState([{ id: 1, name: "", price: "" }]);
  const [totalDetails, setTotalDetails] = useState(null);

  const [dropdownInputs, setDropdownInputs] = useState([]);
  const [staffAdvances, setStaffAdvances] = useState([]);
  const [drinkTotal, setDrinkTotal] = useState(0);
  const [commission, setCommission] = useState("");
  const [staffList, setStaffList] = useState([]);
  const [totalSale, setTotalSale] = useState("");
  const [moneyLift, setMoneyLift] = useState("");

  useEffect(() => {
    fetchStaffList();
  }, []);

  const fetchStaffList = async () => {
    try {
      const response = await fetch("/api/v1/staff/get-staff"); // Adjust the API endpoint as needed
      if (!response.ok) {
        throw new Error("Failed to fetch staff list");
      }
      const data = await response.json();
      setStaffList(data);
    } catch (error) {
      console.error("Error fetching staff list:", error);
      setStaffList([]); // Reset to empty if fetch fails
    }
  };


  useEffect(() => {
  if (!isTotalDetails(category)) return;

  const fetchTotalDetails = async () => {
    try {
      const res = await fetch(`/api/v1/expense/get-by-date?date=${date}`);
      const data = await res.json();
      if (res.ok) {
        setTotalDetails(data);
      } else {
        setTotalDetails(null);
      }
    } catch (error) {
      console.error("Failed to fetch total details:", error);
      setTotalDetails(null);
    }
  };

  fetchTotalDetails();
}, [category, date]);


  const handleSubmit = async () => {
    try {
      // 1. Check if expense already exists
      const checkRes = await fetch(
        `/api/v1/expense/check-duplicate?date=${date}&category=${category}`
      );
      const checkData = await checkRes.json();

      if (checkData.exists) {
        alert("An expense for this date and category already exists.");
        return;
      }
      if (isDrink(category)) {
        if (!soldAmount || !commission) {
          alert("Please enter both sold amount and commission for this drink.");
          return;
        }
      }

      // 2. Build payload as before
      const payload = {
        date,
        category,
        type: isCasher(category) ? "casher" : "drink",
        casherName: isCasher(category) ? casherName : undefined,
        items: isCasher(category)
          ? items.map(({ name, price }) => ({
              name,
              price: parseFloat(price),
            }))
          : [],
        totalCashersAmount: isCasher(category) ? total : undefined,
        totalSealAmount: isCasher(category)
          ? parseFloat(totalSale) || 0
          : undefined,
        totalMoneyLift: isCasher(category)
          ? parseFloat(moneyLift) || 0
          : undefined,
        shot: isCasher(category)
          ? (parseFloat(totalSale) || 0) - (parseFloat(moneyLift) || 0)
          : undefined,

        drinkType: isDrink(category) ? category : undefined,
        soldAmount: isDrink(category) ? parseFloat(soldAmount) : undefined,
        commissionPercent: isDrink(category)
          ? parseFloat(commission)
          : undefined,
        commissionValue: isDrink(category)
          ? parseFloat(((soldAmount * commission) / 100).toFixed(2))
          : undefined,
        finalNetAmount: isDrink(category)
          ? parseFloat(
              (
                soldAmount -
                drinkTotal -
                (soldAmount * commission) / 100
              ).toFixed(2)
            )
          : undefined,
      };

      // 3. Save if not duplicate
      const response = await fetch("/api/v1/expense/add-expense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message);

      alert("Expense saved successfully!");
      router.push("/");
    } catch (error) {
      console.error(error);
      alert("Failed to save expense.");
    }
  };

  const handleAdd = () => {
    setItems([...items, { id: Date.now(), name: "", price: "" }]);
  };

  const handleRemove = (id) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const handleChange = (id, field, value) => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const addDropdownInput = () => {
    setDropdownInputs([
      ...dropdownInputs,
      { id: Date.now(), value: "tea", price: "" },
    ]);
  };

  const updateDropdownInput = (id, field, value) => {
    setDropdownInputs(
      dropdownInputs.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    );
  };

  const removeDropdownInput = (id) => {
    setDropdownInputs(dropdownInputs.filter((d) => d.id !== id));
  };

  const addStaffAdvance = () => {
    setStaffAdvances([
      ...staffAdvances,
      { id: Date.now(), staffId: "", amount: "" },
    ]);
  };

  const updateStaffAdvance = (id, field, value) => {
    setStaffAdvances(
      staffAdvances.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry
      )
    );
  };

  const removeStaffAdvance = (id) => {
    setStaffAdvances(staffAdvances.filter((entry) => entry.id !== id));
  };

  const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);
  // total of casher items
  const itemsTotal = items.reduce(
    (sum, item) => sum + (parseFloat(item.price) || 0),
    0
  );

  // total of dropdown inputs (tea, juice, other)
  const dropdownTotal = dropdownInputs.reduce(
    (sum, d) => sum + (parseFloat(d.price) || 0),
    0
  );

  // total of staff advances
  const staffAdvanceTotal = staffAdvances.reduce(
    (sum, s) => sum + (parseFloat(s.amount) || 0),
    0
  );

  // final grand total
  const total = itemsTotal + dropdownTotal + staffAdvanceTotal;

  useEffect(() => {
    if (!isDrink(category)) return;

    const getDrinkTotal = () => {
      const sources = ["casher1", "casher2"];
      let total = 0;

      sources.forEach((src) => {
        const key = `expenses-${date}-${src}`;
        const data = JSON.parse(localStorage.getItem(key) || "[]");
        data.forEach((item) => {
          if (item.name?.toLowerCase() === category.toLowerCase()) {
            total += parseFloat(item.price) || 0;
          }
        });
      });

      setDrinkTotal(total);
    };

    getDrinkTotal();
  }, [category, date]);

  return (
    <div
      className={` bg-cover bg-center bg-no-repeat ${poppins.className}`}
      style={{ backgroundImage: "url('/image1.jpg')" }}
    >
      <div className=" bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full relative max-w-2xl bg-white/30 backdrop-blur-md rounded-xl p-6 shadow-lg">
          <button
            onClick={() => router.back()}
            className="text-black absolute mt-2 mb-3 hover:bg-black/50 px-2 py-1 text-2xl -top-18 -left-3 rounded "
          >
            <FaArrowLeft className="mr-2" />
          </button>

          <div className="flex justify-between items-center mb-4 gap-2 flex-wrap">
            {isCasher(category) && (
              <input
                type="text"
                value={casherName}
                onChange={(e) => setCasherName(e.target.value)}
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
                      handleChange(item.id, "name", e.target.value)
                    }
                    className="border p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="Item name"
                  />
                  <input
                    type="number"
                    value={item.price}
                    onChange={(e) =>
                      handleChange(item.id, "price", e.target.value)
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
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
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
                    placeholder="Advance ₹"
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
                onChange={(e) => setTotalSale(e.target.value)}
                placeholder="Enter total sale"
                className="p-2 rounded w-full border text-black mb-4"
              />
              <label className="block mb-1 text-white">Remaining Money </label>
              <input
                type="number"
                value={totalSale}
                onChange={(e) => setTotalSale(e.target.value)}
                placeholder="Enter total sale"
                className="p-2 rounded w-full border text-black mb-4"
              />

              <label className="block mb-1 text-white">
                Money Left In Counter
              </label>
              <input
                type="number"
                value={totalSale -total }
                onChange={(e) => setMoneyLift(e.target.value)}
                placeholder="Enter money left"
                className="p-2 rounded w-full border text-black mb-4"
              />

              <label className="block mb-1 text-white">Shot</label>
              <input
                type="number"
                readOnly
                value={totalSale && moneyLift ? totalSale - moneyLift : 0}
                className="p-2 rounded w-full border text-black mb-4"
              />

              <div className="text-right text-xl font-bold text-white drop-shadow border-t border-white/30 pt-4">
                Total: ₹{total.toFixed(2)}
              </div>
               <button
            onClick={handleSubmit}
            className="bg-purple-700 text-white px-4 py-2 rounded-md hover:opacity-90 font-semibold transition w-full mt-"
          >
            💾 Save Expense
          </button>
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
        <p className="text-xl">₹{drinkTotal.toFixed(2)}</p>
      </div>

      <input
        type="number"
        value={soldAmount}
        onChange={(e) => setSoldAmount(e.target.value)}
        placeholder="Enter total sold (e.g. 100)"
        className="p-3 rounded w-full border text-black"
      />

      <input
        type="number"
        value={commission}
        onChange={(e) => setCommission(e.target.value)}
        placeholder="Enter commission %"
        className="p-3 rounded w-full border text-black"
      />

      {soldAmount && commission && (
        <div className="bg-black/40 p-4 rounded text-white space-y-2">
          <p>
            Commission ({commission}% of ₹{soldAmount}): ₹
            {((soldAmount * commission) / 100).toFixed(2)}
          </p>
          <p>Raw Total from Cashers: ₹{drinkTotal.toFixed(2)}</p>
          <hr className="border-white/20 my-2" />
          <p className="font-bold text-lg">
            Final Net = ₹
            {(
              soldAmount -
              drinkTotal -
              (soldAmount * commission) / 100
            ).toFixed(2)}
          </p>
        </div>
      )}
    </div>

    <button
      onClick={handleSubmit}
      className="mt-6 w-full py-3 rounded-lg bg-purple-700 text-white font-semibold hover:opacity-90 transition"
    >
      💾 Save Expense
    </button>
  </div>
)}

{isTotalDetails(category) && (
  <div className="flex flex-col justify-between min-h-[70vh] w-full max-w-2xl mx-auto px-4 py-6">
    {totalDetails ? (
      <div className="space-y-6 text-white">

        <h2 className="text-xl font-bold mb-2">
          Daily Summary — {totalDetails.date}
        </h2>

        <div className="bg-black/40 p-4 rounded">
          <p><strong>Total Cashers Amount:</strong> ₹{totalDetails.totalCashersAmount.toFixed(2)}</p>
          <p><strong>Total Drinks Amount:</strong> ₹{totalDetails.totalDrinksAmount.toFixed(2)}</p>
          <p><strong>Grand Total:</strong> ₹{totalDetails.grandTotal.toFixed(2)}</p>
        </div>

        {/* CASHERS DETAIL */}
        <div className="bg-black/40 p-4 rounded">
          <h3 className="text-lg font-bold mb-2">Cashers</h3>
          {totalDetails.cashers.length > 0 ? (
            totalDetails.cashers.map((c, idx) => (
              <div key={idx} className="mb-4 border-b border-white/20 pb-2">
                <p className="font-semibold mb-1">{c.casherName}</p>

                {/* Main items */}
                {c.items.length > 0 && (
                  <>
                    <p className="underline text-sm">Main Items:</p>
                    <ul className="ml-4 list-disc">
                      {c.items.map((item, i) => (
                        <li key={i}>{item.name}: ₹{item.price}</li>
                      ))}
                    </ul>
                  </>
                )}

                {/* Addons */}
                {c.addons.length > 0 && (
                  <>
                    <p className="underline text-sm mt-2">Addons (Tea/Juice/Other):</p>
                    <ul className="ml-4 list-disc">
                      {c.addons.map((addon, i) => (
                        <li key={i}>{addon.name}: ₹{addon.price}</li>
                      ))}
                    </ul>
                  </>
                )}

                {/* Cashier totals */}
                <div className="mt-2 text-sm">
                  <p>Total Cashers Amount: ₹{c.totalCashersAmount}</p>
                  <p>Total Sale: ₹{c.totalSealAmount}</p>
                  <p>Money Lift: ₹{c.totalMoneyLift}</p>
                  <p>Shot: ₹{c.shot}</p>
                </div>
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
              <div key={idx} className="mb-2 border-b border-white/20 pb-1">
                <p className="font-semibold">{d.drinkType}</p>
                <p>Sold Amount: ₹{d.soldAmount}</p>
                <p>Commission: {d.commissionPercent}% → ₹{d.commissionValue}</p>
                <p>Final Net: ₹{d.finalNetAmount}</p>
              </div>
            ))
          ) : (
            <p>No drinks recorded.</p>
          )}
        </div>

      </div>
    ) : (
      <p className="text-center text-white">Loading daily details...</p>
    )}
  </div>
)}


         
        </div>
      </div>
    </div>
  );
}
