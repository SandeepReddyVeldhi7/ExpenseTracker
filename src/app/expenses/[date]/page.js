'use client'

import { useRouter, useParams } from 'next/navigation'
import { Poppins } from 'next/font/google'
import { FaArrowLeft, FaCashRegister, FaCoffee, FaGlassWhiskey, FaFileAlt } from 'react-icons/fa'
import { motion } from 'framer-motion'

const categories = [
  { id: 'casher1', label: 'Casher 1', icon: <FaCashRegister /> },
  { id: 'casher2', label: 'Casher 2', icon: <FaCashRegister /> },
    { id: 'casher3', label: 'Casher 3', icon: <FaCashRegister /> },
  { id: 'tea', label: 'Tea', icon: <FaCoffee /> },
  { id: 'juice', label: 'Juice', icon: <FaGlassWhiskey /> },
  { id: 'totalDetails', label: 'Total Report', icon: <FaFileAlt /> },
]

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export default function ExpensesForDate() {
  const router = useRouter()
  const { date } = useParams()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`relative min-h-screen bg-gradient-to-br from-black via-gray-800 to-lime-800 flex items-center justify-center p-4 ${poppins.className}`}
    >
      {/* Background: Use either a gradient or an image */}
      <div 
        className="absolute inset-0 bg-center bg-cover"
        style={{ 
          // OPTION 1: High quality image
          backgroundImage: "url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1950&q=80')",
          // OPTION 2: Or comment above and use gradient below
          // backgroundImage: 'linear-gradient(to bottom right, #000000, #1f4037, #99f2c8)',
        }} 
      />

      {/* Overlay to darken & blur background for readability */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Main content */}
      <div className="relative  w-full max-w-2xl z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-xl bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/30 shadow-2xl">
          
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="mb-6 flex  text-2xl items-center text-white hover:text-lime-400 transition"
          >
            <FaArrowLeft className="mr-2" /> 
          </button>

          {/* Heading */}
          <h1 className="text-xl md:text-3xl font-bold text-white mb-8 text-center tracking-wide drop-shadow">
            Expenses for <span className="text-lime-400">{date}</span>
          </h1>

          {/* Categories */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => router.push(`/expenses/${date}/${cat.id}`)}
                className="flex items-center justify-center gap-3 bg-white/20 hover:bg-white/40 border border-white/40 backdrop-blur-lg transition-all duration-300 p-5 rounded-xl text-lg font-semibold text-white shadow-lg hover:scale-105"
              >
                {cat.icon}
                {cat.label}
              </button>
            ))}
          </div>

        </div>
      </div>
    </motion.div>
  )
}
