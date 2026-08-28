import { connectDB } from "@/lib/db";
import Staff from "@/models/Staff";
import { withAuth } from "@/lib/apiAuth";

async function handler(req, res) {
  await connectDB();

  if (req.method === "GET") {
    try {
      const staffList = await Staff.find().sort({ createdAt: -1 }).lean();
      return res.status(200).json(staffList);
    } catch (error) {
      console.error("Failed to fetch staff:", error);
      return res.status(500).json({ error: "Failed to load staff" });
    }
  } else if (req.method === "DELETE") {
    try {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: "Missing id" });

      await Staff.findByIdAndDelete(id);
      return res.status(200).json({ message: "Staff deleted" });
    } catch (error) {
      console.error("Failed to delete staff:", error);
      return res.status(500).json({ error: "Failed to delete staff" });
    }
  } else if (req.method === "PUT") {
    try {
      const { id } = req.query;
      const { name, designation, salary, active, remainingAdvance } = req.body;

      if (!id) return res.status(400).json({ error: "Missing id" });
      if (!name || !designation || typeof salary !== "number") {
        return res.status(400).json({ error: "Missing or invalid fields" });
      }

      const existing = await Staff.findOne({ name: name.trim(), _id: { $ne: id } });
      if (existing) {
        return res.status(409).json({ error: "Another staff member with this name already exists" });
      }

      const updatedStaff = await Staff.findByIdAndUpdate(
        id,
        { name: name.trim(), designation: designation.trim(), salary, active, remainingAdvance },
        { new: true }
      );

      return res.status(200).json({ message: "Staff updated successfully", staff: updatedStaff });
    } catch (error) {
      console.error("Failed to update staff:", error);

      if (error.code === 11000 && error.keyPattern?.name) {
        return res.status(409).json({ error: "Staff name must be unique" });
      }

      return res.status(500).json({ error: "Failed to update staff" });
    }
  } else {
    res.setHeader("Allow", ["GET", "DELETE", "PUT"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default withAuth(handler, { roles: ["owner", "staff", "staff123"] });
