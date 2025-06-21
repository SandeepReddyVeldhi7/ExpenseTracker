

import { connectDB } from '@/lib/db'
import Staff from '@/models/Staff'





export default async function handler(req, res) {
  await connectDB();

  if (req.method === 'GET') {
    try {
      const staffList = await Staff.find().sort({ createdAt: -1 });
      res.status(200).json(staffList);
    } catch (error) {
      console.error('❌ Failed to fetch staff:', error);
      res.status(500).json({ error: 'Failed to load staff' });
    }

  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Missing id' });

      await Staff.findByIdAndDelete(id);
      res.status(200).json({ message: 'Staff deleted' });
    } catch (error) {
      console.error('❌ Failed to delete staff:', error);
      res.status(500).json({ error: 'Failed to delete staff' });
    }

  } else if (req.method === 'PUT') {
  try {
    const { id } = req.query;
    const { name, designation, salary, active, remainingAdvance } = req.body;

    if (!id) return res.status(400).json({ error: 'Missing id' });
    if (!name || !designation || typeof salary !== 'number') {
      return res.status(400).json({ error: 'Missing or invalid fields' });
    }

    // Check if name already exists on another staff
    const existing = await Staff.findOne({ name, _id: { $ne: id } });
    if (existing) {
      return res.status(409).json({ error: 'Another staff with this name already exists' });
    }

    const updatedStaff = await Staff.findByIdAndUpdate(
      id,
      { name, designation, salary, active, remainingAdvance },
      { new: true }
    );

    res.status(200).json({ message: 'Staff updated successfully', staff: updatedStaff });

  } catch (error) {
    console.error('❌ Failed to update staff:', error);

    if (error.code === 11000 && error.keyPattern?.name) {
      return res.status(409).json({ error: 'Staff name must be unique' });
    }

    res.status(500).json({ error: 'Failed to update staff' });
  }

  }
  else {
    res.setHeader('Allow', ['GET', 'DELETE', 'PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

