import { connectDB } from "@/lib/db";
import Staff from "@/models/Staff";


export default async function handler(req, res) {
  await connectDB();
  const staff = await Staff.find({}, "_id name"); // ✅ only needed fields
  res.status(200).json(staff);
}