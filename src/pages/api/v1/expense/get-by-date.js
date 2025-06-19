import { connectDB } from "@/pages/lib/db";
import Expense from "@/pages/models/Expense";


export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Only GET allowed" });
  }

  try {
    await connectDB();

    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    const expenses = await Expense.find({ date });

    if (!expenses.length) {
      return res.status(404).json({ message: "No expenses found" });
    }

    const summary = {
      date,
      cashers: [],
      drinks: [],
      totalCashersAmount: 0,
      totalDrinksAmount: 0,
      grandTotal: 0,
    };

    // list of known addons:
    const addonTypes = ["tea", "juice", "other", "online"];

    expenses.forEach(exp => {
      if (exp.type === "casher") {
        // split items & addons:
        const mainItems = [];
        const addons = [];

        (exp.items || []).forEach(item => {
          if (addonTypes.includes(item.name.toLowerCase())) {
            addons.push(item);
          } else {
            mainItems.push(item);
          }
        });

        summary.cashers.push({
          casherName: exp.casherName,
          items: mainItems,
          addons: addons,
          totalCashersAmount: exp.totalCashersAmount,
          totalSealAmount: exp.totalSealAmount,
          totalMoneyLift: exp.totalMoneyLift,
          shot: exp.shot,
          advance: exp.advance,
        });

        summary.totalCashersAmount += exp.totalCashersAmount || 0;
      }

      else if (exp.type === "drink") {
        summary.drinks.push({
          drinkType: exp.drinkType,
          soldAmount: exp.soldAmount,
          commissionPercent: exp.commissionPercent,
          commissionValue: exp.commissionValue,
          finalNetAmount: exp.finalNetAmount,
        });

        summary.totalDrinksAmount += exp.soldAmount || 0;
      }
    });

    summary.grandTotal = summary.totalCashersAmount + summary.totalDrinksAmount;

    return res.status(200).json(summary);

  } catch (error) {
    console.error("[GetByDate Error]:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
}


