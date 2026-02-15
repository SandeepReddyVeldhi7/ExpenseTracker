import { connectDB } from "@/lib/db";
import SalaryPayment from "@/models/SalaryPayment";
import Staff from "@/models/Staff";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method Not Allowed" });

  try {
    await connectDB();

    const { start, end } = req.query;

    const records = await SalaryPayment.find({
      attendanceStart: start,
      attendanceEnd: end,
    }).populate("staff");

    return res.status(200).json(records);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}
