// /api/v1/analytics/pie
import { connectDB } from "@/lib/db";
import DailySummary from "@/models/DailySummary";
import SalaryPayment from "@/models/SalaryPayment";

const TZ = "Asia/Kolkata";
const ymd = (d) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const endOfDay   = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

function monthsInRange(start, end) {
  const out = [];
  const d = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (d <= last) {
    out.push({ month: d.getMonth() + 1, year: d.getFullYear() });
    d.setMonth(d.getMonth() + 1);
  }
  return out;
}

const clamp2 = (n) => (Number.isFinite(n) ? Math.round(n * 100) / 100 : 0);

export default async function handler(req, res) {
  await connectDB();

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // ---- Inputs (defaults: this month → today) ----
    const now = new Date();
    const startParam = req.query.start ? new Date(req.query.start) : new Date(now.getFullYear(), now.getMonth(), 1);
    const endParam   = req.query.end   ? new Date(req.query.end)   : now;
    const basis      = (req.query.basis || "accrual").toLowerCase(); // "accrual" | "cash"

    const startStr = ymd(startParam);
    const endStr   = ymd(endParam);

    // ---- 1) Pull summaries for string date range ----
    const summaries = await DailySummary.find({
      date: { $gte: startStr, $lte: endStr },
    }).lean();

    // Revenue ONLY from cashers sale; profit from payout
    let revenue = 0;
    let profit  = 0;
    let totalCashersExpenses = 0; // breakdown component

    for (const s of summaries) {
      revenue += Number(s?.totalCashersSale) || 0;                     // ✅ ignore drinks
      profit  += Number(s?.payout) || 0;                                // ✅ daily profit
      totalCashersExpenses += Number(s?.totalCashersExpensesExclTeaJuice) || 0; // for breakdown
    }

    // ---- 2) Salary based on basis ----
    let salaryPaid = 0;
    if (basis === "cash") {
      const salaries = await SalaryPayment.find({
        paidAt: { $gte: startOfDay(startParam), $lte: endOfDay(endParam) },
      }).lean();
      for (const p of salaries) salaryPaid += Number(p?.paidAmount) || 0;
    } else {
      const months = monthsInRange(startParam, endParam);
      if (months.length) {
        const salaries = await SalaryPayment.find({
          $or: months.map(({ month, year }) => ({ month, year })),
        }).lean();
        for (const p of salaries) salaryPaid += Number(p?.paidAmount) || 0;
      }
    }

    // ---- 3) Derived Other Expenses so that: Revenue = Salary + Other + Profit ----
    let otherExpenses = revenue - salaryPaid - profit;

    // ---- 4) Breakdown of Other ----
    // Fit Cashers Expenses into "Other" (don’t let it exceed), rest becomes Adjustments.
    const cashersPortion = Math.max(0, Math.min(otherExpenses, totalCashersExpenses));
    const adjustments    = Math.max(0, otherExpenses - cashersPortion);

    // Round/clamp to 2 decimals
    revenue             = clamp2(revenue);
    salaryPaid          = clamp2(salaryPaid);
    profit              = clamp2(profit);
    otherExpenses       = clamp2(otherExpenses);
    const cashersClean  = clamp2(cashersPortion);
    const adjustClean   = clamp2(adjustments);
    const expensesTotal = clamp2(salaryPaid + otherExpenses);

    const otherBreakdown = [
      { name: "Cashers Expenses (Excl Tea/Juice)", value: cashersClean },
      { name: "Adjustments", value: adjustClean },
    ];

    const pie = [
      { name: "Staff Salary", value: salaryPaid },
      { name: "Other Expenses", value: otherExpenses },
      { name: profit >= 0 ? "Profit" : "Loss", value: Math.abs(profit) },
    ];

    return res.status(200).json({
      start: startStr,
      end: endStr,
      basis,
      revenue,
      salaryPaid,
      profit,
      expensesTotal,
      otherExpenses,
      otherBreakdown, // <-- NEW
      pie,
    });
  } catch (err) {
    console.error("analytics/pie error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
}
