import { connectDB } from "@/lib/db";
import Staff from "@/models/Staff";
import { withAuth } from "@/lib/apiAuth";

async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  await connectDB();
  const staff = await Staff.find({ status: { $ne: "inactive" } }, "_id name").lean();
  return res.status(200).json(staff);
}

export default withAuth(handler, { roles: ["owner", "staff", "staff123"] });
