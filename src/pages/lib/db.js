import mongoose from 'mongoose'

export async function connectDB() {
  if (mongoose.connection.readyState >= 1) return

  const MONGO_URI = process.env.MONGO_URI
  if (!MONGO_URI) throw new Error('MONGO_URI not defined in env')

  await mongoose.connect(MONGO_URI)
}
