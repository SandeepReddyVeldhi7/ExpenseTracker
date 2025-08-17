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
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({ message: "Month and year required" });
    }

    const advances = await ConfirmedAdvance.find({ month: Number(month), year: Number(year) })
      .populate("staff", "name designation")
      .lean();

    res.status(200).json(advances);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}
