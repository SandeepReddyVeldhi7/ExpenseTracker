import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import dashboardUsers from "@/models/dashboardUsers";
import { withAuth } from "@/lib/apiAuth";

async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  await connectDB();

  const { email, username, password, role } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ error: "All fields required" });
  }

  // Check if email or username already exists
  const existingUser = await dashboardUsers.findOne({
    $or: [{ email: email.trim().toLowerCase() }, { username: username.trim().toLowerCase() }],
  });

  if (existingUser) {
    return res
      .status(400)
      .json({ error: "A staff account with this email or username already exists." });
  }

  // Hash password and create new
  const hashedPassword = await bcrypt.hash(password, 10);

  const newStaff = await dashboardUsers.create({
    email: email.trim().toLowerCase(),
    username: username.trim().toLowerCase(),
    password: hashedPassword,
    role: role || "staff",
  });

  const staffResponse = newStaff.toObject();
  delete staffResponse.password;

  return res.status(201).json({ success: true, staff: staffResponse });
}

export default withAuth(handler, { roles: ["owner"] });