import { connectDB } from "@/pages/lib/db"
import Expense from "@/pages/models/Expense"


export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' })

  const { date, category } = req.query

  try {
    await connectDB()

    const existing = await Expense.findOne({ date, category })
    if (existing) {
      return res.status(200).json({ exists: true })
    }

    return res.status(200).json({ exists: false })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: 'Server error' })
  }
}
