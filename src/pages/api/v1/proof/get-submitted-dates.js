import  { connectDB } from "@/lib/db";
import ProofSubmission from "@/models/ProofSubmission";




export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  try {
    await connectDB();
    const docs = await ProofSubmission.find({}, { date: 1 }).sort({ date: 1 });
    const dates = docs.map((d) => d.date.toISOString().slice(0, 10));
    res.status(200).json({ dates });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

