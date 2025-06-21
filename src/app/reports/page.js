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
  const [type, setType] = useState("all");
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      let url = `/api/v1/expense/get-expense?`;
      if (startDate) url += `startDate=${startDate}&`;
      if (endDate) url += `endDate=${endDate}&`;
      if (type) url += `type=${type}`;

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

  const handleViewDetails = (expense) => {
    setSelectedExpense(expense);
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
      name: "Type",
      selector: (row) => row.type,
      sortable: true,
      cell: (row) => <span className="capitalize">{row.type}</span>,
    },
    {
      name: "Total Amount",
      selector: (row) => row.totalAmount,
      sortable: true,
      cell: (row) => `₹${row.totalAmount?.toFixed(2)}`,
    },
    {
      name: "Total Business",
      selector: (row) => row.totalBusiness || 0,
      sortable: true,
      cell: (row) => `₹${row.totalBusiness?.toFixed(2)}`,
    },
    {
      name: "Payout",
      selector: (row) => row.payout || 0,
      sortable: true,
      cell: (row) => `₹${row.payout?.toFixed(2)}`,
    },
    {
      name: "Actions",
      cell: (row) => (
        <button
          onClick={() => handleViewDetails(row)}
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
          <div>
            <label className="block text-white mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full p-3 rounded border bg-white/20 backdrop-blur text-white"
            >
              <option value="all">All</option>
              <option value="advance">Advance</option>
              <option value="casher">Casher</option>
              <option value="drink">Drink</option>
            </select>
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
                Details for{" "}
                {new Date(selectedExpense.date).toLocaleDateString("en-GB")}
              </h2>

              <p>
                <strong>Total Amount:</strong> ₹
                {selectedExpense.totalAmount?.toFixed(2)}
              </p>
              <p>
                <strong>Total Business:</strong> ₹
                {selectedExpense.totalBusiness?.toFixed(2)}
              </p>
              <p>
                <strong>Payout:</strong> ₹
                {selectedExpense.payout?.toFixed(2)}
              </p>

              <hr className="my-4" />

              <h3 className="text-lg font-semibold mb-2">Breakdown:</h3>
              {selectedExpense.rawExpenses &&
              selectedExpense.rawExpenses.length > 0 ? (
                selectedExpense.rawExpenses.map((exp, idx) => (
                  <div
                    key={exp._id || idx}
                    className="mb-4 p-4 border border-gray-300 rounded"
                  >
                    <p>
                      <strong>Casher:</strong> {exp.casherName || "N/A"}
                    </p>
                    <p>
                      <strong>Type:</strong> {exp.type} (
                      {exp.category})
                    </p>
                    <p>
                      <strong>Amount:</strong> ₹
                      {exp.type === "casher"
                        ? (exp.totalCashersAmount || 0).toFixed(2)
                        : exp.type === "drink"
                        ? (exp.soldAmount || 0).toFixed(2)
                        : "—"}
                    </p>

                    {exp.items?.length > 0 && (
                      <>
                        <p className="mt-2 font-medium">Items:</p>
                        <ul className="list-disc pl-6">
                          {exp.items.map((item, i) => (
                            <li key={item._id || i}>
                              {item.name} — ₹{item.price}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                    {exp.addons?.length > 0 && (
                      <>
                        <p className="mt-2 font-medium">Addons:</p>
                        <ul className="list-disc pl-6">
                          {exp.addons.map((addon, i) => (
                            <li key={addon._id || i}>
                              {addon.name} — ₹{addon.price}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                    {exp.staffAdvances?.length > 0 && (
                      <>
                        <p className="mt-2 font-medium">Staff Advances:</p>
                        <ul className="list-disc pl-6">
                          {exp.staffAdvances.map((sa, i) => (
                            <li key={sa._id || i}>
                              Staff: {sa.staffId} — ₹{sa.amount}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                ))
              ) : (
                <p>No detailed expenses found.</p>
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
    </div>
  );
}
