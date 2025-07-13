import { connectDB } from "@/lib/db";
import Attendance from "@/models/Attendance";
import Expense from "@/models/DailySummary";
import SalaryPayment from "@/models/SalaryPayment";
import Staff from "@/models/Staff";

export default async function handler(req, res) {
  await connectDB();

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }
  console.log(req.query);
  const { id } = req.query;
  const { month, year, start, end } = req.query;

  const m = month ? parseInt(month) - 1 : new Date().getMonth();
  const y = year ? parseInt(year) : new Date().getFullYear();

  const startDate = start ? new Date(start) : new Date(y, m, 1);
  const endDate = end ? new Date(end) : new Date(y, m + 1, 0);

  try {
    const staff = await Staff.findById(id);
    if (!staff) return res.status(404).json({ message: "Staff not found" });

    // ✅ Attendance count
    const presentDays = await Attendance.countDocuments({
      staff: id,
      status: "Present",
      date: { $gte: startDate, $lte: endDate },
    });

    // ✅ Advances from DailySummary
    const expenses = await Expense.find({
      date: {
        $gte: startDate.toISOString().split("T")[0],
        $lte: endDate.toISOString().split("T")[0],
      },
    });

    let advancesList = [];
    let currentAdvance = 0;

    expenses.forEach((exp) => {
      if (Array.isArray(exp.cashers)) {
        exp.cashers.forEach((casher) => {
          if (Array.isArray(casher.staffAdvances)) {
            casher.staffAdvances.forEach((a) => {
              if (a.staffId.toString() === id) {
                advancesList.push({
                  date: exp.date,
                  amount: a.amount,
                });
                currentAdvance += a.amount;
              }
            });
          }
        });
      }
    });

    // ✅ Salary calculation
    const perDaySalary = staff.salary / 30;
    const earnedSalary = perDaySalary * presentDays;

    // ✅ Total due including previous
    const totalAdvanceDue = (staff.remainingAdvance || 0) + currentAdvance;

    // ❗ Allow payable to go negative
    const payable = earnedSalary - totalAdvanceDue;
// ✅ Here's the *missing part*: load saved payment if it exists!
    const savedPayment = await SalaryPayment.findOne({
      staff: id,
      month: month ? parseInt(month) : m + 1,
      year: y,
    });
    res.json({
      staffName: staff.name,
      designation: staff.designation,
      monthlySalary: staff.salary,
      presentDays,
      earnedSalary,
      advances: advancesList,
      totalAdvanceDue,
      payable,
      carryForward: staff.remainingAdvance || 0,
      month: month ? parseInt(month) : m + 1,
      year: y,
       // Add saved values if they exist
  finalPaid: savedPayment ? savedPayment.finalPaid : 0,
  advanceDeducted: savedPayment ? savedPayment.advanceDeducted : 0,
  carryForwardSaved: savedPayment ? savedPayment.carryForward : (staff.remainingAdvance || 0),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
}
