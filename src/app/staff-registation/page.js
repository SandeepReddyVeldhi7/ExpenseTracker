"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { useSession } from "next-auth/react";

export default function RegisterStaff() {
     const { data: session, status } = useSession();
      const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
 


  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !username || !password) {
      toast.error("All fields are required");
      return;
    }

    //  Show loading toast
    const toastId = toast.loading("Registering staff...");

    try {
      const res = await fetch("/api/v1/dashboardUsers/add-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Staff registered successfully!", { id: toastId });
        setEmail("");
        setPassword("");
        setUsername("");
      } else {
        toast.error(data.error || "Failed to register staff", { id: toastId });
      }
    } catch (err) {
      toast.error("Something went wrong", { id: toastId });
    }
  };

  return (
    <div className="flex items-center justify-center h-screen  bg-gradient-to-r from-blue-500 to-purple-500">
      <div className="  ">
        <div className="max-w-md mx-auto flex justify-center items-center flex-col  rounded-[4px] p-6  border bg-gray-500 ">
          <Toaster />
          <h1 className="text-2xl font-bold mb-4">Register Staff</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label>Email:</label>
              <input
                type="email"
                className="w-full border px-3 py-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Staff Email"
              />
            </div>

            <div>
              <label>Username:</label>
              <input
                type="text"
                className="w-full border px-3 py-2"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Unique Username"
              />
            </div>

            <div>
              <label>Password:</label>
              <input
                type="password"
                className="w-full border px-3 py-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
              />
            </div>
<div className=" flex justify-center items-center">
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              Register Staff
            </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
