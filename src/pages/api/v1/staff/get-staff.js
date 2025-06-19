// pages/api/v1/staff/get-staff.js

import { connectDB } from '@/pages/lib/db'
import Staff from '@/pages/models/Staff'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      await connectDB()

      const staffList = await Staff.find().sort({ createdAt: -1 })

      res.status(200).json(staffList)
    } catch (error) {
      console.error('❌ Failed to fetch staff:', error)
      res.status(500).json({ error: 'Failed to load staff' })
    }
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
