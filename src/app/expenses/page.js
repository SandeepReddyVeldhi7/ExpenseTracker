'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import DatePicker from 'react-datepicker'
import { FaRegCalendarAlt } from 'react-icons/fa'

import 'react-datepicker/dist/react-datepicker.css'

export default function ExpensesHome() {
  const [selectedDate, setSelectedDate] = useState(null)
  const router = useRouter()

  const handleNext = () => {
    if (selectedDate) {
const formatted = selectedDate.toLocaleDateString('en-CA');

      router.push(`/expenses/${formatted}`)
    }
  }

  return (
    <div className="min-h-[90vh] bg-gradient-to-br from-black via-gray-800 to-lime-800 flex items-center justify-center p-4 ">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          Select Expense Date
        </h1>

        <div className="relative mb-6">
          <FaRegCalendarAlt className="absolute left-3 top-3 text-gray-500 text-lg" />
          <DatePicker
            selected={selectedDate}
            onChange={(date) => setSelectedDate(date)}
            placeholderText="Pick a date"
            dateFormat="yyyy-MM-dd"
            maxDate={new Date()}
            className="w-full text-black pl-10 pr-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={handleNext}
          disabled={!selectedDate}
          className={`w-full py-3 rounded-xl text-white font-semibold transition 
            ${selectedDate ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}
        >
          Continue
        </button>
      </div>
    </div>
  )
}
