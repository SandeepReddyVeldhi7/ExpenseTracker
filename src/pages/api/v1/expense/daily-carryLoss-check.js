import { connectDB } from "@/lib/db";
import DailySummary from "@/models/DailySummary";


export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await connectDB();

    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: "Date query parameter is required" });
    }

    const summary = await DailySummary.findOne({ date });

    if (!summary) {
      return res.status(404).json({ message: "No summary found for that date" });
    }

    return res.status(200).json(summary);
  } catch (error) {
    console.error("Error fetching summary:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
}
