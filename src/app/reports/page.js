"use client";
import { useState, useEffect } from "react";
import { Poppins } from "next/font/google";
import DataTable from "react-data-table-component";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // States
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
console.log("selectedExpense",selectedExpense)
  // Effect: redirect non-owner users
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "owner") {
      router.push("/no-permission");
    }
  }, [status, session, router]);

  // Effect: fetch reports for owners
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "owner") {
      fetchReports();
    }
  }, [status, session]);


  if (status === "loading" || loading) {
  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-800 to-lime-800 ${poppins.className}`}>
      <div className="max-w-6xl w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/30 shadow-2xl space-y-6">
        <div className="animate-pulse space-y-6">
          {/* Title */}
          <div className="h-8 w-1/3 bg-white/30 rounded mx-auto"></div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-12 bg-white/20 rounded"></div>
            <div className="h-12 bg-white/20 rounded"></div>
            <div className="h-12 bg-white/20 rounded"></div>
          </div>

          {/* Button */}
          <div className="h-12 w-40 bg-white/20 rounded mx-auto"></div>

          {/* Table Skeleton */}
          <div className="border border-white/30 rounded-lg overflow-hidden">
            <div className="grid grid-cols-4 md:grid-cols-6 bg-white/10 border-b border-white/20">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="p-4">
                  <div className="h-4 bg-white/20 rounded w-24 mx-auto"></div>
                </div>
              ))}
            </div>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="grid grid-cols-4 md:grid-cols-6 border-b border-white/20">
                {[...Array(6)].map((_, j) => (
                  <div key={j} className="p-4">
                    <div className="h-4 bg-white/10 rounded w-16 mx-auto"></div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


  if (status === "unauthenticated") {
    return <p className="text-center mt-10">You must be logged in.</p>;
  }

  if (session?.user?.role !== "owner") {
    return null;
  }
const getAddonSumForDrinkType = (drinkType) => {
  if (!selectedExpense?.cashers) return 0;
  return selectedExpense.cashers.reduce((sum, casher) => {
    const matchingAddons = casher.addons?.filter(
      (addon) => addon.name?.toLowerCase() === drinkType.toLowerCase()
    ) || [];
    return sum + matchingAddons.reduce((a, b) => a + (parseFloat(b.price) || 0), 0);
  }, 0);
};

  // Helpers
  const formatINR = (num) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(num || 0);

  const renderName = (val) => {
    if (!val) return "—";
    if (typeof val === "string") return val;
    if (typeof val === "object" && val !== null) {
      if (typeof val.name === "string") return val.name;
      if ("_id" in val && "name" in val) return val.name;
      return JSON.stringify(val);
    }
    return String(val);
  };

  // Fetch
  const fetchReports = async () => {
    setLoading(true);
    try {
      let url = `/api/v1/expense/get-expense?`;
      if (startDate) url += `startDate=${startDate}&`;
      if (endDate) url += `endDate=${endDate}`;

      const res = await fetch(url);
      const data = await res.json();
      setExpenses(data.expenses || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  // Table columns
  const columns = [
    {
      name: "Date",
      selector: (row) => row.date,
      sortable: true,
      cell: (row) =>
        new Date(row.date).toLocaleDateString("en-GB", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
    },
    {
      name: "Total Sale Amount",
      selector: (row) => row.totalAmount,
      sortable: true,
      cell: (row) => `${formatINR(row.totalCashersSale?.toFixed(2))}`,
    },
    {
      name: "Remaining / Payout",
      selector: (row) => row.remainingAmount || 0,
      sortable: true,
      cell: (row) => `${formatINR(row.payout?.toFixed(2))}`,
    },
    {
      name: "Actions",
      cell: (row) => (
        <button
          onClick={() => setSelectedExpense(row)}
          className="bg-blue-600 text-white px-3 py-1 rounded text-xs sm:text-sm"
        >
          View Details
        </button>
      ),
    },
  ];

  // Totals for modal
  const totalCashersAmount = selectedExpense?.cashers?.reduce(
    (sum, c) => sum + (parseFloat(c?.totalCashersAmount) || 0),
    0
  );
  const totalTeaExpensive = selectedExpense?.cashers?.reduce(
  (sum, c) =>
    sum +
    (c.addons?.reduce(
      (innerSum, a) =>
        innerSum + (a.name?.toLowerCase() === "tea" ? parseFloat(a.price) || 0 : 0),
      0
    ) || 0),
  0
);


  

  const totalOnlineAmount = selectedExpense?.cashers?.reduce((sum, c) => {
    const onlineAddon = c.addons?.find(
      (a) => a.name?.toLowerCase() === "online"
    );
    return sum + (parseFloat(onlineAddon?.price) || 0);
  }, 0);

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-black via-gray-800 to-lime-800 flex items-center justify-center p-4 ${poppins.className}`}
    >
      <div className="w-full max-w-6xl bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/30 shadow-2xl">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-8 text-center">
          📊 Expense Report
        </h1>

        <Toaster />

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-white mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-3 rounded border bg-white/20 backdrop-blur text-white"
            />
          </div>
          <div>
            <label className="block text-white mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-3 rounded border bg-white/20 backdrop-blur text-white"
            />
          </div>
        </div>

        <button
          onClick={fetchReports}
          disabled={loading}
          className="w-full bg-lime-600 text-white p-3 rounded font-bold hover:opacity-90 mb-8 transition"
        >
          {loading ? "Loading..." : "🔍 Get Reports"}
        </button>

        {/* DataTable */}
        {expenses.length > 0 ? (
          <DataTable
            columns={columns}
            data={expenses}
            pagination
            highlightOnHover
            striped
              paginationPerPage={30}
                defaultSortAsc={false} 
            responsive
            theme="dark"
            customStyles={{
              headRow: {
                style: { backgroundColor: "rgba(255,255,255,0.1)" },
              },
              rows: {
                style: { backgroundColor: "transparent", color: "white" },
                stripedStyle: { backgroundColor: "rgba(255,255,255,0.05)" },
              },
              headCells: {
                style: { color: "white" },
              },
              pagination: {
                style: { backgroundColor: "transparent", color: "white" },
              },
            }}
          />
        ) : (
          <p className="text-center text-white/70">
            {loading ? "" : "No records found. Please search!"}
          </p>
        )}
      </div>

      {/* Modal */}
      {selectedExpense && (
        <div
          className="min-h-screen fixed inset-0 bg-black/50 backdrop-blur-md flex justify-center items-center z-50"
          onClick={() => setSelectedExpense(null)}
        >
          <div
            className="bg-white rounded-lg max-w-3xl w-full p-4 overflow-y-auto max-h-[90vh] text-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setSelectedExpense(null)}
                className="mt-6 bg-red-600 text-white px-4 py-2 rounded"
              >
                Close
              </button>
            </div>
            <h2 className="text-2xl font-bold mb-4">
              Daily Summary —{" "}
              {new Date(selectedExpense.date).toLocaleDateString("en-GB")}
            </h2>
            <div className="mb-4 space-y-2">
              <p>
                <strong>1) Total Cashers Sale:</strong>{" "}
                {formatINR(selectedExpense.totalCashersSale?.toFixed(2))}
              </p>
              <p>
                <strong>2) Total Drinks Amount:</strong>{" "}
                {formatINR(selectedExpense.totalDrinksAmount?.toFixed(2))}
              </p>
              <p>
                <strong>3) Total Shot:</strong>{" "}
                {formatINR(selectedExpense.totalShot?.toFixed(2))}
              </p>
              <p>
                <strong>4) Total Cashers Expenses (Including Tea/Juice):</strong>{" "}
                {formatINR(totalCashersAmount?.toFixed(2))}
              </p>

              <p className="bg-gray-200 p-2 rounded">
                <strong>Remaining / Payout:</strong>{" "}
                {formatINR(selectedExpense?.payout?.toFixed(2))}
              </p>

              {selectedExpense.cashers && selectedExpense.cashers.length > 0 && (
                <div className="mb-4 space-y-2 bg-gray-100 p-3 rounded">
                  <h3 className="text-lg font-bold mb-2">
                    Cashers Online Amount Summary
                  </h3>
                  <ul className="list-disc ml-5 space-y-1">
                    {selectedExpense.cashers.map((c, idx) => {
                      const onlineAddon = c.addons?.find(
                        (a) => a.name?.toLowerCase() === "online"
                      );
                      return (
                        <li key={idx}>
                          {c.casherName}:{" "}
                          {onlineAddon
                            ? formatINR(onlineAddon.price)
                            : "No Online Amount"}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              <div className="mt-2 font-semibold">
                Total Online Amount: {formatINR(totalOnlineAmount) || 0}
              </div>
            </div>
            <hr className="my-4" />

            <h3 className="text-lg font-bold mb-2">Cashers</h3>
            {selectedExpense?.cashers && selectedExpense?.cashers?.length > 0 ? (
              selectedExpense?.cashers.map((c, idx) => (
                <div
                  key={idx}
                  className="mb-4 p-3 border border-gray-300 rounded"
                >
                  <p className="font-semibold mb-1">{c?.casherName}</p>
                  {c.items?.length > 0 && (
                    <>
                      <p className="underline text-sm">Main Items:</p>
                      <ul className="ml-4 list-disc">
                        {c?.items?.map((item, i) => (
                          <li key={i}>
                            {renderName(item.name)}: ₹{item.price}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {c?.addons?.length > 0 && (
                    <>
                      <p className="underline text-sm mt-2">
                        Addons (Tea/Juice/Other):
                      </p>
                      <ul className="ml-4 list-disc">
                        {c.addons.map((addon, i) => (
                          <li key={i}>
                            {renderName(addon.name)}: ₹{addon.price}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  <div className="mt-2 text-sm">
                    <p>
                      Total Cashers(expenses) Amount:{" "}
                      {formatINR(c.totalCashersAmount)}
                    </p>
                    <p>Total Sale: {formatINR(c.totalSealAmount)}</p>
                    <p>Money Lift: {formatINR(c.totalMoneyLift)}</p>
                    <p>Shot: {formatINR(c.shot)}</p>
                  </div>

                  {c.staffAdvances?.length > 0 && (
                    <>
                      <p className="underline text-sm mt-2">Staff Advances:</p>
                      <ul className="ml-4 list-disc">
                        {c.staffAdvances.map((adv, i) => (
                          <li key={i}>
                            Staff ID: {renderName(adv.staffId)} — ₹{adv.amount}
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

            <h3 className="text-lg font-bold mb-2">Drinks</h3>
            {selectedExpense.drinks && selectedExpense.drinks.length > 0 ? (
              selectedExpense.drinks.map((d, idx) => (
                <div
                  key={idx}
                  className="mb-4 p-3 border border-gray-300 rounded"
                >
                  <p className="font-semibold text-lg">
                    {d.drinkType.toUpperCase()}
                  </p>
                  <p>Sold Amount: ₹{d.soldAmount}</p>
                  <p>
                    Commission:{" "}
                    {d.drinkType === "tea"
                      ? `${d.commissionPercent}%`
                      : "Fixed"}{" "}
                    → ₹{d.commissionValue}
                  </p>

 <p>Total Tea Expensive: ₹{totalTeaExpensive}</p>

{/* <p>
  Final Net (after applying carry): ₹
  {formatINR(
    (d.soldAmount || 0) -
    (d.commissionValue || 0) -
    getAddonSumForDrinkType(d.drinkType) +
    (d.carryForwardFromYesterday || 0)
  )}
</p> */}

<p>
  Final Net (as saved): {formatINR(d.finalNetAmount || 0)}
</p>



                  <div className="mt-2 p-2 bg-yellow-50 rounded">
                    <p className="text-yellow-800 font-medium">
                      Includes Carry Forward from Yesterday: ₹
                      {d.carryForwardFromYesterday || 0}
                    </p>
                    <p className="text-yellow-800 font-medium">
                      Will Carry Forward to Tomorrow: ₹{d.carryLoss || 0}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p>No drinks recorded.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
