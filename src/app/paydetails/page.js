"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

export default function PayDetailsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [staffList, setStaffList] = useState([]);
  const [payrollData, setPayrollData] = useState({}); // map: staffIdString -> payroll
  const [payAmounts, setPayAmounts] = useState({});
  const [paidStatus, setPaidStatus] = useState({}); // map: staffIdString -> boolean
  const [loading, setLoading] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [advanceUntil, setAdvanceUntil] = useState("");
  const [activeFilters, setActiveFilters] = useState({ start: null, end: null, until: null });

  const loadAbortRef = useRef(null);
  const applyDebounceRef = useRef(null);

  // Modals for advances and owner-adjustments
  const [advModal, setAdvModal] = useState({ open: false, staffName: "", list: [] });
  const [ownerModal, setOwnerModal] = useState({ open: false, staffName: "", list: [] });

  // currency formatter
  const INR = useMemo(() => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }), []);

  // ---------- tooltip / modal helpers ----------
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
      }
    }
    if (advModal.open || ownerModal.open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advModal.open, ownerModal.open]);

  // ---------- loader (concurrency + robust normalization) ----------
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

          // Prefer explicit server flag that indicates the saved payment covers the requested range
          let isPaid = Boolean(payload?.paidForRequestedRange);

          // Fallback heuristics if server did not include the flag:
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

          // presentDays normalization
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

  // ---------- filters ----------
  const applyFilters = () => {
    const start = customStartDate || null;
    const end = customEndDate || null;
    const until = advanceUntil || null;

    // Require all three fields to be set
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
  };

  // ---------- pay handler ----------
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

  // helpers
  const handlePayAmountChange = (staffId, value) => {
    const key = String(staffId);
    setPayAmounts((prev) => ({ ...prev, [key]: value }));
  };
  const handleSelectThisMonth = () => {
    const now = new Date();
    setSelectedMonth(now.getMonth() + 1);
    setSelectedYear(now.getFullYear());
    // Don't load data here; wait for user to apply filters
  };

  const isUnauthed = status === "unauthenticated";
  const isNotOwner = status === "authenticated" && session?.user?.role !== "owner";

  const representativePayroll = (() => {
    if (!staffList || staffList.length === 0) return null;
    const firstId = staffList[0]._id;
    return payrollData[String(firstId)] || null;
  })();

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "owner") {
      router.push("/no-permission");
    }
  }, [status, session, router]);

  // Removed the useEffect that automatically loads data on status change
  // Removed the useEffect that reloads data on selectedMonth/selectedYear change

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

  // renderPayrollMonthCell & computeRemainingRange
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
      <td className="p-2 border text-black align-top">
        <div className="font-medium">{monthLabel}</div>

        {attendanceStart && attendanceEnd && (
          <div className="text-[11px] text-black mt-0.5">
            Attendance: <span className="font-medium text-black">{attendanceStart}</span> → <span className="font-medium text-black">{attendanceEnd}</span>
          </div>
        )}

        {advancesStart && advancesEnd && (
          <div className="text-[11px] text-black">
            Advances: <span className="font-medium text-black">{advancesStart}</span> → <span className="font-medium text-black">{advancesEnd}</span>
          </div>
        )}

        {advanceCoveredUntil && (
          <div className="text-[11px] text-amber-700 mt-0.5">
            Already included up to: <strong>{advanceCoveredUntil}</strong>
          </div>
        )}
      </td>
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

  // UI render
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

          {/* Controls */}
          <div className="flex flex-col gap-3 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={handleSelectThisMonth} className="px-4 py-2 bg-[#fa3e5e] text-black rounded text-sm">This Month</button>
              <span className="px-2 py-1 rounded bg-gray-200 text-black text-sm">
                {`${new Date(selectedYear, (selectedMonth || 1) - 1).toLocaleString("default", { month: "long" })} ${selectedYear}`}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end gap-2">
              <div className="flex items-center gap-2">
                <label className="text-sm text-black font-medium">Attendance start:</label>
                <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="border p-1 text-black rounded text-sm" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-black font-medium">Attendance end:</label>
                <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="border p-1 text-black rounded text-sm" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-black font-medium">Include advances up to:</label>
                <input type="date" value={advanceUntil} onChange={(e) => setAdvanceUntil(e.target.value)} className="border p-1 text-black rounded text-sm" />
              </div>
              <div className="flex items-center gap-2">
                <button onClick={applyFilters} className="px-4 py-2 bg-blue-600 text-white rounded text-sm">Apply filters</button>
                <button onClick={clearFilters} className="px-4 py-2 bg-gray-500 text-white rounded text-sm">Clear</button>
              </div>
            </div>
          </div>

          {/* Conditional rendering based on active filters */}
          {!activeFilters.start || !activeFilters.end || !activeFilters.until ? (
            <p className="text-center text-black mt-10">Please select Attendance Start, Attendance End, and Include Advances Up To dates, then click Apply Filters.</p>
          ) : (
            <>
              <div className="mb-3">
                <h2 className="text-sm text-black sm:text-base font-semibold">
                  Attendance period:&nbsp;
                  {representativePayroll?.attendanceStart && representativePayroll?.attendanceEnd ? `${representativePayroll.attendanceStart} → ${representativePayroll.attendanceEnd}` : "—"}
                </h2>
                <h2 className="text-sm text-black sm:text-base font-semibold">
                  Advances included:&nbsp;
                  {representativePayroll?.advancesStart ? `${representativePayroll.advancesStart} → ${representativePayroll.advancesEnd}` : "—"}
                </h2>
              </div>

              <h2 className="text-sm text-black sm:text-base mb-3 font-semibold">
                Showing Salary for: {headerLabel} {activeFilters.until ? `(Advances until: ${activeFilters.until})` : ""}
              </h2>

              <div className="relative w-full overflow-x-auto border rounded-lg shadow-sm">
                <table className="w-full border-collapse border text-xs sm:text-sm">
                  <thead className="bg-gray-300 text-black">
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
                          <td className="p-2 border text-black text-center">{idx + 1}</td>
                          <td className="p-2 border text-black">{p.staffName || staff.name}</td>

                          {renderPayrollMonthCell(p)}

                          <td className="p-2 border text-black text-center">{presentDays}</td>

                          <td className="p-2 border text-black text-right">₹ {earned.toLocaleString("en-IN")}</td>
                          <td className="p-2 border text-black text-right">₹ {prev.toLocaleString("en-IN")}</td>

                          <td className="p-2 border text-black text-right whitespace-nowrap">
                            ₹ {systemAdv.toLocaleString("en-IN")}
                            <button
                              type="button"
                              className="ml-1 text-xs opacity-70 align-middle cursor-pointer underline decoration-dotted"
                              title={advancesTooltip(p?.advances)}
                              onClick={() => openAdvancesModal(p?.staffName || staff.name, p?.advances)}
                              aria-label="Show advances details"
                            >
                              ⓘ
                            </button>
                          </td>

                          <td className="p-2 border text-black text-right whitespace-nowrap">
                            {ownerAdj >= 0 ? "+" : "−"} ₹ {Math.abs(ownerAdj).toLocaleString("en-IN")}
                            <button
                              type="button"
                              className="ml-1 text-xs opacity-70 align-middle cursor-pointer underline decoration-dotted"
                              title={ownerAdjTooltip(p?.ownerAdjustmentHistory)}
                              onClick={() => openOwnerModal(p?.staffName || staff.name, p?.ownerAdjustmentHistory)}
                              aria-label="Show owner adjustments details"
                            >
                              ⓘ
                            </button>
                          </td>

                          <td className="p-2 border text-black text-right">₹ {finalAdv.toLocaleString("en-IN")}</td>

                          <td className="p-2 border text-black text-right">₹ {payableNow.toLocaleString("en-IN")}</td>

                          <td className="p-2 border text-black text-center">
                            <input type="number" min="0" value={payAmounts[key] !== undefined && payAmounts[key] !== null ? payAmounts[key] : payableNow} onChange={(e) => handlePayAmountChange(key, e.target.value)} className="border p-1 w-24 text-right rounded text-xs" disabled={isPaid} />
                          </td>

                          <td className="p-2 border text-center">
                            {isPaid ? (
                              <span className="px-3 py-1 rounded text-xs bg-gray-600 text-white cursor-default">Paid</span>
                            ) : (
                              <div className="flex flex-col items-center gap-2">
                                <button onClick={() => handlePay(key, p.staffName || staff.name)} className="px-3 py-1 rounded text-xs bg-green-600 hover:bg-green-700 text-white">Pay</button>
                                {existingCovered && <div className="text-[11px] text-black mt-1">Already included up to: <strong>{existingCovered}</strong></div>}
                                {remainingRange && <div className="text-[11px] text-amber-700 mt-0.5">Will include: <strong>{remainingRange}</strong></div>}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan="12" className="text-center text-black p-4">No staff found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-10 w-10 rounded-full border-4 border-gray-300 border-t-transparent animate-spin" />
                      <div className="text-sm text-black">Loading…</div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Advances modal */}
          {advModal.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closeAdvancesModal}>
              <div className="w-full max-w-md rounded bg-white shadow-md" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="adv-modal-title">
                <div className="flex items-center justify-between border-b p-3">
                  <h3 id="adv-modal-title" className="font-semibold">Advances — {advModal.staffName}</h3>
                  <button className="text-sm px-2 py-1 rounded border bg-gray-50 hover:bg-gray-100" onClick={closeAdvancesModal}>Close</button>
                </div>
                <div className="max-h-80 overflow-auto p-3">
                  {Array.isArray(advModal.list) && advModal.list.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-black">
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
                          <td className="py-2 text-right font-semibold">{INR.format(advModal.list.reduce((s, a) => s + (Number(a?.amount) || 0), 0))}</td>
                        </tr>
                      </tfoot>
                    </table>
                  ) : (
                    <div className="text-sm text-black">No advances in this range.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Owner adjustments modal */}
          {ownerModal.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closeOwnerModal}>
              <div className="w-full max-w-md rounded bg-white shadow-md" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="owner-modal-title">
                <div className="flex items-center justify-between border-b p-3">
                  <h3 id="owner-modal-title" className="font-semibold">Owner Adjustments — {ownerModal.staffName}</h3>
                  <button className="text-sm px-2 py-1 rounded border bg-gray-50 hover:bg-gray-100 text-black" onClick={closeOwnerModal}>Close</button>
                </div>
                <div className="max-h-80 overflow-auto p-3">
                  {Array.isArray(ownerModal.list) && ownerModal.list.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-black">
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
                              <td className="py-1 text-right">{amt >= 0 ? "+" : "−"} ₹{Math.abs(amt).toLocaleString("en-IN")}</td>
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
                    <div className="text-sm text-black">No owner adjustments this month.</div>
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