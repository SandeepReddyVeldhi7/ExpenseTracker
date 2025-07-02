import { connectDB } from "@/lib/db";
import DailySummary from "@/models/DailySummary";



export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  await connectDB();

  // Get all summaries, but only their dates
  const summaries = await DailySummary.find({}, "date");

  // Make an array of just the date strings
  const dates = summaries.map((entry) => entry.date);

  return res.status(200).json({ dates });
}
