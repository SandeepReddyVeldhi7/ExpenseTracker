"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

export default function StaffWithAdvancesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [staffData, setStaffData] = useState([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1); // keep as NUMBER
  const [year, setYear] = useState(new Date().getFullYear());    // keep as NUMBER
  const [loading, setLoading] = useState(false);

  // Per-staff adjustment state: { [staffId]: { type: "add" | "sub", amount: string } }
  const [adjustRows, setAdjustRows] = useState({});
  // Map of confirmed docs keyed by staffId
  const [confirmedData, setConfirmedData] = useState({});

  // Redirect if not owner
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "owner") {
      router.push("/no-permission");
    }
  }, [status, session, router]);

  // Load on mount
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "owner") {
      loadStaffWithAdvances(month, year);
    }
  }, [status, session]);

  // Loader
  const loadStaffWithAdvances = async (m, y) => {
    setLoading(true);
    try {
      const mm = Number(m);
      const yy = Number(y);

      // 1) system advances
      let url = "/api/v1/staff/with-advances";
      if (mm && yy) url += `?month=${mm}&year=${yy}`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      const rows = Array.isArray(data) ? data : [];
      setStaffData(rows);

      // 2) confirmed advances (gate Pay button in Pay page)
      const confirmedRes = await fetch(`/api/v1/staff/advances/confirmed?month=${mm}&year=${yy}`, { cache: "no-store" });
      const confirmedList = (await confirmedRes.json()) || [];
      const cMap = {};
      confirmedList.forEach((doc) => {
        if (doc?.staff?._id) cMap[doc.staff._id] = doc;
      });
      setConfirmedData(cMap);

      // 3) init adjust rows from existing confirms
      const initAdjust = {};
      confirmedList.forEach((doc) => {
        if (!doc?.staff?._id) return;
        const adj = Number(doc.ownerAdjustment) || 0;
        initAdjust[doc.staff._id] = {
          type: adj < 0 ? "sub" : "add",
          amount: String(Math.abs(adj)), // positive string for input
        };
      });
      setAdjustRows((prev) => ({ ...prev, ...initAdjust }));
    } catch (err) {
      console.error(err);
      toast.error("Error loading data");
    } finally {
      setLoading(false);
    }
  };

  // Helpers
  const getAdjFor = (staffId) => {
    const row = adjustRows[staffId] || { type: "add", amount: "" };
    const abs = Math.max(0, Number(row.amount) || 0);
    return row.type === "sub" ? -abs : abs; // signed adjustment
  };

  const previewConfirmed = (sys, signedAdj) => {
    const base = Math.max(0, (Number(sys) || 0) + (Number(signedAdj) || 0));
    return Math.round(base * 1.5); // your 1.5x rule
  };

  // Confirm handler
  const handleConfirm = async (staffId, systemAdvance) => {
    const signedAdj = getAdjFor(staffId);
    const sys = Number(systemAdvance) || 0;
    const confirmed = previewConfirmed(sys, signedAdj);

    // Show a clear confirm dialog
    const msg =
      `Confirm this advance?\n\n` +
      `System Advance:  ₹${sys.toLocaleString("en-IN")}\n` +
      `Owner Adjustment: ${signedAdj >= 0 ? "+" : ""}₹${Math.abs(signedAdj).toLocaleString("en-IN")}\n` +
      `\nFinal (1.5×):   ₹${confirmed.toLocaleString("en-IN")}`;
    if (!window.confirm(msg)) return;

    const toastId = toast.loading("Saving confirmation...");
    try {
      const res = await fetch("/api/v1/staff/advances/confirmed/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId,
          month: Number(month),
          year: Number(year),
          systemCalculatedAdvance: sys,
          ownerAdjustment: signedAdj, // <<< only number, sign handled here
        }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        toast.success("Confirmed advance saved!", { id: toastId });
        // refresh so Pay page can see this too
        loadStaffWithAdvances(month, year);
      } else {
        toast.error(result.message || "Failed to save", { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error("Error saving confirmation", { id: toastId });
    }
  };

  // Filters
  const handleFilter = () => {
    if (!month || !year) {
      toast.error("Please select both month and year");
      return;
    }
    loadStaffWithAdvances(Number(month), Number(year));
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

  // Guards
  if (status === "unauthenticated") {
    return <p className="text-center mt-10">You must be logged in.</p>;
  }
  if (status === "authenticated" && session?.user?.role !== "owner") {
    return null;
  }

  return (
    <div className="min-h-screen max-w-6xl mx-auto sm:mt-12 flex flex-col p-2 sm:p-4 border rounded overflow-y-auto pb-24">
      <h1 className="text-xl sm:text-2xl font-bold mb-4">👥 Staff Advances Summary</h1>
      <Toaster />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div>
          <label className="text-sm">Month:</label>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
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
            onChange={(e) => setYear(Number(e.target.value))}
            placeholder="e.g. 2025"
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
          ? `${new Date(year, month - 1).toLocaleString("default", { month: "long" })} ${year}`
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
              <th className="p-2 border">Confirmed Advance (Preview)</th>
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
                const sys = Number(s.totalAdvance) || 0;

                const row = adjustRows[s._id] || { type: "add", amount: "" };
                const signedAdj = getAdjFor(s._id);
                const preview = previewConfirmed(sys, signedAdj);

                return (
                  <tr key={s._id}>
                    <td className="p-2 border text-center">{idx + 1}</td>
                    <td className="p-2 border">{s.name}</td>
                    <td className="p-2 border">{s.designation}</td>

                    <td className="p-2 border text-right">₹ {sys.toLocaleString("en-IN")}</td>

                    {/* Adjustment controls */}
                    <td className="p-2 border">
                      <div className="flex items-center gap-2">
                        <div className="inline-flex rounded overflow-hidden border">
                          <button
                            type="button"
                            onClick={() =>
                              setAdjustRows((prev) => ({
                                ...prev,
                                [s._id]: { ...prev[s._id], type: "add", amount: prev[s._id]?.amount ?? "" },
                              }))
                            }
                            className={`px-2 py-1 text-xs ${
                              row.type === "add" ? "bg-green-600 text-white" : "bg-gray-200 text-black"
                            }`}
                          >
                            + Add
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setAdjustRows((prev) => ({
                                ...prev,
                                [s._id]: { ...prev[s._id], type: "sub", amount: prev[s._id]?.amount ?? "" },
                              }))
                            }
                            className={`px-2 py-1 text-xs ${
                              row.type === "sub" ? "bg-red-600 text-white" : "bg-gray-200 text-black"
                            }`}
                          >
                            − Reduce
                          </button>
                        </div>

                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={row.amount}
                          onChange={(e) =>
                            setAdjustRows((prev) => ({
                              ...prev,
                              [s._id]: { ...prev[s._id], amount: e.target.value },
                            }))
                          }
                          placeholder="e.g. 500"
                          className="border p-1 w-24 rounded text-xs text-right"
                        />
                      </div>

                      <div className="text-[11px] text-gray-500 mt-1">
                        {row.type === "add" ? "Will add to system total" : "Will reduce from system total"}
                      </div>
                    </td>

                    {/* Preview confirmed (client) */}
                    <td className="p-2 border text-right">
                      ₹ {preview.toLocaleString("en-IN")}
                      {existing && (
                        <span className="ml-2 text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                          ✅ Confirmed
                        </span>
                      )}
                    </td>

                    <td className="p-2 border text-center">
                      <button
                        onClick={() => handleConfirm(s._id, sys)}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                      >
                        {existing ? "Update" : "Confirm"}
                      </button>
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
