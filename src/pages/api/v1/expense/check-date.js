import { connectDB } from "@/lib/db";
import DailySummary from "@/models/DailySummary";
import { withAuth } from "@/lib/apiAuth";

async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  await connectDB();

  // Get all summaries, but only their dates (lean)
  const summaries = await DailySummary.find({}, "date").lean();
  const dates = summaries.map((entry) => entry.date);

  return res.status(200).json({ dates });
}

export default withAuth(handler, { roles: ["owner", "staff", "staff123"] });
