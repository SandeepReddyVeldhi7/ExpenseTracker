import { del } from "@vercel/blob";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import DashboardUser from "@/models/dashboardUsers";

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "DELETE") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const secret = process.env.NEXTAUTH_SECRET;
    const token = await getToken({ req, secret });

    if (!token || !token.email) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await connectDB();

    // Find the user
    let dbUser = await User.findOne({ email: token.email });
    if (!dbUser) {
      dbUser = await DashboardUser.findOne({ email: token.email });
    }

    if (!dbUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Delete photo from Vercel Blob if it exists
    if (dbUser.image) {
      if (dbUser.image.includes("public.blob.vercel-storage.com")) {
        try {
          await del(dbUser.image);
        } catch (err) {
          console.error("Failed to delete profile photo from Vercel Blob:", err);
        }
      }
      dbUser.image = null;
      await dbUser.save();
    }

    return res.status(200).json({ ok: true, message: "Profile photo deleted successfully" });
  } catch (err) {
    console.error("PROFILE PHOTO DELETE ERROR:", err);
    return res.status(500).json({ error: "Profile photo deletion failed" });
  }
}
