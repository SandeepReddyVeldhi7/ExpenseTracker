import { connectDB } from "@/lib/db";
import DailySummary from "@/models/DailySummary";






import dayjs from "dayjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await connectDB();

    const data = req.body;

    if (!data.date || !data.drinks) {
      return res.status(400).json({ message: "Date and drinks are required" });
    }

    const todayDate = dayjs(data.date).format("YYYY-MM-DD");

    // ✅ 1️⃣ Get yesterday's summary to see any carryLoss
    const yesterdayDate = dayjs(todayDate).subtract(1, "day").format("YYYY-MM-DD");
    const yesterday = await DailySummary.findOne({ date: yesterdayDate });

    const carryMap = {};

    if (yesterday && yesterday.drinks) {
      yesterday.drinks.forEach((drink) => {
        if (drink.carryLoss && drink.carryLoss < 0) {
          carryMap[drink.drinkType] = drink.carryLoss;
        }
      });
    }

    // ✅ 2️⃣ For each drink, apply carryLoss from yesterday
    const updatedDrinks = data.drinks.map((drink) => {
      const previousCarry = carryMap[drink.drinkType] || 0;
      
      // frontend sends today's calculated net
      const todayNet = drink.finalNetAmount ?? 0;

      // apply previous carry
      const combinedNet = todayNet + previousCarry;

      // decide today's carryLoss
      const newCarryLoss = combinedNet < 0 ? combinedNet : 0;

      return {
        ...drink,
        finalNetAmount: combinedNet,
        carryLoss: newCarryLoss
      };
    });

    // ✅ 3️⃣ Replace drinks in data with adjusted ones
    data.drinks = updatedDrinks;

    // ✅ 4️⃣ Save today's summary with updated carry
    const saved = await DailySummary.findOneAndUpdate(
      { date: todayDate },
      data,
      { upsert: true, new: true }
    );

    return res.status(200).json({ message: "Summary saved with carry-forward", summary: saved });
  } catch (error) {
    console.error("Error saving summary:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
}