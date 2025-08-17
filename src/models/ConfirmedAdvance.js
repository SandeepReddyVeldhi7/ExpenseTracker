import mongoose from "mongoose";

const ConfirmedAdvanceSchema = new mongoose.Schema(
  {
    staff: { type: mongoose.Schema.Types.ObjectId, ref: "Staff", required: true },
    month: { type: Number, required: true },
    year:  { type: Number, required: true },

    // running totals
    systemCalculatedAdvance: { type: Number, default: 0 },
    ownerAdjustment: { type: Number, default: 0 },     // cumulative for the month
    confirmedAdvance: { type: Number, default: 0 },    // system + owner

    // detailed deltas (history)
    ownerAdjustmentHistory: [
      {
        amount: { type: Number, required: true },      // delta (+/-)
        note:   { type: String, default: "" },
        at:     { type: Date, default: Date.now },
      },
    ],

    confirmedAt: { type: Date },
  },
  { timestamps: true }
);

ConfirmedAdvanceSchema.index({ staff: 1, month: 1, year: 1 }, { unique: true });

export default mongoose.models.ConfirmedAdvance ||
  mongoose.model("ConfirmedAdvance", ConfirmedAdvanceSchema);
