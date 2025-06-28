import { connectDB } from "@/lib/db"
import DailySummary from "@/models/DailySummary";




export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { date, category } = req.query;

  if (!date || !category) {
    return res.status(400).json({ message: "Missing date or category" });
  }

  try {
    await connectDB();

    // Normalize the date to YYYY-MM-DD (to match how it's stored in the DB)
    const normalizedDate = new Date(date).toISOString().split("T")[0];

    // Optional: ensure category is one of the accepted ones
    const validCategories = [
      "casher1",
      "casher2",
      "casher3",
      "tea",
      "juice",
      "totalDetails",
    ];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ message: "Invalid category" });
    }

    const existing = await DailySummary.findOne({ date: normalizedDate, category });

    return res.status(200).json({ exists: !!existing });
  } catch (err) {
    console.error("Check error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

