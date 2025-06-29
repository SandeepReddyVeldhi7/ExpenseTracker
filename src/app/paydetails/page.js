"use client";

import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

export default function PayDetailsPage() {
  const [staffList, setStaffList] = useState([]);
  const [payrollData, setPayrollData] = useState([]);
  const [payAmounts, setPayAmounts] = useState({});
  const [paidStatus, setPaidStatus] = useState({});
  const [loading, setLoading] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const loadData = async (
    m = selectedMonth,
    y = selectedYear,
    startDate = null,
    endDate = null
  ) => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/staff/get-staff");
      const staff = await res.json();
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

      const newPaidStatus = {};
      const newPayAmounts = {};
      payrollResults.forEach((p, idx) => {
        if (p.payable === 0) newPaidStatus[staff[idx]._id] = true;
        newPayAmounts[staff[idx]._id] = Math.floor(p.payable || 0);
      });
      setPaidStatus(newPaidStatus);
      setPayAmounts(newPayAmounts);
    } catch (err) {
      console.error("Error loading payroll:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePayAmountChange = (staffId, value) => {
    setPayAmounts((prev) => ({ ...prev, [staffId]: value }));
  };

  const handlePay = async (staffId) => {
    const amount = Math.floor(parseFloat(payAmounts[staffId]));
    if (isNaN(amount) || amount < 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

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

      if (res.ok) {
        toast.success("Payment saved!", { id: toastId });
        setPaidStatus((prev) => ({ ...prev, [staffId]: true }));
        loadData(selectedMonth, selectedYear);
      } else {
        toast.error(result.message || "Error processing payment", {
          id: toastId,
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("Payment failed!", { id: toastId });
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

  if (loading) {
    return (
      <div className="min-h-screen  flex items-center justify-center bg-white">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 font-medium">
            Loading Pay Details list...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl flex justify-center items-center flex-col h-screen mx-auto p-4 sm:p-6 border border-black rounded mt-10 bg-gray-500 font-sans">
      <h1 className="text-xl sm:text-2xl text-center font-bold mb-4">
        📒 Staff Payroll Ledger
      </h1>
      <Toaster />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <button
          onClick={handleSelectThisMonth}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          This Month
        </button>

        <div className="flex flex-col sm:flex-row gap-2">
          <label className="text-sm font-medium">Start:</label>
          <input
            type="date"
            value={customStartDate}
            onChange={(e) => setCustomStartDate(e.target.value)}
            className="border p-1 rounded text-sm"
          />
          <label className="text-sm font-medium">End:</label>
          <input
            type="date"
            value={customEndDate}
            onChange={(e) => setCustomEndDate(e.target.value)}
            className="border p-1 rounded text-sm"
          />
          <button
            onClick={handleCustomFilter}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
          >
            Apply Filter
          </button>
        </div>
      </div>

      {/* Period Info */}
      <h2 className="text-sm sm:text-base mb-1 font-semibold">
        Showing Salary for:{" "}
        {customStartDate && customEndDate
          ? `${customStartDate} to ${customEndDate}`
          : `${new Date(selectedYear, (selectedMonth || 1) - 1).toLocaleString(
              "default",
              { month: "long" }
            )} ${selectedYear}`}
      </h2>

      {/* Table */}
      <div className="w-full relative  mx-auto flex justify-center mt-8 overflow-x-auto">
        <table className="min-w-[900px]  border border-collapse border-black text-xs sm:text-sm">
          <thead className="bg-gray-300 mt-6 text-black">
            <tr>
              <th className="p-2 border">S.no</th>
              <th className="p-2 border">Name</th>
              <th className="p-2 border">Salary Month</th>
              <th className="p-2 border">Attendance</th>
              <th className="p-2 border">Salary</th>
              <th className="p-2 border">Advances</th>
              <th className="p-2 border">Prev. Carry Fwd</th>
              <th className="p-2 border">Payable</th>
              <th className="p-2 border">Paid Amount</th>
              <th className="p-2 border">Action</th>
            </tr>
          </thead>
          <tbody>
            {payrollData.length > 0 && staffList.length > 0 ? (
              payrollData.every(
                (p) => p.presentDays === 0 && p.earnedSalary === 0
              ) ? (
                <tr>
                  <td colSpan="10" className="text-center p-4">
                    No data exists for selected period.
                  </td>
                </tr>
              ) : (
                payrollData.map((p, idx) => {
                  const staffId = staffList[idx]._id;
                  return (
                    <tr key={staffId}>
                      <td className="p-2 border text-center">{idx + 1}</td>
                      <td className="p-2 border">{p.staffName}</td>
                      <td className="p-2 border">
                        {p.month
                          ? `${new Date(p.year, p.month - 1).toLocaleString(
                              "default",
                              {
                                month: "long",
                              }
                            )} ${p.year}`
                          : "-"}
                      </td>
                      <td className="p-2 border text-center">
                        {p.presentDays}
                      </td>
                      <td className="p-2 border text-right">
                        ₹ {Math.floor(p.earnedSalary || 0)}
                      </td>
                      <td className="p-2 border text-left">
                        {p?.advances?.length > 0 ? (
                          p?.advances.map((adv, i) => (
                            <div key={i} className="whitespace-nowrap">
                              {new Date(adv.date).toLocaleDateString()} - ₹{" "}
                              {adv.amount}
                            </div>
                          ))
                        ) : (
                          <span>No advances</span>
                        )}
                      </td>
                      <td
                        className={`p-2 border text-right ${
                          p.previousCarryForward > 0
                            ? "text-red-600"
                            : p.previousCarryForward < 0
                            ? "text-green-600"
                            : "text-black"
                        }`}
                      >
                        {p.previousCarryForward > 0
                          ? `Advance Due: ₹ ${p.previousCarryForward}`
                          : p.previousCarryForward < 0
                          ? `Credit: ₹ ${Math.abs(p.previousCarryForward)}`
                          : "₹ 0"}
                      </td>

                      <td className="p-2 border text-right">
                        ₹ {Math.floor(p.payable || 0)}
                      </td>
                      <td className="p-2 border text-center">
                        <input
                          type="number"
                          min="0"
                          value={payAmounts[staffId] || ""}
                          onChange={(e) =>
                            handlePayAmountChange(staffId, e.target.value)
                          }
                          className="border p-1 w-24 text-right rounded text-xs"
                          disabled={paidStatus[staffId]}
                        />
                      </td>
                      <td className="p-2 border text-center">
                        <button
                          onClick={() => {
                            if (!paidStatus[staffId]) handlePay(staffId);
                          }}
                          disabled={paidStatus[staffId]}
                          className={`px-3 py-1 rounded text-xs ${
                            paidStatus[staffId]
                              ? "bg-gray-400 cursor-not-allowed"
                              : "bg-green-600 hover:bg-green-700 text-white"
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
                <td colSpan="10" className="text-center p-4">
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
