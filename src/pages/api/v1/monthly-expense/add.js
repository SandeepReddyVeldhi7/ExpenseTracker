import { connectDB } from "@/lib/db";
import MonthlyExpense from "@/models/MonthlyExpense";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Only POST allowed" });
  }

  try {
    await connectDB();

    const { monthYear, items, totalSales, totalPayout, totalOnline, submittedBy } = req.body;

    if (!monthYear || !/^\d{4}-\d{2}$/.test(monthYear)) {
      return res.status(400).json({ message: "Invalid or missing monthYear" });
    }

    if (!Array.isArray(items)) {
      return res.status(400).json({ message: "items must be an array" });
    }

    const year = monthYear.split("-")[0];
    const month = monthYear.split("-")[1];

    // Calculate totals server-side
    const totalExpenses = items.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
    const remainingBalance = (parseFloat(totalPayout) || 0) - totalExpenses;

    const data = {
      month,
      year,
      key: monthYear,
      items: items.map(item => ({
        name: item.name,
        price: parseFloat(item.price) || 0
      })),
      totalSales: parseFloat(totalSales) || 0,
      totalPayout: parseFloat(totalPayout) || 0,
      totalOnline: parseFloat(totalOnline) || 0,
      totalExpenses,
      remainingBalance,
      submittedBy: submittedBy || "staff"
    };

    const saved = await MonthlyExpense.findOneAndUpdate(
      { key: monthYear },
      data,
      { upsert: true, new: true }
    );

    return res.status(200).json({
      message: "Monthly expense submitted successfully",
      data: saved
    });
  } catch (err) {
    console.error("Error in add monthly-expense:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
}
