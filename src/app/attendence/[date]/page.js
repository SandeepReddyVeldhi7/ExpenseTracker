"use client"
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { use } from 'react';
import toast, { Toaster } from 'react-hot-toast';
export default function AttendanceForDate({params}) {

  const router = useRouter();
    const { date } = use(params);
const [submitLoading, setSubmitLoading] = useState(false);
  
  const [staffList, setStaffList] = useState([]);
  
  const [attendance, setAttendance] = useState({});
const [loading, setLoading] = useState(true);

useEffect(() => {
  if (!date) return;

  const fetchStaff = async () => {
    
    try {

       setLoading(true);
      const res = await fetch('/api/v1/staff/get-staff');
      if (!res.ok) {
        throw new Error(`Failed to fetch staff. Status: ${res.status}`);
      }

      const data= await res.json();
    
      setStaffList(data?.filter((staff) => staff.active===true));

      const initial = {};
      data.forEach((staff) => {
        initial[staff._id] = false;
      });
      setAttendance(initial);
    } catch (error) {
      console.error('Error fetching staff:', error);
      alert('Failed to load staff list.');
    }finally {
    setLoading(false); // stop loading regardless of success or error
  }
  };

  fetchStaff();
}, [date]);


if (loading) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-md space-y-4">
        <div className="h-6 bg-gray-300 rounded animate-pulse w-2/3 mx-auto"></div>

        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border rounded-lg shadow-sm animate-pulse">
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-300 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </div>
            <div className="h-5 w-5 bg-gray-300 rounded"></div>
          </div>
        ))}

        <div className="h-10 bg-gray-300 rounded animate-pulse"></div>
      </div>
    </div>
  );
}


  const handleToggle = (id) => {
 
    setAttendance({
      ...attendance,
      [id]: !attendance[id],
    });
  };



// inside AttendanceForDate component

const handleSubmit = async () => {
  // ✅ Check properly
  const noneMarked = Object.values(attendance).every(v => v !== true);
  if (noneMarked) {
    toast.error("Please mark at least one staff member as Present.");
    return;
  }

  const records = Object.entries(attendance).map(([staffId, isPresent]) => ({
    staff: staffId,
    status: isPresent ? 'Present' : 'Absent',
  }));

  const toastId = toast.loading("Submitting attendance...");
setSubmitLoading(true);
  try {
    const res = await fetch('/api/v1/attendance/add-attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, records }),
    });

    if (res.status === 409) {
      toast.error("Attendance already submitted for this date.", { id: toastId });
      router.push("/");
    } else if (res.ok) {
      toast.success("Attendance submitted successfully!", { id: toastId });
      setTimeout(() => {
        router.push("/attendence");
      }, 1000);
    } else {
      toast.error("Error submitting attendance.", { id: toastId });
    }
  } catch (error) {
    toast.error("Something went wrong!", { id: toastId });
  }finally {
    setSubmitLoading(false);
  }
};


return (
  <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-lime-900 py-10 px-4">
    <Toaster position="top-center" />

    <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-2xl p-8">
      
      <h1 className="text-2xl font-bold text-gray-800 text-center mb-2">
        Mark Attendance
      </h1>
      <p className="text-center text-gray-500 mb-8">
        Date: <span className="font-semibold text-gray-700">{date}</span>
      </p>

      {/* Staff List */}
      <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-2">
        {staffList.map((staff) => (
          <div
            key={staff._id}
            className="flex items-center justify-between p-5 rounded-2xl border shadow-sm hover:shadow-md transition bg-gray-50"
          >
            <div>
              <h2 className="font-semibold text-gray-800">
                {staff.name}
              </h2>
              <p className="text-sm text-gray-500">
                {staff.designation}
              </p>
            </div>

            {/* Toggle Switch */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={attendance[staff._id] || false}
                onChange={() => handleToggle(staff._id)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-green-500 transition"></div>
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-5"></div>
            </label>
          </div>
        ))}
      </div>

      {/* Submit Button */}
      <div className="mt-8">
        <button
          onClick={handleSubmit}
          disabled={submitLoading}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition shadow-md hover:shadow-lg"
        >
      {submitLoading ? "Submitting..." : "Submit Attendance"}
        </button>
      </div>
    </div>
  </div>
);



  // return (
  //  <div className="min-h-[90vh] lg: bg-gradient-to-br from-black via-gray-800 to-lime-800 flex items-center justify-center p-4">
  //     <div className="bg-white rounded-2xl shadow-xl p-8 pb-20 w-full max-w-3xl">
  //              <Toaster position="top-center" reverseOrder={false} />
  //       <h1 className="text-xl font-bold text-gray-800 mb-6 text-center">
  //         Mark Attendance for {date}
  //       </h1>

  //       <div className="overflow-x-auto">
  //         <table className="min-w-full border border-gray-400 rounded-lg overflow-hidden">
  //           <thead className="">
  //             <tr>
  //               <th className="px-4 py-2 border text-black">Name</th>
  //               <th className="px-4 py-2 border text-black">Designation</th>
  //               <th className="px-4 py-2 border text-center text-black">Present</th>
  //             </tr>
  //           </thead>
  //           <tbody>
  //             {staffList.map((staff) => (
  //               <tr key={staff._id} className="text-center text-[black]">
  //                 <td className="px-4 py-2 border">{staff.name}</td>
  //                 <td className="px-4 py-2 border">{staff.designation}</td>
  //                 <td className="px-4 py-2 border">
  //                   <input
  //                     type="checkbox"
  //                     checked={attendance[staff._id] || false}
  //                     onChange={() => handleToggle(staff._id)}
  //                     className="w-5 h-5"
  //                   />
  //                 </td>
  //               </tr>
  //             ))}
  //           </tbody>
  //         </table>
  //       </div>

  //       <button
  //         onClick={handleSubmit}
  //         className="mt-6 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
  //       >
  //         Submit Attendance
  //       </button>
  //     </div>
  //   </div>
  // );
}
