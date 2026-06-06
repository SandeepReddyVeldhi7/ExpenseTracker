"use client";

import { useState, useEffect } from "react";
import { Poppins } from "next/font/google";
import DataTable from "react-data-table-component";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { FaArrowLeft } from "react-icons/fa";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export default function MonthlyReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [monthlyExpenses, setMonthlyExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState(null);

  // Restrict access to owner role
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "owner") {
      router.push("/no-permission");
    }
  }, [status, session, router]);

  const fetchMonthlyReports = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/monthly-expense/list");
      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }
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
      <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-800 to-lime-800 ${poppins.className}`}>
        <div className="max-w-6xl w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/30 shadow-2xl space-y-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-1/3 bg-white/30 rounded mx-auto"></div>
            <div className="border border-white/30 rounded-lg overflow-hidden">
              <div className="grid grid-cols-5 bg-white/10 border-b border-white/20">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="p-4">
                    <div className="h-4 bg-white/20 rounded w-24 mx-auto"></div>
                  </div>
                ))}
              </div>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="grid grid-cols-5 border-b border-white/20">
                  {[...Array(5)].map((_, j) => (
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

  const formatINR = (num) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
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
      cell: (row) => <span className="text-xs sm:text-sm">{getFormattedMonthName(row.key)}</span>,
    },
    {
      name: "Total Sales",
      selector: (row) => row.totalSales,
      sortable: true,
      cell: (row) => <span className="text-xs sm:text-sm">{formatINR(row.totalSales)}</span>,
    },
    {
      name: "Total Payout",
      selector: (row) => row.totalPayout,
      sortable: true,
      cell: (row) => <span className="text-xs sm:text-sm">{formatINR(row.totalPayout)}</span>,
    },
    {
      name: "Online Amount",
      selector: (row) => row.totalOnline,
      sortable: true,
      cell: (row) => <span className="text-xs sm:text-sm">{formatINR(row.totalOnline || 0)}</span>,
    },
    {
      name: "Extra Expenses",
      selector: (row) => row.totalExpenses,
      sortable: true,
      cell: (row) => <span className="text-xs sm:text-sm">{formatINR(row.totalExpenses)}</span>,
    },
    {
      name: "Balance",
      selector: (row) => row.remainingBalance,
      sortable: true,
      cell: (row) => (
        <span className={`text-xs sm:text-sm font-semibold ${row.remainingBalance >= 0 ? "text-green-400" : "text-red-400"}`}>
          {formatINR(row.remainingBalance)}
        </span>
      ),
    },
    {
      name: "Actions",
      cell: (row) => (
        <button
          onClick={() => setSelectedExpense(row)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded-lg text-xs sm:text-sm transition duration-150"
        >
          Details
        </button>
      ),
    },
  ];

  return (
    <div className={`min-h-screen bg-gradient-to-br from-black via-gray-800 to-lime-800 flex items-center lg:mt-10 justify-center p-4 ${poppins.className}`}>
      <Toaster />
      <div className="w-full max-w-6xl mb-4 bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/30 shadow-2xl relative">
        
        {/* Back button */}
        <button
          onClick={() => router.push("/")}
          className="text-white absolute mt-2 mb-3 hover:bg-white/10 px-3 py-1.5 text-xl top-4 left-4 rounded-lg flex items-center transition"
        >
          <FaArrowLeft className="mr-2" size={14} />
          <span className="text-sm font-semibold">Home</span>
        </button>

        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-8 text-center mt-6">
          📊 Monthly Expense Reports
        </h1>

        {monthlyExpenses.length > 0 ? (
          <DataTable
            columns={columns}
            data={monthlyExpenses}
            pagination
            highlightOnHover
            striped
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
                style: { color: "white", fontWeight: "bold" },
              },
              pagination: {
                style: { backgroundColor: "transparent", color: "white" },
              },
            }}
          />
        ) : (
          <p className="text-center text-white/70 py-12">No monthly reports submitted yet.</p>
        )}
      </div>

      {/* Item Details Modal */}
      {selectedExpense && (
        <div
          className="min-h-screen fixed inset-0 bg-black/60 backdrop-blur-md flex justify-center items-center z-50"
          onClick={() => setSelectedExpense(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full p-6 overflow-y-auto max-h-[85vh] text-gray-800 shadow-2xl border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b pb-4 mb-4">
              <h2 className="text-lg sm:text-2xl font-bold text-gray-800">
                Extra Expenses - {getFormattedMonthName(selectedExpense.key)}
              </h2>
              <button
                onClick={() => setSelectedExpense(null)}
                className="text-gray-500 hover:text-gray-700 text-sm sm:text-lg font-bold bg-gray-100 hover:bg-gray-200 rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-6 bg-gray-50 p-3 sm:p-4 rounded-xl border border-gray-100 text-xs sm:text-sm">
              <p><strong>Total Sales:</strong> {formatINR(selectedExpense.totalSales)}</p>
              <p><strong>Total Payout:</strong> {formatINR(selectedExpense.totalPayout)}</p>
              <p className="col-span-2 border-t pt-2 mt-1">
                <strong>Online Amount:</strong> {formatINR(selectedExpense.totalOnline || 0)}
              </p>
              <p className="col-span-2 border-t pt-2 mt-1">
                <strong>Extra Expenses Total:</strong> {formatINR(selectedExpense.totalExpenses)}
              </p>
              <p className="col-span-2 text-sm sm:text-base font-bold text-indigo-700">
                Remaining Balance: {formatINR(selectedExpense.remainingBalance)}
              </p>
              <p className="col-span-2 text-3xs sm:text-xs text-gray-500 border-t pt-1">
                Submitted by: {selectedExpense.submittedBy || "staff"}
              </p>
            </div>

            <h3 className="text-sm sm:text-lg font-bold mb-3 border-b pb-2">Itemized List</h3>
            {selectedExpense.items && selectedExpense.items.length > 0 ? (
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                {selectedExpense.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-gray-50 px-3 py-2 sm:px-4 sm:py-3 rounded-lg border border-gray-150 text-xs sm:text-sm">
                    <span className="font-semibold text-gray-700">{idx + 1}. {item.name}</span>
                    <span className="font-bold text-gray-900">{formatINR(item.price)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-6">No itemized details recorded.</p>
            )}

            <div className="flex justify-end mt-6 border-t pt-4">
              <button
                onClick={() => setSelectedExpense(null)}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2.5 rounded-xl transition"
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
