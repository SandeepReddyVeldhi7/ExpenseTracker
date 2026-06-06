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
    attendanceStart: { type: String }, 
attendanceEnd:   { type: String }, 


  },
  { timestamps: true }
);

salaryPaymentSchema.index({ staff: 1, createdAt: -1 });
salaryPaymentSchema.index({ staff: 1, year: -1, month: -1 });
salaryPaymentSchema.index({ month: 1, year: 1 });
salaryPaymentSchema.index({ paidAt: 1 });
salaryPaymentSchema.index({ attendanceStart: 1, attendanceEnd: 1 });

export default mongoose.models.SalaryPayment ||
  mongoose.model("SalaryPayment", salaryPaymentSchema);
