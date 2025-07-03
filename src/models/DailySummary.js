import mongoose from "mongoose";

const casherSchema = new mongoose.Schema({
  casherName: String,
  category: String,
  items: [
    {
      name: String,
      price: Number,
    },
  ],
  addons: [
    {
      name: String,
      price: Number,
    },
  ],
  staffAdvances: [
    {
      staffId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Staff",
      },
      amount: Number,
    },
  ],
  totalCashersAmount: Number,
  totalSealAmount: Number,
  totalMoneyLift: Number,
  shot: Number,
}, { _id: false });

const drinkSchema = new mongoose.Schema({
  drinkType: String,
  soldAmount: Number,
  commissionPercent: Number,
  commissionValue: Number,
  finalNetAmount: Number,
  carryLoss: { type: Number, default: 0 },
}, { _id: false });

const dailySummarySchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
    unique: true,
  },
  cashers: [casherSchema],
  drinks: [drinkSchema],
  totalCashersSale: Number,
  totalDrinksAmount: Number,
  totalShot: Number,
  totalCashersExpensesExclTeaJuice: Number,
  totalBusiness: Number,
  payout: Number,
}, { timestamps: true });

export default mongoose.models.DailySummary || mongoose.model("DailySummary", dailySummarySchema);
