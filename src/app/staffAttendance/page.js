"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { FiCalendar, FiArrowLeft, FiSearch, FiCheck, FiX } from "react-icons/fi";

export default function AttendancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);

  useEffect(() => {
    if (status === "authenticated" && session.user.role !== "owner") {
      router.push("/no-permission");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "owner") {
      loadData();
    }
  }, [status, session, selectedMonth, selectedYear]);

  function getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
  }

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/v1/attendance/get-monthly-attendance?month=${selectedMonth}&year=${selectedYear}`
      );
      const result = await res.json();
      setData(Array.isArray(result) ? result : []);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    const d = new Date(date);
    return `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-28">
      {/* Main Neo Card */}
      <div className="neo-card p-6 sm:p-8 bg-white mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-6 border-b-2 border-black">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/attendence")}
              className="neo-btn neo-btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5"
            >
              <FiArrowLeft size={15} />
              <span>Mark Attendance</span>
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
                Staff Monthly Attendance Matrix
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-gray-600">
                Full month calendar attendance heatmap for all employees
              </p>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl border-2 border-black bg-[#F4F4F0] mb-6">
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-black mb-1">
              Select Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="neo-input text-xs font-bold py-1.5 cursor-pointer"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString("default", { month: "long" })}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-black mb-1">
              Year
            </label>
            <input
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="neo-input text-xs font-bold py-1.5"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={loadData}
              disabled={loading}
              className="w-full py-2.5 neo-btn neo-btn-primary text-xs font-black flex items-center justify-center gap-1.5"
            >
              <FiSearch size={14} />
              <span>{loading ? "Loading..." : "Load Attendance Sheet"}</span>
            </button>
          </div>
        </div>

        {/* Table Matrix */}
        <div className="overflow-x-auto table-scrollbar border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#000]">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-[#F4F4F0] border-b-2 border-black font-black uppercase text-black">
              <tr>
                <th className="p-3 border-r border-black sticky left-0 bg-[#F4F4F0] z-20 text-center">S.No</th>
                <th className="p-3 border-r border-black sticky left-[48px] bg-[#F4F4F0] z-20 text-left">Staff Name</th>
                <th className="p-3 border-r border-black text-left">Role</th>
                {Array.from({ length: daysInMonth }, (_, i) => (
                  <th key={i + 1} className="p-1 border-r border-black text-center min-w-[28px]">
                    {i + 1}
                  </th>
                ))}
                <th className="p-3 border-r border-black text-center bg-[#D4FF00] text-black">Present</th>
                <th className="p-3 text-center bg-[#FF5A5F] text-white">Absent</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 font-bold">
              {loading ? (
                <tr>
                  <td colSpan={daysInMonth + 5} className="text-center p-8 font-black text-black">
                    Loading monthly attendance matrix...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={daysInMonth + 5} className="text-center p-8 text-gray-500 font-bold">
                    No attendance records found for this month.
                  </td>
                </tr>
              ) : (
                data.map((staff, idx) => {
                  const presentDays = staff.presentDates.map((d) =>
                    new Date(d).getDate()
                  );
                  const isExpanded = expandedRow === staff._id;

                  return (
                    <React.Fragment key={staff._id}>
                      <tr className="hover:bg-gray-50 transition">
                        <td className="p-3 border-r border-gray-200 text-center sticky left-0 bg-white z-10 font-mono">
                          {idx + 1}
                        </td>
                        <td
                          className="p-3 border-r border-gray-200 font-black text-black sticky left-[48px] bg-white z-10 cursor-pointer hover:underline"
                          onClick={() =>
                            setExpandedRow((prev) => (prev === staff._id ? null : staff._id))
                          }
                        >
                          {staff.name}
                        </td>
                        <td className="p-3 border-r border-gray-200 text-gray-700">
                          {staff.designation}
                        </td>
                        {Array.from({ length: daysInMonth }, (_, i) => {
                          const day = i + 1;
                          const isPresent = presentDays.includes(day);
                          return (
                            <td
                              key={day}
                              className={`p-1 border-r border-gray-200 text-center font-black ${
                                isPresent ? "bg-lime-100 text-emerald-800" : "bg-red-50 text-red-500"
                              }`}
                            >
                              {isPresent ? "P" : "A"}
                            </td>
                          );
                        })}
                        <td className="p-3 border-r border-gray-200 text-center font-mono font-black text-emerald-800">
                          {presentDays.length}
                        </td>
                        <td className="p-3 text-center font-mono font-black text-red-600">
                          {daysInMonth - presentDays.length}
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-[#F4F4F0] border-y-2 border-black">
                          <td colSpan={daysInMonth + 5} className="p-4 text-xs font-bold text-black">
                            <div className="space-y-2">
                              <p className="font-black text-sm">
                                📌 Attendance Record for {staff.name} ({staff.designation})
                              </p>
                              <div className="flex gap-4">
                                <span>Present Days: <strong>{presentDays.length}</strong></span>
                                <span>Absent Days: <strong>{daysInMonth - presentDays.length}</strong></span>
                              </div>
                              <div>
                                <span className="block font-black mb-1">Present Dates Logged:</span>
                                {presentDays.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5">
                                    {staff.presentDates.map((d, i) => (
                                      <span
                                        key={i}
                                        className="px-2 py-0.5 rounded border border-black bg-white font-mono text-[11px]"
                                      >
                                        {formatDate(d)}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-red-600">No present records logged.</span>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import React from "react";
