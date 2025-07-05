import { connectDB } from "@/lib/db";
import Attendance from "@/models/Attendance";
import Expense from "@/models/DailySummary";
import SalaryPayment from "@/models/SalaryPayment";
import Staff from "@/models/Staff";


export default async function handler(req, res) {
  await connectDB();

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { staffId, month, year, paidAmount } = req.body;
  const m = month ? parseInt(month) - 1 : new Date().getMonth();
  const y = year ? parseInt(year) : new Date().getFullYear();

  const startDate = new Date(y, m, 1);
  const endDate = new Date(y, m + 1, 0);

  try {
    const staff = await Staff.findById(staffId);
    if (!staff) return res.status(404).json({ message: "Staff not found" });

    // Attendance
    const presentDays = await Attendance.countDocuments({
      staff: staffId,
      status: "Present",
      date: { $gte: startDate, $lte: endDate },
    });

    // Advances
    const expenses = await Expense.find({
      date: {
        $gte: startDate.toISOString().split("T")[0],
        $lte: endDate.toISOString().split("T")[0],
      },
    });

    let currentAdvance = 0;
    expenses.forEach((exp) => {
      if (Array.isArray(exp.cashers)) {
        exp.cashers.forEach((casher) => {
          if (Array.isArray(casher.staffAdvances)) {
            casher.staffAdvances.forEach((a) => {
              if (a.staffId.toString() === staffId) {
                currentAdvance += a.amount;
              }
            });
          }
        });
      }
    });

    const perDaySalary = staff.salary / 30;
    const earnedSalary = perDaySalary * presentDays;

    // Compute new carry forward
    const totalAdvanceDue = (staff.remainingAdvance || 0) + currentAdvance;
    const newCarryForward = totalAdvanceDue - earnedSalary + paidAmount;

    // Save payment
    const payment = await SalaryPayment.findOneAndUpdate(
      { staff: staffId, month: m + 1, year: y },
      {
        staff: staffId,
        month: m + 1,
        year: y,
        presentDays,
        earnedSalary,
        advanceDeducted: totalAdvanceDue,
        finalPaid: paidAmount,
        carryForward: newCarryForward,
      },
      { upsert: true, new: true }
    );

    // Update staff's remainingAdvance
    staff.remainingAdvance = newCarryForward;
    staff.lastPaid = new Date();
    await staff.save();

    res.json({ message: "Salary paid successfully", payment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}


