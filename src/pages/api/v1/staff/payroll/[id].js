import { connectDB } from "@/lib/db";
import Attendance from "@/models/Attendance";
import ConfirmedAdvance from "@/models/ConfirmedAdvance";
import DailySummary from "@/models/DailySummary";
import Expense from "@/models/DailySummary";
import SalaryPayment from "@/models/SalaryPayment";
import Staff from "@/models/Staff";








// ── helpers ───────────────────────────────────────────────────────────────────
function prevMonthYear(month, year) {
  if (month === 1) return { pm: 12, py: year - 1 };
  return { pm: month - 1, py: year };
}
function startOfDayLocal(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function endOfDayLocal(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}
function addDaysLocal(d, days) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days, 0, 0, 0, 0);
}

const TZ = "Asia/Kolkata";
const ymd = (d) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);

export default async function handler(req, res) {
  await connectDB();

  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  try {
    const { id } = req.query;

    // Salary month / year (the ledger month user is paying for)
    const month = req.query.month ? Number(req.query.month) : new Date().getMonth() + 1;
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();

    // Advances filters (NOT attendance)
    const startParam = req.query.start ? new Date(req.query.start) : null; // YYYY-MM-DD
    const endParam = req.query.end ? new Date(req.query.end) : null;       // YYYY-MM-DD
    const untilParam = req.query.advanceUntil ? new Date(req.query.advanceUntil) : null;

    // ── SALARY MONTH BOUNDS ──
    const m0 = month - 1;
    const y0 = year;
    const salaryMonthStart = new Date(y0, m0, 1, 0, 0, 0, 0);
    const salaryMonthEnd = new Date(y0, m0 + 1, 0, 23, 59, 59, 999);

    // ── ATTENDANCE WINDOW = ALWAYS the selected salary month ──
    const attendanceStart = salaryMonthStart;
    const attendanceEnd = salaryMonthEnd;

    // ── ADVANCES WINDOW (decoupled from attendance) ──
    // End cutoff priority:
    // 1) explicit advanceUntil
    // 2) else explicit end
    // 3) else DEFAULT to salaryMonthEnd (NOT today)
    const advancesCutoff = untilParam ?? endParam ?? salaryMonthEnd;

    // Start:
    // 1) explicit start
    // 2) else if cutoff within salary month → salaryMonthStart
    // 3) else (including next-month advances) → day after salaryMonthEnd
    let advancesStart = startParam
      ? startOfDayLocal(startParam)
      : (advancesCutoff <= salaryMonthEnd ? new Date(salaryMonthStart) : addDaysLocal(salaryMonthEnd, 1));

    // Avoid double counting if previous month already saved a cutoff
    const { pm, py } = prevMonthYear(month, year);
    const lastPayment = await SalaryPayment.findOne({ staff: id, month: pm, year: py }).lean();
    if (lastPayment?.advanceUntil) {
      const nextDay = addDaysLocal(new Date(lastPayment.advanceUntil), 1);
      if (nextDay > advancesStart) advancesStart = nextDay;
    }

    const advancesEnd = endOfDayLocal(advancesCutoff);
    if (advancesEnd < advancesStart) {
      return res.status(400).json({ message: "Advances end date is before start date." });
    }

    // ── STAFF ──
    const staff = await Staff.findById(id);
    if (!staff) return res.status(404).json({ message: "Staff not found" });

    // ── ATTENDANCE COUNT ──
    const presentDays = await Attendance.countDocuments({
      staff: id,
      status: "Present",
      date: { $gte: attendanceStart, $lte: attendanceEnd },
    });

    // ── ADVANCES (DailySummary has string dates in IST 'YYYY-MM-DD') ──
    const startStr = ymd(advancesStart);
    const endStr = ymd(advancesEnd);

    const summaries = await DailySummary.find({
      date: { $gte: startStr, $lte: endStr },
    }).lean();

    let advancesList = [];
    let currentAdvance = 0;
    for (const day of summaries) {
      for (const casher of day.cashers || []) {
        for (const a of casher.staffAdvances || []) {
          if (String(a.staffId) === String(id)) {
            const amt = Number(a.amount) || 0;
            advancesList.push({ date: day.date, amount: amt });
            currentAdvance += amt;
          }
        }
      }
    }

    // ── COMPUTE PAYABLE ──
    const perDaySalary = (Number(staff.salary) || 0) / 30;
    const earnedSalary = perDaySalary * presentDays;

    const previousCarryForward = Number(staff.remainingAdvance) || 0;
    const totalAdvanceDue = previousCarryForward + currentAdvance;
    const payable = earnedSalary - totalAdvanceDue;

    const savedPayment = await SalaryPayment.findOne({ staff: id, month, year: y0 }).lean();

    const fmt = (d) =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone: TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d);

    // ── RESPONSE ──
    res.json({
      staffName: staff.name,
      designation: staff.designation,
      monthlySalary: staff.salary,

      // attendance & earnings
      presentDays,
      earnedSalary,

      // advances
      advances: advancesList, // [{ date:'YYYY-MM-DD', amount }]
      totalAdvanceDue,        // previous carry + advances in range
      payable,
      carryForward: previousCarryForward,

      // period + meta
      month,
      year: y0,

      // saved payment echoes
      finalPaid: savedPayment?.paidAmount || 0,
      advanceDeducted: savedPayment
        ? (Number(savedPayment.advances) || 0) + (Number(savedPayment.previousCarryForward) || 0)
        : 0,
      carryForwardSaved: savedPayment?.newCarryForward ?? previousCarryForward,

      // periods as display-friendly strings
      attendanceStart: fmt(attendanceStart),
      attendanceEnd: fmt(attendanceEnd),
      advancesStart: fmt(advancesStart),
      advancesEnd: fmt(advancesEnd),

      // raw cutoff kept for compatibility if you rely on it elsewhere
      advanceUntil: advancesEnd,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
}
