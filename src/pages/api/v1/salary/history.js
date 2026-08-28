import { connectDB } from "@/lib/db";
import SalaryPayment from "@/models/SalaryPayment";
import Staff from "@/models/Staff";
import { withAuth } from "@/lib/apiAuth";

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method Not Allowed" });

  try {
    await connectDB();

    const { start, end } = req.query;

    const query = {};
    if (start && end) {
      query.attendanceStart = start;
      query.attendanceEnd = end;
    }

    const records = await SalaryPayment.find(query)
      .populate("staff", "name salary role status")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(records);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
}

export default withAuth(handler, { roles: ["owner"] });
