'use client'

import { useState } from 'react'
import CreatableSelect from 'react-select/creatable'

export default function AddStaffForm() {
  const [name, setName] = useState('')
  const [designation, setDesignation] = useState('')
  const [salary, setSalary] = useState('')

  const designationOptions = [
    { value: 'Waiter', label: 'Waiter' },
    { value: 'Cook', label: 'Cook' },
    { value: 'Cleaner', label: 'Cleaner' },
    { value: 'Manager', label: 'Manager' },
    { value: 'Cashier', label: 'Cashier' },
    { value: 'Other', label: 'Other' },
  ]

 const handleSubmit = async (e) => {
  e.preventDefault()

  const res = await fetch('/api/v1/staff/add-staff', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      designation,
      salary: parseFloat(salary),
    }),
  })

  if (res.ok) {
    alert('✅ Staff saved!')
    setName('')
    setDesignation('')
    setSalary('')
  } else {
    const err = await res.json()
    alert('❌ Failed: ' + err.error)
  }
}


  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-500 p-6 rounded-xl shadow-lg w-full max-w-md space-y-4"
      >
        <h1 className="text-2xl font-bold text-center text-blue-700">Add Staff</h1>

        {/* Name Input */}
        <div>
          <label className="block text-black text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full p-2 border rounded"
            placeholder="e.g. Ravi Kumar"
          />
        </div>

        {/* Designation (Creatable Dropdown) */}
        <div>
          <label className="block text-sm text-black font-medium mb-1">Designation</label>
          <CreatableSelect
            isClearable
            options={designationOptions}
            className='text-black'
            value={designation ? { value: designation, label: designation } : null}
            onChange={(selected) => setDesignation(selected ? selected.value : '')}
            placeholder="Select or create designation..."
          />
        </div>

        {/* Salary Input */}
        <div>
          <label className="block text-sm font-medium mb-1">Salary (₹)</label>
          <input
            type="number"
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
            required
            min="0"
            className="w-full p-2 border rounded"
            placeholder="e.g. 15000"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition"
        >
           Save Staff
        </button>
      </form>
    </div>
  )
}
