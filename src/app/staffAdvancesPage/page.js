"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

export default function StaffWithAdvancesPage() {
     const { data: session, status } = useSession();
    const router = useRouter();
  const [staffData, setStaffData] = useState([]);
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(false);
  // ✅ Redirect unauthorized
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "owner") {
      router.push("/no-permission");
    }
  }, [status, session, router]);

  // ✅ Load data only if authorized
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "owner") {
      const now = new Date();
      const thisMonth = now.getMonth() + 1;
      const thisYear = now.getFullYear();
      setMonth(thisMonth);
      setYear(thisYear);
      loadStaffWithAdvances(thisMonth, thisYear);
    }
  }, [status, session]);

  // ✅ Render guards after all hooks
  if (status === "loading") {
    return <p className="text-center mt-10">Loading...</p>;
  }

  if (status === "unauthenticated") {
    return <p className="text-center mt-10">You must be logged in.</p>;
  }

  if (status === "authenticated" && session?.user?.role !== "owner") {
    return null;
  }


  // ✅ Unified load function
  const loadStaffWithAdvances = async (m, y) => {
    setLoading(true);
    try {
      let url = "/api/v1/staff/with-advances";
      if (m && y) {
        url += `?month=${m}&year=${y}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setStaffData(data);
    } catch (err) {
      console.error(err);
      toast.error("Error loading data");
    } finally {
      setLoading(false);
    }
  };

 

  const handleFilter = () => {
 
    if (!month || !year) {
      toast.error("Please select both month and year");
      return;
    }
    loadStaffWithAdvances(month, year);
  };

  const handleClear = () => {
    const now = new Date();
    const thisMonth = now.getMonth() + 1;
    const thisYear = now.getFullYear();
    setMonth(thisMonth);
    setYear(thisYear);
    loadStaffWithAdvances(thisMonth, thisYear);
    toast.success("Reset to current month");
  };

  return (
<div className="min-h-screen max-w-6xl mx-auto sm:mt-6 flex flex-col p-2 sm:p-4 border rounded overflow-y-auto pb-24">

      <h1 className="text-xl sm:text-2xl font-bold mb-4">
        👥 Staff Advances Summary
      </h1>
      <Toaster />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div>
          <label className="text-sm">Month:</label>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border p-1 rounded ml-2"
          >
            <option value="">--Select--</option>
            {[...Array(12)].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(0, i).toLocaleString("default", { month: "long" })}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm">Year:</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="e.g. 2024"
            className="border p-1 rounded ml-2"
          />
        </div>

        <button
          onClick={handleFilter}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          Apply Filter
        </button>

        <button
          onClick={handleClear}
          className="px-4 py-2 bg-gray-400 text-black rounded hover:bg-gray-500 text-sm"
        >
          Clear Filter
        </button>
      </div>

      {/* Info */}
      <h2 className="text-lg mb-4 font-semibold">
        Showing advances for:{" "}
        {month && year
          ? `${new Date(year, month - 1).toLocaleString("default", {
              month: "long",
            })} ${year}`
          : "All time"}
      </h2>

      {/* Table */}
      <div className="w-full overflow-x-auto">
<table className="w-full border border-collapse border-black text-xs sm:text-sm">
          <thead className="bg-gray-400 text-black">
            <tr>
              <th className="p-2 border">S.no</th>
              <th className="p-2 border">Name</th>
              <th className="p-2 border">Designation</th>
              <th className="p-2 border">Total Advances</th>
            </tr>
          </thead>
          <tbody>
            {staffData.length > 0 ? (
              staffData.map((s, idx) => (
                <tr key={s._id}>
                  <td className="p-2 border text-center">{idx + 1}</td>
                  <td className="p-2 border">{s.name}</td>
                  <td className="p-2 border">{s.designation}</td>
                  <td className="p-2 border text-right">₹ {s.totalAdvance.toLocaleString("en-IN")}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="text-center p-4 text-gray-500">
                  No staff data.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

     
    </div>
  );
}
