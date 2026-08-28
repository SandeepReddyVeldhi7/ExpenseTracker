"use client";

import { useEffect, useState } from "react";
import {
  FiUsers,
  FiEdit2,
  FiTrash2,
  FiCheckCircle,
  FiXCircle,
  FiArrowLeft,
  FiPlus,
  FiX,
} from "react-icons/fi";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function StaffList() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editData, setEditData] = useState(null);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "owner") {
      router.push("/no-permission");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "owner") {
      fetchStaff();
    }
  }, [status, session]);

  if (status === "unauthenticated") {
    return <p className="text-center mt-10 font-bold">You must be logged in.</p>;
  }

  if (status === "authenticated" && session?.user?.role !== "owner") {
    return null;
  }

  const fetchStaff = async () => {
    try {
      const res = await fetch("/api/v1/staff/get-staff");
      const data = await res.json();
      setStaff(data || []);
    } catch (err) {
      console.error("Failed to fetch staff", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this staff member?")) return;
    try {
      const res = await fetch(`/api/v1/staff/get-staff?id=${id}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to delete");
      toast.success("Staff deleted successfully!");
      fetchStaff();
    } catch (err) {
      console.error(err);
      toast.error(err.message);
    }
  };

  const handleEditClick = (person) => {
    setEditData(person);
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    try {
      const res = await fetch(`/api/v1/staff/get-staff?id=${editData._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to update staff");

      toast.success("Staff updated successfully!");
      setIsEditOpen(false);
      fetchStaff();
    } catch (err) {
      console.error(err);
      toast.error(err.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <Toaster position="top-right" />

      {/* Main Container */}
      <div className="neo-card p-6 sm:p-8 bg-white mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-6 border-b-2 border-black">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="neo-btn neo-btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5"
            >
              <FiArrowLeft size={15} />
              <span>Home</span>
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
                Staff Directory
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-gray-600">
                Manage staff members, roles, salary baselines & active status
              </p>
            </div>
          </div>

          <Link
            href="/staff"
            className="neo-btn neo-btn-primary px-4 py-2 text-xs font-black flex items-center gap-1.5 self-start sm:self-auto"
          >
            <FiPlus size={16} />
            <span>Add New Staff</span>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="font-black text-xs uppercase tracking-wider text-black">Loading Staff List...</p>
          </div>
        ) : staff.length === 0 ? (
          <p className="text-center text-gray-500 font-bold py-12">No staff members registered yet.</p>
        ) : (
          <>
            {/* Desktop Contained Table */}
            <div className="hidden md:block overflow-x-auto table-scrollbar border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#000]">
              <table className="w-full text-xs sm:text-sm text-left">
                <thead className="bg-[#F4F4F0] border-b-2 border-black font-black uppercase text-black text-xs">
                  <tr>
                    <th className="p-3.5">Name</th>
                    <th className="p-3.5">Designation</th>
                    <th className="p-3.5">Monthly Base Salary</th>
                    <th className="p-3.5">Remaining Advance</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Joined Date</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-bold">
                  {staff.map((person) => (
                    <tr key={person._id} className="hover:bg-gray-50 transition">
                      <td className="p-3.5 flex items-center gap-2 font-black text-black">
                        <div className="w-7 h-7 rounded-full bg-[#D4FF00] border border-black flex items-center justify-center text-black font-black text-xs">
                          {person.name?.charAt(0) || "S"}
                        </div>
                        {person.name}
                      </td>
                      <td className="p-3.5 text-gray-700">{person.designation}</td>
                      <td className="p-3.5 font-mono font-bold text-black">
                        ₹{person.salary?.toLocaleString("en-IN")}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-black">
                        ₹{person.remainingAdvance || 0}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black border border-black ${
                            person.active
                              ? "bg-[#D4FF00] text-black"
                              : "bg-[#FF5A5F] text-white"
                          }`}
                        >
                          {person.active ? <FiCheckCircle /> : <FiXCircle />}
                          {person.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="p-3.5 text-xs text-gray-500 font-mono">
                        {new Date(person.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        <button
                          onClick={() => handleEditClick(person)}
                          className="px-2.5 py-1 text-xs neo-btn neo-btn-cyan font-black"
                        >
                          <FiEdit2 size={12} className="inline mr-1" /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(person._id)}
                          className="px-2.5 py-1 text-xs neo-btn neo-btn-danger font-black"
                        >
                          <FiTrash2 size={12} className="inline mr-1" /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="block md:hidden space-y-3">
              {staff.map((person) => (
                <div
                  key={person._id}
                  className="p-4 rounded-xl border-2 border-black bg-[#F4F4F0] shadow-[2px_2px_0px_0px_#000] space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-black text-base text-black">
                      <div className="w-8 h-8 rounded-full bg-[#D4FF00] border-2 border-black flex items-center justify-center text-black font-black text-xs">
                        {person.name?.charAt(0) || "S"}
                      </div>
                      <div>
                        <span>{person.name}</span>
                        <span className="block text-[11px] font-bold text-gray-600">{person.designation}</span>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border border-black ${
                        person.active ? "bg-[#D4FF00] text-black" : "bg-[#FF5A5F] text-white"
                      }`}
                    >
                      {person.active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-bold pt-2 border-t border-gray-300">
                    <div>Salary: <span className="font-mono font-black text-black">₹{person.salary?.toLocaleString("en-IN")}</span></div>
                    <div>Advance: <span className="font-mono font-black text-black">₹{person.remainingAdvance || 0}</span></div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                    <button
                      onClick={() => handleEditClick(person)}
                      className="px-3 py-1 neo-btn neo-btn-cyan text-xs font-black"
                    >
                      <FiEdit2 size={12} className="inline mr-1" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(person._id)}
                      className="px-3 py-1 neo-btn neo-btn-danger text-xs font-black"
                    >
                      <FiTrash2 size={12} className="inline mr-1" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Edit Modal */}
      {isEditOpen && editData && (
        <div
          className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setIsEditOpen(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md border-[3px] border-black shadow-[8px_8px_0px_0px_#000] relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b-2 border-black pb-3 mb-4">
              <h2 className="text-xl font-black text-black">Edit Staff Member</h2>
              <button
                onClick={() => setIsEditOpen(false)}
                className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center hover:bg-gray-100 font-black cursor-pointer"
              >
                <FiX size={16} />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-black uppercase text-black mb-1">Full Name</label>
                <input
                  className="neo-input text-sm font-bold"
                  placeholder="Staff Name"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-black mb-1">Designation</label>
                <input
                  className="neo-input text-sm font-bold"
                  placeholder="e.g. Cashier / Chef"
                  value={editData.designation}
                  onChange={(e) => setEditData({ ...editData, designation: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-black mb-1">Monthly Salary (₹)</label>
                <input
                  type="number"
                  className="neo-input text-sm font-mono font-bold"
                  placeholder="Base Salary"
                  value={editData.salary}
                  onChange={(e) => setEditData({ ...editData, salary: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-black mb-1">Status</label>
                <select
                  className="neo-input text-sm font-bold cursor-pointer"
                  value={editData.active ? "true" : "false"}
                  onChange={(e) => setEditData({ ...editData, active: e.target.value === "true" })}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t-2 border-black">
                <button
                  className="py-2 px-4 neo-btn neo-btn-secondary text-xs font-black"
                  onClick={() => setIsEditOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="py-2 px-5 neo-btn neo-btn-primary text-xs font-black"
                  onClick={handleUpdate}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
