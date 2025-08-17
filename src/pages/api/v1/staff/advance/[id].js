// pages/api/v1/staff/advances/[id].js
import { connectDB } from "@/lib/db";
import DailySummary from "@/models/DailySummary";
import Staff from "@/models/Staff";

const TZ = "Asia/Kolkata";
const ymd = (d) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);

export default async function handler(req, res) {
  await connectDB();

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { id, month, year } = req.query;

    const staff = await Staff.findById(id);
    if (!staff) return res.status(404).json({ message: "Staff not found" });

    // Build date strings in IST (YYYY-MM-DD)
    let startStr = "0000-01-01";
    let endStr = "9999-12-31";
    if (month && year) {
      const m = Number(month) - 1;
      const y = Number(year);
      const start = new Date(y, m, 1, 0, 0, 0, 0);
      const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
      startStr = ymd(start);
      endStr = ymd(end);
    }

    // Pull summaries by date string, then extract this staff's advances
    const summaries = await DailySummary.find({
      date: { $gte: startStr, $lte: endStr },
    }).lean();

    const advances = [];
    for (const day of summaries) {
      for (const casher of day.cashers || []) {
        for (const a of casher.staffAdvances || []) {
          if (String(a.staffId) === String(id)) {
            advances.push({
              _id: a._id ?? undefined,
              date: day.date, // already YYYY-MM-DD string
              amount: Number(a.amount) || 0,
            });
          }
        }
      }
    }

    // Sort latest first
    advances.sort((a, b) => (a.date < b.date ? 1 : -1));

    res.json({
      staffName: staff.name,
      advances,
      total: advances.reduce((s, a) => s + a.amount, 0),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
}
