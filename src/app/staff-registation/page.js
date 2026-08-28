"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { useSession } from "next-auth/react";
import { FiUserPlus, FiArrowLeft, FiCheck } from "react-icons/fi";

export default function RegisterStaff() {
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && session.user.role !== "owner") {
      router.push("/no-permission");
    }
  }, [status, session, router]);

  if (status === "unauthenticated") {
    return <p className="text-center mt-10 font-bold">You must be logged in.</p>;
  }

  if (session?.user?.role !== "owner") {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !username || !password) {
      toast.error("All fields are required");
      return;
    }

    const toastId = toast.loading("Registering staff account...");
    setLoading(true);

    try {
      const res = await fetch("/api/v1/dashboardUsers/add-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Staff login account created successfully!", { id: toastId });
        setEmail("");
        setPassword("");
        setUsername("");
        router.push("/dashboard-users");
      } else {
        toast.error(data.error || "Failed to register staff", { id: toastId });
      }
    } catch (err) {
      toast.error("Something went wrong", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8 sm:py-14">
      <Toaster position="top-right" />

      {/* Main Neo Card */}
      <div className="neo-card p-6 sm:p-8 bg-white mb-6">
        <div className="flex items-center justify-between pb-4 mb-6 border-b-2 border-black">
          <button
            onClick={() => router.push("/dashboard-users")}
            className="neo-btn neo-btn-secondary px-3.5 py-1.5 text-xs flex items-center gap-1.5"
          >
            <FiArrowLeft size={15} />
            <span>Staff Accounts</span>
          </button>
          <span className="neo-badge bg-[#00F0FF] text-black">New Account</span>
        </div>

        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-[#00F0FF] border-2 border-black shadow-[3px_3px_0px_0px_#000] mb-3">
            <FiUserPlus size={28} className="text-black" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
            Create Staff Login
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-gray-600 mt-1">
            Assign credentials for cashiers & daily shift operators
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">
              Staff Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="staff@restaurant.com"
              className="neo-input text-sm font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="e.g. staff_ramesh"
              className="neo-input text-sm font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••••••"
              className="neo-input text-sm font-bold"
            />
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 neo-btn neo-btn-primary text-base font-black flex items-center justify-center gap-2"
            >
              <FiCheck size={18} />
              <span>{loading ? "Registering Staff..." : "🚀 Create Staff Login"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
