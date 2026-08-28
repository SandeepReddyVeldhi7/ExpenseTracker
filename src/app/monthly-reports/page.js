"use client";

import { useState, useEffect } from "react";
import DataTable from "react-data-table-component";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { FiArrowLeft, FiBarChart2, FiDollarSign, FiX } from "react-icons/fi";

export default function MonthlyReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [monthlyExpenses, setMonthlyExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState(null);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "owner") {
      router.push("/no-permission");
    }
  }, [status, session, router]);

  const fetchMonthlyReports = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/monthly-expense/list");
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setMonthlyExpenses(data.list || []);
    } catch (error) {
      console.error("Error loading monthly reports:", error);
      toast.error("Failed to load monthly reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "owner") {
      fetchMonthlyReports();
    }
  }, [status, session]);

  if (status === "loading" || (status === "authenticated" && session?.user?.role === "owner" && loading)) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center">
        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-black text-sm text-black uppercase tracking-wider">Loading Monthly Reports...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <p className="text-center mt-10 font-bold">You must be logged in.</p>;
  }

  if (session?.user?.role !== "owner") {
    return null;
  }

  const formatINR = (num) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num || 0);

  const getFormattedMonthName = (key) => {
    if (!key) return "";
    const [year, month] = key.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const columns = [
    {
      name: "Month / Year",
      selector: (row) => row.key,
      sortable: true,
      cell: (row) => (
        <span className="font-black text-xs sm:text-sm text-black">
          {getFormattedMonthName(row.key)}
        </span>
      ),
    },
    {
      name: "Total Sales",
      selector: (row) => row.totalSales,
      sortable: true,
      cell: (row) => (
        <span className="font-mono font-bold text-xs sm:text-sm text-black">
          {formatINR(row.totalSales)}
        </span>
      ),
    },
    {
      name: "Total Payout",
      selector: (row) => row.totalPayout,
      sortable: true,
      cell: (row) => (
        <span className="font-mono font-bold text-xs sm:text-sm text-black">
          {formatINR(row.totalPayout)}
        </span>
      ),
    },
    {
      name: "Online Amount",
      selector: (row) => row.totalOnline,
      sortable: true,
      cell: (row) => (
        <span className="font-mono font-bold text-xs sm:text-sm text-cyan-800">
          {formatINR(row.totalOnline || 0)}
        </span>
      ),
    },
    {
      name: "Extra Expenses",
      selector: (row) => row.totalExpenses,
      sortable: true,
      cell: (row) => (
        <span className="font-mono font-bold text-xs sm:text-sm text-black">
          {formatINR(row.totalExpenses)}
        </span>
      ),
    },
    {
      name: "Balance",
      selector: (row) => row.remainingBalance,
      sortable: true,
      cell: (row) => (
        <span
          className={`font-mono font-black text-xs sm:text-sm px-2 py-0.5 rounded border border-black ${
            row.remainingBalance >= 0 ? "bg-[#D4FF00] text-black" : "bg-[#FF5A5F] text-white"
          }`}
        >
          {formatINR(row.remainingBalance)}
        </span>
      ),
    },
    {
      name: "Actions",
      cell: (row) => (
        <button
          onClick={() => setSelectedExpense(row)}
          className="neo-btn neo-btn-cyan px-2.5 py-1 text-xs font-black"
        >
          Details
        </button>
      ),
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <Toaster position="top-right" />

      {/* Main Container Card */}
      <div className="neo-card p-6 sm:p-8 bg-white mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-6 border-b-2 border-black">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="neo-btn neo-btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5"
            >
              <FiArrowLeft size={15} />
              <span>Home</span>
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
                Monthly Expense Reports
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-gray-600">
                Audited monthly gross sales, payouts, online totals, and extra bills
              </p>
            </div>
          </div>

          <span className="neo-badge bg-[#D4FF00] text-black self-start sm:self-auto">
            {monthlyExpenses.length} Months Recorded
          </span>
        </div>

        {/* Contained Data Table Container with Custom Scrollbar */}
        <div className="overflow-x-auto table-scrollbar border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#000]">
          {monthlyExpenses.length > 0 ? (
            <DataTable
              columns={columns}
              data={monthlyExpenses}
              pagination
              highlightOnHover
              customStyles={{
                headRow: {
                  style: {
                    backgroundColor: "#F4F4F0",
                    borderBottom: "2px solid #0A0A0A",
                    fontWeight: "900",
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    color: "#0A0A0A",
                  },
                },
                rows: {
                  style: {
                    backgroundColor: "#FFFFFF",
                    borderBottom: "1px solid #E2E8F0",
                    fontWeight: "600",
                    "&:hover": {
                      backgroundColor: "#F8FAFC",
                    },
                  },
                },
                pagination: {
                  style: {
                    borderTop: "2px solid #0A0A0A",
                    backgroundColor: "#F4F4F0",
                    fontWeight: "700",
                  },
                },
              }}
            />
          ) : (
            <p className="text-center text-gray-500 font-bold py-12">
              No monthly reports submitted yet.
            </p>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {selectedExpense && (
        <div
          className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedExpense(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[85vh] overflow-y-auto border-[3px] border-black shadow-[8px_8px_0px_0px_#000] relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b-2 border-black pb-3 mb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-gray-500 block">Monthly Audit Details</span>
                <h2 className="text-xl font-black text-black">
                  {getFormattedMonthName(selectedExpense.key)}
                </h2>
              </div>
              <button
                onClick={() => setSelectedExpense(null)}
                className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center hover:bg-gray-100 font-black cursor-pointer"
              >
                <FiX size={16} />
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-2.5 mb-5 p-4 rounded-xl border-2 border-black bg-[#F4F4F0] text-xs font-bold">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Sales:</span>
                <span className="font-mono font-black text-black">{formatINR(selectedExpense.totalSales)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Payout:</span>
                <span className="font-mono font-black text-black">{formatINR(selectedExpense.totalPayout)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-300 pt-2">
                <span className="text-gray-600">Online Amount:</span>
                <span className="font-mono font-black text-black">{formatINR(selectedExpense.totalOnline || 0)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-300 pt-2">
                <span className="text-gray-600">Extra Expenses:</span>
                <span className="font-mono font-black text-black">{formatINR(selectedExpense.totalExpenses)}</span>
              </div>
              <div className="col-span-2 flex justify-between items-center p-2.5 rounded-lg bg-[#D4FF00] border-2 border-black mt-1">
                <span className="text-sm font-black text-black">Remaining Balance:</span>
                <span className="text-base font-mono font-black text-black">{formatINR(selectedExpense.remainingBalance)}</span>
              </div>
            </div>

            {/* Itemized list */}
            <h3 className="text-xs font-black uppercase tracking-wider text-black mb-2">
              Itemized Extra Expenses List
            </h3>
            {selectedExpense.items && selectedExpense.items.length > 0 ? (
              <div className="space-y-1.5 max-h-[35vh] overflow-y-auto pr-1">
                {selectedExpense.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-2.5 rounded-lg border-2 border-black bg-white shadow-[1px_1px_0px_0px_#000] text-xs font-bold"
                  >
                    <span className="text-black">{idx + 1}. {item.name}</span>
                    <span className="font-mono font-black text-black">{formatINR(item.price)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4 font-bold text-xs">No itemized details recorded.</p>
            )}

            <div className="mt-5 pt-3 border-t-2 border-black flex justify-end">
              <button
                onClick={() => setSelectedExpense(null)}
                className="py-2 px-5 neo-btn neo-btn-danger text-xs font-black"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
