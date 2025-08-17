"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
  const [advanceUntil, setAdvanceUntil] = useState("");

  const [activeFilters, setActiveFilters] = useState({ start: null, end: null, until: null });

  const fmtYMD = (s) => s;

  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    const touch =
      typeof window !== "undefined" &&
      (("ontouchstart" in window) ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia?.("(pointer: coarse)").matches);
    setIsTouch(!!touch);
  }, []);

  const INR = useMemo(
    () =>
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }),
    []
  );

  // Tooltip — system advances list
  const advancesTooltip = (advList = []) => {
    if (!Array.isArray(advList) || advList.length === 0) return "No advances in this range";
    const lines = advList.map((a) => {
      const d = String(a?.date ?? "");
      const amt = Number(a?.amount) || 0;
      return `${d} — ₹${amt.toLocaleString("en-IN")}`;
    });
    const total = advList.reduce((s, a) => s + (Number(a?.amount) || 0), 0);
    lines.push(`Total — ₹${total.toLocaleString("en-IN")}`);
    return lines.join("\n");
  };

  // ⭐ Owner Adjustment tooltip (history)
  const ownerAdjTooltip = (hist = []) => {
    if (!Array.isArray(hist) || hist.length === 0) return "No owner adjustments this month";
    const lines = hist.map((h) => {
      const d = h?.at ? new Date(h.at) : null;
      const dStr = d ? d.toISOString().slice(0, 10) : "";
      const amt = Number(h?.amount) || 0;
      const note = (h?.note || "").trim();
      return `${dStr} — ${amt >= 0 ? "+" : "−"}₹${Math.abs(amt).toLocaleString("en-IN")}${note ? ` (${note})` : ""}`;
    });
    const total = hist.reduce((s, h) => s + (Number(h?.amount) || 0), 0);
    lines.push(`Total — ${total >= 0 ? "+" : "−"}₹${Math.abs(total).toLocaleString("en-IN")}`);
    return lines.join("\n");
  };

  // ⭐ Advances detail modal state (system)
  const [advModal, setAdvModal] = useState({ open: false, staffName: "", list: [] });
  const openAdvancesModal = (staffName, advList = []) => setAdvModal({ open: true, staffName, list: Array.isArray(advList) ? advList : [] });
  const closeAdvancesModal = () => setAdvModal((prev) => ({ ...prev, open: false }));

  // ⭐ Owner Adjustment detail modal state
  const [ownerModal, setOwnerModal] = useState({ open: false, staffName: "", list: [] });
  const openOwnerModal = (staffName, list = []) => setOwnerModal({ open: true, staffName, list: Array.isArray(list) ? list : [] });
  const closeOwnerModal = () => setOwnerModal((prev) => ({ ...prev, open: false }));

  // Close on ESC for both modals
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") {
        if (advModal.open) closeAdvancesModal();
        if (ownerModal.open) closeOwnerModal();
      }
    }
    if (advModal.open || ownerModal.open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advModal.open, ownerModal.open]);

  // Core loader
  const loadData = async (m, y, startDate = null, endDate = null, cutoff = null) => {
    setLoading(true);
    try {
      // 1) Staff
      const staffRes = await fetch("/api/v1/staff/get-staff", { cache: "no-store" });
      if (!staffRes.ok) throw new Error("Failed to fetch staff list");
      const rawStaff = await staffRes.json();
      const staff = (rawStaff || []).filter((s) => s && s._id);
      setStaffList(staff);

      // 2) Payroll per staff
      const payrollPromises = staff.map(async (s) => {
        let url = `/api/v1/staff/payroll/${s._id}?month=${m}&year=${y}`;
        if (startDate) url += `&start=${startDate}`;
        if (endDate) url += `&end=${endDate}`;
        if (cutoff) url += `&advanceUntil=${cutoff}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to fetch payroll for ${s.name || s._id}`);
        return res.json();
      });

      const payrollResults = await Promise.all(payrollPromises);
      setPayrollData(payrollResults);

      // 3) Paid status
      const statusMap = {};
      payrollResults.forEach((p, idx) => {
        const id = staff[idx]._id;
        if (p.finalPaid && p.finalPaid > 0) statusMap[id] = true;
      });
      setPaidStatus(statusMap);

      setPayAmounts({});
    } catch (err) {
      console.error("Error in loadData:", err);
      toast.error(err.message || "Failed to load payroll data");
    } finally {
      setLoading(false);
    }
  };

  // Guards
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "owner") {
      router.push("/no-permission");
    }
  }, [status, session, router]);

  // Initial load
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "owner") {
      loadData(selectedMonth, selectedYear, null, null, null);
      setActiveFilters({ start: null, end: null, until: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Reload when month/year changes with active filters
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "owner") {
      loadData(
        selectedMonth,
        selectedYear,
        activeFilters.start,
        activeFilters.end,
        activeFilters.until
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear]);

  const monthLabel = useMemo(() => {
    return `${new Date(selectedYear, (selectedMonth || 1) - 1).toLocaleString("default", {
      month: "long",
    })} ${selectedYear}`;
  }, [selectedMonth, selectedYear]);

  const applyFilters = () => {
    const start = customStartDate || null;
    const end = customEndDate || null;
    const until = advanceUntil || null;

    if (end && start && new Date(end) < new Date(start)) {
      toast.error("End date cannot be before Start date.");
      return;
    }
    setActiveFilters({ start, end, until });
    loadData(selectedMonth, selectedYear, start, end, until);
  };

  const clearFilters = () => {
    setCustomStartDate("");
    setCustomEndDate("");
    setAdvanceUntil("");
    setActiveFilters({ start: null, end: null, until: null });
    loadData(selectedMonth, selectedYear, null, null, null);
  };

  const handlePayAmountChange = (staffId, value) => {
    setPayAmounts((prev) => ({ ...prev, [staffId]: value }));
  };

  const handlePay = async (staffId, staffName) => {
    const amount = Math.floor(parseFloat(String(payAmounts[staffId])));
    if (isNaN(amount) || amount < 0) {
      toast.error("Please enter a valid amount.");
      return;
    }
    if (!activeFilters.until) {
      toast.error("Please select ‘Include advances up to’ first.");
      return;
    }

    const untilInfo = activeFilters.until;
    if (!window.confirm(`Confirm paying ₹${amount.toLocaleString("en-IN")} to ${staffName}?\n(Advances included up to ${untilInfo})`)) {
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
          advanceUntil: activeFilters.until,
          start: activeFilters.start,
          end: activeFilters.end,
        }),
      });
      const result = await res.json();

      if (res.ok && result.payment) {
        const updated = result.payment;
        setPaidStatus((prev) => ({ ...prev, [staffId]: true }));
        setPayAmounts((prev) => ({ ...prev, [staffId]: updated.paidAmount }));

        setPayrollData((prev) =>
          prev.map((p, i) => (staffList[i]._id === staffId ? { ...p, finalPaid: updated.paidAmount } : p))
        );

        toast.success("Payment saved!", { id: toastId });

        setTimeout(() => {
          loadData(selectedMonth, selectedYear, activeFilters.start, activeFilters.end, activeFilters.until);
        }, 600);
      } else {
        toast.error(result.message || "Payment failed. Try again.", { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error("Error processing payment.", { id: toastId });
    }
  };

  const handleSelectThisMonth = () => {
    const now = new Date();
    const m = now.getMonth() + 1;
    const y = now.getFullYear();
    setSelectedMonth(m);
    setSelectedYear(y);
  };

  const isUnauthed = status === "unauthenticated";
  const isNotOwner = status === "authenticated" && session?.user?.role !== "owner";

  return (
    <div className="relative max-w-7xl mx-auto p-4 sm:p-6 border border-black rounded mt-10 pb-20 bg-gray-50 font-sans">
      <Toaster />

      {isUnauthed ? (
        <p className="text-center mt-10">You must be logged in.</p>
      ) : isNotOwner ? (
        <p className="text-center mt-10">Redirecting…</p>
      ) : (
        <>
          <h1 className="text-xl sm:text-2xl text-black text-center font-bold mb-4">📒 Staff Payroll Ledger</h1>

          {/* Top controls */}
          <div className="flex flex-col gap-3 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleSelectThisMonth}
                className="px-4 py-2 bg-[#fa3e5e] text-black rounded text-sm"
              >
                This Month
              </button>

              <span className="px-2 py-1 rounded bg-gray-200 text-black text-sm">
                {monthLabel}
              </span>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-2">
              <div className="flex items-center gap-2">
                <label className="text-sm text-black font-medium">Attendance start:</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="border p-1 text-black rounded text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-black font-medium">Attendance end:</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="border p-1 text-black rounded text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-black font-medium">Include advances up to:</label>
                <input
                  type="date"
                  value={advanceUntil}
                  onChange={(e) => setAdvanceUntil(e.target.value)}
                  className="border p-1 text-black rounded text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <button onClick={applyFilters} className="px-4 py-2 bg-blue-600 text-white rounded text-sm">
                  Apply filters
                </button>
                <button onClick={clearFilters} className="px-4 py-2 bg-gray-500 text-white rounded text-sm">
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Periods */}
          <div className="mb-3">
            <h2 className="text-sm text-black sm:text-base font-semibold">
              Attendance period:&nbsp;
              {payrollData?.length && payrollData[0]?.attendanceStart
                ? `${fmtYMD(payrollData[0].attendanceStart)} → ${fmtYMD(payrollData[0].attendanceEnd)}`
                : "—"}
            </h2>
            <h2 className="text-sm text-black sm:text-base font-semibold">
              Advances included:&nbsp;
              {payrollData?.length && payrollData[0]?.advancesStart
                ? `${fmtYMD(payrollData[0].advancesStart)} → ${fmtYMD(payrollData[0].advancesEnd)}`
                : "—"}
            </h2>
          </div>

          <h2 className="text-sm text-black sm:text-base mb-3 font-semibold">
            Showing Salary for: {monthLabel}{" "}
            {activeFilters.until ? `(Advances until: ${activeFilters.until})` : ""}
          </h2>

          <div className="relative w-full overflow-x-auto border rounded-lg shadow-sm">
            <table className="w-full border-collapse border text-xs sm:text-sm">
              <thead className="bg-gray-300 text-black">
                <tr>
                  <th className="p-2 border">S.no</th>
                  <th className="p-2 border">Name</th>
                  <th className="p-2 border">Month</th>
                  <th className="p-2 border">Attendance</th>
                  <th className="p-2 border">Earned Salary</th>
                  <th className="p-2 border">Prev. Carry Forward</th>
                  <th className="p-2 border">System Advances</th>
                  <th className="p-2 border">Owner Adjustment</th>
                  <th className="p-2 border">Final Advances</th>
                  <th className="p-2 border">Payable</th>
                  <th className="p-2 border">Paid Amount</th>
                  <th className="p-2 border">Action</th>
                </tr>
              </thead>

              <tbody>
                {payrollData.length && staffList.length ? (
                  payrollData.map((p, idx) => {
                    const staff = staffList[idx];
                    const staffId = staff._id;

                    const earned = Math.round(Number(p?.earnedSalary) || 0);
                    const prevCarry = Math.round(Number(p?.carryForward) || 0);

                    const systemAdvFromApi = Number(p?.systemAdvance) || 0;
                    const systemAdvFromList = Array.isArray(p?.advances)
                      ? p.advances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0)
                      : 0;
                    const systemAdv = Math.round(systemAdvFromApi || systemAdvFromList || 0);

                    const ownerAdj = Math.round(Number(p?.ownerAdjustment) || 0);
                    const ownerHist = Array.isArray(p?.ownerAdjustmentHistory) ? p.ownerAdjustmentHistory : [];

                    const finalAdv = Math.round(
                      Number.isFinite(Number(p?.advancesFinal))
                        ? Number(p?.advancesFinal)
                        : Math.max(0, systemAdv + ownerAdj)
                    );

                    const totalAdvanceDue = Math.max(0, prevCarry + finalAdv);
                    const payableNow = Math.max(0, Math.round(Number(p?.payable) || (earned - totalAdvanceDue)));

                    const isPaid = !!paidStatus[staffId];

                    const monthLabelCell = p.month
                      ? `${new Date(p.year, p.month - 1).toLocaleString("default", { month: "long" })} ${p.year}`
                      : "-";

                    return (
                      <tr key={staffId}>
                        <td className="p-2 border text-black text-center">{idx + 1}</td>
                        <td className="p-2 border text-black">{p.staffName}</td>
                        <td className="p-2 border text-black">{monthLabelCell}</td>
                        <td className="p-2 border text-black text-center">{p.presentDays}</td>

                        <td className="p-2 border text-black text-right">₹ {earned.toLocaleString("en-IN")}</td>
                        <td className="p-2 border text-black text-right">₹ {prevCarry.toLocaleString("en-IN")}</td>

                        {/* System Advances with tooltip + modal */}
                        <td className="p-2 border text-black text-right whitespace-nowrap">
                          ₹ {systemAdv.toLocaleString("en-IN")}
                          <button
                            type="button"
                            className="ml-1 text-xs opacity-70 align-middle cursor-pointer underline decoration-dotted"
                            title={advancesTooltip(p?.advances)}
                            onClick={() => openAdvancesModal(p?.staffName, p?.advances)}
                            aria-label="Show advances details"
                          >
                            ⓘ
                          </button>
                        </td>

                        {/* Owner Adjustment with tooltip + modal */}
                        <td className="p-2 border text-black text-right whitespace-nowrap">
                          {ownerAdj >= 0 ? "+" : "−"} ₹ {Math.abs(ownerAdj).toLocaleString("en-IN")}
                          <button
                            type="button"
                            className="ml-1 text-xs opacity-70 align-middle cursor-pointer underline decoration-dotted"
                            title={ownerAdjTooltip(ownerHist)}
                            onClick={() => openOwnerModal(p?.staffName, ownerHist)}
                            aria-label="Show owner adjustments details"
                          >
                            ⓘ
                          </button>
                        </td>

                        {/* Final Advances */}
                        <td className="p-2 border text-black text-right">₹ {finalAdv.toLocaleString("en-IN")}</td>

                        {/* Payable */}
                        <td className="p-2 border text-black text-right">₹ {payableNow.toLocaleString("en-IN")}</td>

                        {/* Paid Amount input */}
                        <td className="p-2 border text-black text-center">
                          <input
                            type="number"
                            min="0"
                            value={
                              payAmounts[staffId] !== undefined && payAmounts[staffId] !== null
                                ? payAmounts[staffId]
                                : payableNow
                            }
                            onChange={(e) => handlePayAmountChange(staffId, e.target.value)}
                            className="border p-1 w-24 text-right rounded text-xs"
                            disabled={isPaid}
                          />
                        </td>

                        {/* Action */}
                        <td className="p-2 border text-center">
                          {isPaid ? (
                            <span className="px-3 py-1 rounded text-xs bg-gray-600 text-white cursor-default">
                              Paid
                            </span>
                          ) : (
                            <button
                              onClick={() => handlePay(staffId, p.staffName)}
                              className="px-3 py-1 rounded text-xs bg-green-600 hover:bg-green-700 text-white"
                            >
                              Pay
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="12" className="text-center text-black p-4">No staff found.</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Loading overlay */}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-10 w-10 rounded-full border-4 border-gray-300 border-t-transparent animate-spin" />
                  <div className="text-sm text-black">Loading…</div>
                </div>
              </div>
            )}
          </div>

          {/* ⭐ System Advances modal */}
          {advModal.open && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
              onClick={closeAdvancesModal}
            >
              <div
                className="w-full max-w-md rounded bg-white shadow-md"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="adv-modal-title"
              >
                <div className="flex items-center justify-between border-b p-3">
                  <h3 id="adv-modal-title" className="font-semibold">
                    Advances — {advModal.staffName || "Staff"}
                  </h3>
                  <button
                    className="text-sm px-2 py-1 rounded border bg-gray-50 hover:bg-gray-100"
                    onClick={closeAdvancesModal}
                  >
                    Close
                  </button>
                </div>

                <div className="max-h-80 overflow-auto p-3">
                  {Array.isArray(advModal.list) && advModal.list.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-600">
                          <th className="py-1">Date</th>
                          <th className="py-1 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {advModal.list.map((a, i) => (
                          <tr key={i} className="border-t">
                            <td className="py-1">{String(a?.date ?? "")}</td>
                            <td className="py-1 text-right">{INR.format(Number(a?.amount) || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t">
                          <td className="py-2 font-semibold">Total</td>
                          <td className="py-2 text-right font-semibold">
                            {INR.format(advModal.list.reduce((s, a) => s + (Number(a?.amount) || 0), 0))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  ) : (
                    <div className="text-sm text-gray-600">No advances in this range.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ⭐ Owner Adjustments modal */}
          {ownerModal.open && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
              onClick={closeOwnerModal}
            >
              <div
                className="w-full max-w-md rounded bg-white shadow-md"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="owner-modal-title"
              >
                <div className="flex items-center justify-between border-b p-3">
                  <h3 id="owner-modal-title" className="font-semibold">
                    Owner Adjustments — {ownerModal.staffName || "Staff"}
                  </h3>
                  <button
                    className="text-sm px-2 py-1 rounded border bg-gray-50 hover:bg-gray-100"
                    onClick={closeOwnerModal}
                  >
                    Close
                  </button>
                </div>

                <div className="max-h-80 overflow-auto p-3">
                  {Array.isArray(ownerModal.list) && ownerModal.list.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-600">
                          <th className="py-1">Date</th>
                          <th className="py-1">Note</th>
                          <th className="py-1 text-right">Delta</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ownerModal.list.map((h, i) => {
                          const d = h?.at ? new Date(h.at) : null;
                          const dStr = d ? d.toISOString().slice(0, 10) : "";
                          const amt = Number(h?.amount) || 0;
                          return (
                            <tr key={i} className="border-t">
                              <td className="py-1">{dStr}</td>
                              <td className="py-1">{(h?.note || "").trim()}</td>
                              <td className="py-1 text-right">
                                {amt >= 0 ? "+" : "−"} ₹{Math.abs(amt).toLocaleString("en-IN")}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t">
                          <td className="py-2 font-semibold" colSpan={2}>Total</td>
                          <td className="py-2 text-right font-semibold">
                            {(() => {
                              const total = ownerModal.list.reduce((s, h) => s + (Number(h?.amount) || 0), 0);
                              return `${total >= 0 ? "+" : "−"} ₹${Math.abs(total).toLocaleString("en-IN")}`;
                            })()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  ) : (
                    <div className="text-sm text-gray-600">No owner adjustments this month.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
