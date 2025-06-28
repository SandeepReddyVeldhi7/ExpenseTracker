"use client";
import { useState, useEffect } from "react";
import { Poppins } from "next/font/google";
import DataTable from "react-data-table-component";
import toast, { Toaster } from "react-hot-toast";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export default function ReportsPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expenses, setExpenses] = useState([]);
  console.log("expenses", expenses);
  const [loading, setLoading] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);

  useEffect(() => {
    fetchReports();
  }, []);
  const formatINR = (num) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(num || 0);

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
      name: "Cashers",
      selector: (row) => row.allCashers?.join(", "),
      cell: (row) => row.allCashers?.join(", ") || "—",
    },
    {
      name: "Total Sale Amount",
      selector: (row) => row.totalAmount,
      sortable: true,
      cell: (row) => `${formatINR(row.totalCashersSale?.toFixed(2))}`,
    },
    // {
    //   name: "Total Business",
    //   selector: (row) => row.totalBusiness || 0,
    //   sortable: true,
    //   cell: (row) => `${formatINR(row.totalBusiness?.toFixed(2))}`,
    // },
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
            className="fixed inset-0 bg-black/50 backdrop-blur-md flex justify-center items-center z-50"
            onClick={() => setSelectedExpense(null)}
          >
            <div
              className="bg-white rounded-lg max-w-3xl w-full p-6 overflow-y-auto max-h-[90vh] text-gray-800"
              onClick={(e) => e.stopPropagation()}
            >
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
                  <strong>4) Total Cashers Expenses (Excl. Tea/Juice):</strong>{" "}
                  {formatINR(
                    selectedExpense?.totalCashersExpensesExclTeaJuice?.toFixed(2)
                  )}
                </p>
                <p className="bg-gray-200 p-2 rounded">
                  <strong>Remaining / Payout:</strong>{" "}
                  {formatINR(selectedExpense?.payout?.toFixed(2))}
                </p>
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
                              {item.name}: ₹{item.price}
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
                              {addon.name}: ₹{addon.price}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}

                    <div className="mt-2 text-sm">
                      <p>
                        Total Cashers(expenses) Amount: {formatINR(c.totalCashersAmount)}
                      </p>
                      <p>Total Sale: {formatINR(c.totalSealAmount)}</p>
                      <p>Money Lift: {formatINR(c.totalMoneyLift)}</p>
                      <p>Shot: {formatINR(c.shot)}</p>
                    </div>

                    {c.staffAdvances?.length > 0 && (
                      <>
                        <p className="underline text-sm mt-2">
                          Staff Advances:
                        </p>
                        <ul className="ml-4 list-disc">
                          {c.staffAdvances.map((adv, i) => (
                            <li key={i}>
                              Staff ID: {adv.staffId} — ₹{adv.amount}
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
                    <p className="font-semibold">{d.drinkType}</p>
                    <p>Sold Amount: ₹{d.soldAmount}</p>
                    <p>
                      Commission:{" "}
                      {d.drinkType === "tea"
                        ? `${d.commissionPercent}%`
                        : "Fixed"}{" "}
                      → ₹{d.commissionValue}
                    </p>
                    <p>Final Net: ₹{d.finalNetAmount}</p>
                  </div>
                ))
              ) : (
                <p>No drinks recorded.</p>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => setSelectedExpense(null)}
                  className="mt-6 bg-red-600 text-white px-4 py-2 rounded"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
