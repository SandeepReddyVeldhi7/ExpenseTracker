import { connectDB } from "@/lib/db";
import DailySummary from "@/models/DailySummary";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await connectDB();

    const data = req.body;
    if (!data.date) {
      return res.status(400).json({ message: "Date is required" });
    }

    const saved = await DailySummary.findOneAndUpdate(
      { date: data.date },
      data,
      { upsert: true, new: true }
    );

    return res.status(200).json({ message: "Summary saved", summary: saved });
  } catch (error) {
    console.error("Error saving summary:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
}
