"use client";
import { useEffect, useState } from "react";
import {
  FaUserTie,
  FaCheckCircle,
  FaTimesCircle,
  FaTrash,
} from "react-icons/fa";
import toast, { Toaster } from "react-hot-toast";

export default function StaffList() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editData, setEditData] = useState(null);

  const fetchStaff = async () => {
    try {
      const res = await fetch("/api/v1/staff/get-staff");
      const data = await res.json();
      setStaff(data);
    } catch (err) {
      console.error("Failed to fetch staff", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

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
        headers: {
          "Content-Type": "application/json",
        },
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
    <div className="min-h-screen bg-gradient-to-br from-blue-700 to-purple-700 flex items-center justify-center p-6">
      <Toaster />
      <div className="bg-white shadow-2xl rounded-2xl p-8 w-full max-w-6xl">
        <h1 className=" sm:text-4xl font-bold mb-8 text-gray-800 text-center">
          👥 Staff Directory
        </h1>

        {loading ? (
          <p className="text-center text-gray-500">Loading staff list...</p>
        ) : staff.length === 0 ? (
          <p className="text-center text-gray-500">No staff found.</p>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-gray-700 min-w-[800px]">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="p-4 text-left">Name</th>
                    <th className="p-4 text-left">Designation</th>
                    <th className="p-4 text-left">Salary</th>
                    <th className="p-4 text-left">Advance</th>
                    <th className="p-4 text-left">Status</th>
                    <th className="p-4 text-left">Joined</th>
                    <th className="p-4 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {staff.map((person) => (
                    <tr
                      key={person._id}
                      className="hover:bg-gray-50 transition-all"
                    >
                      <td className="p-4 flex items-center gap-2 font-medium text-gray-900">
                        <FaUserTie className="text-blue-600" /> {person.name}
                      </td>
                      <td className="p-4">{person.designation}</td>
                      <td className="p-4">₹ {person.salary.toLocaleString("en-IN")}</td>
                      <td className="p-4">₹ {person.remainingAdvance}</td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            person.active
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {person.active ? (
                            <>
                              <FaCheckCircle className="mr-1" /> Active
                            </>
                          ) : (
                            <>
                              <FaTimesCircle className="mr-1" /> Inactive
                            </>
                          )}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-500">
                        {new Date(person.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 space-x-3">
                        <button
                          onClick={() => handleEditClick(person)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDelete(person._id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          <FaTrash /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="block md:hidden space-y-4">
              {staff.map((person) => (
                <div
                  key={person._id}
                  className="bg-gray-100 p-4 rounded-lg shadow-md text-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 font-semibold text-gray-800">
                      <FaUserTie className="text-blue-600" />
                      {person.name}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditClick(person)}
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDelete(person._id)}
                        className="text-red-600 hover:text-red-800 text-xs flex items-center gap-1"
                      >
                        <FaTrash /> Delete
                      </button>
                    </div>
                  </div>
                  <div className="text-gray-600">
                    <div>
                      <strong>Designation:</strong> {person.designation}
                    </div>
                    <div>
                      <strong>Salary:</strong> ₹ {person.salary.toLocaleString("en-IN")}
                    </div>
                    <div>
                      {/* <strong>Advance:</strong> ₹ {person.remainingAdvance} */}
                    </div>
                    <div>
                      <strong>Status:</strong>{" "}
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold ${
                          person.active ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {person.active ? (
                          <>
                            <FaCheckCircle /> Active
                          </>
                        ) : (
                          <>
                            <FaTimesCircle /> Inactive
                          </>
                        )}
                      </span>
                    </div>
                    <div className="text-gray-500 text-xs mt-2">
                      Joined: {new Date(person.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Edit Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-center">Edit Staff</h2>
            <div className="space-y-3">
              <input
                className="w-full border p-2 rounded"
                placeholder="Name"
                value={editData.name}
                onChange={(e) =>
                  setEditData({ ...editData, name: e.target.value })
                }
              />
              <input
                className="w-full border p-2 rounded"
                placeholder="Designation"
                value={editData.designation}
                onChange={(e) =>
                  setEditData({ ...editData, designation: e.target.value })
                }
              />
              <input
                type="number"
                className="w-full border p-2 rounded"
                placeholder="Salary"
                value={editData.salary}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    salary: parseFloat(e.target.value),
                  })
                }
              />
              {/* <input
                type="number"
                className="w-full border p-2 rounded"
                placeholder="Advance"
                value={editData.remainingAdvance}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    remainingAdvance: parseFloat(e.target.value),
                  })
                }
              /> */}
              <select
                className="w-full border p-2 rounded"
                value={editData.active ? "true" : "false"}
                onChange={(e) =>
                  setEditData({ ...editData, active: e.target.value === "true" })
                }
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  className="bg-gray-400 text-white px-4 py-2 rounded"
                  onClick={() => setIsEditOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="bg-blue-600 text-white px-4 py-2 rounded"
                  onClick={handleUpdate}
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
