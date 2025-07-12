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

  const [adjustments, setAdjustments] = useState({});
  const [confirmedData, setConfirmedData] = useState({});

  // ✅ Redirect if not owner
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "owner") {
      router.push("/no-permission");
    }
  }, [status, session, router]);

  // ✅ Load on mount
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

  // ✅ Loader function
  const loadStaffWithAdvances = async (m, y) => {
    setLoading(true);
    try {
      // 1. Get system advances
      let url = "/api/v1/staff/with-advances";
      if (m && y) url += `?month=${m}&year=${y}`;
      const res = await fetch(url);
      const data = await res.json();
      setStaffData(data);

      // 2. Get confirmed advances
      const confirmedRes = await fetch(`/api/v1/staff/advances/confirmed?month=${m}&year=${y}`);
      const confirmed = await confirmedRes.json();
      const map = {};
      confirmed.forEach((item) => {
        map[item.staff._id] = item;
      });
      setConfirmedData(map);

      // 3. Initialize adjustment inputs from existing confirmed
      const adjMap = {};
      confirmed.forEach((item) => {
        adjMap[item.staff._id] = item.ownerAdjustment;
      });
      setAdjustments(adjMap);

    } catch (err) {
      console.error(err);
      toast.error("Error loading data");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Confirm handler with validation + confirm dialog
  const handleConfirm = async (staffId, systemAdvance, adjustmentValue) => {
    if (adjustmentValue === "" || adjustmentValue === null || adjustmentValue === undefined) {
      toast.error("Please enter an adjustment amount (even 0).");
      return;
    }

    const adjustment = parseFloat(adjustmentValue);

    if (isNaN(adjustment)) {
      toast.error("Invalid adjustment. Enter a number.");
      return;
    }

    const confirmed = Math.max(0, systemAdvance + adjustment);

    const isOk = window.confirm(
      `Are you sure you want to confirm this advance?\n\nSystem Advance: ₹${systemAdvance}\nOwner Adjustment: ₹${adjustment}\nFinal Confirmed Advance: ₹${confirmed}`
    );
    if (!isOk) return;

    const toastId = toast.loading("Saving confirmation...");
    try {
      const res = await fetch('/api/v1/staff/advances/confirmed/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId,
          month,
          year,
          systemCalculatedAdvance: systemAdvance,
          ownerAdjustment: adjustment,
          confirmedAdvance: confirmed
        })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        toast.success("Confirmed advance saved!", { id: toastId });
        loadStaffWithAdvances(month, year);
      } else {
        toast.error(result.message || "Failed to save", { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error("Error saving confirmation", { id: toastId });
    }
  };

  // ✅ Filter handlers
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

  // ✅ Guards
  if (status === "unauthenticated") {
    return <p className="text-center mt-10">You must be logged in.</p>;
  }
  if (status === "authenticated" && session?.user?.role !== "owner") {
    return null;
  }

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
              <th className="p-2 border">System Advances</th>
              <th className="p-2 border">Owner Adjustment</th>
              <th className="p-2 border">Confirmed Advance</th>
              <th className="p-2 border">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="p-2 border">
                      <div className="h-4 bg-gray-300 rounded w-3/4 mx-auto"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : staffData.length > 0 ? (
              staffData.map((s, idx) => {
                const existing = confirmedData[s._id];
                const systemAdvance = s.totalAdvance;
                const adjustment = adjustments[s._id] ?? (existing?.ownerAdjustment ?? 0);
                const confirmed = Math.max(0, systemAdvance + (parseFloat(adjustment) || 0));

                return (
                  <tr key={s._id}>
                    <td className="p-2 border text-center">{idx + 1}</td>
                    <td className="p-2 border">{s.name}</td>
                    <td className="p-2 border">{s.designation}</td>
                    <td className="p-2 border text-right">
                      ₹ {systemAdvance.toLocaleString("en-IN")}
                    </td>
                    <td className="p-2 border text-right">
                      <input
                        type="number"
                        value={adjustment}
                        onChange={(e) =>
                          setAdjustments((prev) => ({
                            ...prev,
                            [s._id]: e.target.value
                          }))
                        }
                        className="border p-1 w-24 rounded text-xs text-right"
                        disabled={!!existing}
                      />
                    </td>
                    <td className="p-2 border text-right">
                      ₹ {confirmed.toLocaleString("en-IN")}
                    </td>
                    <td className="p-2 border text-center">
                      {existing ? (
                        <span className="px-3 py-1 bg-gray-500 text-white rounded text-xs cursor-default">
                          ✅ Confirmed
                        </span>
                      ) : (
                        <button
                          onClick={() =>
                            handleConfirm(s._id, systemAdvance, adjustment)
                          }
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                        >
                          Confirm
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7" className="text-center p-4 text-gray-500">
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
