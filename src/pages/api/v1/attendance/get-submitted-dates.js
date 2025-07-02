import { connectDB } from "@/lib/db";
import Attendance from "@/models/Attendance";


export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  await connectDB();

  // Fetch all distinct dates from attendance
  const records = await Attendance.find({}, "date");
  const uniqueDatesSet = new Set();

  records.forEach(r => {
    const d = new Date(r.date);
    // Convert to YYYY-MM-DD
    const iso = d.toISOString().split('T')[0];
    uniqueDatesSet.add(iso);
  });

  const uniqueDates = Array.from(uniqueDatesSet);

  res.status(200).json({ dates: uniqueDates });
}
