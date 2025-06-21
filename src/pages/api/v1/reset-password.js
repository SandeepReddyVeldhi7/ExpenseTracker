import { User } from "@/models/User";
import bcrypt from "bcrypt";
import dashboardUsers from "@/models/DashboardUsers";
import { connectDB } from "@/lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { password } = req.body;
  const { token } = req.query;

  if (!password) {
    return res.status(400).json({ error: "Password is required" });
  }

  try {
    await connectDB();

    let user = await User.findOne({ forgotPasswordToken: token });

    if (!user) {
      user = await dashboardUsers.findOne({ forgotPasswordToken: token });
    }

    if (!user) {
      return res.status(404).json({ error: "Invalid or expired token." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.forgotPasswordToken = undefined;

    await user.save();

    res.status(200).json({ message: "Password reset successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
}
