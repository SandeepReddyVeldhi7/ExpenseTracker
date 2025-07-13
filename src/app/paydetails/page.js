"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

export default function PayDetailsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [staffList, setStaffList] = useState([]);
  const [payrollData, setPayrollData] = useState([]);
  const [payAmounts, setPayAmounts] = useState({});
  const [paidStatus, setPaidStatus] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [confirmedAdvances, setConfirmedAdvances] = useState({});

  // ✅ Redirect if not owner
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

  // ✅ Load staff, payroll, and confirmed advances
  const loadData = async (
    m = selectedMonth,
    y = selectedYear,
    startDate = null,
    endDate = null
  ) => {
    setLoading(true);
    try {
      console.log("Fetching staff list...");
      const staffRes = await fetch("/api/v1/staff/get-staff");
      if (!staffRes.ok) throw new Error("Failed to fetch staff list");
const rawStaff = await staffRes.json();
const staff = (rawStaff || []).filter((s) => s && s._id);

      setStaffList(staff);

      console.log("Staff loaded:", staff);

      // Fetch confirmed advances
      let confirmedUrl = `/api/v1/staff/advances/confirmed?month=${m}&year=${y}`;
      const confirmedRes = await fetch(confirmedUrl);
      if (!confirmedRes.ok)
        throw new Error("Failed to fetch confirmed advances");
      const confirmedList = await confirmedRes.json();
      const confirmedMap = {};
      confirmedList.forEach((c) => {
        confirmedMap[c.staff?._id] = c;
      });
      setConfirmedAdvances(confirmedMap);

      console.log("Confirmed advances loaded:", confirmedList);

      // Fetch payroll for all staff
      const payrollPromises = staff.map(async (s) => {
        let url = `/api/v1/staff/payroll/${s._id}?month=${m}&year=${y}`;
        if (startDate && endDate) {
          url = `/api/v1/staff/payroll/${s._id}?start=${startDate}&end=${endDate}`;
        }

        console.log(`Fetching payroll for ${s.name}:`, url);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch payroll for ${s.name}`);
        return res.json();
      });

      const payrollResults = await Promise.all(payrollPromises);
      console.log("Payroll data loaded:", payrollResults);
      setPayrollData(payrollResults);

      // Map paid status and input amounts
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
      console.error("Error in loadData:", err);
      toast.error(err.message || "Failed to load payroll data");
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
        const updated = result.payment;

        // Optimistically update UI
        setPaidStatus((prev) => ({ ...prev, [staffId]: true }));
        setPayAmounts((prev) => ({ ...prev, [staffId]: updated.finalPaid }));

        setPayrollData((prev) =>
          prev.map((p, i) =>
            staffList[i]._id === staffId
              ? { ...p, finalPaid: updated.finalPaid }
              : p
          )
        );

        toast.success("Payment saved!", { id: toastId });

        // Optionally refresh everything silently
        setTimeout(() => loadData(selectedMonth, selectedYear), 1000);
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

  // ✅ Guards
  if (status === "unauthenticated") {
    return <p className="text-center mt-10">You must be logged in.</p>;
  }

  if (session?.user?.role !== "owner") {
    return null;
  }

  if (loading) {
    return <p className="text-center mt-10">Loading...</p>;
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
              <th className="p-2 border">S.no</th>
              <th className="p-2 border">Name</th>
              <th className="p-2 border">Month</th>
              <th className="p-2 border">Attendance</th>
              <th className="p-2 border">Earned Salary</th>
              <th className="p-2 border">Confirmed Advance</th>
              <th className="p-2 border">Payable</th>
              <th className="p-2 border">Carry Forward (Next Month)</th>
              <th className="p-2 border">Paid Amount</th>
              <th className="p-2 border">Action</th>
            </tr>
          </thead>
          <tbody>
            {payrollData.length && staffList.length ? (
              payrollData.map((p, idx) => {
                const staff = staffList[idx];
                const staffId = staff._id;

                const confirmed = confirmedAdvances[staffId];
                const confirmedAdvance = confirmed
                  ? confirmed.confirmedAdvance
                  : null;
                const payable =
                  confirmedAdvance !== null
                    ? Math.max(0, (p.earnedSalary || 0) - confirmedAdvance)
                    : null;

                return (
                  <tr key={staffId}>
                    <td className="p-2 border text-black text-center">
                      {idx + 1}
                    </td>
                    <td className="p-2 border text-black">{p.staffName}</td>
                    <td className="p-2 border text-black">
                      {p.month
                        ? `${new Date(p.year, p.month - 1).toLocaleString(
                            "default",
                            { month: "long" }
                          )} ${p.year}`
                        : "-"}
                    </td>
                    <td className="p-2 border text-black text-center">
                      {p.presentDays}
                    </td>
                    <td className="p-2 border text-black text-right">
                      ₹{" "}
                      {Math.round(p.earnedSalary || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="p-2 border text-black text-right">
                      {confirmedAdvance !== null ? (
                        `₹ ${confirmedAdvance.toLocaleString("en-IN")}`
                      ) : (
                        <span className="text-red-600 font-semibold">
                          Not Confirmed
                        </span>
                      )}
                    </td>
                    <td className="p-2 border text-black text-right">
                      {payable !== null ? (
                        `₹ ${Math.round(payable).toLocaleString("en-IN")}`
                      ) : (
                        <span className="text-red-600">N/A</span>
                      )}
                    </td>
                    <td className="p-2 border text-black text-right">
                      {p.carryForward > 0
                        ? `- Advance Due: ${Math.round(
                            p.carryForward
                          ).toLocaleString("en-IN")}`
                        : p.carryForward < 0
                        ? `Credit: ${Math.abs(
                            Math.round(p.carryForward)
                          ).toLocaleString("en-IN")}`
                        : "0"}
                    </td>
                    <td className="p-2 border text-black text-center">
                      <input
                        type="number"
                        min="0"
                        value={
                          payable !== null ? payAmounts[staffId] || "" : ""
                        }
                        onChange={(e) =>
                          handlePayAmountChange(staffId, e.target.value)
                        }
                        className="border p-1 w-24 text-right rounded text-xs"
                        disabled={paidStatus[staffId] || payable === null}
                      />
                    </td>
                    <td className="p-2 border text-center">
                      <button
                        onClick={() =>
                          !paidStatus[staffId] &&
                          handlePay(staffId, p.staffName)
                        }
                        disabled={paidStatus[staffId] || payable === null}
                        className={`px-3 py-1 rounded text-xs ${
                          paidStatus[staffId] || payable === null
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
