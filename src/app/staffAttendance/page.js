"use client";

import { useEffect, useState } from "react";

export default function AttendancePage() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);

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

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear]);

  const formatDate = (date) => {
    const d = new Date(date);
    return `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`;
  };

  return (
    <div className="p-4 min-h-screen bg-gray-100">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 text-center">
        📅 Staff Monthly Attendance
      </h1>

      <div className="flex flex-wrap gap-4 mb-6 justify-center">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          className="border rounded p-2"
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(0, i).toLocaleString("default", { month: "long" })}
            </option>
          ))}
        </select>

        <input
          type="number"
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          className="border rounded p-2 w-24"
        />

        <button
          onClick={loadData}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Load
        </button>
      </div>

      {loading ? (
        <p className="text-center text-gray-600">Loading...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg shadow bg-white">
          <table className="min-w-[900px] w-full text-xs sm:text-sm border-collapse">
            <thead className="bg-gray-300 sticky top-0 z-10">
              <tr>
                <th className="border p-2">S.no</th>
                <th className="border p-2">Name</th>
                <th className="border p-2">Designation</th>
                {Array.from({ length: daysInMonth }, (_, i) => (
                  <th key={i + 1} className="border p-1 text-center">
                    {i + 1}
                  </th>
                ))}
                <th className="border p-2">Present</th>
                <th className="border p-2">Absent</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={daysInMonth + 5} className="text-center p-4">
                    No attendance records found.
                  </td>
                </tr>
              ) : (
                data.map((staff, idx) => {
                  const presentDays = staff.presentDates.map((d) =>
                    new Date(d).getDate()
                  );
                  const isExpanded = expandedRow === staff._id;

                  return (
                    <>
                      <tr
                        key={staff._id}
                        className="text-center hover:bg-gray-50"
                      >
                        <td className="border p-1">{idx + 1}</td>
                        <td
                          className={`border p-1 font-medium cursor-pointer ${
                            isExpanded ? "bg-blue-100" : "hover:bg-blue-50"
                          }`}
                          onClick={() =>
                            setExpandedRow((prev) =>
                              prev === staff._id ? null : staff._id
                            )
                          }
                        >
                          {staff.name}
                        </td>
                        <td className="border p-1">{staff.designation}</td>
                        {Array.from({ length: daysInMonth }, (_, i) => {
                          const day = i + 1;
                          const isPresent = presentDays.includes(day);
                          return (
                            <td
                              key={day}
                              className={`border p-1 ${
                                isPresent ? "bg-green-300" : "bg-red-200"
                              }`}
                            >
                              {isPresent ? "✔️" : "❌"}
                            </td>
                          );
                        })}
                        <td className="border p-1 text-green-700 font-bold">
                          {presentDays.length}
                        </td>
                        <td className="border p-1 text-red-700 font-bold">
                          {daysInMonth - presentDays.length}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-blue-50">
                          <td
                            colSpan={daysInMonth + 5}
                            className="p-3 text-left text-xs sm:text-sm"
                          >
                            <div>
                              <p className="font-semibold mb-2">
                                📌 Details for {staff.name}
                              </p>
                              <p>
                                <strong>Designation:</strong> {staff.designation}
                              </p>
                              <p>
                                <strong>Total Present:</strong>{" "}
                                {presentDays.length}
                              </p>
                              <p>
                                <strong>Total Absent:</strong>{" "}
                                {daysInMonth - presentDays.length}
                              </p>
                              <div className="mt-2">
                                <strong>Present Dates:</strong>
                                {presentDays.length > 0 ? (
                                  <ul className="list-disc list-inside">
                                    {staff.presentDates.map((d, i) => (
                                      <li key={i}>{formatDate(d)}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-red-600">
                                    No present records.
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}