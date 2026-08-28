import { User } from "@/models/User";
import bcrypt from "bcryptjs";
import dashboardUsers from "@/models/dashboardUsers";
import { connectDB } from "@/lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { password } = req.body;
  const { token } = req.query;

  if (!password || !token) {
    return res.status(400).json({ error: "Password and token are required" });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  try {
    await connectDB();

    const now = new Date();
    let user = await User.findOne({
      forgotPasswordToken: token,
      forgotPasswordExpires: { $gt: now },
    });

    if (!user) {
      user = await dashboardUsers.findOne({
        forgotPasswordToken: token,
        forgotPasswordExpires: { $gt: now },
      });
    }

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset token. Please request a new link." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.forgotPasswordToken = undefined;
    user.forgotPasswordExpires = undefined;

    await user.save();

    return res.status(200).json({ message: "Password reset successfully. You may now sign in." });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
}
