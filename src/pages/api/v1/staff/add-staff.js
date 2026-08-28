import { connectDB } from "@/lib/db";
import Staff from "@/models/Staff";
import { withAuth } from "@/lib/apiAuth";

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    await connectDB();

    const { name, designation, salary } = req.body;

    if (!name || !designation || typeof salary !== "number") {
      return res.status(400).json({ error: "Name, designation, and numeric salary are required" });
    }

    const trimmedName = name.trim();

    // Check if staff with the same name already exists
    const existingStaff = await Staff.findOne({ name: trimmedName });
    if (existingStaff) {
      return res.status(409).json({ message: "Staff with this name already exists" });
    }

    const staff = new Staff({
      name: trimmedName,
      designation: designation.trim(),
      salary,
      active: true,
    });

    await staff.save();
    return res.status(201).json({ message: "Staff saved successfully", staff });
  } catch (err) {
    console.error("Error saving staff:", err);
    return res.status(500).json({ error: "Server error", message: err.message });
  }
}

export default withAuth(handler, { roles: ["owner"] });
