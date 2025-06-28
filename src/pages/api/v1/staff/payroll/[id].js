import { connectDB } from "@/lib/db";
import Attendance from "@/models/Attendance";
import Expense from "@/models/DailySummary";
import Staff from "@/models/Staff";
import SalaryPayment from "@/models/SalaryPayment";

export default async function handler(req, res) {
  await connectDB();

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { id } = req.query;
  const { month, year, start, end } = req.query;

  const m = month ? parseInt(month) - 1 : new Date().getMonth();
  const y = year ? parseInt(year) : new Date().getFullYear();

  const startDate = start ? new Date(start) : new Date(y, m, 1);
  const endDate = end ? new Date(end) : new Date(y, m + 1, 0);

  try {
    const staff = await Staff.findById(id);
    if (!staff) return res.status(404).json({ message: "Staff not found" });

    // ✅ Attendance
    const presentDays = await Attendance.countDocuments({
      staff: id,
      status: "Present",
      date: { $gte: startDate, $lte: endDate },
    });

    // ✅ Advances
    const advances = await Expense.find({
      advance: id,
      date: {
        $gte: startDate.toISOString().split("T")[0],
        $lte: endDate.toISOString().split("T")[0],
      },
    });

    const currentAdvance = advances.reduce((sum, expense) => {
      if (expense.items.length > 0) {
        return sum + expense.items.reduce((s, i) => s + i.price, 0);
      } else {
        return sum + expense.totalCashersAmount;
      }
    }, 0);

    const advancesList = advances.map((exp) => ({
      _id: exp._id,
      date: exp.date,
      amount:
        exp.items.length > 0
          ? exp.items.reduce((s, i) => s + i.price, 0)
          : exp.totalCashersAmount,
    }));

    // ✅ Existing Payment (if any)
    const existingPayment = await SalaryPayment.findOne({
      staff: id,
      month: m + 1,
      year: y,
    });

    const finalPaid = existingPayment?.finalPaid || 0;

    // ✅ Compute amounts
    const perDaySalary = staff.salary / 30;
    const earnedSalary = perDaySalary * presentDays;
    const totalAdvanceDue = (staff.remainingAdvance || 0) + currentAdvance;

    let payable = earnedSalary - totalAdvanceDue - finalPaid;
    if (payable < 0) payable = 0;

    res.json({
      staffName: staff.name,
      designation: staff.designation,
      monthlySalary: staff.salary,
      presentDays,
      earnedSalary,
      previousCarryForward: staff.remainingAdvance || 0,
      currentMonthAdvance: currentAdvance,
      totalAdvanceDue,
      finalPaid,
      carryForward: staff.remainingAdvance || 0,
      payable,
      newCarryForward: payable === 0 ? Math.abs(earnedSalary - totalAdvanceDue - finalPaid) : 0,
      advances: advancesList,
      // ✅ Always include:
      month: month ? parseInt(month) : m + 1,
      year: y,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
}
