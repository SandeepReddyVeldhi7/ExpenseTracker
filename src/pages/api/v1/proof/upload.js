import multer from "multer";
import { put } from "@vercel/blob";
import { connectDB } from "@/lib/db";
import ProofSubmission from "@/models/ProofSubmission";

export const config = { api: { bodyParser: false } };

const upload = multer({ storage: multer.memoryStorage() });

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) reject(result);
      else resolve(result);
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method Not Allowed" });

  const date = req.query.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: "Invalid date (YYYY-MM-DD)" });
  }

  try {
    await runMiddleware(req, res, upload.array("images"));
    const files = req.files || [];

    if (!files.length) return res.status(400).json({ error: "No images" });

    const urls = [];

    for (const file of files) {
      const filename = `${date}-${Date.now()}-${file.originalname}`;
      const uploaded = await put(filename, file.buffer, {
        access: "public",
        contentType: file.mimetype,
      });
      urls.push(uploaded.url);
    }

    await connectDB();

    const existing = await ProofSubmission.findOne({ date: new Date(date) });
    if (existing) {
      existing.images.push(...urls);
      await existing.save();
    } else {
      await ProofSubmission.create({
        date: new Date(date),
        images: urls,
      });
    }

    return res.status(200).json({ ok: true, images: urls });
  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    return res.status(500).json({ error: "Upload failed" });
  }
}
