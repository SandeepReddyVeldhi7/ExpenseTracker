"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { FaTrash, FaUserShield, FaEdit } from "react-icons/fa";

export default function DashboardUsersList() {
     const { data: session, status } = useSession();
    const router = useRouter();
     useEffect(() => {
      if (status === "authenticated" && session.user.role !== "owner") {
        router.push("/no-permission");
      }
    }, [status, session, router]);
  
    if (status === "loading") {
      return <p className="text-center mt-10">Loading...</p>;
    }
  
    if (status === "unauthenticated") {
      return <p className="text-center mt-10">You must be logged in.</p>;
    }
  
    if (session?.user?.role !== "owner") {
      return null; // redirecting
    }
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState(null);
  const [formData, setFormData] = useState({ email: "", username: "", role: "" });

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/v1/users/user");
      const data = await res.json();
      console.log("data", data);
      setUsers(data);
    } catch (error) {
      toast.error("Failed to fetch users");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      const res = await fetch(`/api/v1/users/user?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("User deleted successfully");
      fetchUsers();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const openEditModal = (user) => {
    setEditUser(user);
    setFormData({
      email: user.email,
      username: user.username,
      role: user.role,
    });
  };

  const handleUpdate = async () => {
    if (!formData.email || !formData.username || !formData.role) {
      return toast.error("All fields are required");
    }
const toastLoading=toast.loading("Updating user...");
    try {
      const res = await fetch(`/api/v1/users/user?id=${editUser._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("User updated successfully",{id:toastLoading});
      setEditUser(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.message,{id:toastLoading});
    }
  };

  return (
    <div className="min-h-screen sm:mt-8  bg-gradient-to-br from-indigo-800 to-purple-800 p-6">
      <Toaster />
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-6">
          🛡️ Dashboard Admin Users
        </h1>

        {loading ? (
          <p className="text-center text-gray-500">Loading users...</p>
        ) : users.length === 0 ? (
          <p className="text-center text-gray-500">No users found.</p>
        ) : (
          <>
            {/* Table View for Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border border-gray-300 text-center">
                <thead className="bg-black">
                  <tr>
                    <th className="p-3 border">Username</th>
                    <th className="p-3 border">Email</th>
                    <th className="p-3 border">Role</th>
                    <th className="p-3 border">Created</th>
                    <th className="p-3 border">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="p-3 border text-black">
                        <div className="flex items-center justify-center gap-2">
                          <FaUserShield className="text-indigo-600" />
                          {user.username}
                        </div>
                      </td>
                      <td className="p-3 border text-black">{user.email}</td>
                      <td className="p-3 border capitalize text-black">{user.role}</td>
                      <td className="p-3 border text-sm text-black">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3 border">
                        <button
                          onClick={() => openEditModal(user)}
                          className="text-blue-600 hover:text-blue-800 mr-3 flex items-center gap-1 text-sm"
                        >
                          <FaEdit /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(user._id)}
                          className="text-red-600 hover:text-red-800 flex items-center gap-1 text-sm"
                        >
                          <FaTrash /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Card View for Mobile */}
            <div className="block md:hidden space-y-4 mt-4">
              {users.map((user) => (
                <div key={user._id} className="bg-gray-100 p-4 rounded-lg shadow">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2 font-semibold text-gray-800">
                      <FaUserShield className="text-indigo-600" />
                      {user.username}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(user)}
                        className="text-blue-600"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(user._id)}
                        className="text-red-600"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                  <div>
                    <div className="text-black"><strong>Email:</strong> {user.email}</div>
                    <div className="text-black"><strong>Role:</strong> <span className="capitalize">{user.role}</span></div>
                    <div className="text-xs text-black mt-1">
                      Created: {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Edit Modal */}
        {editUser && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-lg">
              <h2 className="text-xl font-bold mb-4 text-black">Edit User</h2>
              <label className="block mb-2 text-black">
                Username
                <input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full border p-2 text-black rounded mt-1"
                />
              </label>
              <label className="block mb-2 text-black">
                Email
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full border p-2 text-black rounded mt-1"
                />
              </label>
              <label className="block mb-4 text-black">
                Role
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full border p-2 text-black rounded mt-1"
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                </select>
              </label>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setEditUser(null)}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
