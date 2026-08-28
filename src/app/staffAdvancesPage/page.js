"use client";

import { useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { FiCalendar, FiSearch, FiDollarSign, FiCheck, FiX, FiInfo } from "react-icons/fi";

export default function SalaryPage() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const [payConfirmRow, setPayConfirmRow] = useState(null);

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(today.toISOString().split("T")[0]);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [adjustRow, setAdjustRow] = useState(null);
  const [adjustValue, setAdjustValue] = useState("");

  const [advancePopup, setAdvancePopup] = useState(null);

  const loadData = async () => {
    if (!startDate || !endDate) return toast.error("Select dates");

    setLoading(true);
    try {
      const res = await fetch(
        `/api/v1/salary/prepare-range?start=${startDate}&end=${endDate}`,
      );
      const result = await res.json();
      setData((result || []).map((r) => ({ ...r, ownerAdjust: 0, paid: false })));
    } catch (err) {
      console.error(err);
      toast.error("Failed to load salary settlement data");
    } finally {
      setLoading(false);
    }
  };

  const getDates = () => {
    const list = [];
    let d = new Date(startDate);
    const end = new Date(endDate);
    while (d <= end) {
      list.push(d.toISOString().split("T")[0]);
      d.setDate(d.getDate() + 1);
    }
    return list;
  };

  const dates = getDates();

  const earned = (r) => {
    const perDaySalary = r.salary / 30;
    return Math.round(perDaySalary * r.presentDays * 100) / 100;
  };

  const payable = (r) =>
    Math.round(
      (earned(r) - r.totalAdvance + r.ownerAdjust - r.previousCarryForward) *
        100,
    ) / 100;

  const handlePay = async (row) => {
    const pay = payable(row);

    try {
      await fetch("/api/v1/salary/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staff: row._id,
          startDate,
          endDate,
          presentDays: row.presentDays,
          earnedSalary: earned(row),
          advances: row.totalAdvance,
          ownerAdjust: row.ownerAdjust,
          paidAmount: pay,
        }),
      });

      toast.success(`${row.name} paid`);
      setData((prev) =>
        prev.map((r) => (r._id === row._id ? { ...r, paid: true } : r)),
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to process payment");
    }
  };

  const money = (value) =>
    Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-28">
      <Toaster position="top-right" />

      {/* Main Neo Card */}
      <div className="neo-card p-6 sm:p-8 bg-white mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-6 border-b-2 border-black">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
              Salary Settlement Matrix
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-gray-600">
              Daily advances audit, earned compensation & instant pay settlement
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl border-2 border-black bg-[#F4F4F0] mb-6">
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-black mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="neo-input text-xs font-bold py-1.5"
            />
          </div>
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-black mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
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
              <span>{loading ? "Calculating..." : "Load Settlement"}</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto table-scrollbar border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#000]">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-[#F4F4F0] border-b-2 border-black font-black uppercase text-black">
              <tr>
                <th className="p-3 border-r border-black sticky left-0 bg-[#F4F4F0] z-20 text-left">
                  Staff Name
                </th>
                {dates.map((d) => (
                  <th key={d} className="p-2 border-r border-black text-center min-w-[32px]">
                    {new Date(d).getDate()}
                  </th>
                ))}
                <th className="p-3 border-r border-black text-center">Present</th>
                <th className="p-3 border-r border-black text-right">Total Advance</th>
                <th className="p-3 border-r border-black text-right">Earned</th>
                <th className="p-3 border-r border-black text-center">Adjust</th>
                <th className="p-3 border-r border-black text-right">Payable</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 font-bold">
              {loading ? (
                <tr>
                  <td colSpan={dates.length + 7} className="text-center p-8 font-black text-black">
                    Calculating salary settlement data...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={dates.length + 7} className="text-center p-8 text-gray-500 font-bold">
                    Select a date range and click Load Settlement.
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row._id} className="hover:bg-gray-50 transition">
                    <td className="p-3 border-r border-gray-200 font-black text-black text-left sticky left-0 bg-white z-10 max-w-[130px] truncate shadow-[1px_0px_0px_0px_#000]">
                      {row.name}
                    </td>

                    {dates.map((d) => {
                      const list = row.advancesByDate[d] || [];
                      const total = list.reduce((s, v) => s + v, 0);
                      return (
                        <td
                          key={d}
                          className={`p-2 border-r border-gray-200 text-center font-mono cursor-pointer ${
                            total ? "bg-amber-50 font-black text-red-600 hover:bg-amber-100" : "text-gray-400"
                          }`}
                          onClick={() =>
                            list.length && setAdvancePopup({ date: d, list })
                          }
                        >
                          {total ? `₹${total}` : "-"}
                        </td>
                      );
                    })}

                    <td className="p-3 border-r border-gray-200 text-center font-mono">
                      {row.presentDays}
                    </td>
                    <td className="p-3 border-r border-gray-200 text-right font-mono text-red-600">
                      ₹{row.totalAdvance || 0}
                    </td>
                    <td className="p-3 border-r border-gray-200 text-right font-mono text-black">
                      ₹{earned(row).toFixed(0)}
                    </td>
                    <td className="p-3 border-r border-gray-200 text-center">
                      <button
                        disabled={row.paid}
                        onClick={() => {
                          setAdjustRow(row);
                          setAdjustValue(row.ownerAdjust);
                        }}
                        className="px-2 py-0.5 rounded text-[11px] neo-btn neo-btn-cyan font-black disabled:opacity-40"
                      >
                        Adjust
                      </button>
                    </td>

                    <td
                      className={`p-3 border-r border-gray-200 text-right font-mono font-black ${
                        payable(row) >= 0 ? "text-emerald-800" : "text-red-600"
                      }`}
                    >
                      ₹{payable(row).toFixed(0)}
                    </td>

                    <td className="p-3 text-center">
                      {row.paid ? (
                        <span className="px-3 py-1 rounded-full text-xs font-black border border-black bg-gray-200 text-gray-700">
                          PAID
                        </span>
                      ) : (
                        <button
                          onClick={() => setPayConfirmRow(row)}
                          className="px-3 py-1 neo-btn neo-btn-primary text-xs font-black"
                        >
                          PAY
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADJUST POPUP */}
      {adjustRow && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-sm border-[3px] border-black shadow-[8px_8px_0px_0px_#000]">
            <h2 className="font-black text-lg text-black mb-1">Owner Adjustment</h2>
            <p className="text-xs font-semibold text-gray-600 mb-4">
              Payable = Earned − Advance + Adjust − CarryForward
            </p>

            <input
              type="number"
              value={adjustValue}
              onChange={(e) => setAdjustValue(e.target.value)}
              className="neo-input text-base font-mono font-bold mb-4"
              autoFocus
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setAdjustRow(null)}
                className="py-2 px-4 neo-btn neo-btn-secondary text-xs font-black"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setData((prev) =>
                    prev.map((r) =>
                      r._id === adjustRow._id
                        ? { ...r, ownerAdjust: Number(adjustValue) || 0 }
                        : r,
                    ),
                  );
                  setAdjustRow(null);
                }}
                className="py-2 px-5 neo-btn neo-btn-primary text-xs font-black"
              >
                Save Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADVANCE POPUP */}
      {advancePopup && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-xs border-[3px] border-black shadow-[8px_8px_0px_0px_#000]">
            <h2 className="font-black text-base text-black mb-2 border-b-2 border-black pb-2">
              Advances on {advancePopup.date}
            </h2>
            <div className="space-y-1 my-3">
              {advancePopup.list.map((a, i) => (
                <div key={i} className="flex justify-between font-mono font-bold text-xs">
                  <span>Entry #{i + 1}:</span>
                  <span className="text-red-600 font-black">₹{a}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setAdvancePopup(null)}
              className="w-full mt-3 py-2 neo-btn neo-btn-secondary text-xs font-black"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* PAY CONFIRM POPUP */}
      {payConfirmRow && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-sm border-[3px] border-black shadow-[8px_8px_0px_0px_#000]">
            <h2 className="font-black text-xl text-black mb-2">Confirm Payout</h2>

            <div className="p-3.5 rounded-xl border-2 border-black bg-[#F4F4F0] text-xs font-bold space-y-1.5 mb-4">
              <div className="flex justify-between">
                <span>Earned Salary:</span>
                <span className="font-mono text-black">₹{earned(payConfirmRow).toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Total Advances:</span>
                <span className="font-mono">-₹{payConfirmRow.totalAdvance}</span>
              </div>
              <div className="flex justify-between">
                <span>Owner Adjustment:</span>
                <span className="font-mono">{payConfirmRow.ownerAdjust >= 0 ? "+" : "−"}₹{Math.abs(payConfirmRow.ownerAdjust)}</span>
              </div>
              <div className="flex justify-between">
                <span>Carry Forward:</span>
                <span className="font-mono">₹{money(payConfirmRow.previousCarryForward)}</span>
              </div>
              <div className="pt-2 border-t border-black flex justify-between text-sm font-black text-black">
                <span>Net Payable:</span>
                <span className="text-emerald-800 text-base font-mono">₹{payable(payConfirmRow).toFixed(0)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPayConfirmRow(null)}
                className="py-2 px-4 neo-btn neo-btn-secondary text-xs font-black"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await handlePay(payConfirmRow);
                  setPayConfirmRow(null);
                }}
                className="py-2 px-5 neo-btn neo-btn-primary text-xs font-black"
              >
                Confirm Payout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
