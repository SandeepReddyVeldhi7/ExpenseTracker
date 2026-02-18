"use client";

import { useState } from "react";
import toast, { Toaster } from "react-hot-toast";

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
    const res = await fetch(
      `/api/v1/salary/prepare-range?start=${startDate}&end=${endDate}`,
    );
    const result = await res.json();

    setData(result.map((r) => ({ ...r, ownerAdjust: 0, paid: false })));
    setLoading(false);
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
  const getDaysInMonth = (dateStr) => {
    const d = new Date(dateStr);
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  };

  const earned = (r) => {
    const daysInMonth = getDaysInMonth(startDate);
    return Math.round((r.salary / daysInMonth) * r.presentDays * 100) / 100;
  };

  const payable = (r) =>
    Math.round(
      (earned(r) - r.totalAdvance + r.ownerAdjust - r.previousCarryForward) *
        100,
    ) / 100;

  const handlePay = async (row) => {
    const pay = payable(row);

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
  };
  {
    loading && (
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
        <div className="bg-white px-6 py-4 rounded shadow text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent mx-auto mb-2"></div>
          <p className="text-sm font-semibold text-black">
            Loading salary data...
          </p>
        </div>
      </div>
    );
  }
  const money = (value) =>
    Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="min-h-screen  lg:mt-20 h-auto p-2 bg-gray-100">
      <Toaster />

      <h1 className="text-center text-black text-lg font-bold mb-2">
        💰 Salary Settlement
      </h1>

      {/* FILTER */}
      <div className="flex flex-col sm:flex-row gap-2 mb-2">
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="border text-black p-2 rounded w-full"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="border text-black p-2 rounded w-full"
        />
        <button
          onClick={loadData}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {loading ? "Loading..." : "Load Salary Data"}
        </button>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto rounded shadow border  bg-white">
        <table className="w-full text-xs border-collapse overflow-y-auto h-auto">
          <thead className="bg-gray-900 text-white sticky top-0">
            <tr>
              <th className="border px-2 py-1 sticky left-0 bg-gray-900 z-20">
                Name
              </th>

              {dates.map((d) => (
                <th key={d} className="border px-2 py-1">
                  {new Date(d).getDate()}
                </th>
              ))}

              <th className="border px-2 py-1 ">Present</th>
              <th className="border px-2 py-1">Total Advance</th>
              <th className="border px-2 py-1">Earned Salary</th>
              <th className="border px-2 py-1">Adjust</th>
              <th className="border px-2 py-1">Payable</th>
              <th className="border px-2 py-1">Status</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={dates.length + 6} className="text-center p-4">
                  Loading...
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={row._id} className="hover:bg-gray-100">
                  <td className="border px-2 py-1 text-black font-medium text-left sticky left-0 bg-white z-10 max-w-[120px] truncate">
                    {row.name}
                  </td>

                  {dates.map((d) => {
                    const list = row.advancesByDate[d] || [];
                    const total = list.reduce((s, v) => s + v, 0);
                    return (
                      <td
                        key={d}
                        className="border px-2 py-1 text-center text-black cursor-pointer"
                        onClick={() =>
                          list.length && setAdvancePopup({ date: d, list })
                        }
                      >
                        {total ? `₹${total}` : "-"}
                      </td>
                    );
                  })}

                  <td className="border px-2 text-black py-1 text-center">
                    {row.presentDays}
                  </td>
                  <td className="border px-2 py-1 text-center text-red-600 font-semibold">
                    ₹{row.totalAdvance || 0}
                  </td>
                  {/* EARNED SALARY = presentDays * salary */}
                  <td className="border px-2 py-1 text-center text-blue-700 font-semibold">
                    ₹{earned(row).toFixed(0)}
                  </td>
                  <td className="border px-2 py-1 text-center">
                    <button
                      disabled={row.paid}
                      onClick={() => {
                        setAdjustRow(row);
                        setAdjustValue(row.ownerAdjust);
                      }}
                      className="bg-yellow-500 text-black px-2 py-1 rounded text-xs"
                    >
                      Adjust
                    </button>
                  </td>

                  <td
                    className={`border px-2 py-1 text-center font-bold ${
                      payable(row) >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    ₹{payable(row).toFixed(0)}
                  </td>

                  <td className="border px-2 py-1 text-center">
                    {row.paid ? (
                      <span className="text-green-700 font-bold">PAID</span>
                    ) : (
                      <button
                        onClick={() => setPayConfirmRow(row)}
                        className="bg-green-600 text-white px-3 py-1 rounded text-xs"
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

      {/* ADJUST POPUP */}
      {adjustRow && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-5 rounded-xl w-80 shadow-2xl text-black">
            <h2 className="font-bold text-lg mb-2">Owner Adjustment</h2>

            <p className="text-xs text-gray-600 mb-3">
              Payable = Earned - Advance + Adjust - CarryForward
            </p>

            <input
              type="number"
              value={adjustValue}
              onChange={(e) => setAdjustValue(e.target.value)}
              className="border p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              autoFocus
            />

            <div className="flex justify-between mt-4">
              <button
                onClick={() => setAdjustRow(null)}
                className="px-4 py-1 border rounded-md hover:bg-gray-100"
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
                className="bg-green-600 text-white px-4 py-1 rounded-md hover:bg-green-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADVANCE POPUP */}
      {advancePopup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-4 rounded w-72 shadow">
            <h2 className="font-bold mb-2">Advances on {advancePopup.date}</h2>
            {advancePopup.list.map((a, i) => (
              <div key={i}>₹{a}</div>
            ))}
            <button
              onClick={() => setAdvancePopup(null)}
              className="mt-3 bg-blue-600 text-white px-3 py-1 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* PAY CONFIRM POPUP */}
      {payConfirmRow && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded w-80 shadow text-black">
            <h2 className="font-bold text-lg mb-2">Confirm Payment</h2>

            <div className="text-sm space-y-1">
              <div>Earned Salary: ₹{earned(payConfirmRow).toFixed(0)}</div>
              <div>Total Advance: ₹{payConfirmRow.totalAdvance}</div>
              <div>Owner Adjust: ₹{payConfirmRow.ownerAdjust}</div>
              <div>
                Carry Forward: ₹{money(payConfirmRow.previousCarryForward)}
              </div>
              <hr />
              <div className="font-bold text-green-600">
                Payable: ₹{payable(payConfirmRow).toFixed(0)}
              </div>
            </div>

            <div className="flex justify-between mt-4">
              <button
                onClick={() => setPayConfirmRow(null)}
                className="border px-3 py-1 rounded"
              >
                Cancel
              </button>

              <button
                onClick={async () => {
                  await handlePay(payConfirmRow);
                  setPayConfirmRow(null);
                }}
                className="bg-green-600 text-white px-4 py-1 rounded"
              >
                Confirm Pay
              </button>
            </div>
          </div>
        </div>
      )}
      {loading && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white px-6 py-4 rounded shadow text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent mx-auto mb-2"></div>
            <p className="text-sm font-semibold text-black">
              Loading salary data...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
