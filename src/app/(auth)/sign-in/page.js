"use client";
import React, { useState } from "react";
import { Poppins } from "next/font/google";
import toast, { Toaster } from "react-hot-toast";
import { signIn } from "next-auth/react";
import Link from "next/link";
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const SignIn = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle form submission
 const handleSubmit = async (e) => {
  e.preventDefault();
  if (isLoading) return;
  setIsLoading(true);

  const toastId = toast.loading("Signing in...");

  try {
    const response = await signIn("credentials", {
      email: formData.email,
      password: formData.password,
      redirect: false,
      callbackUrl: `/`,
    });

    if (response.ok) {
      // Fetch session to get the role and username
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();

      if (session?.user?.role) {
        localStorage.setItem("userRole", session.user.role);
      }

      // 👉 Get a friendly name for the toast
      const namePart = session?.user?.username?.split(" ")[0] || formData.email.split("@")[0];

      toast.success(`Welcome, ${namePart}!`, { id: toastId });

      setFormData({ email: "", password: "" });
      window.location.href = "/";
    } else {
      toast.error(response.error || "Sign-in failed", { id: toastId });
    }
  } catch (error) {
    console.log("Sign-in error:", error);
    toast.error("An error occurred. Please try again.", { id: toastId });
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div
      className={`flex ${poppins.className} items-center justify-center min-h-screen bg-gray-100 p-4`}
    >
      <Toaster />
      <form
        className="w-full max-w-md bg-white rounded-lg shadow-lg p-6"
        onSubmit={handleSubmit}
      >
        <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">
          Sign In
        </h2>

        {/* Email Field */}
        <div className="relative z-0 w-full mb-6 group">
          <input
            type="email"
            name="email"
            id="email"
            className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer"
            placeholder=" "
            value={formData.email}
            onChange={handleChange}
            required
          />
          <label
            htmlFor="email"
            className="absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-1 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-blue-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
          >
            Email
          </label>
        </div>

        {/* Password Field */}
        <div className="relative z-0 w-full mb-6 group">
          <input
            type="password"
            name="password"
            id="password"
            className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer"
            placeholder=" "
            value={formData.password}
            onChange={handleChange}
            required
          />
          <label
            htmlFor="password"
            className="absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-blue-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
          >
            Password
          </label>
        </div>

        {/* Forgot Password */}
        <div className="text-right">
          <Link href="/forgot-password">
            <p className="text-[#000] text-[14px] font-medium">
              Forgot Password
            </p>
          </Link>
        </div>
        {/* Submit Button */}
        <button
  type="submit"
  disabled={isLoading}
  className={`w-full mt-2 text-white font-medium rounded-lg text-sm px-5 py-2.5 text-center transition duration-300
    ${
      isLoading
        ? "bg-gray-400 cursor-not-allowed"
        : "bg-gradient-to-r from-teal-500 to-green-600 hover:from-teal-600 hover:to-green-700 focus:ring-4 focus:outline-none focus:ring-teal-200"
    }
  `}
>
  {isLoading ? (
    <span className="flex items-center justify-center">
      <svg
        className="animate-spin h-5 w-5 mr-2 text-white"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
          fill="none"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v8z"
        />
      </svg>
      Signing in...
    </span>
  ) : (
    "Sign In"
  )}
</button>

      </form>
    </div>
  );
};

export default SignIn;
