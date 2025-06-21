
import bcrypt from "bcryptjs";

import { connectDB } from "@/lib/db";
import dashboardUsers from "@/models/dashboardUsers";




export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  await connectDB();

  const { email, username, password } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ error: "All fields required" });
  }

  // ✅ Check if email or username already exists
  const existingUser = await dashboardUsers.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser) {
    return res
      .status(400)
      .json({ error: "A staff with this email or username already exists." });
  }

  //  Hash password and create new
  const hashedPassword = await bcrypt.hash(password, 10);

  const newStaff = await dashboardUsers.create({
    email,
    username,
    password: hashedPassword,
  });

  res.status(201).json({ success: true, staff: newStaff });
}