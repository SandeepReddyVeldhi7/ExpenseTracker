"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

export default function PayDetailsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [staffList, setStaffList] = useState([]);
  const [payrollData, setPayrollData] = useState({});
  const [payAmounts, setPayAmounts] = useState({});
  const [paidStatus, setPaidStatus] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [advanceUntil, setAdvanceUntil] = useState("");
  const [activeFilters, setActiveFilters] = useState({ start: null, end: null, until: null });
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  const loadAbortRef = useRef(null);
  const applyDebounceRef = useRef(null);
  const [advModal, setAdvModal] = useState({ open: false, staffName: "", list: [] });
  const [ownerModal, setOwnerModal] = useState({ open: false, staffName: "", list: [] });

  const INR = useMemo(() => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }), []);

  // Tooltip/modal helpers (unchanged)
  const advancesTooltip = (advList = []) => {
    if (!Array.isArray(advList) || advList.length === 0) return "No advances in this range";
    const lines = advList.map((a) => `${String(a?.date ?? "")} — ₹${(Number(a?.amount) || 0).toLocaleString("en-IN")}`);
    const total = advList.reduce((s, a) => s + (Number(a?.amount) || 0), 0);
    lines.push(`Total — ₹${total.toLocaleString("en-IN")}`);
    return lines.join("\n");
  };

  const ownerAdjTooltip = (hist = []) => {
    if (!Array.isArray(hist) || hist.length === 0) return "No owner adjustments this month";
    const lines = hist.map((h) => {
      const d = h?.at ? new Date(h.at) : null;
      const dStr = d ? d.toISOString().slice(0, 10) : "";
      const amt = Number(h?.amount) || 0;
      return `${dStr} — ${amt >= 0 ? "+" : "−"}₹${Math.abs(amt).toLocaleString("en-IN")}${h?.note ? ` (${h.note})` : ""}`;
    });
    const total = hist.reduce((s, h) => s + (Number(h?.amount) || 0), 0);
    lines.push(`Total — ${total >= 0 ? "+" : "−"}₹${Math.abs(total).toLocaleString("en-IN")}`);
    return lines.join("\n");
  };

  const openAdvancesModal = (staffName, list = []) => setAdvModal({ open: true, staffName: staffName || "Staff", list: Array.isArray(list) ? list : [] });
  const closeAdvancesModal = () => setAdvModal((p) => ({ ...p, open: false }));
  const openOwnerModal = (staffName, list = []) => setOwnerModal({ open: true, staffName: staffName || "Staff", list: Array.isArray(list) ? list : [] });
  const closeOwnerModal = () => setOwnerModal((p) => ({ ...p, open: false }));

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") {
        if (advModal.open) closeAdvancesModal();
        if (ownerModal.open) closeOwnerModal();
        if (filterModalOpen) setFilterModalOpen(false);
      }
    }
    if (advModal.open || ownerModal.open || filterModalOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advModal.open, ownerModal.open, filterModalOpen]);

  // Load data (unchanged)
  const loadData = async (m, y, startDate = null, endDate = null, cutoff = null) => {
    if (loadAbortRef.current) {
      try { loadAbortRef.current.abort(); } catch (e) {}
    }
    const controller = new AbortController();
    loadAbortRef.current = controller;

    setLoading(true);
    setPayrollData({});
    setPaidStatus({});
    setPayAmounts({});

    try {
      const staffRes = await fetch("/api/v1/staff/get-staff", { cache: "no-store", signal: controller.signal });
      if (!staffRes.ok) throw new Error("Failed to fetch staff list");
      const rawStaff = await staffRes.json();
      const staff = (rawStaff || []).filter((s) => s && s._id);
      setStaffList(staff);

      if (!staff.length) {
        setLoading(false);
        return;
      }

      const CONCURRENCY = 6;
      let idx = 0;

      const fetchOne = async (i) => {
        const s = staff[i];
        if (!s) return;
        const staffKey = String(s._id);
        let url = `/api/v1/staff/payroll/${s._id}?month=${m}&year=${y}`;
        if (startDate) url += `&start=${startDate}`;
        if (endDate) url += `&end=${endDate}`;
        if (cutoff) url += `&advanceUntil=${cutoff}`;

        try {
          const res = await fetch(url, { cache: "no-store", signal: controller.signal });
          if (!res.ok) {
            setPayrollData(prev => ({ ...prev, [staffKey]: { _error: true, _errorMsg: `Failed: ${res.status}` } }));
            setPaidStatus(prev => ({ ...prev, [staffKey]: false }));
            return;
          }
          const payload = await res.json();

          let isPaid = Boolean(payload?.paidForRequestedRange);
          if (!isPaid) {
            const finalPaidNum = Number(payload?.finalPaid ?? payload?.paidAmount ?? 0);
            if (finalPaidNum > 0) {
              try {
                const serverCovered = payload?.advanceCoveredUntil || payload?.advanceUntil || null;
                if (serverCovered && cutoff) {
                  if (String(serverCovered) >= String(cutoff)) {
                    isPaid = true;
                  }
                } else {
                  if (!cutoff && payload?.attendanceStart && payload?.attendanceEnd) {
                    const reqStart = startDate || null;
                    const reqEnd = endDate || null;
                    if (reqStart && reqEnd && payload.attendanceStart === reqStart && payload.attendanceEnd === reqEnd) isPaid = true;
                  }
                }
              } catch (e) {}
            }
          }

          const normalized = {
            ...(payload || {}),
            presentDays: typeof payload?.presentDays === "number" ? payload.presentDays : Number(payload?.presentDays ?? 0),
          };

          setPayrollData(prev => ({ ...prev, [staffKey]: { ...(prev[staffKey] || {}), ...normalized } }));
          setPaidStatus(prev => ({ ...prev, [staffKey]: !!isPaid }));

          const payableVal = Math.max(0, Math.round(Number(payload?.payable) || 0));
          setPayAmounts(prev => ({ ...(prev || {}), [staffKey]: prev?.[staffKey] ?? payableVal }));
        } catch (err) {
          if (err?.name === "AbortError") return;
          setPayrollData(prev => ({ ...prev, [staffKey]: { _error: true, _errorMsg: err.message || "Error" } }));
          setPaidStatus(prev => ({ ...prev, [staffKey]: false }));
        }
      };

      const runners = new Array(Math.min(CONCURRENCY, staff.length)).fill(null).map(async () => {
        while (true) {
          const i = idx++;
          if (i >= staff.length) break;
          await fetchOne(i);
        }
      });

      await Promise.all(runners);
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error("Error in loadData:", err);
        toast.error(err.message || "Failed to load payroll data");
      }
    } finally {
      setLoading(false);
      if (loadAbortRef.current === controller) loadAbortRef.current = null;
    }
  };

  // Filter handlers (unchanged)
  const applyFilters = () => {
    const start = customStartDate || null;
    const end = customEndDate || null;
    const until = advanceUntil || null;

    if (!start || !end || !until) {
      toast.error("Please select Attendance Start, Attendance End, and Include Advances Up To dates.");
      return;
    }

    if (end && start && new Date(end) < new Date(start)) {
      toast.error("End date cannot be before Start date.");
      return;
    }

    if (applyDebounceRef.current) clearTimeout(applyDebounceRef.current);
    applyDebounceRef.current = setTimeout(() => {
      setActiveFilters({ start, end, until });
      loadData(selectedMonth, selectedYear, start, end, until);
      applyDebounceRef.current = null;
      setFilterModalOpen(false);
    }, 200);
  };

  const clearFilters = () => {
    setCustomStartDate("");
    setCustomEndDate("");
    setAdvanceUntil("");
    setActiveFilters({ start: null, end: null, until: null });
    setStaffList([]);
    setPayrollData({});
    setPaidStatus({});
    setPayAmounts({});
    setFilterModalOpen(false);
  };

  // Pay handler (unchanged)
  const handlePay = async (rawStaffId, staffName) => {
    const staffKey = String(rawStaffId);
    const amount = Math.floor(parseFloat(String(payAmounts[staffKey])));
    if (isNaN(amount) || amount < 0) {
      toast.error("Please enter a valid amount.");
      return;
    }
    if (!activeFilters.until) {
      toast.error("Please select ‘Include advances up to’ first.");
      return;
    }

    try {
      const selectedUntil = String(activeFilters.until);
      const existingCovered = payrollData?.[staffKey]?.advanceCoveredUntil || payrollData?.[staffKey]?.advanceUntil || null;
      if (existingCovered) {
        if (String(existingCovered) >= selectedUntil) {
          toast.error(`Advances for ${staffName} are already included up to ${existingCovered}. Choose a later date.`);
          return;
        }
      }
    } catch (err) {
      console.warn("advanceUntil parse error:", err);
    }

    if (!window.confirm(`Confirm paying ₹${amount.toLocaleString("en-IN")} to ${staffName}?\n(Advances included up to ${activeFilters.until})`)) {
      return;
    }

    const toastId = toast.loading("Processing payment...");
    try {
      const res = await fetch("/api/v1/staff/pay-salary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: rawStaffId,
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
        const updatedPaidAmount = Number(updated.paidAmount || updated.finalPaid || updated.paid || 0);
        const updatedAdvanceUntilStr = updated.advanceCoveredUntil || updated.advanceUntil || null;

        setPaidStatus(prev => ({ ...prev, [staffKey]: updatedPaidAmount > 0 }));
        setPayAmounts(prev => ({ ...prev, [staffKey]: updatedPaidAmount }));
        setPayrollData(prev => {
          const prevForStaff = prev[staffKey] || {};
          const merged = {
            ...prevForStaff,
            finalPaid: updatedPaidAmount,
            paidAmount: updatedPaidAmount,
            paid: updatedPaidAmount > 0,
            payable: updated.payable ?? prevForStaff.payable,
            carryForward: (updated.newCarryForward ?? prevForStaff.carryForward),
            presentDays: typeof updated.presentDays === "number" ? updated.presentDays : Number(updated?.presentDays ?? prevForStaff.presentDays ?? 0),
            earnedSalary: updated.earnedSalary ?? prevForStaff.earnedSalary,
            advances: updated.advances ?? prevForStaff.advances,
            advanceUntil: updatedAdvanceUntilStr ?? prevForStaff.advanceUntil,
            advanceCoveredUntil: updatedAdvanceUntilStr ?? prevForStaff.advanceCoveredUntil,
            month: updated.month ?? prevForStaff.month,
            year: updated.year ?? prevForStaff.year,
            savedPaymentId: updated._id ?? prevForStaff.savedPaymentId,
          };
          return { ...prev, [staffKey]: merged };
        });

        toast.success("Payment saved!", { id: toastId });
        loadData(selectedMonth, selectedYear, activeFilters.start, activeFilters.end, activeFilters.until);
      } else {
        if (result?.alreadyCoveredUntil) {
          const covered = String(result.alreadyCoveredUntil);
          toast.error(`Cannot pay: advances already included up to ${covered}`, { id: toastId });
        } else {
          toast.error(result.message || "Payment failed. Try again.", { id: toastId });
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Error processing payment.", { id: toastId });
    }
  };

  // Helpers (unchanged)
  const handlePayAmountChange = (staffId, value) => {
    const key = String(staffId);
    setPayAmounts((prev) => ({ ...prev, [key]: value }));
  };
  const handleSelectThisMonth = () => {
    const now = new Date();
    setSelectedMonth(now.getMonth() + 1);
    setSelectedYear(now.getFullYear());
  };

  const isUnauthed = status === "unauthenticated";
  const isNotOwner = status === "authenticated" && session?.user?.role !== "owner";

  const representativePayroll = useMemo(() => {
    if (!staffList || staffList.length === 0) return null;
    const firstId = staffList[0]._id;
    return payrollData[String(firstId)] || null;
  }, [staffList, payrollData]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "owner") {
      router.push("/no-permission");
    }
  }, [status, session, router]);

  useEffect(() => {
    return () => {
      if (loadAbortRef.current) {
        try { loadAbortRef.current.abort(); } catch (e) {}
        loadAbortRef.current = null;
      }
      if (applyDebounceRef.current) {
        clearTimeout(applyDebounceRef.current);
        applyDebounceRef.current = null;
      }
    };
  }, []);

  // Render payroll month cell (unchanged)
  const renderPayrollMonthCell = (p) => {
    const monthLabel = p?.month && p?.year
      ? `${new Date(p.year, p.month - 1).toLocaleString("default", { month: "long" })} ${p.year}`
      : "-";

    const attendanceStart = p?.attendanceStart || null;
    const attendanceEnd = p?.attendanceEnd || null;
    const advancesStart = p?.advancesStart || null;
    const advancesEnd = p?.advancesEnd || null;
    const advanceCoveredUntil = p?.advanceCoveredUntil || p?.advanceUntil || null;

    return (
      <div className="text-base">
        <div className="font-medium">{monthLabel}</div>
        {attendanceStart && attendanceEnd && (
          <div className="text-sm text-gray-600 mt-0.5">
            Attendance: <span className="font-medium">{attendanceStart}</span> → <span className="font-medium">{attendanceEnd}</span>
          </div>
        )}
        {advancesStart && advancesEnd && (
          <div className="text-sm text-gray-600">
            Advances: <span className="font-medium">{advancesStart}</span> → <span className="font-medium">{advancesEnd}</span>
          </div>
        )}
        {advanceCoveredUntil && (
          <div className="text-sm text-amber-700 mt-0.5">
            Already included up to: <strong>{advanceCoveredUntil}</strong>
          </div>
        )}
      </div>
    );
  };

  const headerLabel = useMemo(() => {
    const startRaw = activeFilters.start ?? representativePayroll?.attendanceStart ?? null;
    const endRaw = activeFilters.end ?? representativePayroll?.attendanceEnd ?? null;

    if (startRaw && endRaw) {
      try {
        const s = new Date(startRaw);
        const e = new Date(endRaw);
        if (!Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime())) {
          const sStr = s.toISOString().slice(0, 10);
          const eStr = e.toISOString().slice(0, 10);
          if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
            return `${s.toLocaleString("default", { month: "long" })} ${s.getFullYear()} (Attendance: ${sStr} → ${eStr})`;
          } else {
            return `Attendance: ${sStr} → ${eStr}`;
          }
        }
      } catch (err) {}
    }
    const monthLabel = `${new Date(selectedYear, (selectedMonth || 1) - 1).toLocaleString("default", { month: "long" })} ${selectedYear}`;
    return monthLabel;
  }, [activeFilters.start, activeFilters.end, representativePayroll, selectedMonth, selectedYear]);

  const computeRemainingRange = (coveredStr, selectedUntilStr) => {
    if (!selectedUntilStr) return null;
    if (!coveredStr) return `Full: ${selectedUntilStr}`;
    try {
      const covered = new Date(coveredStr);
      const nextDay = new Date(covered.getFullYear(), covered.getMonth(), covered.getDate() + 1);
      const sel = new Date(selectedUntilStr);
      if (nextDay > sel) return null;
      const a = nextDay.toISOString().slice(0, 10);
      const b = sel.toISOString().slice(0, 10);
      return `${a} → ${b}`;
    } catch (e) {
      return null;
    }
  };

  return (
    <div className="relative max-w-7xl mx-auto p-4 sm:p-6 border border-gray-300 rounded-lg mt-6 sm:mt-10 pb-20 bg-gray-50 font-sans">
      <Toaster />
      {isUnauthed ? (
        <p className="text-center text-lg text-gray-800 mt-10">You must be logged in.</p>
      ) : isNotOwner ? (
        <p className="text-center text-lg text-gray-800 mt-10">Redirecting…</p>
      ) : (
        <>
          <h1 className="text-xl sm:text-2xl text-gray-800 text-center font-bold mb-4">📒 Staff Payroll Ledger</h1>

          {/* Controls */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              {/* <button onClick={handleSelectThisMonth} className="px-4 py-2 bg-[#fa3e5e] text-white rounded text-base font-medium">This Month</button>
              <span className="px-3 py-1 rounded bg-gray-200 text-gray-800 text-base">
                {`${new Date(selectedYear, (selectedMonth || 1) - 1).toLocaleString("default", { month: "long" })} ${selectedYear}`}
              </span> */}
              <button onClick={() => setFilterModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded text-base font-medium">Set Filters</button>
            </div>
          </div>

          {/* Filter Modal */}
          {filterModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setFilterModalOpen(false)}>
              <div className="w-full max-w-md rounded-lg bg-white shadow-lg p-4" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Set Filters</h3>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-base text-gray-800 font-medium">Attendance start:</label>
                    <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="border p-2 rounded text-base text-gray-800" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-base text-gray-800 font-medium">Attendance end:</label>
                    <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="border p-2 rounded text-base text-gray-800" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-base text-gray-800 font-medium">Include advances up to:</label>
                    <input type="date" value={advanceUntil} onChange={(e) => setAdvanceUntil(e.target.value)} className="border p-2 rounded text-base text-gray-800" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={applyFilters} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded text-base font-medium">Apply</button>
                    <button onClick={clearFilters} className="flex-1 px-4 py-2 bg-gray-500 text-white rounded text-base font-medium">Clear</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Conditional rendering */}
          {!activeFilters.start || !activeFilters.end || !activeFilters.until ? (
            <p className="text-center text-lg text-gray-800 mt-10">Please select Attendance Start, Attendance End, and Include Advances Up To dates, then click Apply.</p>
          ) : (
            <>
              <div className="mb-4">
                <h2 className="text-base sm:text-lg text-gray-800 font-semibold">
                  Attendance period: {representativePayroll?.attendanceStart && representativePayroll?.attendanceEnd ? `${representativePayroll.attendanceStart} → ${representativePayroll.attendanceEnd}` : "—"}
                </h2>
                <h2 className="text-base sm:text-lg text-gray-800 font-semibold">
                  Advances included: {representativePayroll?.advancesStart ? `${representativePayroll.advancesStart} → ${representativePayroll.advancesEnd}` : "—"}
                </h2>
              </div>

              <h2 className="text-base sm:text-lg text-gray-800 mb-4 font-semibold">
                Showing Salary for: {headerLabel} {activeFilters.until ? `(Advances until: ${activeFilters.until})` : ""}
              </h2>

              {/* Mobile Card Layout */}
              <div className="block sm:hidden space-y-4">
                {staffList.length ? staffList.map((staff, idx) => {
                  const key = String(staff._id);
                  const p = payrollData[key] || {};
                  const earned = Math.round(Number(p?.earnedSalary) || 0);
                  const prevCarry = Math.round(Number(p?.carryForward) || 0);
                  const systemAdvFromApi = Number(p?.systemAdvance) || 0;
                  const systemAdvFromList = Array.isArray(p?.advances) ? p.advances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0) : 0;
                  const systemAdv = Math.round(systemAdvFromApi || systemAdvFromList || 0);
                  const ownerAdj = Math.round(Number(p?.ownerAdjustment) || 0);
                  const finalAdv = Math.round(Number.isFinite(Number(p?.advancesFinal)) ? Number(p?.advancesFinal) : Math.max(0, systemAdv + ownerAdj));
                  const prev = Math.max(0, prevCarry);
                  const totalAdvanceDue = Math.max(0, prev + finalAdv);
                  const payableNow = Math.max(0, Math.round(Number(p?.payable) || (earned - totalAdvanceDue)));
                  const isPaid = !!paidStatus[key];
                  const presentDays = Number.isFinite(Number(p?.presentDays)) ? Number(p.presentDays) : 0;
                  const existingCovered = p?.advanceCoveredUntil || p?.advanceUntil || null;
                  const remainingRange = computeRemainingRange(existingCovered, activeFilters.until);

                  return (
                    <div key={key} className="border rounded-lg p-4 bg-white shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold text-gray-800">{p.staffName || staff.name}</h3>
                        <span className="text-sm text-gray-600">#{idx + 1}</span>
                      </div>
                      <div className="space-y-2 text-base text-gray-800">
                        {renderPayrollMonthCell(p)}
                        <div><strong>Attendance:</strong> {presentDays} days</div>
                        <div><strong>Earned Salary:</strong> ₹{earned.toLocaleString("en-IN")}</div>
                        <div><strong>Prev. Carry Forward:</strong> ₹{prev.toLocaleString("en-IN")}</div>
                        <div className="flex items-center gap-2">
                          <span><strong>System Advances:</strong> ₹{systemAdv.toLocaleString("en-IN")}</span>
                          <button
                            type="button"
                            className="text-sm text-blue-600 underline"
                            title={advancesTooltip(p?.advances)}
                            onClick={() => openAdvancesModal(p?.staffName || staff.name, p?.advances)}
                          >
                            ⓘ
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span><strong>Owner Adjustment:</strong> {ownerAdj >= 0 ? "+" : "−"} ₹{Math.abs(ownerAdj).toLocaleString("en-IN")}</span>
                          <button
                            type="button"
                            className="text-sm text-blue-600 underline"
                            title={ownerAdjTooltip(p?.ownerAdjustmentHistory)}
                            onClick={() => openOwnerModal(p?.staffName || staff.name, p?.ownerAdjustmentHistory)}
                          >
                            ⓘ
                          </button>
                        </div>
                        <div><strong>Final Advances:</strong> ₹{finalAdv.toLocaleString("en-IN")}</div>
                        <div><strong>Payable:</strong> ₹{payableNow.toLocaleString("en-IN")}</div>
                        <div className="flex items-center gap-2">
                          <label><strong>Paid Amount:</strong></label>
                          <input
                            type="number"
                            min="0"
                            value={payAmounts[key] !== undefined && payAmounts[key] !== null ? payAmounts[key] : payableNow}
                            onChange={(e) => handlePayAmountChange(key, e.target.value)}
                            className="border p-2 rounded w-full text-base text-gray-800"
                            disabled={isPaid}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          {isPaid ? (
                            <span className="px-4 py-2 rounded bg-gray-600 text-white text-center text-base">Paid</span>
                          ) : (
                            <>
                              <button
                                onClick={() => handlePay(key, p.staffName || staff.name)}
                                className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white text-base"
                              >
                                Pay
                              </button>
                              {existingCovered && (
                                <div className="text-sm text-gray-600">
                                  Already included up to: <strong>{existingCovered}</strong>
                                </div>
                              )}
                              {remainingRange && (
                                <div className="text-sm text-amber-700">
                                  Will include: <strong>{remainingRange}</strong>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <p className="text-center text-lg text-gray-800 p-4">No staff found.</p>
                )}
              </div>

              {/* Desktop Table Layout */}
              <div className="hidden sm:block relative w-full overflow-x-auto border rounded-lg shadow-sm">
                <table className="w-full border-collapse border text-sm">
                  <thead className="bg-gray-300 text-gray-800">
                    <tr>
                      <th className="p-2 border">S.no</th>
                      <th className="p-2 border">Name</th>
                      <th className="p-2 border">Payroll month / Period</th>
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
                    {staffList.length ? staffList.map((staff, idx) => {
                      const key = String(staff._id);
                      const p = payrollData[key] || {};
                      const earned = Math.round(Number(p?.earnedSalary) || 0);
                      const prevCarry = Math.round(Number(p?.carryForward) || 0);
                      const systemAdvFromApi = Number(p?.systemAdvance) || 0;
                      const systemAdvFromList = Array.isArray(p?.advances) ? p.advances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0) : 0;
                      const systemAdv = Math.round(systemAdvFromApi || systemAdvFromList || 0);
                      const ownerAdj = Math.round(Number(p?.ownerAdjustment) || 0);
                      const finalAdv = Math.round(Number.isFinite(Number(p?.advancesFinal)) ? Number(p?.advancesFinal) : Math.max(0, systemAdv + ownerAdj));
                      const prev = Math.max(0, prevCarry);
                      const totalAdvanceDue = Math.max(0, prev + finalAdv);
                      const payableNow = Math.max(0, Math.round(Number(p?.payable) || (earned - totalAdvanceDue)));
                      const isPaid = !!paidStatus[key];
                      const presentDays = Number.isFinite(Number(p?.presentDays)) ? Number(p.presentDays) : 0;
                      const existingCovered = p?.advanceCoveredUntil || p?.advanceUntil || null;
                      const remainingRange = computeRemainingRange(existingCovered, activeFilters.until);

                      return (
                        <tr key={key}>
                          <td className="p-2 border text-gray-800 text-center">{idx + 1}</td>
                          <td className="p-2 border text-gray-800">{p.staffName || staff.name}</td>
                          <td className="p-2 border text-gray-800">{renderPayrollMonthCell(p)}</td>
                          <td className="p-2 border text-gray-800 text-center">{presentDays}</td>
                          <td className="p-2 border text-gray-800 text-right">₹{earned.toLocaleString("en-IN")}</td>
                          <td className="p-2 border text-gray-800 text-right">₹{prev.toLocaleString("en-IN")}</td>
                          <td className="p-2 border text-gray-800 text-right whitespace-nowrap">
                            ₹{systemAdv.toLocaleString("en-IN")}
                            <button
                              type="button"
                              className="ml-1 text-sm text-blue-600 underline"
                              title={advancesTooltip(p?.advances)}
                              onClick={() => openAdvancesModal(p?.staffName || staff.name, p?.advances)}
                            >
                              ⓘ
                            </button>
                          </td>
                          <td className="p-2 border text-gray-800 text-right whitespace-nowrap">
                            {ownerAdj >= 0 ? "+" : "−"} ₹{Math.abs(ownerAdj).toLocaleString("en-IN")}
                            <button
                              type="button"
                              className="ml-1 text-sm text-blue-600 underline"
                              title={ownerAdjTooltip(p?.ownerAdjustmentHistory)}
                              onClick={() => openOwnerModal(p?.staffName || staff.name, p?.ownerAdjustmentHistory)}
                            >
                              ⓘ
                            </button>
                          </td>
                          <td className="p-2 border text-gray-800 text-right">₹{finalAdv.toLocaleString("en-IN")}</td>
                          <td className="p-2 border text-gray-800 text-right">₹{payableNow.toLocaleString("en-IN")}</td>
                          <td className="p-2 border text-gray-800 text-center">
                            <input
                              type="number"
                              min="0"
                              value={payAmounts[key] !== undefined && payAmounts[key] !== null ? payAmounts[key] : payableNow}
                              onChange={(e) => handlePayAmountChange(key, e.target.value)}
                              className="border p-2 w-28 text-right rounded text-sm"
                              disabled={isPaid}
                            />
                          </td>
                          <td className="p-2 border text-center">
                            {isPaid ? (
                              <span className="px-4 py-2 rounded text-sm bg-gray-600 text-white">Paid</span>
                            ) : (
                              <div className="flex flex-col items-center gap-2">
                                <button
                                  onClick={() => handlePay(key, p.staffName || staff.name)}
                                  className="px-4 py-2 rounded text-sm bg-green-600 hover:bg-green-700 text-white"
                                >
                                  Pay
                                </button>
                                {existingCovered && (
                                  <div className="text-xs text-gray-600">
                                    Already included up to: <strong>{existingCovered}</strong>
                                  </div>
                                )}
                                {remainingRange && (
                                  <div className="text-xs text-amber-700">
                                    Will include: <strong>{remainingRange}</strong>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan="12" className="text-center text-gray-800 p-4">No staff found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {loading && (
                <div className="fixed inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm z-50">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-12 w-12 rounded-full border-4 border-gray-300 border-t-transparent animate-spin" />
                    <div className="text-base text-gray-800">Loading…</div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Advances Modal */}
          {advModal.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeAdvancesModal}>
              <div className="w-full max-w-lg rounded-lg bg-white shadow-lg" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b p-4">
                  <h3 className="text-lg font-semibold text-gray-800">Advances — {advModal.staffName}</h3>
                  <button className="text-base px-4 py-2 rounded border bg-gray-50 hover:bg-gray-100 text-gray-800" onClick={closeAdvancesModal}>Close</button>
                </div>
                <div className="max-h-[70vh] overflow-auto p-4">
                  {Array.isArray(advModal.list) && advModal.list.length > 0 ? (
                    <table className="w-full text-base">
                      <thead>
                        <tr className="text-left text-gray-800">
                          <th className="py-2">Date</th>
                          <th className="py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {advModal.list.map((a, i) => (
                          <tr key={i} className="border-t">
                            <td className="py-2">{String(a?.date ?? "")}</td>
                            <td className="py-2 text-right">{INR.format(Number(a?.amount) || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t">
                          <td className="py-2 font-semibold">Total</td>
                          <td className="py-2 text-right font-semibold">{INR.format(advModal.list.reduce((s, a) => s + (Number(a?.amount) || 0), 0))}</td>
                        </tr>
                      </tfoot>
                    </table>
                  ) : (
                    <div className="text-base text-gray-800">No advances in this range.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Owner Adjustments Modal */}
          {ownerModal.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeOwnerModal}>
              <div className="w-full max-w-lg rounded-lg bg-white shadow-lg" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b p-4">
                  <h3 className="text-lg font-semibold text-gray-800">Owner Adjustments — {ownerModal.staffName}</h3>
                  <button className="text-base px-4 py-2 rounded border bg-gray-50 hover:bg-gray-100 text-gray-800" onClick={closeOwnerModal}>Close</button>
                </div>
                <div className="max-h-[70vh] overflow-auto p-4">
                  {Array.isArray(ownerModal.list) && ownerModal.list.length > 0 ? (
                    <table className="w-full text-base">
                      <thead>
                        <tr className="text-left text-gray-800">
                          <th className="py-2">Date</th>
                          <th className="py-2">Note</th>
                          <th className="py-2 text-right">Delta</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ownerModal.list.map((h, i) => {
                          const d = h?.at ? new Date(h.at) : null;
                          const dStr = d ? d.toISOString().slice(0, 10) : "";
                          const amt = Number(h?.amount) || 0;
                          return (
                            <tr key={i} className="border-t">
                              <td className="py-2">{dStr}</td>
                              <td className="py-2">{(h?.note || "").trim()}</td>
                              <td className="py-2 text-right">{amt >= 0 ? "+" : "−"} ₹{Math.abs(amt).toLocaleString("en-IN")}</td>
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
                    <div className="text-base text-gray-800">No owner adjustments this month.</div>
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