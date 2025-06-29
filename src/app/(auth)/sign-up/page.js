"use client";
import React, { useState } from "react";
import { Poppins } from "next/font/google";
import toast, { Toaster } from "react-hot-toast";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const Page = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "", // Default role
  });
  console.log("Form Data:", formData);

  const roles = ["owner"]; // Restrict roles to admin and user

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    const toastId = toast.loading("Storing User Detals...");

    if (formData.password !== formData.confirmPassword) {
      // toast.error("Passwords do not match!",  toastId);
      toast.error("Passwords do not match!!", { id: toastId });
      return;
    }

    try {
      const response = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("User Stored Successfully", { id: toastId });
        setFormData({
          username: "",
          email: "",
          password: "",
          confirmPassword: "",
          role:"", // Reset to default role
        });
      } else {
        const errorData = await response.json();
        // alert(errorData.message || "Registration failed.");
        toast.error(errorData.message, { id: toastId });
      }
    } catch (error) {
  console.log("Error while registering the user:", error);
  toast.error(error.message || "An unexpected error occurred", { id: toastId });
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
          Register
        </h2>

        {/* Username Field */}
        <div className="relative z-0 w-full mb-6 group">
          <input
            type="text"
            name="username"
            id="username"
            className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer"
            placeholder=" "
            value={formData.username}
            onChange={handleChange}
            required
          />
          <label
            htmlFor="username"
            className="absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-blue-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
          >
            Username
          </label>
        </div>

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

        {/* Confirm Password Field */}
        <div className="relative z-0 w-full mb-6 group">
          <input
            type="password"
            name="confirmPassword"
            id="confirmPassword"
            className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer"
            placeholder=" "
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />
          <label
            htmlFor="confirmPassword"
            className="absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-blue-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
          >
            Confirm Password
          </label>
        </div>

        {/* Role Field */}
        <div className="relative z-0 w-full mb-6 group">
          <select
            name="role"
            id="role"
            className="block py-2.5 px-0 w-full text-sm text-gray-500 bg-transparent border-0 border-b-2 border-gray-300 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
            value={formData.role}
            onChange={handleChange}
            required
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </option>
            ))}
          </select>
          <label
            htmlFor="role"
            className="absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-blue-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
          >
            Role
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full text-white bg-teal-600 hover:bg-teal-700 focus:ring-4 focus:outline-none focus:ring-blue-200 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
        >
          Register
        </button>
      </form>
    </div>
  );
};

export default Page;
