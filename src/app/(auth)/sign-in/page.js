"use client";

import React, { useState } from "react";
import { Poppins } from "next/font/google";
import { signIn } from "next-auth/react";
import toast, { Toaster } from "react-hot-toast";
import Image from "next/image";
import Link from "next/link";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function SignIn() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);

  /** Handle input changes **/
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  /** Handle email/password sign-in **/
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
        callbackUrl: "/",
      });

      if (response.ok) {
        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();

        if (session?.user?.role) {
          localStorage.setItem("userRole", session.user.role);
        }

        const namePart = session?.user?.username?.split(" ")[0] || formData.email.split("@")[0];
        toast.success(`Welcome, ${namePart}!`, { id: toastId });

        setFormData({ email: "", password: "" });
        window.location.href = "/";
      } else {
        toast.error(response.error || "Sign-in failed", { id: toastId });
      }
    } catch (error) {
      console.error("Sign-in error:", error);
      toast.error("An error occurred. Please try again.", { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  /** Handle Google sign-in **/
  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: "/" });
  };

  return (
    <div
      className={`flex ${poppins.className} items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-4`}
    >
      <Toaster />

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white rounded-lg shadow-lg p-6 flex flex-col items-center"
      >
        {/* LOGO */}
        <div className="mb-4">
          <Image
            src="/icons/icon3-192.jpg"
            alt="Company Logo"
            width={100}
            height={100}
            priority
            className="rounded-full object-cover"
          />
        </div>

        <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">
          Sign In
        </h2>

        {/* Email Field */}
        <div className="relative z-0 w-full mb-6 group">
          <input
            type="email"
            name="email"
            id="email"
            className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-teal-600 peer"
            placeholder=" "
            value={formData.email}
            onChange={handleChange}
            required
          />
          <label
            htmlFor="email"
            className="absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-1 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-teal-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
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
            className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-teal-600 peer"
            placeholder=" "
            value={formData.password}
            onChange={handleChange}
            required
          />
          <label
            htmlFor="password"
            className="absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-teal-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
          >
            Password
          </label>
        </div>

        {/* Forgot Password Link */}
        <div className="text-right w-full mb-4">
          <Link href="/forgot-password">
            <p className="text-sm text-teal-700 hover:underline">
              Forgot Password?
            </p>
          </Link>
        </div>

        {/* Sign In Button */}
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full mt-2 text-white font-medium rounded-lg text-sm px-5 py-2.5 text-center transition duration-300
            ${isLoading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-teal-500 to-green-600 hover:from-teal-600 hover:to-green-700 focus:ring-4 focus:outline-none focus:ring-teal-200"}`}
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

        {/* Divider */}
        <div className="my-4 w-full flex items-center">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="mx-3 text-gray-400 text-sm">OR</span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>

        {/* Google Sign-In Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg px-5 py-2.5 text-sm font-medium bg-white hover:bg-gray-50 transition duration-300 shadow-sm"
        >
          <img
            src="/icons/google-logo.png"
            alt="Google logo" 
            className="w-5 h-5"
          />
          <span className="text-gray-700">Sign in with Google</span>
        </button>
      </form>
    </div>
  );
}
