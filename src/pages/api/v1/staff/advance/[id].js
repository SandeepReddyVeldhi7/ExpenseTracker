// pages/api/v1/staff/advances/[id].js

import { connectDB } from "@/pages/lib/db";
import Expense from "@/pages/models/Expense";
import Staff from "@/pages/models/Staff";

export default async function handler(req, res) {
  await connectDB();

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { id } = req.query;
  const { month, year } = req.query;

  try {
    const staff = await Staff.findById(id);
    if (!staff) return res.status(404).json({ message: "Staff not found" });

    let filter = { advance: id };

    // ✅ If month+year given, apply date range:
    if (month && year) {
      const m = parseInt(month) - 1;
      const y = parseInt(year);
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0);
      filter.date = { $gte: start.toISOString().split("T")[0], $lte: end.toISOString().split("T")[0] };
    }

    const advances = await Expense.find(filter).sort({ date: -1 });

    const formatted = advances.map((adv) => ({
      _id: adv._id,
      date: adv.date,
      amount:
        adv.items.length > 0
          ? adv.items.reduce((sum, item) => sum + item.price, 0)
          : adv.totalCashersAmount,
    }));

    res.json({
      staffName: staff.name,
      advances: formatted,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
}
