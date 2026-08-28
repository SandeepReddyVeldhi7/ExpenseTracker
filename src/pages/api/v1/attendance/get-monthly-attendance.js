import { connectDB } from "@/lib/db";
import Attendance from "@/models/Attendance";
import Staff from "@/models/Staff";
import { withAuth } from "@/lib/apiAuth";

async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  await connectDB();

  const { month, year } = req.query;
  if (!month || !year) {
    return res.status(400).json({ message: "Month and year are required" });
  }

  const m = parseInt(month) - 1;
  const y = parseInt(year);

  const startDate = new Date(y, m, 1);
  const endDate = new Date(y, m + 1, 0, 23, 59, 59, 999);

  try {
    const staffList = await Staff.find({ status: { $ne: "inactive" } }).lean();
    const attendance = await Attendance.find({
      date: { $gte: startDate, $lte: endDate },
    }).lean();

    // Map attendance by staffId (only Present)
    const attendanceMap = {};
    attendance.forEach((record) => {
      if (record.status === "Present") {
        const staffId = record.staff.toString();
        if (!attendanceMap[staffId]) attendanceMap[staffId] = [];
        attendanceMap[staffId].push(record.date);
      }
    });

    const result = staffList.map((staff) => ({
      _id: staff._id,
      name: staff.name,
      designation: staff.designation,
      presentDates: attendanceMap[staff._id.toString()] || [],
    }));

    return res.status(200).json(result);
  } catch (err) {
    console.error("Monthly attendance error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
}

export default withAuth(handler, { roles: ["owner", "staff", "staff123"] });
