"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, use } from "react";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiXCircle,
  FiCalendar,
  FiCheck,
  FiX,
  FiUsers,
} from "react-icons/fi";
import toast, { Toaster } from "react-hot-toast";

export default function AttendanceForDate({ params }) {
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
        const res = await fetch("/api/v1/staff/get-staff");
        if (!res.ok) {
          throw new Error(`Failed to fetch staff. Status: ${res.status}`);
        }

        const data = await res.json();
        const activeStaff = (data || []).filter((s) => s.active === true);
        setStaffList(activeStaff);

        const initial = {};
        activeStaff.forEach((s) => {
          initial[s._id] = true; // Default to present for convenience
        });
        setAttendance(initial);
      } catch (error) {
        console.error("Error fetching staff:", error);
        toast.error("Failed to load staff list.");
      } finally {
        setLoading(false);
      }
    };

    fetchStaff();
  }, [date]);

  const handleToggle = (id) => {
    setAttendance((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleMarkAll = (status) => {
    const updated = {};
    staffList.forEach((s) => {
      updated[s._id] = status;
    });
    setAttendance(updated);
  };

  const handleSubmit = async () => {
    const noneMarked = Object.values(attendance).every((v) => v !== true);
    if (noneMarked && staffList.length > 0) {
      toast.error("Please mark at least one staff member as Present.");
      return;
    }

    const records = Object.entries(attendance).map(([staffId, isPresent]) => ({
      staff: staffId,
      status: isPresent ? "Present" : "Absent",
    }));

    const toastId = toast.loading("Submitting attendance...");
    setSubmitLoading(true);

    try {
      const res = await fetch("/api/v1/attendance/add-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, records }),
      });

      if (res.status === 409) {
        toast.error("Attendance already submitted for this date.", { id: toastId });
        router.push("/attendence");
      } else if (res.ok) {
        toast.success("Attendance submitted successfully!", { id: toastId });
        setTimeout(() => {
          router.push("/attendence");
        }, 800);
      } else {
        toast.error("Error submitting attendance.", { id: toastId });
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong!", { id: toastId });
    } finally {
      setSubmitLoading(false);
    }
  };

  const presentCount = Object.values(attendance).filter(Boolean).length;
  const absentCount = staffList.length - presentCount;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <Toaster position="top-right" />

      {/* Main Neo Card */}
      <div className="neo-card p-6 sm:p-8 bg-white mb-6">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b-2 border-black flex-wrap gap-3">
          <button
            onClick={() => router.push("/attendence")}
            className="neo-btn neo-btn-secondary px-3.5 py-2 text-xs flex items-center gap-1.5"
          >
            <FiArrowLeft size={16} />
            <span>Select Date</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="neo-badge bg-[#D4FF00] text-black">
              {date}
            </span>
          </div>
        </div>

        {/* Title & Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl border-2 border-black bg-[#00F0FF] shadow-[3px_3px_0px_0px_#000] flex items-center justify-center text-black">
              <FiCalendar size={26} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
                Daily Attendance Sheet
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-gray-600">
                Log presence, leaves, and attendance for all active staff members
              </p>
            </div>
          </div>
        </div>

        {/* Summary Badges & Quick Mark Buttons */}
        <div className="p-4 rounded-xl border-2 border-black bg-[#F4F4F0] mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 text-xs font-black rounded-lg border-2 border-black bg-white">
              Total Active: {staffList.length}
            </span>
            <span className="px-3 py-1 text-xs font-black rounded-lg border-2 border-black bg-[#D4FF00] text-black">
              Present: {presentCount}
            </span>
            <span className="px-3 py-1 text-xs font-black rounded-lg border-2 border-black bg-[#FF5A5F] text-white">
              Absent: {absentCount}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleMarkAll(true)}
              className="neo-btn neo-btn-primary px-2.5 py-1 text-xs font-black flex items-center gap-1"
            >
              <FiCheck size={14} /> All Present
            </button>
            <button
              onClick={() => handleMarkAll(false)}
              className="neo-btn neo-btn-secondary px-2.5 py-1 text-xs font-black flex items-center gap-1"
            >
              <FiX size={14} /> All Absent
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="font-black text-xs uppercase tracking-wider text-black">Loading Staff...</p>
          </div>
        ) : staffList.length === 0 ? (
          <p className="text-center text-gray-500 font-bold py-12">No active staff members found.</p>
        ) : (
          <div className="space-y-3">
            {staffList.map((staff) => {
              const isPresent = attendance[staff._id] || false;
              return (
                <div
                  key={staff._id}
                  onClick={() => handleToggle(staff._id)}
                  className={`p-4 rounded-xl border-2 border-black flex items-center justify-between cursor-pointer transition-all shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 ${
                    isPresent ? "bg-white hover:bg-lime-50/50" : "bg-[#FFF1F2]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full border-2 border-black flex items-center justify-center font-black text-sm ${
                        isPresent ? "bg-[#D4FF00] text-black" : "bg-[#FF5A5F] text-white"
                      }`}
                    >
                      {staff.name?.charAt(0) || "S"}
                    </div>
                    <div>
                      <h2 className="font-black text-base text-black tracking-tight">
                        {staff.name}
                      </h2>
                      <p className="text-xs font-bold text-gray-600">
                        {staff.designation || "Staff"}
                      </p>
                    </div>
                  </div>

                  {/* High-Contrast Neo-Brutalist Pill Toggle */}
                  <div
                    className={`px-4 py-1.5 rounded-full border-2 border-black text-xs font-black uppercase flex items-center gap-1.5 transition-all shadow-[1px_1px_0px_0px_#000] ${
                      isPresent
                        ? "bg-[#D4FF00] text-black"
                        : "bg-[#FF5A5F] text-white"
                    }`}
                  >
                    {isPresent ? <FiCheckCircle size={15} /> : <FiXCircle size={15} />}
                    <span>{isPresent ? "PRESENT" : "ABSENT"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Submit Action */}
        <div className="mt-8 pt-4 border-t-2 border-black">
          <button
            onClick={handleSubmit}
            disabled={submitLoading || loading || staffList.length === 0}
            className="w-full py-4 neo-btn neo-btn-primary text-base font-black flex items-center justify-center gap-2"
          >
            <span>{submitLoading ? "Submitting Attendance..." : "🚀 Submit Attendance Sheet"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
