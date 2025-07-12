import mongoose from 'mongoose';

const confirmedAdvanceSchema = new mongoose.Schema(
  {
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
    },
    systemCalculatedAdvance: {
      type: Number,
      required: true,
      min: 0,
    },
    ownerAdjustment: {
      type: Number,
      required: true,
    },
    confirmedAdvance: {
      type: Number,
      required: true,
      min: 0,
    },
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    confirmedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Ensure 1 record per staff per month/year
confirmedAdvanceSchema.index({ staff: 1, month: 1, year: 1 }, { unique: true });

export default mongoose.models.ConfirmedAdvance ||
  mongoose.model('ConfirmedAdvance', confirmedAdvanceSchema);
