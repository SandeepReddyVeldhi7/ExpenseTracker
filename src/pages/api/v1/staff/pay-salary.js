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

    // Advances for this month
    const advances = await Expense.find({
      advance: staffId,
      date: { $gte: startDate.toISOString().split("T")[0], $lte: endDate.toISOString().split("T")[0] }
    });

    const currentAdvance = advances.reduce((sum, expense) => {
      if (expense.items.length > 0) {
        return sum + expense.items.reduce((s, item) => s + item.price, 0);
      } else {
        return sum + expense.totalCashersAmount;
      }
    }, 0);

    const daysInMonth = new Date(y, m + 1, 0).getDate();
const perDaySalary = staff.salary / daysInMonth;
const earnedSalary = perDaySalary * presentDays;


    const previousCarryForward = staff.remainingAdvance || 0;
const totalAdvanceDue = previousCarryForward + currentAdvance;


    let finalPaid = Number(paidAmount);
    if (isNaN(finalPaid) || finalPaid < 0) {
      return res.status(400).json({ message: "Invalid paidAmount" });
    }

    // 🗝️ Compute the new carry forward
   let newCarryForward = totalAdvanceDue - earnedSalary + finalPaid;



    // ✅ UPSERT: update if exists, else create
    const payment = await SalaryPayment.findOneAndUpdate(
      { staff: staffId, month: m + 1, year: y },
      {
        staff: staffId,
        month: m + 1,
        year: y,
        presentDays,
        earnedSalary,
        advanceDeducted: totalAdvanceDue,
        finalPaid,
        carryForward: newCarryForward,
      },
      { upsert: true, new: true }
    );

    // ✅ Update Staff's remainingAdvance
    staff.remainingAdvance = newCarryForward;
    staff.lastPaid = new Date();
    await staff.save();

    res.json({ message: "Salary paid successfully", payment });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}
