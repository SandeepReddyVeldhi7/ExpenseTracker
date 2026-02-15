import { connectDB } from "@/lib/db";
import Attendance from "@/models/Attendance";
import ConfirmedAdvance from "@/models/ConfirmedAdvance";
import Staff from "@/models/Staff";
import DailySummary from "@/models/DailySummary";
import SalaryPayment from "@/models/SalaryPayment";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method Not Allowed" });

  try {
    await connectDB();

    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ message: "Start and End required" });

    const startDate = new Date(start);
    const endDate = new Date(end);
    endDate.setHours(23,59,59,999);

    const staffList = await Staff.find();

    const summaries = await DailySummary.find({ date: { $gte: start, $lte: end } });

    const result = await Promise.all(staffList.map(async staff => {

      // Present days
      const presentDays = await Attendance.countDocuments({
        staff: staff._id,
        date: { $gte: startDate, $lte: endDate },
        status: "Present",
      });

      // Advance by date
      const advancesByDate = {};

      summaries.forEach(summary => {
        summary.cashers.forEach(casher => {
          casher.staffAdvances.forEach(adv => {
            if (String(adv.staffId) === String(staff._id)) {
              if (!advancesByDate[summary.date]) advancesByDate[summary.date] = [];
              advancesByDate[summary.date].push(Number(adv.amount));
            }
          });
        });
      });

      // Owner confirmed advance
      const ownerAdv = await ConfirmedAdvance.find({
        staff: staff._id,
        date: { $gte: startDate, $lte: endDate },
      });

      ownerAdv.forEach(a => {
        const d = a.date.toISOString().split("T")[0];
        if (!advancesByDate[d]) advancesByDate[d] = [];
        advancesByDate[d].push(Number(a.amount));
      });

      // Total advance
      let totalAdvance = 0;
      Object.values(advancesByDate).forEach(list => {
        list.forEach(v => totalAdvance += v);
      });

      // Last carry forward
      const lastPay = await SalaryPayment.findOne({ staff: staff._id }).sort({ createdAt: -1 });
      const previousCarryForward = lastPay?.newCarryForward || 0;

      return {
        _id: staff._id,
        name: staff.name,
        salary: staff.salary,
        presentDays,
        advancesByDate,
        totalAdvance,
        previousCarryForward
      };
    }));

    return res.status(200).json(result);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}
