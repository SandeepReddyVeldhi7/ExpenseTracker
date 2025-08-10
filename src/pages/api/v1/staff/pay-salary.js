import { connectDB } from "@/lib/db";
import Attendance from "@/models/Attendance";
import DailySummary from "@/models/DailySummary";
import Expense from "@/models/DailySummary";
import SalaryPayment from "@/models/SalaryPayment";
import Staff from "@/models/Staff";










// ── helpers ───────────────────────────────────────────────────────────────────
function prevMonthYear(month, year) {
  if (month === 1) return { pm: 12, py: year - 1 };
  return { pm: month - 1, py: year };
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

  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  try {
    const { staffId, month, year, paidAmount, advanceUntil, remark, start, end } = req.body;

    if (!advanceUntil) {
      return res.status(400).json({ message: "Please provide 'advanceUntil'." });
    }

    const m = month ? Number(month) : new Date().getMonth() + 1;
    const y = year ? Number(year)   : new Date().getFullYear();

    const m0 = m - 1, y0 = y;
    const monthStart = new Date(y0, m0, 1, 0,0,0,0);
    const monthEnd   = new Date(y0, m0 + 1, 0, 23,59,59,999);

    const attendanceStart = start ? startOfDayLocal(new Date(start)) : monthStart;
    const attendanceEnd   = end   ? endOfDayLocal(new Date(end))     : monthEnd;
    if (attendanceEnd < attendanceStart) {
      return res.status(400).json({ message: "Attendance end is before start." });
    }

    // ── Adaptive advances window ──
    const cutoffDate = new Date(advanceUntil);
    let advancesStart = (cutoffDate <= monthEnd)
      ? new Date(monthStart)           // same-month advances
      : addDaysLocal(monthEnd, 1);     // next-month advances

    // Avoid double counting if previous salary month saved a cutoff
    const { pm, py } = prevMonthYear(m, y);
    const lastPayment = await SalaryPayment.findOne({ staff: staffId, month: pm, year: py }).lean();
    if (lastPayment?.advanceUntil) {
      const nextDay = addDaysLocal(new Date(lastPayment.advanceUntil), 1);
      if (nextDay > advancesStart) advancesStart = nextDay;
    }

    const advancesEnd = endOfDayLocal(cutoffDate);
    if (advancesEnd < advancesStart) {
      return res.status(400).json({ message: "Cutoff is before the valid advances start." });
    }

    const staff = await Staff.findById(staffId);
    if (!staff) return res.status(404).json({ message: "Staff not found" });

    const presentDays = await Attendance.countDocuments({
      staff: staffId,
      status: "Present",
      date: { $gte: attendanceStart, $lte: attendanceEnd },
    });

    // ── FIXED: fetch advances from DailySummary by STRING date range ──
    const startStr = ymd(advancesStart);
    const endStr   = ymd(advancesEnd);

    const summaries = await DailySummary.find({
      date: { $gte: startStr, $lte: endStr },
    });

    let advances = 0;
    for (const day of summaries) {
      for (const casher of (day.cashers || [])) {
        for (const a of (casher.staffAdvances || [])) {
          if (String(a.staffId) === String(staffId)) {
            advances += Number(a.amount) || 0;
          }
        }
      }
    }

    const perDaySalary = (staff.salary || 0) / 30;
    const earnedSalary = perDaySalary * presentDays;

    const previousCarryForward = staff.remainingAdvance || 0;
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
        advances, // save the computed sum
        previousCarryForward,
        totalAvailable: earnedSalary,
        payable,
        paidAmount: paid,
        newCarryForward,
        advanceUntil: advancesEnd,
        remark: remark || "",
        paidAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    staff.remainingAdvance = newCarryForward;
    staff.lastPaid = new Date();
    await staff.save();

    res.json({ message: "Salary paid successfully", payment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}
