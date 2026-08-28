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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-28">
      <Toaster position="top-right" />
      {isUnauthed ? (
        <p className="text-center text-lg font-bold text-black mt-10">You must be logged in.</p>
      ) : isNotOwner ? (
        <p className="text-center text-lg font-bold text-black mt-10">Redirecting…</p>
      ) : (
        <div className="neo-card p-6 sm:p-8 bg-white mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-6 border-b-2 border-black">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
                Staff Payroll Ledger
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-gray-600">
                Attendance days, earned salary, advance deductions & live payroll disbursement
              </p>
            </div>

            <button
              onClick={() => setFilterModalOpen(true)}
              className="py-2 px-4 neo-btn neo-btn-primary text-xs font-black self-start sm:self-auto"
            >
              📅 Set Date Filters
            </button>
          </div>

          {/* Filter Modal */}
          {filterModalOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4"
              onClick={() => setFilterModalOpen(false)}
            >
              <div
                className="w-full max-w-md bg-white border-[3px] border-black rounded-2xl shadow-[8px_8px_0px_0px_#000] p-6 relative"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center border-b-2 border-black pb-3 mb-4">
                  <h3 className="text-lg font-black text-black">Filter Payroll Date Range</h3>
                  <button
                    onClick={() => setFilterModalOpen(false)}
                    className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center hover:bg-gray-100 font-black cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex flex-col gap-3.5">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                      Attendance Start:
                    </label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="neo-input text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                      Attendance End:
                    </label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="neo-input text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                      Include Advances Up To:
                    </label>
                    <input
                      type="date"
                      value={advanceUntil}
                      onChange={(e) => setAdvanceUntil(e.target.value)}
                      className="neo-input text-xs font-bold"
                    />
                  </div>
                  <div className="flex gap-2 pt-2 border-t-2 border-black mt-2">
                    <button
                      onClick={applyFilters}
                      className="flex-1 py-2.5 neo-btn neo-btn-primary text-xs font-black"
                    >
                      Apply Filter
                    </button>
                    <button
                      onClick={clearFilters}
                      className="flex-1 py-2.5 neo-btn neo-btn-secondary text-xs font-black"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Conditional rendering */}
          {!activeFilters.start || !activeFilters.end || !activeFilters.until ? (
            <div className="text-center py-12 p-6 rounded-xl border-2 border-dashed border-black bg-[#F4F4F0]">
              <p className="text-base font-black text-black mb-3">
                Please configure the date filter range to view live payroll ledger.
              </p>
              <button
                onClick={() => setFilterModalOpen(true)}
                className="py-2.5 px-5 neo-btn neo-btn-primary text-xs font-black"
              >
                Set Date Range Filters
              </button>
            </div>
          ) : (
            <>
              <div className="p-4 rounded-xl border-2 border-black bg-[#F4F4F0] mb-6 flex flex-wrap justify-between items-center gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-gray-700">
                    Attendance: <span className="font-black text-black">{representativePayroll?.attendanceStart || "—"} → {representativePayroll?.attendanceEnd || "—"}</span>
                  </div>
                  <div className="text-xs font-bold text-gray-700">
                    Advances Included: <span className="font-black text-black">{representativePayroll?.advancesStart || "—"} → {representativePayroll?.advancesEnd || "—"}</span>
                  </div>
                </div>

                <span className="neo-badge bg-[#D4FF00] text-black">
                  Period: {headerLabel}
                </span>
              </div>

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
                    <div key={key} className="p-4 rounded-xl border-2 border-black bg-white shadow-[3px_3px_0px_0px_#000] space-y-2.5">
                      <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                        <h3 className="text-base font-black text-black">{p.staffName || staff.name}</h3>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#F4F4F0] border border-black">#{idx + 1}</span>
                      </div>
                      <div className="space-y-1.5 text-xs font-bold text-gray-800">
                        <div>Attendance: <span className="font-mono font-black text-black">{presentDays} days</span></div>
                        <div>Earned Salary: <span className="font-mono font-black text-black">₹{earned.toLocaleString("en-IN")}</span></div>
                        <div>Prev. Carry Forward: <span className="font-mono font-black text-black">₹{prev.toLocaleString("en-IN")}</span></div>
                        <div className="flex items-center justify-between">
                          <span>System Advances: <span className="font-mono font-black text-black">₹{systemAdv.toLocaleString("en-IN")}</span></span>
                          <button
                            type="button"
                            className="px-2 py-0.5 text-[10px] neo-btn neo-btn-cyan font-black"
                            onClick={() => openAdvancesModal(p?.staffName || staff.name, p?.advances)}
                          >
                            Details
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Owner Adjustment: <span className="font-mono font-black text-black">{ownerAdj >= 0 ? "+" : "−"}₹{Math.abs(ownerAdj).toLocaleString("en-IN")}</span></span>
                          <button
                            type="button"
                            className="px-2 py-0.5 text-[10px] neo-btn neo-btn-secondary font-black"
                            onClick={() => openOwnerModal(p?.staffName || staff.name, p?.ownerAdjustmentHistory)}
                          >
                            Details
                          </button>
                        </div>
                        <div>Final Advances: <span className="font-mono font-black text-black">₹{finalAdv.toLocaleString("en-IN")}</span></div>
                        <div className="p-2 rounded-lg bg-[#D4FF00] border border-black flex justify-between">
                          <span className="font-black text-black">Net Payable:</span>
                          <span className="font-mono font-black text-black">₹{payableNow.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="pt-2">
                          <label className="block text-[11px] font-black uppercase text-black mb-1">Pay Amount</label>
                          <input
                            type="number"
                            min="0"
                            value={payAmounts[key] !== undefined && payAmounts[key] !== null ? payAmounts[key] : payableNow}
                            onChange={(e) => handlePayAmountChange(key, e.target.value)}
                            className="neo-input text-xs font-mono font-bold"
                            disabled={isPaid}
                          />
                        </div>
                        <div className="pt-2">
                          {isPaid ? (
                            <span className="w-full block py-2 rounded-xl border-2 border-black bg-gray-200 text-gray-700 text-center font-black text-xs">
                              Paid
                            </span>
                          ) : (
                            <button
                              onClick={() => handlePay(key, p.staffName || staff.name)}
                              className="w-full py-2.5 neo-btn neo-btn-primary text-xs font-black"
                            >
                              Disburse Payment
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <p className="text-center text-sm font-bold text-gray-500 p-4">No staff found.</p>
                )}
              </div>

              {/* Desktop Table Layout */}
              <div className="hidden sm:block relative w-full overflow-x-auto table-scrollbar border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#000]">
                <table className="w-full border-collapse text-xs">
                  <thead className="bg-[#F4F4F0] border-b-2 border-black font-black uppercase text-black">
                    <tr>
                      <th className="p-3 border-r border-black text-center">S.No</th>
                      <th className="p-3 border-r border-black text-left">Staff Name</th>
                      <th className="p-3 border-r border-black text-left">Period</th>
                      <th className="p-3 border-r border-black text-center">Present</th>
                      <th className="p-3 border-r border-black text-right">Earned</th>
                      <th className="p-3 border-r border-black text-right">Prev Carry</th>
                      <th className="p-3 border-r border-black text-right">Advances</th>
                      <th className="p-3 border-r border-black text-right">Adjustment</th>
                      <th className="p-3 border-r border-black text-right">Final Adv</th>
                      <th className="p-3 border-r border-black text-right">Net Payable</th>
                      <th className="p-3 border-r border-black text-center">Disburse Amount</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 font-bold">
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
                        <tr key={key} className="hover:bg-gray-50 transition">
                          <td className="p-3 border-r border-gray-200 text-center font-mono">{idx + 1}</td>
                          <td className="p-3 border-r border-gray-200 font-black text-black">{p.staffName || staff.name}</td>
                          <td className="p-3 border-r border-gray-200 text-gray-700">{renderPayrollMonthCell(p)}</td>
                          <td className="p-3 border-r border-gray-200 text-center font-mono">{presentDays}</td>
                          <td className="p-3 border-r border-gray-200 text-right font-mono text-black">₹{earned.toLocaleString("en-IN")}</td>
                          <td className="p-3 border-r border-gray-200 text-right font-mono text-black">₹{prev.toLocaleString("en-IN")}</td>
                          <td className="p-3 border-r border-gray-200 text-right font-mono whitespace-nowrap">
                            ₹{systemAdv.toLocaleString("en-IN")}
                            <button
                              type="button"
                              className="ml-1 text-xs text-blue-600 font-black"
                              title={advancesTooltip(p?.advances)}
                              onClick={() => openAdvancesModal(p?.staffName || staff.name, p?.advances)}
                            >
                              ⓘ
                            </button>
                          </td>
                          <td className="p-3 border-r border-gray-200 text-right font-mono whitespace-nowrap">
                            {ownerAdj >= 0 ? "+" : "−"}₹{Math.abs(ownerAdj).toLocaleString("en-IN")}
                            <button
                              type="button"
                              className="ml-1 text-xs text-blue-600 font-black"
                              title={ownerAdjTooltip(p?.ownerAdjustmentHistory)}
                              onClick={() => openOwnerModal(p?.staffName || staff.name, p?.ownerAdjustmentHistory)}
                            >
                              ⓘ
                            </button>
                          </td>
                          <td className="p-3 border-r border-gray-200 text-right font-mono text-black">₹{finalAdv.toLocaleString("en-IN")}</td>
                          <td className="p-3 border-r border-gray-200 text-right font-mono font-black text-emerald-800">₹{payableNow.toLocaleString("en-IN")}</td>
                          <td className="p-3 border-r border-gray-200 text-center">
                            <input
                              type="number"
                              min="0"
                              value={payAmounts[key] !== undefined && payAmounts[key] !== null ? payAmounts[key] : payableNow}
                              onChange={(e) => handlePayAmountChange(key, e.target.value)}
                              className="neo-input text-xs w-28 text-right py-1 font-mono font-bold"
                              disabled={isPaid}
                            />
                          </td>
                          <td className="p-3 text-center">
                            {isPaid ? (
                              <span className="px-3 py-1 rounded-full text-xs font-black border border-black bg-gray-200 text-gray-700">
                                Paid
                              </span>
                            ) : (
                              <button
                                onClick={() => handlePay(key, p.staffName || staff.name)}
                                className="px-3 py-1 neo-btn neo-btn-primary text-xs font-black"
                              >
                                Pay
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan="12" className="text-center text-gray-500 font-bold p-6">No staff found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {loading && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs z-50">
                  <div className="p-6 rounded-2xl border-[3px] border-black bg-white shadow-[6px_6px_0px_0px_#000] flex flex-col items-center gap-3">
                    <div className="h-10 w-10 rounded-full border-4 border-black border-t-transparent animate-spin" />
                    <div className="text-xs font-black uppercase text-black">Calculating Payroll Ledger…</div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Advances Modal */}
          {advModal.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4" onClick={closeAdvancesModal}>
              <div className="w-full max-w-lg rounded-2xl bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_#000] p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
                  <h3 className="text-base font-black text-black">Advances Record — {advModal.staffName}</h3>
                  <button className="py-1 px-3 rounded-lg border border-black neo-btn neo-btn-secondary text-xs font-black" onClick={closeAdvancesModal}>Close</button>
                </div>
                <div className="max-h-[60vh] overflow-auto table-scrollbar border border-black rounded-lg">
                  {Array.isArray(advModal.list) && advModal.list.length > 0 ? (
                    <table className="w-full text-xs font-bold">
                      <thead className="bg-[#F4F4F0] border-b border-black">
                        <tr className="text-left text-black">
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {advModal.list.map((a, i) => (
                          <tr key={i}>
                            <td className="p-2.5">{String(a?.date ?? "")}</td>
                            <td className="p-2.5 text-right font-mono font-bold">{INR.format(Number(a?.amount) || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-black bg-[#D4FF00] font-black">
                          <td className="p-2.5">Total Advances</td>
                          <td className="p-2.5 text-right font-mono">{INR.format(advModal.list.reduce((s, a) => s + (Number(a?.amount) || 0), 0))}</td>
                        </tr>
                      </tfoot>
                    </table>
                  ) : (
                    <div className="text-xs font-bold text-gray-500 p-4">No advances in this range.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Owner Adjustments Modal */}
          {ownerModal.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4" onClick={closeOwnerModal}>
              <div className="w-full max-w-lg rounded-2xl bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_#000] p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
                  <h3 className="text-base font-black text-black">Owner Adjustments — {ownerModal.staffName}</h3>
                  <button className="py-1 px-3 rounded-lg border border-black neo-btn neo-btn-secondary text-xs font-black" onClick={closeOwnerModal}>Close</button>
                </div>
                <div className="max-h-[60vh] overflow-auto table-scrollbar border border-black rounded-lg">
                  {Array.isArray(ownerModal.list) && ownerModal.list.length > 0 ? (
                    <table className="w-full text-xs font-bold">
                      <thead className="bg-[#F4F4F0] border-b border-black">
                        <tr className="text-left text-black">
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">Note</th>
                          <th className="p-2.5 text-right">Adjustment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {ownerModal.list.map((h, i) => {
                          const d = h?.at ? new Date(h.at) : null;
                          const dStr = d ? d.toISOString().slice(0, 10) : "";
                          const amt = Number(h?.amount) || 0;
                          return (
                            <tr key={i}>
                              <td className="p-2.5">{dStr}</td>
                              <td className="p-2.5">{(h?.note || "").trim()}</td>
                              <td className="p-2.5 text-right font-mono font-bold">{amt >= 0 ? "+" : "−"}₹{Math.abs(amt).toLocaleString("en-IN")}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-black bg-[#D4FF00] font-black">
                          <td className="p-2.5" colSpan={2}>Net Owner Adjustment</td>
                          <td className="p-2.5 text-right font-mono">
                            {(() => {
                              const total = ownerModal.list.reduce((s, h) => s + (Number(h?.amount) || 0), 0);
                              return `${total >= 0 ? "+" : "−"}₹${Math.abs(total).toLocaleString("en-IN")}`;
                            })()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  ) : (
                    <div className="text-xs font-bold text-gray-500 p-4">No owner adjustments this month.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

}