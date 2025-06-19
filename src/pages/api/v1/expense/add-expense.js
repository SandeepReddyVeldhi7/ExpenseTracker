import { connectDB } from "@/lib/db"
import Expense from "@/models/Expense"

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Only POST method is allowed' })
  }

  try {
    await connectDB()
    const data = req.body

    const newExpense = new Expense(data)
    await newExpense.save()

    return res.status(201).json({ message: 'Expense recorded', expense: newExpense })
  } catch (error) {
    console.error('Error saving expense:', error)
    return res.status(500).json({ message: 'Internal Server Error', error: error.message })
  }
}
