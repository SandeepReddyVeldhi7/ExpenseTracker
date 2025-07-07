"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { FaTrash, FaUserShield, FaEdit } from "react-icons/fa";

export default function DashboardUsersList() {
     const { data: session, status } = useSession();
    const router = useRouter();
     const [users, setUsers] = useState([]);
     const [loading, setLoading] = useState(true);

  const [editUser, setEditUser] = useState(null);
  const [formData, setFormData] = useState({ email: "", username: "", role: "" });
      // ✅ All hooks declared first
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
       setLoading(true);
    try {
      const res = await fetch("/api/v1/dashboard-users/users");
      const data = await res.json();
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
  // ✅ Guards AFTER all hooks
  if (status === "loading") {
    return <p className="text-center mt-10">Loading...</p>;
  }

  if (status === "unauthenticated") {
    return <p className="text-center mt-10">You must be logged in.</p>;
  }

  if (status === "authenticated" && session?.user?.role !== "owner") {
    return null;
  }
 

 

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      const res = await fetch(`/api/v1/dashboard-users/users?id=${id}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to delete");
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
    if (!formData.email || !formData.username) {
      return toast.error("Email and Username are required");
    }

    try {
      const res = await fetch(`/api/v1/dashboard-users/users?id=${editUser._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("User updated successfully");
      setEditUser(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-700 to-purple-700 p-6 flex justify-center">
      <Toaster />
      <div className=" rounded-xl shadow-xl p-6 w-full max-w-5xl">
        <h1 className="sm:text-3xl bg-white font-bold mb-6 text-center text-gray-800">
          🛡️ Dashboard Users
        </h1>

        {loading ? (
          <p className="text-center text-gray-500">Loading users...</p>
        ) : users.length === 0 ? (
          <p className="text-center text-gray-500">No users found.</p>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm text-black">
                <thead className="">
                  <tr>
                    <th className="p-3 text-left text-black">Username</th>
                    <th className="p-3 text-left text-black">Email</th>
                    <th className="p-3 text-left text-black">Role</th>
                    <th className="p-3 text-left text-black">Created</th>
                    <th className="p-3 text-left text-black">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="p-3 flex items-center gap-2 font-medium text-gray-800">
                        <FaUserShield className="text-indigo-600" />
                        {user.username}
                      </td>
                      <td className="p-3 text-black">{user.email}</td>
                      <td className="p-3  text-black capitalize">{user.role}</td>
                      <td className="p-3 text-sm text-black">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3 flex gap-4">
                        <button
                          onClick={() => openEditModal(user)}
                          className="text-blue-600 hover:text-blue-800 text-lg flex items-center gap-1"
                        >
                          <FaEdit /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(user._id)}
                          className="text-red-600 hover:text-red-800 text-lg flex items-center gap-1"
                        >
                          <FaTrash /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile view */}
            <div className="block md:hidden space-y-4">
              {users.map((user) => (
                <div key={user._id} className="bg-black p-4 rounded-lg shadow text-sm">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2 font-semibold text-gray-800">
                      <FaUserShield className="text-indigo-600 text-white" />
                      {user.username}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(user)}
                        className="text-blue-600 text-xs"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(user._id)}
                        className="text-red-600 text-xs"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                  <div>
                    <div><strong>Email:</strong> {user.email}</div>
                    <div><strong>Role:</strong> <span className="capitalize">{user.role}</span></div>
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className=" p-6 rounded-lg w-full max-w-md shadow-lg">
              <h2 className="text-xl font-bold mb-4">Edit User</h2>
              <label className="block mb-2">
                Username
                <input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full border p-2 rounded mt-1"
                />
              </label>
              <label className="block mb-2">
                Email
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full border p-2 rounded mt-1"
                />
              </label>
              {/* <label className="block mb-4">
                Role
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full border p-2 rounded mt-1"
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                </select>
              </label> */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setEditUser(null)}
                  className="px-4 py-2 bg-black rounded hover:bg-gray-400"
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
