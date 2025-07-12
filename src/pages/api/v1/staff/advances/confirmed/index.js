import { connectDB } from "@/lib/db";
import ConfirmedAdvance from "@/models/ConfirmedAdvance";


export default async function handler(req, res) {
  await connectDB();

  if (req.method === 'GET') {
    try {
      const { month, year } = req.query;
      if (!month || !year) {
        return res.status(400).json({ message: 'Month and year required' });
      }

      const advances = await ConfirmedAdvance.find({ month, year })
        .populate('staff', 'name designation')
        .lean();

      res.status(200).json(advances);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
