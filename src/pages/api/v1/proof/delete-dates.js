import fs from "fs";
import path from "path";
import { connectDB } from "@/lib/db";
import ProofSubmission from "@/models/ProofSubmission";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { dates } = req.body || {};
  if (!Array.isArray(dates) || dates.length === 0) {
    return res.status(400).json({ error: "dates[] required" });
  }

  try {
    await connectDB();

    let deletedDocs = 0;
    let deletedFiles = 0;

    for (const date of dates) {
      const doc = await ProofSubmission.findOne({ date: new Date(date) });
      if (!doc) continue;

      const folder = path.join(process.cwd(), "public", "proof", date);
      if (fs.existsSync(folder)) {
        try {
          const files = fs.readdirSync(folder);
          for (const f of files) {
            try {
              fs.unlinkSync(path.join(folder, f));
              deletedFiles++;
            } catch {}
          }
          try { fs.rmdirSync(folder); } catch {}
        } catch {}
      }

      await ProofSubmission.deleteOne({ _id: doc._id });
      deletedDocs++;
    }

    return res.status(200).json({ ok: true, deletedDocs, deletedFiles });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Bulk delete failed" });
  }
}
