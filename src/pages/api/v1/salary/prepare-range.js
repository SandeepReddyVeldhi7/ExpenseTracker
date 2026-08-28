import { connectDB } from "@/lib/db";
import Attendance from "@/models/Attendance";
import ConfirmedAdvance from "@/models/ConfirmedAdvance";
import Staff from "@/models/Staff";
import DailySummary from "@/models/DailySummary";
import SalaryPayment from "@/models/SalaryPayment";
import { withAuth } from "@/lib/apiAuth";

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method Not Allowed" });

  try {
    await connectDB();

    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ message: "Start and End dates are required" });

    const startDate = new Date(start);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);

    const [staffList, summaries, ownerAdvances, attendanceCounts, lastPayments] = await Promise.all([
      Staff.find({ status: { $ne: "inactive" } }).lean(),
      DailySummary.find({ date: { $gte: start, $lte: end } }).lean(),
      ConfirmedAdvance.find({ date: { $gte: startDate, $lte: endDate } }).lean(),
      Attendance.aggregate([
        {
          $match: {
            date: { $gte: startDate, $lte: endDate },
            status: "Present",
          },
        },
        {
          $group: {
            _id: "$staff",
            count: { $sum: 1 },
          },
        },
      ]),
      SalaryPayment.aggregate([
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: "$staff",
            newCarryForward: { $first: "$newCarryForward" },
          },
        },
      ]),
    ]);

    const attendanceMap = new Map();
    attendanceCounts.forEach((a) => attendanceMap.set(String(a._id), a.count));

    const carryMap = new Map();
    lastPayments.forEach((p) => carryMap.set(String(p._id), p.newCarryForward || 0));

    const result = staffList.map((staff) => {
      const sId = String(staff._id);
      const presentDays = attendanceMap.get(sId) || 0;
      const advancesByDate = {};

      // Calculate advances from DailySummary cashers
      summaries.forEach((summary) => {
        if (summary.cashers) {
          summary.cashers.forEach((casher) => {
            if (casher.staffAdvances) {
              casher.staffAdvances.forEach((adv) => {
                if (String(adv.staffId) === sId) {
                  if (!advancesByDate[summary.date]) advancesByDate[summary.date] = [];
                  advancesByDate[summary.date].push(Number(adv.amount) || 0);
                }
              });
            }
          });
        }
      });

      // Owner confirmed advances
      ownerAdvances.forEach((a) => {
        if (String(a.staff) === sId) {
          const d = a.date.toISOString().split("T")[0];
          if (!advancesByDate[d]) advancesByDate[d] = [];
          advancesByDate[d].push(Number(a.amount) || 0);
        }
      });

      let totalAdvance = 0;
      Object.values(advancesByDate).forEach((list) => {
        list.forEach((v) => {
          totalAdvance += v;
        });
      });

      const previousCarryForward = carryMap.get(sId) || 0;

      return {
        _id: staff._id,
        name: staff.name,
        salary: staff.salary,
        presentDays,
        advancesByDate,
        totalAdvance,
        previousCarryForward,
      };
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error("prepare-range error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
}

export default withAuth(handler, { roles: ["owner"] });
