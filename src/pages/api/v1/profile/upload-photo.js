import multer from "multer";
import { put, del } from "@vercel/blob";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import DashboardUser from "@/models/dashboardUsers";

export const config = {
  api: {
    bodyParser: false,
  },
};

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
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const secret = process.env.NEXTAUTH_SECRET;
    const token = await getToken({ req, secret });

    if (!token || !token.email) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await runMiddleware(req, res, upload.single("image"));
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    await connectDB();

    // Find the user to check if they already have an existing custom profile photo
    let dbUser = await User.findOne({ email: token.email });
    let isOwner = true;
    if (!dbUser) {
      dbUser = await DashboardUser.findOne({ email: token.email });
      isOwner = false;
    }

    if (!dbUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Delete existing custom profile photo from Vercel Blob if present
    if (dbUser.image && dbUser.image.includes("public.blob.vercel-storage.com")) {
      try {
        await del(dbUser.image);
      } catch (err) {
        console.error("Failed to delete old profile photo:", err);
      }
    }

    // Upload new photo
    const filename = `avatar-${token.id || dbUser._id.toString()}-${Date.now()}-${file.originalname}`;
    const uploaded = await put(filename, file.buffer, {
      access: "public",
      contentType: file.mimetype,
    });

    // Save back to DB
    dbUser.image = uploaded.url;
    await dbUser.save();

    return res.status(200).json({ ok: true, imageUrl: uploaded.url });
  } catch (err) {
    console.error("PROFILE PHOTO UPLOAD ERROR:", err);
    return res.status(500).json({ error: "Profile photo upload failed" });
  }
}
