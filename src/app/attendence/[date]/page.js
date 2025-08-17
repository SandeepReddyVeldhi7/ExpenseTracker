"use client"
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { use } from 'react';
import toast, { Toaster } from 'react-hot-toast';
export default function AttendanceForDate({params}) {

  const router = useRouter();
    const { date } = use(params);

    console.log("date",date)
  const [staffList, setStaffList] = useState([]);
  console.log("staffList",staffList)
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
      console.log("data",data)
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
    console.log("id",id)
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
    } else {
      toast.error("Error submitting attendance.", { id: toastId });
    }
  } catch (error) {
    toast.error("Something went wrong!", { id: toastId });
  }
};





  return (
   <div className="min-h-[90vh] bg-gradient-to-br from-black via-gray-800 to-lime-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 pb-20 w-full max-w-3xl">
               <Toaster position="top-center" reverseOrder={false} />
        <h1 className="text-xl font-bold text-gray-800 mb-6 text-center">
          Mark Attendance for {date}
        </h1>

        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-400 rounded-lg overflow-hidden">
            <thead className="">
              <tr>
                <th className="px-4 py-2 border text-black">Name</th>
                <th className="px-4 py-2 border text-black">Designation</th>
                <th className="px-4 py-2 border text-center text-black">Present</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((staff) => (
                <tr key={staff._id} className="text-center text-[black]">
                  <td className="px-4 py-2 border">{staff.name}</td>
                  <td className="px-4 py-2 border">{staff.designation}</td>
                  <td className="px-4 py-2 border">
                    <input
                      type="checkbox"
                      checked={attendance[staff._id] || false}
                      onChange={() => handleToggle(staff._id)}
                      className="w-5 h-5"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          onClick={handleSubmit}
          className="mt-6 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
        >
          Submit Attendance
        </button>
      </div>
    </div>
  );
}
