

import { connectDB } from "@/lib/db";
import { User } from "@/models/User";





export default async function handler(req, res) {
  await connectDB();

  if (req.method === "GET") {
    try {
      const users = await User.find().sort({ createdAt: -1 });
      res.status(200).json(users);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  } 
  else if (req.method === "DELETE") {
    try {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: "Missing id" });
      await User.findByIdAndDelete(id);
      res.status(200).json({ message: "User deleted" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  } 
  else if (req.method === "PUT") {
    try {
      const { id } = req.query;
      const { email, username, role } = req.body;
      if (!id || !email || !username || !role) {
        return res.status(400).json({ error: "Missing fields" });
      }

      const duplicateUser = await User.findOne({
        _id: { $ne: id },
        $or: [{ email }, { username }],
      });

      if (duplicateUser) {
        return res.status(409).json({
          error: duplicateUser.email === email ? "Email already exists" : "Username already exists",
        });
      }

      const updatedUser = await User.findByIdAndUpdate(
        id,
        { email, username, role },
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      return res.status(200).json({ message: "User updated", user: updatedUser });
    } catch (error) {
      console.error("PUT error:", error);
      return res.status(500).json({ error: "Failed to update user" });
    }
  } 
  else {
    res.setHeader("Allow", ["GET", "DELETE", "PUT"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}


