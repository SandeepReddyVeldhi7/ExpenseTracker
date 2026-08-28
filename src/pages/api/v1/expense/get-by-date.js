import { connectDB } from "@/lib/db";
import DailySummary from "@/models/DailySummary";
import { withAuth } from "@/lib/apiAuth";

async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Only GET allowed" });
  }

  try {
    await connectDB();

    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    const summary = await DailySummary.findOne({ date }).lean();

    if (!summary) {
      return res.status(404).json({ message: "No expenses found for this date" });
    }

    return res.status(200).json(summary);
  } catch (error) {
    console.error("[GetByDate Error]:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
}

export default withAuth(handler, { roles: ["owner", "staff", "staff123"] });
