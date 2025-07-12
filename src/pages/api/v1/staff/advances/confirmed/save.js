import { connectDB } from "@/lib/db";
import ConfirmedAdvance from "@/models/ConfirmedAdvance";
import { getServerSession } from "next-auth";

export default async function handler(req, res) {
  await connectDB();

  if (req.method === 'POST') {
    

    const {
      staffId,
      month,
      year,
      systemCalculatedAdvance,
      ownerAdjustment,
      confirmedAdvance
    } = req.body;

    if (
      !staffId ||
      !month ||
      !year ||
      systemCalculatedAdvance === undefined ||
      ownerAdjustment === undefined ||
      confirmedAdvance === undefined
    ) {
      return res.status(400).json({ message: 'Missing fields' });
    }

    try {
      const result = await ConfirmedAdvance.findOneAndUpdate(
        { staff: staffId, month, year },
        {
          staff: staffId,
          month,
          year,
          systemCalculatedAdvance,
          ownerAdjustment,
          confirmedAdvance,
          confirmedBy: session.user._id,
          confirmedAt: new Date(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      res.status(200).json({ success: true, record: result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
