// models/Staff.js

import mongoose from 'mongoose'

const staffSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    designation: {
      type: String,
      required: true,
      trim: true,
    },

    salary: {
      type: Number,
      required: true,
      min: 0,
    },

    active: {
      type: Boolean,
      default: true,
    },
    remainingAdvance: {
  type: Number,
  default: 0,
},

  },
  { timestamps: true }
)

export default mongoose.models.Staff || mongoose.model('Staff', staffSchema)
