import mongoose from "mongoose";

const monthlyExpenseItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
  },
  { _id: false }
);

const monthlyExpenseSchema = new mongoose.Schema(
  {
    month: { type: String, required: true },
    year: { type: String, required: true },
    key: { type: String, required: true, unique: true }, // e.g., "2026-06"
    items: [monthlyExpenseItemSchema],
    totalSales: { type: Number, required: true, default: 0 },
    totalPayout: { type: Number, required: true, default: 0 },
    totalOnline: { type: Number, required: true, default: 0 },
    totalExpenses: { type: Number, required: true, default: 0 },
    remainingBalance: { type: Number, required: true, default: 0 },
    submittedBy: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.MonthlyExpense || mongoose.model("MonthlyExpense", monthlyExpenseSchema);
