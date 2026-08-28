import { connectDB } from "@/lib/db";
import dashboardUsers from "@/models/dashboardUsers";
import { withAuth } from "@/lib/apiAuth";

async function handler(req, res) {
  await connectDB();

  if (req.method === "GET") {
    try {
      const users = await dashboardUsers.find()
        .select("-password -forgotPasswordToken")
        .sort({ createdAt: -1 });
      return res.status(200).json(users);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Failed to fetch dashboard users" });
    }
  } else if (req.method === "DELETE") {
    try {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: "Missing id" });

      await dashboardUsers.findByIdAndDelete(id);
      return res.status(200).json({ message: "User deleted" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Failed to delete user" });
    }
  } else if (req.method === "PUT") {
    try {
      const { id } = req.query;
      const { email, username, role } = req.body;

      if (!id || !email || !username || !role) {
        return res.status(400).json({ error: "Missing fields" });
      }

      // Check for duplicates (excluding the user being updated)
      const duplicateUser = await dashboardUsers.findOne({
        _id: { $ne: id },
        $or: [{ email }, { username }],
      });

      if (duplicateUser) {
        return res.status(409).json({
          error:
            duplicateUser.email === email
              ? "Email already exists"
              : "Username already exists",
        });
      }

      const updatedUser = await dashboardUsers.findByIdAndUpdate(
        id,
        { email, username, role },
        { new: true, runValidators: true }
      ).select("-password -forgotPasswordToken");

      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      return res.status(200).json({ message: "User updated", user: updatedUser });
    } catch (error) {
      console.error("PUT error:", error);
      return res.status(500).json({ error: "Failed to update user" });
    }
  } else {
    res.setHeader("Allow", ["GET", "DELETE", "PUT"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default withAuth(handler, { roles: ["owner"] });
