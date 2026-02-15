import { connectDB } from "@/lib/db";
import SalaryPayment from "@/models/SalaryPayment";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method Not Allowed" });

  try {
    await connectDB();

    const {
      staff,
      startDate,
      endDate,
      presentDays,
      earnedSalary,
      advances,
      ownerAdjust,
      paidAmount,
    } = req.body;

    const lastPay = await SalaryPayment.findOne({ staff }).sort({ createdAt: -1 });
    const previousCarryForward = lastPay?.newCarryForward || 0;

    const totalAvailable =
  Math.round((earnedSalary - advances + ownerAdjust - previousCarryForward) * 100) / 100;

const newCarryForward =
  Math.round((totalAvailable - paidAmount) * 100) / 100;


    await SalaryPayment.create({
      staff,
      presentDays,
      earnedSalary,
      advances,
      previousCarryForward,
      totalAvailable,
      payable: totalAvailable,
      paidAmount,
      newCarryForward,
      attendanceStart: startDate,
      attendanceEnd: endDate,
    });

    return res.status(200).json({ message: "Paid & saved" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}
