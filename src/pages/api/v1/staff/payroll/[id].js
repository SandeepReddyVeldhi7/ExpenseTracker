// pages/api/v1/staff/payroll/[id].js
import { connectDB } from "@/lib/db";
import Attendance from "@/models/Attendance";
import DailySummary from "@/models/DailySummary";
import SalaryPayment from "@/models/SalaryPayment";
import Staff from "@/models/Staff";
import ConfirmedAdvance from "@/models/ConfirmedAdvance";

// helpers
function parseLocalYMD(ymd) {
  if (!ymd) return null;
  const m = String(ymd).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const y = Number(m[1]), mm = Number(m[2]) - 1, d = Number(m[3]);
    return new Date(y, mm, d, 0, 0, 0, 0);
  }
  const parsed = new Date(ymd);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
function startOfDayLocal(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0,0,0,0); }
function endOfDayLocal(d)   { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23,59,59,999); }
function addDaysLocal(d, days) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days, 0,0,0,0); }

const TZ = "Asia/Kolkata";
const ymd = (d) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

export default async function handler(req, res) {
  await connectDB();

  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  try {
    const { id } = req.query;

    const month = req.query.month ? Number(req.query.month) : new Date().getMonth() + 1;
    const year  = req.query.year  ? Number(req.query.year)  : new Date().getFullYear();

    // parse query params (local YMD)
    const attendanceStartParam = req.query.start ? parseLocalYMD(req.query.start) : null;
    const attendanceEndParam   = req.query.end   ? parseLocalYMD(req.query.end)   : null;
    const untilParam           = req.query.advanceUntil ? parseLocalYMD(req.query.advanceUntil) : null;

    const m0 = month - 1, y0 = year;
    const salaryMonthStart = new Date(y0, m0, 1, 0,0,0,0);
    const salaryMonthEnd   = new Date(y0, m0 + 1, 0, 23,59,59,999);

    const attendanceStart = attendanceStartParam ? startOfDayLocal(attendanceStartParam) : salaryMonthStart;
    const attendanceEnd   = attendanceEndParam   ? endOfDayLocal(attendanceEndParam)     : salaryMonthEnd;
    if (attendanceEnd < attendanceStart) return res.status(400).json({ message: "Attendance end date is before start date." });

    const advancesCutoff = untilParam ?? salaryMonthEnd;
    let advancesStart = attendanceStartParam
      ? startOfDayLocal(attendanceStartParam)
      : (advancesCutoff <= salaryMonthEnd ? new Date(salaryMonthStart) : addDaysLocal(salaryMonthEnd, 1));

    // last payment earlier than this payroll month (used to compute advancesStart)
    const lastPayment = await SalaryPayment.findOne({
      staff: id,
      $or: [{ year: { $lt: year } }, { year, month: { $lt: month } }],
    }).sort({ year: -1, month: -1 }).lean();

    if (lastPayment?.advanceUntil) {
      const nextDay = addDaysLocal(new Date(lastPayment.advanceUntil), 1);
      if (nextDay > advancesStart) advancesStart = nextDay;
    }

    const advancesEnd = endOfDayLocal(advancesCutoff);
    if (advancesEnd < advancesStart) return res.status(400).json({ message: "Advances end date is before start date." });

    const staff = await Staff.findById(id);
    if (!staff) return res.status(404).json({ message: "Staff not found" });

    const presentDays = await Attendance.countDocuments({
      staff: id,
      status: "Present",
      date: { $gte: attendanceStart, $lte: attendanceEnd },
    });

    const startStr = ymd(advancesStart);
    const endStr   = ymd(advancesEnd);
    const summaries = await DailySummary.find({ date: { $gte: startStr, $lte: endStr } }).lean();

    let advancesList = [];
    let systemAdvance = 0;
    for (const day of summaries) {
      for (const casher of day.cashers || []) {
        for (const a of casher.staffAdvances || []) {
          if (String(a.staffId) === String(id)) {
            const amt = Number(a.amount) || 0;
            advancesList.push({ date: day.date, amount: amt });
            systemAdvance += amt;
          }
        }
      }
    }

    const confirmed = await ConfirmedAdvance.findOne({ staff: id, month, year }).lean();
    const ownerAdjustment = Number(confirmed?.ownerAdjustment) || 0;

    const ownerAdjustmentHistory = Array.isArray(confirmed?.ownerAdjustmentHistory)
      ? [...confirmed.ownerAdjustmentHistory]
          .map(h => ({
            at: h?.at ? new Date(h.at) : null,
            amount: Number(h?.amount) || 0,
            note: String(h?.note || ""),
          }))
          .sort((a, b) => (a.at?.getTime?.() || 0) - (b.at?.getTime?.() || 0))
      : [];

    const advancesFinal = Math.max(0, systemAdvance + ownerAdjustment);

    const perDaySalary = (Number(staff.salary) || 0) / 30;
    const earnedSalary = perDaySalary * presentDays;
    const previousCarryForward = Number(staff.remainingAdvance) || 0;
    const totalAdvanceDue = previousCarryForward + advancesFinal;
    const payable = earnedSalary - totalAdvanceDue;

    const savedPayment = await SalaryPayment.findOne({ staff: id, month, year: y0 }).lean();

    // --- IMPORTANT: prefer request's attendance window when provided (do not override with savedPayment) ---
    const attendanceStartStr = req.query.start ? ymd(attendanceStart) : (savedPayment?.attendanceStart ?? ymd(attendanceStart));
    const attendanceEndStr   = req.query.end   ? ymd(attendanceEnd)   : (savedPayment?.attendanceEnd   ?? ymd(attendanceEnd));
    // -----------------------------------------------------------------------------------------------

    // ----------------- Find last payment up to this payroll month/year only -----------------
    const lastPaymentOverall = await SalaryPayment.findOne({
      staff: id,
      $or: [
        { year: { $lt: year } },
        { year, month: { $lte: month } },
      ],
    })
      .sort({ year: -1, month: -1, advanceUntil: -1 })
      .lean();
    // ---------------------------------------------------------------------------------------------

    let canonicalAdvanceUntilStr = null;
    if (savedPayment?.advanceUntilDate) {
      canonicalAdvanceUntilStr = savedPayment.advanceUntilDate;
    } else if (lastPaymentOverall?.advanceUntilDate) {
      canonicalAdvanceUntilStr = lastPaymentOverall.advanceUntilDate;
    } else if (lastPaymentOverall?.advanceUntil) {
      canonicalAdvanceUntilStr = lastPaymentOverall.advanceUntil ? new Date(lastPaymentOverall.advanceUntil).toISOString().slice(0,10) : null;
    } else {
      canonicalAdvanceUntilStr = null;
    }

    // --- Determine whether the saved payment actually covers the *requested* range/cutoff ---
    // requested cutoff string in YYYY-MM-DD (derived from advancesEnd)
    const requestedCutoffStr = ymd(advancesEnd); // e.g. "2025-09-15"
    let paidForRequestedRange = false;
    let paidAmountForSavedPayment = 0;

    if (savedPayment && Number(savedPayment.paidAmount || 0) > 0) {
      paidAmountForSavedPayment = Number(savedPayment.paidAmount || 0);

      // if client provided an advanceUntil (i.e. they asked to "include advances up to X")
      if (req.query.advanceUntil) {
        // use savedPayment.advanceUntilDate if present, else format savedPayment.advanceUntil
        const savedCutoffStr = savedPayment.advanceUntilDate
          ? String(savedPayment.advanceUntilDate)
          : (savedPayment.advanceUntil ? new Date(savedPayment.advanceUntil).toISOString().slice(0,10) : null);

        if (savedCutoffStr && requestedCutoffStr) {
          if (savedCutoffStr >= requestedCutoffStr) paidForRequestedRange = true;
        }
      } else {
        // No explicit advanceUntil requested: match attendance window exactly
        // Consider it paid for the requested attendance if saved payment's attendanceStart/End equal requested
        const savedAttStart = savedPayment?.attendanceStart ?? null;
        const savedAttEnd = savedPayment?.attendanceEnd ?? null;
        if (savedAttStart && savedAttEnd && savedAttStart === attendanceStartStr && savedAttEnd === attendanceEndStr) {
          paidForRequestedRange = true;
        } else {
          // fallback: if savedPayment.advanceUntilDate covers entire month requested (rare), mark paid
          const savedCutoffStr = savedPayment.advanceUntilDate
            ? String(savedPayment.advanceUntilDate)
            : (savedPayment.advanceUntil ? new Date(savedPayment.advanceUntil).toISOString().slice(0,10) : null);
          if (savedCutoffStr) {
            // if saved cutoff >= requestedCutoffStr (which is end of attendance computed), treat as covering
            if (savedCutoffStr >= requestedCutoffStr) paidForRequestedRange = true;
          }
        }
      }
    }

    // Format the advancesStart/advancesEnd for response
    const fmt = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

    res.json({
      staffName: staff.name,
      designation: staff.designation,
      monthlySalary: staff.salary,

      presentDays,
      earnedSalary,

      advances: advancesList,
      systemAdvance,
      ownerAdjustment,
      ownerAdjustmentHistory,
      advancesFinal,
      totalAdvanceDue,
      payable,
      carryForward: previousCarryForward,

      month,
      year: y0,

      // savedPayment details (if any)
      finalPaid: savedPayment?.paidAmount || 0,            // amount on saved payment (audit)
      paidForRequestedRange,                               // NEW bool: does saved payment actually cover this request?
      paidAmountForSavedPayment,                           // amount (number)
      advanceDeducted: savedPayment
        ? (Number(savedPayment.advances) || 0) + (Number(savedPayment.previousCarryForward) || 0)
        : 0,
      carryForwardSaved: savedPayment?.newCarryForward ?? previousCarryForward,

      attendanceStart: attendanceStartStr,
      attendanceEnd: attendanceEndStr,
      advancesStart: fmt(advancesStart),
      advancesEnd: fmt(advancesEnd),

      advanceCoveredUntil: canonicalAdvanceUntilStr,
      advanceUntil: canonicalAdvanceUntilStr, // backward compatibility

      // debug info
      savedPaymentId: savedPayment?._id ?? null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
}
