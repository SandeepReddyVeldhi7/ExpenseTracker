// pages/api/v1/staff/with-advances.js

import { connectDB } from "@/lib/db";
import Staff from "@/models/Staff";
import Expense from "@/models/DailySummary";



export default async function handler(req, res) {
  await connectDB();

  const { month, year } = req.query;

  try {
    const staffList = await Staff.find({});

    const result = [];

    const pad = (n) => (n < 10 ? `0${n}` : n);
    const startStr = `${year}-${pad(month)}-01`;
    const endStr = `${year}-${pad(month)}-31`;

    // Fetch all expenses in the month
    const expenses = await Expense.find({
      date: { $gte: startStr, $lte: endStr }
    });

    for (const staff of staffList) {
      let totalAdvance = 0;

      expenses.forEach(exp => {
        if (Array.isArray(exp.cashers)) {
          exp.cashers.forEach(casher => {
            if (Array.isArray(casher.staffAdvances)) {
              casher.staffAdvances.forEach(adv => {
                if (adv.staffId.toString() === staff._id.toString()) {
                  totalAdvance += adv.amount;
                }
              });
            }
          });
        }
      });

      result.push({
        _id: staff._id,
        name: staff.name,
        designation: staff.designation,
        totalAdvance,
      });
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
}
