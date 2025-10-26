import { connectDB } from "@/lib/db";
import ProofSubmission from "@/models/ProofSubmission";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { startDate, endDate } = req.query;

  try {
    await connectDB();

    const q = {};
    if (startDate || endDate) {
      q.date = {};
      if (startDate) q.date.$gte = new Date(startDate);
      if (endDate) q.date.$lte = new Date(endDate);
    }

    const docs = await ProofSubmission.find(q).sort({ date: -1 });

    const items = docs.map((d) => ({
      date: d.date.toISOString().slice(0, 10),
      count: d.images.length,
      images: d.images,
    }));

    res.status(200).json({ items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load proofs" });
  }
}
