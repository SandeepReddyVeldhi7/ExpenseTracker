"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { FiTrash2, FiUserCheck, FiEdit2, FiArrowLeft, FiPlus, FiX, FiShield } from "react-icons/fi";
import Link from "next/link";

export default function AdminUsersList() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState(null);
  const [formData, setFormData] = useState({ email: "", username: "", role: "" });

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "owner") {
      router.push("/no-permission");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "owner") {
      fetchUsers();
    }
  }, [status, session]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/v1/users/user");
      const data = await res.json();
      setUsers(data || []);
    } catch (error) {
      toast.error("Failed to fetch users");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (status === "unauthenticated") {
    return <p className="text-center mt-10 font-bold">You must be logged in.</p>;
  }

  if (status === "authenticated" && session?.user?.role !== "owner") {
    return null;
  }

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this admin account?")) return;
    try {
      const res = await fetch(`/api/v1/users/user?id=${id}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to delete");
      toast.success("Admin user deleted successfully");
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

    const toastId = toast.loading("Updating admin account...");
    try {
      const res = await fetch(`/api/v1/users/user?id=${editUser._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("User updated successfully", { id: toastId });
      setEditUser(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.message, { id: toastId });
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <Toaster position="top-right" />

      {/* Main Neo Card */}
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
                Admin Accounts Management
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-gray-600">
                System owners, managers & elevated privilege accounts
              </p>
            </div>
          </div>

          <Link
            href="/sign-up"
            className="neo-btn neo-btn-primary px-4 py-2 text-xs font-black flex items-center gap-1.5 self-start sm:self-auto"
          >
            <FiPlus size={16} />
            <span>Create Admin User</span>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="font-black text-xs uppercase tracking-wider text-black">Loading Admins...</p>
          </div>
        ) : users.length === 0 ? (
          <p className="text-center text-gray-500 font-bold py-12">No admin users found.</p>
        ) : (
          <div className="overflow-x-auto table-scrollbar border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#000]">
            <table className="w-full text-xs sm:text-sm text-left">
              <thead className="bg-[#F4F4F0] border-b-2 border-black font-black uppercase text-black">
                <tr>
                  <th className="p-3.5">Username</th>
                  <th className="p-3.5">Email</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Created Date</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-bold">
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50 transition">
                    <td className="p-3.5 font-black text-black flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#D4FF00] border border-black flex items-center justify-center text-black font-black text-xs">
                        <FiShield size={12} />
                      </div>
                      {user.username}
                    </td>
                    <td className="p-3.5 text-gray-700 font-mono text-xs">{user.email}</td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black border border-black bg-[#D4FF00] text-black">
                        {user.role}
                      </span>
                    </td>
                    <td className="p-3.5 text-xs text-gray-500 font-mono">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3.5 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(user)}
                        className="px-2.5 py-1 text-xs neo-btn neo-btn-cyan font-black"
                      >
                        <FiEdit2 size={12} className="inline mr-1" /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(user._id)}
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
        )}
      </div>

      {/* Edit Modal */}
      {editUser && (
        <div
          className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setEditUser(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md border-[3px] border-black shadow-[8px_8px_0px_0px_#000] relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b-2 border-black pb-3 mb-4">
              <h2 className="text-xl font-black text-black">Edit Admin Account</h2>
              <button
                onClick={() => setEditUser(null)}
                className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center hover:bg-gray-100 font-black cursor-pointer"
              >
                <FiX size={16} />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-black uppercase text-black mb-1">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="neo-input text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-black mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="neo-input text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-black mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="neo-input text-sm font-bold cursor-pointer"
                >
                  <option value="owner">owner</option>
                  <option value="admin">admin</option>
                  <option value="manager">manager</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t-2 border-black">
                <button
                  onClick={() => setEditUser(null)}
                  className="py-2 px-4 neo-btn neo-btn-secondary text-xs font-black"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  className="py-2 px-5 neo-btn neo-btn-primary text-xs font-black"
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
