"use client";

import { useState, useEffect } from "react";
import DataTable from "react-data-table-component";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Tooltip } from "react-tooltip";
import {
  FiCalendar,
  FiSearch,
  FiX,
  FiEye,
  FiDollarSign,
  FiEyeOff,
} from "react-icons/fi";

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [totalRemaining, setTotalRemaining] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [showTotal, setShowTotal] = useState(false);
  const [staffMap, setStaffMap] = useState({});

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "owner") {
      router.push("/");
    }
  }, [status, session, router]);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await fetch("/api/v1/staff/get-staff");
        const data = await res.json();
        const map = {};
        (data || []).forEach((s) => {
          if (s && s._id) {
            map[String(s._id)] = s.name;
          }
        });
        setStaffMap(map);
      } catch (err) {
        console.error("Error fetching staff:", err);
      }
    };
    fetchStaff();
  }, []);

  const renderName = (val) => {
    if (val === null || val === undefined) return "";
    if (typeof val === "object") {
      return val.name || val.username || val.title || (val._id ? staffMap[String(val._id)] || String(val._id) : "");
    }
    const str = String(val);
    return staffMap[str] || str;
  };

  const renderPrice = (val) => {
    if (val === null || val === undefined) return "0";
    if (typeof val === "object") {
      return String(val.price || val.amount || 0);
    }
    return String(val);
  };

  const formatINR = (num) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num || 0);

  const fetchReports = async () => {
    setLoading(true);
    try {
      let url = `/api/v1/expense/get-expense?`;
      if (startDate) url += `startDate=${startDate}&`;
      if (endDate) url += `endDate=${endDate}`;

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const text = await res.text();
      if (!text) {
        throw new Error("Empty response from server");
      }

      const data = JSON.parse(text);
      const list = data.expenses || [];
      setExpenses(list);

      const total = list.reduce(
        (sum, item) => sum + (parseFloat(item.payout) || 0),
        0
      );
      setTotalRemaining(total);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "owner") {
      fetchReports();
    }
  }, [status, session]);

  if (status === "unauthenticated") {
    return <p className="text-center mt-10 font-bold">You must be logged in.</p>;
  }

  if (status === "authenticated" && session?.user?.role !== "owner") {
    return null;
  }

  // Totals for modal
  const totalCashersAmount = selectedExpense?.cashers?.reduce(
    (sum, c) => sum + (parseFloat(c?.totalCashersAmount) || 0),
    0
  );

  const totalJuiceExpensive = selectedExpense?.cashers?.reduce(
    (sum, c) =>
      sum +
      (c.addons?.reduce(
        (innerSum, a) =>
          innerSum + (a.name?.toLowerCase() === "juice" ? parseFloat(a.price) || 0 : 0),
        0
      ) || 0),
    0
  );

  const totalTeaExpensive = selectedExpense?.cashers?.reduce(
    (sum, c) =>
      sum +
      (c.addons?.reduce(
        (innerSum, a) =>
          innerSum + (a.name?.toLowerCase() === "tea" ? parseFloat(a.price) || 0 : 0),
        0
      ) || 0),
    0
  );

  const totalOnlineAmount = selectedExpense?.cashers?.reduce((sum, c) => {
    const onlineAddon = c.addons?.find(
      (a) => (typeof a.name === "string" ? a.name : a.name?.name)?.toLowerCase() === "online"
    );
    return sum + (onlineAddon ? parseFloat(onlineAddon.price) || 0 : 0);
  }, 0);

  // DataTable columns (exact matching original)
  const columns = [
    {
      name: "Date",
      selector: (row) => row.date,
      sortable: true,
      cell: (row) => (
        <span className="font-mono font-bold text-xs sm:text-sm text-black">
          {new Date(row.date).toLocaleDateString("en-GB")}
        </span>
      ),
    },
    {
      name: "Total Cashers Sale",
      selector: (row) => row.totalCashersSale,
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-black font-semibold text-xs sm:text-sm">
          {formatINR(row.totalCashersSale?.toFixed(2))}
        </span>
      ),
    },
    {
      name: "Total Drinks Amount",
      selector: (row) => row.totalDrinksAmount,
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-black font-semibold text-xs sm:text-sm">
          {formatINR(row.totalDrinksAmount?.toFixed(2))}
        </span>
      ),
    },
    {
      name: "Total Expenses",
      selector: (row) => {
        const total = row.cashers?.reduce(
          (sum, c) => sum + (parseFloat(c.totalCashersAmount) || 0),
          0
        );
        return total || 0;
      },
      sortable: true,
      cell: (row) => {
        const total = row.cashers?.reduce(
          (sum, c) => sum + (parseFloat(c.totalCashersAmount) || 0),
          0
        );
        return (
          <span className="font-mono text-black font-semibold text-xs sm:text-sm">
            {formatINR(total?.toFixed(2))}
          </span>
        );
      },
    },
    {
      name: "Payout",
      selector: (row) => row.payout,
      sortable: true,
      cell: (row) => (
        <span className="font-mono font-bold text-emerald-800 text-xs sm:text-sm">
          {formatINR(row.payout?.toFixed(2))}
        </span>
      ),
    },
    {
      name: "Online Amount",
      sortable: true,
      cell: (row) => {
        const onlineDetails =
          row.cashers?.map((c) => {
            const onlineAddon = c.addons?.find(
              (a) => (typeof a.name === "string" ? a.name : a.name?.name)?.toLowerCase() === "online"
            );
            return {
              name: c.casherName,
              amount: parseFloat(onlineAddon?.price) || 0,
            };
          }) || [];

        const totalOnline = onlineDetails.reduce((sum, c) => sum + c.amount, 0);
        const tooltipText = onlineDetails
          .map((c) => `${c.name}: ₹${c.amount}`)
          .join(" | ");

        return (
          <div
            data-tooltip-id="global-tooltip"
            data-tooltip-content={tooltipText}
            className="font-mono font-bold text-xs sm:text-sm cursor-help text-cyan-800"
          >
            {totalOnline ? formatINR(totalOnline) : "—"}
          </div>
        );
      },
    },
    {
      name: "Total Shot",
      sortable: true,
      cell: (row) => {
        const shotDetails =
          row.cashers?.map((c) => ({
            name: c.casherName,
            shot: parseFloat(c.shot) || 0,
          })) || [];

        const totalShot = shotDetails.reduce((sum, c) => sum + c.shot, 0);
        const tooltipText = shotDetails
          .map((c) => `${c.name}: ${c.shot}`)
          .join(" | ");

        return (
          <div
            data-tooltip-id="global-tooltip"
            data-tooltip-content={tooltipText}
            className="font-mono font-bold text-xs sm:text-sm cursor-help text-red-600"
          >
            {totalShot ? formatINR(totalShot) : "—"}
          </div>
        );
      },
    },
    {
      name: "Actions",
      cell: (row) => (
        <button
          onClick={() => setSelectedExpense(row)}
          className="neo-btn neo-btn-cyan px-3 py-1 text-xs font-black flex items-center gap-1"
        >
          <FiEye size={13} /> View
        </button>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-28">
      <Toaster position="top-right" />

      {/* Header Neo Card */}
      <div className="neo-card p-6 sm:p-8 bg-white mb-6">
        <h1 className="text-2xl md:text-3xl font-black text-black mb-6 text-center tracking-tight">
          📊 Expense Report
        </h1>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-black uppercase text-black mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="neo-input text-xs font-bold py-2"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-black mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="neo-input text-xs font-bold py-2"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={fetchReports}
              disabled={loading}
              className="w-full py-2.5 neo-btn neo-btn-primary text-xs font-black flex items-center justify-center gap-1.5"
            >
              <FiSearch size={15} />
              <span>{loading ? "Loading..." : "🔍 Get Reports"}</span>
            </button>
          </div>
        </div>

        {/* Action Buttons: Clear Filters & Show / Hide Total */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          {startDate && endDate && (
            <button
              onClick={() => {
                setStartDate("");
                setEndDate("");
                fetchReports();
              }}
              className="flex-1 py-2.5 neo-btn neo-btn-danger text-xs font-black flex items-center justify-center gap-1.5"
            >
              <FiX size={15} />
              <span>❌ Clear Filters</span>
            </button>
          )}

          <button
            onClick={() => setShowTotal(!showTotal)}
            className="flex-1 py-2.5 neo-btn neo-btn-secondary text-xs font-black flex items-center justify-center gap-1.5"
          >
            {showTotal ? <FiEyeOff size={15} /> : <FiEye size={15} />}
            <span>{showTotal ? "🙈 Hide Total" : "👀 Show Total"}</span>
          </button>
        </div>

        {/* Show Total Payout Banner */}
        {showTotal && (
          <div className="p-4 rounded-xl border-2 border-black bg-[#D4FF00] shadow-[3px_3px_0px_0px_#000] text-center mb-6 font-black text-black text-base sm:text-lg">
            💰 Total Remaining / Payout: <span className="font-mono text-xl">{formatINR(totalRemaining)}</span>
          </div>
        )}

        {/* DataTable Container with Contained Scroll */}
        {expenses.length > 0 ? (
          <div className="border-2 border-black rounded-xl overflow-hidden shadow-[4px_4px_0px_0px_#000] mt-4">
            <DataTable
              columns={columns}
              data={expenses}
              pagination
              highlightOnHover
              striped
              paginationPerPage={30}
              defaultSortAsc={false}
              responsive
              customStyles={{
                headRow: {
                  style: {
                    backgroundColor: "#F4F4F0",
                    borderBottom: "2px solid #0A0A0A",
                    fontWeight: "900",
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    color: "#0A0A0A",
                  },
                },
                rows: {
                  style: {
                    backgroundColor: "#FFFFFF",
                    borderBottom: "1px solid #E2E8F0",
                    fontWeight: "600",
                    color: "#0A0A0A",
                    "&:hover": {
                      backgroundColor: "#F8FAFC",
                    },
                  },
                  stripedStyle: {
                    backgroundColor: "#FAF9F5",
                  },
                },
                headCells: {
                  style: {
                    color: "#0A0A0A",
                    fontWeight: "900",
                  },
                },
                pagination: {
                  style: {
                    backgroundColor: "#F4F4F0",
                    borderTop: "2px solid #0A0A0A",
                    fontWeight: "700",
                    color: "#0A0A0A",
                  },
                },
              }}
            />
            <Tooltip id="global-tooltip" place="top" />
          </div>
        ) : (
          <p className="text-center text-gray-500 font-bold py-12">
            {loading ? "Fetching reports..." : "No records found. Please search!"}
          </p>
        )}
      </div>

      {/* Full Modal with 100% original breakdown details */}
      {selectedExpense && (
        <div
          className="min-h-screen fixed inset-0 bg-black/65 backdrop-blur-xs flex justify-center items-center z-50 p-4"
          onClick={() => setSelectedExpense(null)}
        >
          <div
            className="bg-white border-[3px] border-black rounded-2xl max-w-3xl w-full p-6 overflow-y-auto max-h-[90vh] shadow-[8px_8px_0px_0px_#000] relative text-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 border-b-2 border-black pb-3">
              <h2 className="text-xl sm:text-2xl font-black text-black">
                Daily Summary — {new Date(selectedExpense.date).toLocaleDateString("en-GB")}
              </h2>
              <button
                onClick={() => setSelectedExpense(null)}
                className="py-1.5 px-4 neo-btn neo-btn-danger text-xs font-black"
              >
                Close
              </button>
            </div>

            {/* Top Metrics 1-4 & Payout & Online */}
            <div className="mb-6 space-y-2 p-4 rounded-xl border-2 border-black bg-[#F4F4F0] text-xs sm:text-sm font-bold">
              <p className="flex justify-between">
                <span>1) Total Cashers Sale:</span>
                <span className="font-mono font-black text-black">
                  {formatINR(selectedExpense.totalCashersSale?.toFixed(2))}
                </span>
              </p>
              <p className="flex justify-between">
                <span>2) Total Drinks Amount:</span>
                <span className="font-mono font-black text-black">
                  {formatINR(selectedExpense.totalDrinksAmount?.toFixed(2))}
                </span>
              </p>
              <p className="flex justify-between">
                <span>3) Total Shot:</span>
                <span className="font-mono font-black text-red-600">
                  {formatINR(selectedExpense.totalShot?.toFixed(2))}
                </span>
              </p>
              <p className="flex justify-between">
                <span>4) Total Cashers Expenses (Including Tea/Juice):</span>
                <span className="font-mono font-black text-black">
                  {formatINR(totalCashersAmount?.toFixed(2))}
                </span>
              </p>

              <div className="p-3 rounded-lg border-2 border-black bg-[#FF5A5F] text-white flex justify-between items-center text-sm font-black mt-2">
                <span>Remaining / Payout:</span>
                <span className="font-mono text-base">
                  {formatINR(selectedExpense?.payout?.toFixed(2))}
                </span>
              </div>

              {selectedExpense.cashers && selectedExpense.cashers.length > 0 && (
                <div className="mt-3 p-3 rounded-lg border border-black bg-white space-y-1">
                  <h3 className="text-xs font-black uppercase text-black mb-1">
                    Cashers Online Amount Summary
                  </h3>
                  <ul className="list-disc ml-5 space-y-0.5 text-xs text-gray-800 font-semibold">
                    {selectedExpense.cashers.map((c, idx) => {
                      const onlineAddon = c.addons?.find(
                        (a) => (typeof a.name === "string" ? a.name : a.name?.name)?.toLowerCase() === "online"
                      );
                      return (
                        <li key={idx}>
                          {c.casherName}:{" "}
                          <strong className="font-mono font-bold text-black">
                            {onlineAddon ? formatINR(onlineAddon.price) : "No Online Amount"}
                          </strong>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <div className="pt-2 border-t border-black flex justify-between font-black text-xs text-black">
                <span>Total Online Amount:</span>
                <span className="font-mono">{formatINR(totalOnlineAmount) || 0}</span>
              </div>
            </div>

            <hr className="my-4 border-black" />

            {/* Cashers Section */}
            <h3 className="text-base font-black uppercase tracking-wider text-black mb-3">
              Cashers
            </h3>
            {selectedExpense?.cashers && selectedExpense?.cashers?.length > 0 ? (
              <div className="space-y-3 mb-6">
                {selectedExpense?.cashers.map((c, idx) => (
                  <div
                    key={idx}
                    className="p-4 border-2 border-black rounded-xl bg-white shadow-[2px_2px_0px_0px_#000] text-xs"
                  >
                    <p className="font-black text-sm text-black mb-2">{c?.casherName}</p>

                    {c.items?.length > 0 && (
                      <div className="mb-2">
                        <p className="font-bold underline text-gray-700 mb-1">Main Items:</p>
                        <ul className="ml-4 list-disc space-y-0.5 font-semibold">
                          {c?.items?.map((item, i) => (
                            <li key={i}>
                              {renderName(item.name)}: <span className="font-mono font-bold">₹{renderPrice(item.price)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {c?.addons?.length > 0 && (
                      <div className="mb-2">
                        <p className="font-bold underline text-gray-700 mb-1">
                          Addons (Tea/Juice/Other):
                        </p>
                        <ul className="ml-4 list-disc space-y-0.5 font-semibold">
                          {c.addons.map((addon, i) => (
                            <li key={i}>
                              {renderName(addon.name)}: <span className="font-mono font-bold">₹{renderPrice(addon.price)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-3 p-3 rounded-lg border border-black bg-[#F4F4F0] font-bold text-xs space-y-1">
                      <div className="flex justify-between">
                        <span>Total Cashers(expenses) Amount:</span>
                        <span className="font-mono font-black">{formatINR(c.totalCashersAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Sale:</span>
                        <span className="font-mono font-black">{formatINR(c.totalSealAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Money Lift:</span>
                        <span className="font-mono font-black">{formatINR(c.totalMoneyLift)}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>Shot:</span>
                        <span className="font-mono font-black">{formatINR(c.shot)}</span>
                      </div>
                    </div>

                    {c.staffAdvances?.length > 0 && (
                      <div className="mt-3">
                        <p className="font-bold underline text-gray-700 mb-1">Staff Advances:</p>
                        <ul className="ml-4 list-disc space-y-0.5 font-semibold">
                          {c.staffAdvances.map((adv, i) => (
                            <li key={i}>
                              Staff ID: <strong>{renderName(adv.staffId)}</strong> — <span className="font-mono font-bold">₹{renderPrice(adv.amount)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-bold text-gray-500 mb-6">No cashers recorded.</p>
            )}

            {/* Drinks Section */}
            <h3 className="text-base font-black uppercase tracking-wider text-black mb-3">
              Drinks
            </h3>
            {selectedExpense.drinks && selectedExpense.drinks.length > 0 ? (
              <div className="space-y-3 mb-6">
                {selectedExpense.drinks.map((d, idx) => (
                  <div
                    key={idx}
                    className="p-4 border-2 border-black rounded-xl bg-[#F4F4F0] text-xs font-bold space-y-1.5 shadow-[2px_2px_0px_0px_#000]"
                  >
                    <p className="font-black text-base text-black uppercase">
                      {d.drinkType.toUpperCase()}
                    </p>
                    <div className="flex justify-between">
                      <span>Sold Amount:</span>
                      <span className="font-mono font-black">₹{d.soldAmount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Commission:</span>
                      <span className="font-mono font-black">
                        {d.drinkType === "tea" ? `${d.commissionPercent}%` : "Fixed"} → ₹{d.commissionValue}
                      </span>
                    </div>

                    {d.drinkType.toLowerCase() === "tea" && (
                      <div className="flex justify-between text-blue-700">
                        <span>Total Tea Expensive:</span>
                        <span className="font-mono font-black">₹{totalTeaExpensive}</span>
                      </div>
                    )}

                    {d.drinkType.toLowerCase() === "juice" && (
                      <div className="flex justify-between text-blue-700">
                        <span>Total Juice Expensive:</span>
                        <span className="font-mono font-black">₹{totalJuiceExpensive}</span>
                      </div>
                    )}

                    <div className="p-2 rounded-lg bg-white border border-black flex justify-between font-black">
                      <span>Final Net (as saved):</span>
                      <span className="font-mono text-emerald-800">{formatINR(d.finalNetAmount || 0)}</span>
                    </div>

                    <div className="mt-2 p-2.5 bg-[#FFDE59] border border-black rounded-lg text-[11px] font-bold space-y-0.5 text-black">
                      <p>Includes Carry Forward from Yesterday: ₹{d.carryForwardFromYesterday || 0}</p>
                      <p>Will Carry Forward to Tomorrow: ₹{d.carryLoss || 0}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-bold text-gray-500 mb-6">No drinks recorded.</p>
            )}

            <div className="pt-2 border-t-2 border-black flex justify-end">
              <button
                onClick={() => setSelectedExpense(null)}
                className="py-2.5 px-6 neo-btn neo-btn-secondary text-xs font-black"
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
