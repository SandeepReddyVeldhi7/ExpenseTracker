

import { connectDB } from '@/lib/db';
import Attendance from '@/models/Attendance';

export default async function handler(req, res) {
await connectDB()

  if (req.method === 'POST') {
    try {
      const { date, records } = req.body;

      if (!date || !records || !Array.isArray(records)) {
        return res.status(400).json({ success: false, message: 'Invalid payload' });
      }

      const attendanceDate = new Date(date);

      // ❗ Check if attendance already exists for this date
      const existing = await Attendance.findOne({ date: attendanceDate });
      if (existing) {   
        return res.status(409).json({
          success: false,
          message: 'Attendance for this date has already been submitted.',
        });
      }

      const attendanceEntries = records.map(({ staff, status }) => ({
        staff,
        date: attendanceDate,
        status,
      }));

      await Attendance.insertMany(attendanceEntries);

      return res.status(200).json({ success: true, message: 'Attendance saved successfully' });
    } catch (error) {
      console.error('Error saving attendance:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
