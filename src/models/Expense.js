// models/Expense.js

import mongoose from "mongoose";

// Individual item entry
const itemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
});

// Main expense schema
const expenseSchema = new mongoose.Schema(
  {
    date: {
      type: String, // Use 'YYYY-MM-DD' format
      required: true,
    },

    category: {
      type: String,

      required: true,
    },

    type: {
      type: String,
      enum: ["casher", "drink"],
      required: true,
    },

    // Casher only
    casherName: {
      type: String,
      required: function () {
        return this.type === "casher";
      },
    },

    items: {
      type: [itemSchema], // Only for casher
      default: [],
    },

    totalCashersAmount: {
      type: Number,
      default: 0,
    },
    totalSealAmount: {
      type: Number,
      default: 0,
    },
    totalMoneyLift: {
      type: Number,
      default: 0,
    },
    shot: {
      type: Number,
      default: 0,
    },

    advance: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
    },

    // Drinks only
    drinkType: {
      type: String,
      enum: ["tea", "juice"],
      required: function () {
        return this.type === "drink";
      },
    },

    soldAmount: Number,
    commissionPercent: Number,
    commissionValue: Number,
    finalNetAmount: Number,
  },
  { timestamps: true }
);

export default mongoose.models.Expense ||
  mongoose.model("Expense", expenseSchema);
