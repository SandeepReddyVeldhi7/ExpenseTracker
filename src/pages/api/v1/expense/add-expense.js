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

    if (!data.date || !data.drinks || !data.cashers) {
      return res.status(400).json({ message: "Date, cashers, and drinks are required" });
    }

    const todayDate = dayjs(data.date).format("YYYY-MM-DD");
    const yesterdayDate = dayjs(todayDate).subtract(1, "day").format("YYYY-MM-DD");

    // 1️⃣ Get yesterday's carryLoss map
    const yesterday = await DailySummary.findOne({ date: yesterdayDate });
    const carryMap = {};

    if (yesterday && yesterday.drinks) {
      yesterday.drinks.forEach((drink) => {
        if (drink.carryLoss && drink.carryLoss < 0) {
          carryMap[drink.drinkType] = drink.carryLoss;
        }
      });
    }

    // 2️⃣ Adjust today's drinks using yesterday's carryLoss and today's expenseAmount from cashers
    const updatedDrinks = data.drinks.map((drink) => {
      const previousCarry = carryMap[drink.drinkType] || 0;

      // Compute expenseAmount for this drink type from cashers
      const expenseAmount = data.cashers.reduce((sum, casher) => {
        const matchingAddons = casher.addons?.filter(
          (a) => a.name?.toLowerCase() === drink.drinkType.toLowerCase()
        ) || [];
        return sum + matchingAddons.reduce((a, b) => a + (parseFloat(b.price) || 0), 0);
      }, 0);

      const soldAmount = drink.soldAmount ?? 0;
      const commissionValue = drink.commissionValue ?? 0;

      const todayRawNet = soldAmount - expenseAmount - commissionValue;
      const combinedNet = todayRawNet + previousCarry;
      const newCarryLoss = combinedNet < 0 ? combinedNet : 0;

      return {
        drinkType: drink.drinkType,
        soldAmount,
        commissionPercent: drink.commissionPercent ?? 0,
        commissionValue,
        finalNetAmount: combinedNet,
        carryForwardFromYesterday: previousCarry,
        carryLoss: newCarryLoss
      };
    });

    data.drinks = updatedDrinks;

    // 3️⃣ Recalculate daily summary totals *server-side* from cashers and updated drinks
    const totalCashersAmount = data.cashers.reduce(
      (sum, c) => sum + (parseFloat(c.totalCashersAmount) || 0),
      0
    );

    const totalDrinksAmount = updatedDrinks.reduce(
      (sum, d) => sum + (d.finalNetAmount || 0),
      0
    );

    const totalCashersSale = data.cashers.reduce(
      (sum, c) => sum + (parseFloat(c.totalSealAmount) || 0),
      0
    );

    const totalShot = data.cashers.reduce(
      (sum, c) => sum + (parseFloat(c.shot) || 0),
      0
    );

    const payout = parseFloat(
      (totalCashersSale - totalDrinksAmount - totalCashersAmount - totalShot).toFixed(2)
    );

    // Optionally calculate online sales and tea/juice in cashers for audit
    const totalOnlineSale = data.cashers.reduce((sum, c) => {
      const online = c.addons?.find((a) => a.name?.toLowerCase() === "online");
      return sum + (parseFloat(online?.price) || 0);
    }, 0);

    const totalTeaJuiceInCashers = data.cashers.reduce((sum, c) => {
      const teaJuice = c.addons?.filter(
        (a) =>
          a.name?.toLowerCase() === "tea" ||
          a.name?.toLowerCase() === "juice"
      ) || [];
      return sum + teaJuice.reduce((a, b) => a + (parseFloat(b.price) || 0), 0);
    }, 0);

    const totalBusiness = totalCashersSale + totalDrinksAmount;

    // 4️⃣ Save calculated values back into data
    data.totalCashersAmount = totalCashersAmount;
    data.totalDrinksAmount = totalDrinksAmount;
    data.totalCashersSale = totalCashersSale;
    data.totalShot = totalShot;
    data.payout = payout;
    data.totalOnlineSale = totalOnlineSale;
    data.totalTeaJuiceInCashers = totalTeaJuiceInCashers;
    data.totalBusiness = totalBusiness;

    // 5️⃣ Upsert
    const saved = await DailySummary.findOneAndUpdate(
      { date: todayDate },
      data,
      { upsert: true, new: true }
    );

    return res.status(200).json({
      message: "Summary saved with carry-forward and recalculated totals",
      summary: saved
    });
  } catch (error) {
    console.error("Error saving summary:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
}
