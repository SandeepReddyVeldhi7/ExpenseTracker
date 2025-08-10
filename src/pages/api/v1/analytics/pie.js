import { connectDB } from "@/lib/db";
import DailySummary from "@/models/DailySummary";
import SalaryPayment from "@/models/SalaryPayment";


// Helpers
const TZ = "Asia/Kolkata";
const ymd = (d) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const endOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

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

export default async function handler(req, res) {
  await connectDB();

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Date range: default to current month → today
    const now = new Date();
    const startParam = req.query.start ? new Date(req.query.start) : new Date(now.getFullYear(), now.getMonth(), 1);
    const endParam   = req.query.end   ? new Date(req.query.end)   : now;

    // NEW: accounting basis (default accrual)
    const basis = (req.query.basis || "accrual").toLowerCase(); // "accrual" | "cash"

    const startStr = ymd(startParam);
    const endStr   = ymd(endParam);

    // 1) Revenue + non-salary expenses from DailySummary (string date range)
    const summaries = await DailySummary.find({
      date: { $gte: startStr, $lte: endStr },
    }).lean();

    let revenue = 0;
    let otherExpenses = 0;
    for (const d of summaries) {
      revenue       += Number(d?.totalBusiness) || 0;
      otherExpenses += Number(d?.totalCashersExpensesExclTeaJuice) || 0;
      otherExpenses += Number(d?.payout) || 0;
    }

    // 2) Salary — CASH vs ACCRUAL
    let salaryPaid = 0;

    if (basis === "cash") {
      // Cash basis → paidAt within date range
      const salaries = await SalaryPayment.find({
        paidAt: { $gte: startOfDay(startParam), $lte: endOfDay(endParam) },
      }).lean();
      for (const s of salaries) salaryPaid += Number(s?.paidAmount) || 0;
    } else {
      // Accrual basis → salary month/year within the range's months
      const months = monthsInRange(startParam, endParam); // [{month, year}, ...]
      if (months.length) {
        const salaries = await SalaryPayment.find({
          $or: months.map(({ month, year }) => ({ month, year })),
        }).lean();
        for (const s of salaries) salaryPaid += Number(s?.paidAmount) || 0;
      }
    }

    const expensesTotal = otherExpenses + salaryPaid;
    const profit = revenue - expensesTotal;

    res.status(200).json({
      start: startStr,
      end: endStr,
      basis,
      revenue,
      otherExpenses,
      salaryPaid,
      expensesTotal,
      profit,
      pie: [
        { name: "Staff Salary", value: Math.max(0, salaryPaid) },
        { name: "Other Expenses", value: Math.max(0, otherExpenses) },
        { name: profit >= 0 ? "Profit" : "Loss", value: Math.abs(profit) },
      ],
    });
  } catch (err) {
    console.error("analytics/pie error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
}
