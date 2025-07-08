'use client'

import { useEffect, useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import CreatableSelect from 'react-select/creatable'

import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default  function AddStaffForm() {
  const { data: session, status } = useSession();
  const [name, setName] = useState('')
  const [designation, setDesignation] = useState('')
  const [salary, setSalary] = useState('')

      
     const router = useRouter();
      useEffect(() => {
  if (status === "authenticated") {
    if (!session?.user?.role || session.user.role !== "owner") {
      router.push("/no-permission");
    }
  }
}, [status, session, router]);

   
     // ⏳ Loading skeleton
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
        <div className="space-y-4 w-full max-w-md">
          <div className="animate-pulse space-y-4 bg-gray-200 p-6 rounded-xl shadow-lg">
            <div className="h-6 bg-gray-300 rounded w-1/2 mx-auto mb-4"></div>
            <div className="h-10 bg-gray-300 rounded"></div>
            <div className="h-10 bg-gray-300 rounded"></div>
            <div className="h-10 bg-gray-300 rounded"></div>
            <div className="h-10 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    );
  }
   
     if (status === "unauthenticated") {
       return <p className="text-center mt-10">You must be logged in.</p>;
     }
   
     if (status === "authenticated" && (!session?.user?.role || session.user.role !== "owner")) {
  return null;
}

  

  
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
const toastId = toast.loading("Saving staff...");
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
    toast.success('Staff saved!',{id: toastId})
    setName('')
    setDesignation('')
    setSalary('')
  } else {
    const err = await res.json()
    toast.error( err.message ,{id: toastId})
  }
}


  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
     <Toaster/>
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
