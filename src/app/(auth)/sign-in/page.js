"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import toast, { Toaster } from "react-hot-toast";
import Image from "next/image";
import Link from "next/link";
import { FiMail, FiLock, FiArrowRight, FiShield } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";

export default function SignIn() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    if (!formData.email || !formData.password) {
      toast.error("Please enter email/username and password");
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading("Authenticating...");

    try {
      const response = await signIn("credentials", {
        email: formData.email.trim(),
        password: formData.password,
        redirect: false,
        callbackUrl: "/",
      });

      if (response?.ok) {
        toast.success("Signed in successfully!", { id: toastId });
        setFormData({ email: "", password: "" });
        window.location.href = "/";
      } else {
        toast.error(response?.error || "Invalid username or password", { id: toastId });
      }
    } catch (error) {
      console.error("Sign-in error:", error);
      toast.error("An error occurred during sign-in", { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    if (isGoogleLoading) return;
    setIsGoogleLoading(true);

    signIn("google", { callbackUrl: "/" })
      .catch((err) => {
        console.error(err);
        toast.error("Google sign-in failed");
      })
      .finally(() => {
        setIsGoogleLoading(false);
      });
  };

  return (
    <div className="flex items-center justify-center min-h-[85vh] px-4 py-8">
      <Toaster position="top-right" />

      <div className="w-full max-w-md neo-card p-6 sm:p-8 bg-white">
        {/* Brand Logo */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl border-[3px] border-black overflow-hidden shadow-[4px_4px_0px_0px_#000] mb-3 bg-white">
            <Image
              src="/icons/icon3-192.png"
              alt="Sri Raghavendra Udupi Veg"
              fill
              priority
              className="object-cover"
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-black">
            Sri Raghavendra Udupi Veg
          </h1>
          <p className="text-xs sm:text-sm font-bold text-gray-600 mt-1">
            Sign in to restaurant dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">
              Email or Username
            </label>
            <div className="relative">
              <input
                type="text"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="owner@example.com or staff_user"
                className="neo-input text-sm"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-black uppercase tracking-wider text-black">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-bold text-gray-600 hover:text-black underline"
              >
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="neo-input text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 neo-btn neo-btn-primary text-sm flex items-center justify-center gap-2 mt-2"
          >
            <span>{isLoading ? "Signing in..." : "Sign In to Dashboard"}</span>
            <FiArrowRight />
          </button>
        </form>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t-2 border-black" />
          </div>
          <span className="relative bg-white px-3 text-xs font-black uppercase tracking-widest text-gray-500">
            or
          </span>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading}
          className="w-full py-2.5 neo-btn neo-btn-secondary text-xs sm:text-sm flex items-center justify-center gap-2"
        >
          <FcGoogle size={18} />
          <span>{isGoogleLoading ? "Connecting..." : "Sign In with Google"}</span>
        </button>

        <div className="mt-6 pt-4 border-t-2 border-gray-100 text-center">
          <p className="text-xs font-semibold text-gray-600">
            Need an account? Contact the business owner.
          </p>
        </div>
      </div>
    </div>
  );
}
