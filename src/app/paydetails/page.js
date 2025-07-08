"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

export default function PayDetailsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // ✅ All hooks at top
  const [staffList, setStaffList] = useState([]);
  const [payrollData, setPayrollData] = useState([]);
  const [payAmounts, setPayAmounts] = useState({});
  const [paidStatus, setPaidStatus] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "owner") {
      router.push("/no-permission");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "owner") {
      loadData();
    }
  }, [status]);

  const loadData = async (
    m = selectedMonth,
    y = selectedYear,
    startDate = null,
    endDate = null
  ) => {
    setLoading(true);
    try {
      const staffRes = await fetch("/api/v1/staff/get-staff");
      const staff = await staffRes.json();
      setStaffList(staff);

      const payrollPromises = staff.map((s) => {
        let url = `/api/v1/staff/payroll/${s._id}?month=${m}&year=${y}`;
        if (startDate && endDate) {
          url = `/api/v1/staff/payroll/${s._id}?start=${startDate}&end=${endDate}`;
        }
        return fetch(url).then((r) => r.json());
      });

      const payrollResults = await Promise.all(payrollPromises);
      setPayrollData(payrollResults);

      const statusMap = {};
      const amountsMap = {};
      payrollResults.forEach((p, idx) => {
        const id = staff[idx]._id;
        if (p.finalPaid && p.finalPaid > 0) statusMap[id] = true;
        amountsMap[id] = Math.floor(p.payable || 0);
      });
      setPaidStatus(statusMap);
      setPayAmounts(amountsMap);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load payroll data");
    } finally {
      setLoading(false);
    }
  };

  const handlePayAmountChange = (staffId, value) => {
    setPayAmounts((prev) => ({ ...prev, [staffId]: value }));
  };

  const handlePay = async (staffId, staffName) => {
    const amount = Math.floor(parseFloat(payAmounts[staffId]));
    if (isNaN(amount) || amount < 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    if (!window.confirm(`Confirm paying ₹${amount} to ${staffName}?`)) return;

    const toastId = toast.loading("Processing payment...");
    try {
      const res = await fetch("/api/v1/staff/pay-salary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId,
          month: selectedMonth,
          year: selectedYear,
          paidAmount: amount,
        }),
      });
      const result = await res.json();

      if (res.ok && result.payment) {
        toast.success("Payment saved!", { id: toastId });
        setPaidStatus((prev) => ({ ...prev, [staffId]: true }));
        loadData(selectedMonth, selectedYear);
      } else {
        toast.error(result.message || "Payment failed. Try again.", {
          id: toastId,
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("Error processing payment.", { id: toastId });
    }
  };

  const handleSelectThisMonth = () => {
    const now = new Date();
    setSelectedMonth(now.getMonth() + 1);
    setSelectedYear(now.getFullYear());
    setCustomStartDate("");
    setCustomEndDate("");
    loadData(now.getMonth() + 1, now.getFullYear());
  };

  const handleCustomFilter = () => {
    if (!customStartDate || !customEndDate) {
      toast.error("Please select both start and end dates.");
      return;
    }
    setSelectedMonth(null);
    setSelectedYear(null);
    loadData(null, null, customStartDate, customEndDate);
  };

  

  if (status === "unauthenticated") {
    return <p className="text-center mt-10">You must be logged in.</p>;
  }

  if (session?.user?.role !== "owner") {
    return null;
  }

  if (loading) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-4xl space-y-6">
        {/* Page Title Skeleton */}
        <div className="h-8 w-1/3 bg-gray-200 rounded animate-pulse mx-auto"></div>

        {/* Filter Bar Skeleton */}
        <div className="flex flex-wrap gap-3 justify-center">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>

        {/* Table Skeleton */}
        <div className="border rounded-lg overflow-hidden shadow-sm">
          <div className="grid grid-cols-10 bg-gray-100 border-b">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="p-3 text-center text-xs font-semibold text-gray-500"
              >
                <div className="h-4 bg-gray-300 rounded animate-pulse mx-auto w-20"></div>
              </div>
            ))}
          </div>
          {[...Array(6)].map((_, rowIdx) => (
            <div
              key={rowIdx}
              className="grid grid-cols-10 border-b hover:bg-gray-50"
            >
              {[...Array(10)].map((_, colIdx) => (
                <div
                  key={colIdx}
                  className="p-3 text-center"
                >
                  <div className="h-4 bg-gray-200 rounded animate-pulse mx-auto w-16"></div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Submit Button Skeleton */}
        <div className="h-10 w-40 bg-gray-300 rounded animate-pulse mx-auto"></div>
      </div>
    </div>
  );
}


  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 border border-black rounded mt-10 pb-20 bg-gray-50 font-sans">
      <Toaster />

      <h1 className="text-xl sm:text-2xl text-black text-center font-bold mb-4">
        📒 Staff Payroll Ledger
      </h1>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <button
          onClick={handleSelectThisMonth}
          className="px-4 py-2 bg-[#fa3e5e] text-black rounded hover:bg-[#fa3e5e] text-sm"
        >
          This Month
        </button>

        <div className="flex flex-col sm:flex-row gap-2">
          <label className="text-sm text-black font-medium">Start:</label>
          <input
            type="date"
            value={customStartDate}
            onChange={(e) => setCustomStartDate(e.target.value)}
            className="border p-1 text-black rounded text-sm"
          />
          <label className="text-sm text-black font-medium">End:</label>
          <input
            type="date"
            value={customEndDate}
            onChange={(e) => setCustomEndDate(e.target.value)}
            className="border p-1 text-black rounded text-sm"
          />
          <button
            onClick={handleCustomFilter}
            className="px-4 py-2 bg-[#47ff54] text-black rounded hover:bg-[#47ff54]text-sm"
          >
            Apply Filter
          </button>
        </div>
      </div>

      <h2 className="text-sm text-black sm:text-base mb-3 font-semibold">
        Showing Salary for:{" "}
        {customStartDate && customEndDate
          ? `${customStartDate} to ${customEndDate}`
          : `${new Date(selectedYear, (selectedMonth || 1) - 1).toLocaleString(
              "default",
              { month: "long" }
            )} ${selectedYear}`}
      </h2>

      <div className="w-full overflow-x-auto border rounded-lg shadow-sm">
        <table className="w-full border-collapse border text-xs sm:text-sm">
          <thead className="bg-gray-300 text-black">
            <tr>
              <th className="p-2 border text-black">S.no</th>
              <th className="p-2 border text-black">Name</th>
              <th className="p-2 border text-black">Month</th>
              <th className="p-2 border text-black">Attendance</th>
              <th className="p-2 border text-black">Earned Salary</th>
              <th className="p-2 border text-black">Advances</th>
              <th className="p-2 border text-black">Payable</th>
              <th className="p-2 border text-black">Carry Forward (Next Month)</th>
              <th className="p-2 border text-black">Paid Amount</th>
              <th className="p-2 border text-black">Action</th>
            </tr>
          </thead>
          <tbody>
            {payrollData.length && staffList.length ? (
              payrollData.every(
                (p) => p.presentDays === 0 && p.earnedSalary === 0
              ) ? (
                <tr>
                  <td colSpan="12" className="text-center text-black p-4">
                    No data exists for selected period.
                  </td>
                </tr>
              ) : (
                payrollData.map((p, idx) => {
                  const staffId = staffList[idx]._id;
                  return (
                    <tr key={staffId}>
                      <td className="p-2 border text-black text-center">{idx + 1}</td>
                      <td className="p-2 border text-black">{p.staffName}</td>
                      <td className="p-2 border text-black">
                        {p.month
                          ? `${new Date(p.year, p.month - 1).toLocaleString(
                              "default",
                              { month: "long" }
                            )} ${p.year}`
                          : "-"}
                      </td>
                      <td className="p-2 border text-black  text-center">
                        {p.presentDays}
                      </td>
                      <td className="p-2 border text-black text-right">
                        ₹ {Math.round(p.earnedSalary || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="p-2 border text-black text-left">
                        {p?.advances?.length ? (
                          <div className="max-h-24 overflow-y-auto space-y-1">
                            {p.advances.map((adv, i) => (
                              <div key={i} className="whitespace-nowrap text-black">
                                {new Date(adv.date).toLocaleDateString("en-GB")} - ₹ {adv.amount}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="italic text-black">None</span>
                        )}
                      </td>
                      <td className="p-2 border text-black text-right">
                        ₹ {Math.round(p.payable || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="p-2 border text-black text-right">
                        {p.carryForward > 0
                          ? `- Advance Due:  ${Math.round(p.carryForward).toLocaleString("en-IN")}`
                          : p.carryForward < 0
                          ? `Credit:  ${Math.abs(Math.round(p.carryForward)).toLocaleString("en-IN")}`
                          : " 0"}
                      </td>
                      <td className="p-2 border text-black text-center">
                        <input
                          type="number"
                          min="0"
                          value={payAmounts[staffId] || ""}
                          onChange={(e) => handlePayAmountChange(staffId, e.target.value)}
                          className="border p-1 w-24 text-right rounded text-xs"
                          disabled={paidStatus[staffId]}
                        />
                      </td>
                      <td className="p-2 border  text-center">
                        <button
                          onClick={() =>
                            !paidStatus[staffId] && handlePay(staffId, p.staffName)
                          }
                          disabled={paidStatus[staffId]}
                          className={`px-3 py-1 rounded text-xs ${
                            paidStatus[staffId]
                              ? "bg-gray-600 cursor-not-allowed"
                              : "bg-green-600 hover:bg-green-700"
                          }`}
                        >
                          {paidStatus[staffId] ? "Paid" : "Pay"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )
            ) : (
              <tr>
                <td colSpan="12" className="text-center text-black p-4">
                  No staff found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
