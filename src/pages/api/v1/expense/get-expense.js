// pages/api/v1/expense/get-expense.js

import { connectDB } from "@/pages/lib/db";
import Expense from "@/pages/models/Expense";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Only GET allowed" });
  }

  try {
    await connectDB();

    const { startDate, endDate, type } = req.query;

    const query = {};

    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }

    if (type && type !== "all") {
      query.type = type;
    }

    const expenses = await Expense.find(query).sort({ date: 1 });

    const grouped = {};

    expenses.forEach(exp => {
      const dateKey = exp.date;
      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          date: dateKey,
          type: exp.type,
          totalAmount: 0,
          allItems: [],
          allCashers: new Set(),
          rawExpenses: []
        };
      }

      if (exp.type === "casher") {
        grouped[dateKey].totalAmount += exp.totalCashersAmount || 0;
      } else if (exp.type === "drink") {
        grouped[dateKey].totalAmount += exp.soldAmount || 0;
      }

      if (exp.casherName) {
        grouped[dateKey].allCashers.add(exp.casherName);
      }

      if (exp.items && exp.items.length) {
        grouped[dateKey].allItems.push(...exp.items);
      }

      // ✅ Also store full expense for breakdown
      grouped[dateKey].rawExpenses.push(exp);
    });

    const result = Object.values(grouped).map(g => ({
      ...g,
      allCashers: Array.from(g.allCashers),
    }));

    return res.status(200).json({ expenses: result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
}
