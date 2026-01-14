import { connectDB } from "@/lib/db";
import Attendance from "@/models/Attendance";
import Staff from "@/models/Staff";



export default async function handler(req, res) {
  await connectDB();

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { month, year } = req.query;
  if (!month || !year) {
    return res.status(400).json({ message: "Month and year are required" });
  }

  const m = parseInt(month) - 1;
  const y = parseInt(year);

  const startDate = new Date(y, m, 1);
  const endDate = new Date(y, m + 1, 0);

  try {
    // 🔹 Only active staff are fetched
    const staffList = await Staff.find({ active: true });
    const attendance = await Attendance.find({
      date: { $gte: startDate, $lte: endDate },
      // (optional) if you want to ignore any stray records for inactive people:
      // staff: { $in: staffList.map(s => s._id) },
    });

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

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}
