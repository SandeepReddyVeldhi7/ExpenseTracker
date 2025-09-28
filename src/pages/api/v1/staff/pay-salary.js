// pages/api/v1/staff/pay-salary.js
import { connectDB } from "@/lib/db";
import Attendance from "@/models/Attendance";
import DailySummary from "@/models/DailySummary";
import SalaryPayment from "@/models/SalaryPayment";
import Staff from "@/models/Staff";
import ConfirmedAdvance from "@/models/ConfirmedAdvance";

// ── helpers ───────────────────────────────────────────────────────────────────
// parse "YYYY-MM-DD" as a LOCAL date (midnight local of that day)
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
const fmt = (d) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

export default async function handler(req, res) {
  await connectDB();

  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  try {
    const { staffId, month, year, paidAmount, advanceUntil, remark, start, end } = req.body;

    if (!advanceUntil) return res.status(400).json({ message: "Please provide 'advanceUntil'." });

    const m = month ? Number(month) : new Date().getMonth() + 1;
    const y = year  ? Number(year)  : new Date().getFullYear();

    const m0 = m - 1, y0 = y;
    const monthStart = new Date(y0, m0, 1, 0,0,0,0);
    const monthEnd   = new Date(y0, m0 + 1, 0, 23,59,59,999);

    // Attendance window (use provided start/end if present)
    const attendanceStart = start ? startOfDayLocal(new Date(start)) : monthStart;
    const attendanceEnd   = end   ? endOfDayLocal(new Date(end))     : monthEnd;
    if (attendanceEnd < attendanceStart) return res.status(400).json({ message: "Attendance end is before start." });

    // Parse advanceUntil as local date (avoid timezone drift)
    const cutoffDateLocal = parseLocalYMD(advanceUntil);
    if (!cutoffDateLocal) return res.status(400).json({ message: "Invalid 'advanceUntil' format. Use YYYY-MM-DD." });

    // Advances window: from attendanceStart (if provided) → cutoffDateLocal
    let advancesStart = start ? startOfDayLocal(new Date(start)) : (cutoffDateLocal <= monthEnd ? new Date(monthStart) : addDaysLocal(monthEnd, 1));

    const lastPayment = await SalaryPayment.findOne({
      staff: staffId,
      $or: [{ year: { $lt: y } }, { year: y, month: { $lt: m } }],
    }).sort({ year: -1, month: -1 }).lean();

    if (lastPayment?.advanceUntil) {
      const nextDay = addDaysLocal(new Date(lastPayment.advanceUntil), 1);
      if (nextDay > advancesStart) advancesStart = nextDay;
    }

    const advancesEnd = endOfDayLocal(cutoffDateLocal);
    if (advancesEnd < advancesStart) return res.status(400).json({ message: "Cutoff is before the valid advances start." });

    const staff = await Staff.findById(staffId);
    if (!staff) return res.status(404).json({ message: "Staff not found" });

    const presentDays = await Attendance.countDocuments({
      staff: staffId,
      status: "Present",
      date: { $gte: attendanceStart, $lte: attendanceEnd },
    });

    // System advances between start..advanceUntil (DailySummary)
    const ymd = d => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
    const startStr = ymd(advancesStart);
    const endStr   = ymd(advancesEnd);
    const summaries = await DailySummary.find({ date: { $gte: startStr, $lte: endStr } });

    let systemAdvance = 0;
    for (const day of summaries) {
      for (const casher of (day.cashers || [])) {
        for (const a of (casher.staffAdvances || [])) {
          if (String(a.staffId) === String(staffId)) {
            systemAdvance += Number(a.amount) || 0;
          }
        }
      }
    }

    // Owner adjustment
    const confirmed = await ConfirmedAdvance.findOne({ staff: staffId, month: m, year: y }).lean();
    const ownerAdjustment = Number(confirmed?.ownerAdjustment) || 0;

    const advances = Math.max(0, systemAdvance + ownerAdjustment);

    const perDaySalary = (staff.salary || 0) / 30;
    const earnedSalary = perDaySalary * presentDays;

    const previousCarryForward = Number(staff.remainingAdvance) || 0;
    const payable = earnedSalary - (previousCarryForward + advances);
    const paid = Math.max(0, Number(paidAmount) || 0);

    const newCarryForward = previousCarryForward + advances - earnedSalary + paid;

    const payment = await SalaryPayment.findOneAndUpdate(
      { staff: staffId, month: m, year: y0 },
      {
        staff: staffId,
        month: m,
        year: y0,
        presentDays,
        earnedSalary,
        advances, // includes owner's adjustment
        previousCarryForward,
        totalAvailable: earnedSalary,
        payable,
        paidAmount: paid,
        newCarryForward,
        advanceUntil: advancesEnd,
        advanceUntilDate: fmt(cutoffDateLocal), // canonical local date string
        // Persist attendance window for audit / canonical reference:
        attendanceStart: fmt(attendanceStart),
        attendanceEnd:   fmt(attendanceEnd),
        remark: remark || "",
        paidAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    staff.remainingAdvance = newCarryForward;
    staff.lastPaid = new Date();
    await staff.save();

    const paymentObj = payment.toObject ? payment.toObject() : payment;
    paymentObj.paid = (Number(paymentObj.paidAmount || 0) > 0);
    paymentObj.advanceCoveredUntil = paymentObj.advanceUntilDate || (paymentObj.advanceUntil ? new Date(paymentObj.advanceUntil).toISOString().slice(0,10) : null);

    res.json({ message: "Salary paid successfully", payment: paymentObj });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}
