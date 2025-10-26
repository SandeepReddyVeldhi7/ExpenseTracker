import fs from "fs";
import path from "path";
import { connectDB } from "@/lib/db";
import ProofSubmission from "@/models/ProofSubmission";

export default async function handler(req, res) {
  if (req.method !== "DELETE") return res.status(405).end();

  const { date, filename } = req.query;
  if (!date || !filename) return res.status(400).json({ error: "date & filename required" });

  try {
    await connectDB();

    const doc = await ProofSubmission.findOne({ date: new Date(date) });
    if (!doc) return res.status(404).json({ error: "Record not found" });

    const url = `/proof/${date}/${filename}`;
    const nextImages = doc.images.filter((u) => u !== url);

    if (nextImages.length === 0) {
      await ProofSubmission.deleteOne({ _id: doc._id });
    } else {
      doc.images = nextImages;
      await doc.save();
    }

    const filePath = path.join(process.cwd(), "public", "proof", date, filename);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch {}
    }

    // remove empty folder
    try {
      const folderPath = path.join(process.cwd(), "public", "proof", date);
      const left = fs.existsSync(folderPath) ? fs.readdirSync(folderPath) : [];
      if (left && left.length === 0) fs.rmdirSync(folderPath);
    } catch {}

    res.status(200).json({ ok: true, remaining: nextImages.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Delete failed" });
  }
}
