import { connectDB } from "@/lib/db";
import MonthlyExpense from "@/models/MonthlyExpense";
import DailySummary from "@/models/DailySummary";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Only GET allowed" });
  }

  try {
    await connectDB();

    const expenses = await MonthlyExpense.find({}).sort({ key: -1 });

    const list = [];
    for (let exp of expenses) {
      const expObj = exp.toObject();

      // If key is present and totalOnline is missing, calculate it and update the DB
      if (expObj.key && (expObj.totalOnline === undefined || expObj.totalOnline === null)) {
        const summaries = await DailySummary.find({
          date: { $regex: new RegExp(`^${expObj.key}`) }
        }).lean();

        let calculatedOnline = 0;
        summaries.forEach((s) => {
          if (s.cashers && Array.isArray(s.cashers)) {
            s.cashers.forEach((c) => {
              if (c.addons && Array.isArray(c.addons)) {
                c.addons.forEach((a) => {
                  if (a.name && a.name.toLowerCase() === "online") {
                    calculatedOnline += parseFloat(a.price) || 0;
                  }
                });
              }
            });
          }
        });

        exp.totalOnline = parseFloat(calculatedOnline.toFixed(2));
        await exp.save();
        expObj.totalOnline = exp.totalOnline;
      }

      list.push(expObj);
    }

    return res.status(200).json({ list });
  } catch (err) {
    console.error("Error in list monthly-expense:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
}
