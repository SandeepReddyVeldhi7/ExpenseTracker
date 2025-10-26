import fs from "fs";
import path from "path";
import { connectDB } from "@/lib/db";
import ProofSubmission from "@/models/ProofSubmission";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { date, filenames } = req.body || {};

  if (!date || !Array.isArray(filenames) || filenames.length === 0) {
    return res.status(400).json({ error: "date and filenames[] required" });
  }

  try {
    await connectDB();

    const doc = await ProofSubmission.findOne({ date: new Date(date) });
    if (!doc) return res.status(404).json({ error: "Record not found" });

    const urlsToRemove = new Set(filenames.map((fn) => `/proof/${date}/${fn}`));

    const remaining = doc.images.filter((u) => !urlsToRemove.has(u));

    if (remaining.length === 0) {
      await ProofSubmission.deleteOne({ _id: doc._id });
    } else {
      doc.images = remaining;
      await doc.save();
    }

    for (const fn of filenames) {
      const filePath = path.join(process.cwd(), "public", "proof", date, fn);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch {}
      }
    }

    // remove empty folder if necessary
    try {
      const folderPath = path.join(process.cwd(), "public", "proof", date);
      const left = fs.existsSync(folderPath) ? fs.readdirSync(folderPath) : [];
      if (left && left.length === 0) fs.rmdirSync(folderPath);
    } catch {}

    res.status(200).json({ ok: true, remaining: remaining.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Bulk delete failed" });
  }
}
