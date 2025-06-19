import mongoose from "mongoose";

const salaryPaymentSchema = new mongoose.Schema(
  {
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },
    month: { type: Number, required: true }, // 1-12
    year: { type: Number, required: true },
    presentDays: { type: Number, required: true },
    earnedSalary: { type: Number, required: true },
    advanceDeducted: { type: Number, required: true },
    finalPaid: { type: Number, required: true },
    carryForward: { type: Number, required: true },
    paidAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.SalaryPayment ||
  mongoose.model("SalaryPayment", salaryPaymentSchema);
