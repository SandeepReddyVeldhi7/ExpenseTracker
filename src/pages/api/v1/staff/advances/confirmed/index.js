// pages/api/v1/staff/advances/confirmed/index.js
import { connectDB } from "@/lib/db";
import ConfirmedAdvance from "@/models/ConfirmedAdvance";

export default async function handler(req, res) {
  await connectDB();

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const month = req.query.month ? Number(req.query.month) : null;
    const year  = req.query.year  ? Number(req.query.year)  : null;

    const q = {};
    if (month) q.month = month;
    if (year) q.year = year;

    // find + populate staff for consistent frontend shape
    const docs = await ConfirmedAdvance.find(q)
      .populate("staff", "name designation")
      .sort({ updatedAt: -1 })
      .lean();

    // docs will have staff populated when available; return as-is
    return res.status(200).json(docs || []);
  } catch (err) {
    console.error("GET /staff/advances/confirmed error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
}
