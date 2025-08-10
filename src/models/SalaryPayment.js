import mongoose from "mongoose";

const salaryPaymentSchema = new mongoose.Schema(
  {
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    presentDays: { type: Number, required: true },
    earnedSalary: { type: Number, required: true },
    advances: { type: Number, required: true },
    previousCarryForward: { type: Number, required: true },
    totalAvailable: { type: Number, required: true },
    payable: { type: Number, required: true },
    paidAmount: { type: Number, required: true },
    advanceUntil: { type: Date },

    newCarryForward: { type: Number, required: true },
    remark: { type: String },
    paidAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.SalaryPayment ||
  mongoose.model("SalaryPayment", salaryPaymentSchema);
