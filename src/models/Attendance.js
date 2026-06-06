// models/Attendance.js

import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
    
      default: 'Present',
    },
  },
  { timestamps: true }
);

attendanceSchema.index({ staff: 1, date: 1 });
attendanceSchema.index({ date: 1 });

export default mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);
