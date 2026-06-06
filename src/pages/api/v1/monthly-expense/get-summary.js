import { connectDB } from "@/lib/db";
import DailySummary from "@/models/DailySummary";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Only GET allowed" });
  }

  try {
    await connectDB();

    const { monthYear } = req.query; // format: YYYY-MM (e.g., 2026-06)
    if (!monthYear || !/^\d{4}-\d{2}$/.test(monthYear)) {
      return res.status(400).json({ message: "Invalid or missing monthYear query parameter" });
    }

    // Find all daily summaries for that month
    const summaries = await DailySummary.find({
      date: { $regex: new RegExp(`^${monthYear}`) }
    }).lean();

    let totalSales = 0;
    let totalPayout = 0;
    let totalOnline = 0;

    summaries.forEach((s) => {
      totalSales += parseFloat(s.totalCashersSale) || 0;
      totalPayout += parseFloat(s.payout) || 0;

      if (s.cashers && Array.isArray(s.cashers)) {
        s.cashers.forEach((c) => {
          if (c.addons && Array.isArray(c.addons)) {
            c.addons.forEach((a) => {
              if (a.name && a.name.toLowerCase() === "online") {
                totalOnline += parseFloat(a.price) || 0;
              }
            });
          }
        });
      }
    });

    const [yearStr, monthStr] = monthYear.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const totalDays = new Date(year, month, 0).getDate(); // standard JS formula for total days in month

    return res.status(200).json({
      monthYear,
      totalSales: parseFloat(totalSales.toFixed(2)),
      totalPayout: parseFloat(totalPayout.toFixed(2)),
      totalOnline: parseFloat(totalOnline.toFixed(2)),
      count: summaries.length,
      totalDays,
    });
  } catch (err) {
    console.error("Error in get-summary:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
}
