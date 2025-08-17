import { connectDB } from "@/lib/db";
import Attendance from "@/models/Attendance";
import DailySummary from "@/models/DailySummary";
import SalaryPayment from "@/models/SalaryPayment";
import Staff from "@/models/Staff";
import ConfirmedAdvance from "@/models/ConfirmedAdvance";

// helpers identical to your current file
function prevMonthYear(month, year) { if (month === 1) return { pm: 12, py: year - 1 }; return { pm: month - 1, py: year }; }
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

    const attendanceStartParam = req.query.start ? new Date(req.query.start) : null;
    const attendanceEndParam   = req.query.end   ? new Date(req.query.end)   : null;
    const untilParam           = req.query.advanceUntil ? new Date(req.query.advanceUntil) : null;

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

    // NEW: owner adjustment history (sorted)
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

    const fmt = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

    res.json({
      staffName: staff.name,
      designation: staff.designation,
      monthlySalary: staff.salary,

      presentDays,
      earnedSalary,

      advances: advancesList,            // system itemized
      systemAdvance,
      ownerAdjustment,                   // cumulative total
      ownerAdjustmentHistory,            // NEW: details
      advancesFinal,
      totalAdvanceDue,
      payable,
      carryForward: previousCarryForward,

      month,
      year: y0,

      finalPaid: savedPayment?.paidAmount || 0,
      advanceDeducted: savedPayment
        ? (Number(savedPayment.advances) || 0) + (Number(savedPayment.previousCarryForward) || 0)
        : 0,
      carryForwardSaved: savedPayment?.newCarryForward ?? previousCarryForward,

      attendanceStart: fmt(attendanceStart),
      attendanceEnd: fmt(attendanceEnd),
      advancesStart: fmt(advancesStart),
      advancesEnd: fmt(advancesEnd),
      advanceUntil: advancesEnd,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
}
