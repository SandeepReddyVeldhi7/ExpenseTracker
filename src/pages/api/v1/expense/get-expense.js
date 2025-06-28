import { connectDB } from "@/lib/db";
import DailySummary from "@/models/DailySummary";


export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Only GET allowed" });
  }

  try {
    await connectDB();

    const { startDate, endDate } = req.query;

    const query = {};

    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }

    // Get all matching daily summaries
    const summaries = await DailySummary.find(query).populate('cashers.staffAdvances.staffId', 'name').sort({ date: 1 }).lean();

    // Optionally, clean up _id/createdAt/updatedAt if you want
    const cleanedSummaries = summaries.map((s) => ({
      _id: s._id,
      date: s.date,
      cashers: s.cashers || [],
      drinks: s.drinks || [],
      totalCashersSale: s.totalCashersSale || 0,
      totalDrinksAmount: s.totalDrinksAmount || 0,
      totalShot: s.totalShot || 0,
      totalCashersExpensesExclTeaJuice: s.totalCashersExpensesExclTeaJuice || 0,
      totalBusiness: s.totalBusiness || 0,
      payout: s.payout || 0,
      // For your table view
      totalAmount: (s.totalCashersSale || 0) + (s.totalDrinksAmount || 0),
      allCashers: s.cashers ? s.cashers.map(c => c.casherName) : [],
      rawExpenses: s
    }));

    return res.status(200).json({ expenses: cleanedSummaries });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
}
