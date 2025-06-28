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

    for (const staff of staffList) {
      let filter = { advance: staff._id };

   const pad = (n) => (n < 10 ? `0${n}` : n);
const startStr = `${year}-${pad(month)}-01`;
const endStr = `${year}-${pad(month)}-31`;

filter.date = {
  $gte: startStr,
  $lte: endStr,
};


      const advances = await Expense.find(filter);

      const totalAdvance = advances.reduce((sum, adv) => {
        const advAmount = adv.items.length > 0
          ? adv.items.reduce((s, i) => s + i.price, 0)
          : adv.totalCashersAmount;
        return sum + advAmount;
      }, 0);

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
