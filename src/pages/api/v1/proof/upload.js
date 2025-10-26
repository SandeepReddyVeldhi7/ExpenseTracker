import multer from "multer";
import fs from "fs";
import path from "path";
import { connectDB } from "@/lib/db";
import ProofSubmission from "@/models/ProofSubmission";


export const config = {
  api: { bodyParser: false }, // IMPORTANT: let multer handle multipart
};

// tiny helper to await any middleware
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
}

const baseDir = path.join(process.cwd(), "public", "proof");

// dynamic disk storage per date (?date=YYYY-MM-DD)
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const date = (req.query.date || "unknown") + "";
    const dest = path.join(baseDir, date);
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const ok = /^image\//.test(file.mimetype);
    cb(ok ? null : new Error("Only image files allowed"), ok);
  },
  limits: { fileSize: 5 * 1024 * 1024, files: 20 }, // 5MB each, max 20
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const date = (req.query.date || "").toString();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: "Invalid date (yyyy-MM-dd)" });
  }

  try {
    // parse multipart + save files
    await runMiddleware(req, res, upload.array("images"));

    const files = req.files || [];
    if (!files.length) return res.status(400).json({ error: "No files uploaded" });

    const publicUrls = files.map((f) => `/proof/${date}/${f.filename}`);

    // save/update DB
    await connectDB();
    const existing = await ProofSubmission.findOne({ date: new Date(date) });
    if (existing) {
      existing.images.push(...publicUrls);
      await existing.save();
    } else {
      await ProofSubmission.create({ date: new Date(date), images: publicUrls });
    }

    return res.status(200).json({ ok: true, images: publicUrls });
  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).json({ error: "Upload failed" });
  }
}
