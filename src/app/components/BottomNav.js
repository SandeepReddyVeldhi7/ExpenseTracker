"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";

import {
  FiChevronDown,
  FiUsers,
  FiCalendar,
  FiFolder,
  FiDollarSign,
  FiBarChart2,
  FiLogOut,
  FiImage,
  FiCamera,
  FiTrash2,
} from "react-icons/fi";
import toast, { Toaster } from "react-hot-toast";

export default function ResponsiveNav() {
  const pathname = usePathname();
  const { data: session, update } = useSession();

  const avatarSrc =
    session?.user?.image || "https://cdn-icons-png.flaticon.com/512/149/149071.png";

  const [openDropdown, setOpenDropdown] = useState(null); 
  const [mobileSheetFor, setMobileSheetFor] = useState(null); 

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [updatingPhoto, setUpdatingPhoto] = useState(false);
  const [deletingPhoto, setDeletingPhoto] = useState(false);

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUpdatingPhoto(true);
    const formData = new FormData();
    formData.append("image", file);

    const toastId = toast.loading("Updating profile photo...");

    try {
      const res = await fetch("/api/v1/profile/upload-photo", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      toast.success("Profile photo updated!", { id: toastId });
      
      // Re-fetch NextAuth session to load the updated image path
      await update();
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload photo", { id: toastId });
    } finally {
      setUpdatingPhoto(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!confirm("Are you sure you want to remove your profile photo?")) return;

    setDeletingPhoto(true);
    const toastId = toast.loading("Removing profile photo...");

    try {
      const res = await fetch("/api/v1/profile/delete-photo", {
        method: "POST",
      });

      if (!res.ok) throw new Error("Delete failed");

      toast.success("Profile photo removed!", { id: toastId });
      
      // Re-fetch NextAuth session to load the default image
      await update();
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove photo", { id: toastId });
    } finally {
      setDeletingPhoto(false);
    }
  }; 


  let role =
    session?.user?.role ||
    (typeof window !== "undefined" ? localStorage.getItem("userRole") : "");

  useEffect(() => {
    if (session?.user?.role) {
      localStorage.setItem("userRole", session.user.role);
    }
  }, [session]);

 

  const ownerNavItems = [
    {
      label: "Staff",
      icon: <FiUsers />,
      children: [
        { href: "/staff", label: "Add Staff Members " },
        { href: "/staff-list", label: "Staff Members" },
        { href: "/staffAdvancesPage", label: "Staff Advances" },
        { href: "/staffAttendance", label: "Staff Attendence List" },
        { href: "/staff-registation", label: "Staff login Creation" },
        { href: "/dashboard-users", label: "login Staff List" },
        { href: "/sign-up", label: "Admin user creation" },
        { href: "/admin-users", label: "Admin users" },
        { href: "/analytics", label: "Analytics" },
      ],
    },
    { href: "/attendence", label: "Attendance", icon: <FiCalendar /> },
    { href: "/expenses", label: "Expenses", icon: <FiFolder /> },
    { href: "/reports", label: "Reports", icon: <FiBarChart2 /> },
    { href: "/monthly-reports", label: "View Month Report", icon: <FiBarChart2 /> },


    {
      label: "upload",
      icon: <FiImage />,
      children: [
        { href: "/proof", label: "Upload Proof" },
        { href: "/images", label: "View Proofs (Table)" },
      ],
    },
  ];

  const staffNavItems = [
    { href: "/attendence", label: "Attendance", icon: <FiCalendar /> },
    { href: "/expenses", label: "Expenses", icon: <FiFolder /> },
    { href: "/extra-expenses", label: "Extra Monthly Expenses", icon: <FiDollarSign /> },
    { href: "/proof", label: "Upload Proof", icon: <FiImage /> },
  ];

  const navItems =
    role === "staff" || role === "staff123" ? staffNavItems : ownerNavItems;

  // helper: is any child active?
  const isGroupActive = (item) =>
    Array.isArray(item.children) &&
    item.children.some((c) => pathname.startsWith(c.href));

  return (
    <>
      {/* Desktop Nav */}
      <nav className="hidden md:flex justify-between items-center bg-white text-black px-6 py-4 shadow fixed top-0 left-0 right-0 z-50">
        <div className="text-xl font-bold text-blue-600"></div>
        <div className="flex space-x-8 items-center">
          {navItems.map((item, idx) =>
            item.children ? (
              <div
                key={idx}
                className="relative"
                onMouseEnter={() => setOpenDropdown(idx)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <button
                  className={`flex items-center gap-1 ${
                    isGroupActive(item) ? "text-blue-600" : "text-gray-600"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  <FiChevronDown className="ml-1" />
                </button>

                <AnimatePresence>
                  {openDropdown === idx && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute left-0 top-full mt-2 bg-white border shadow rounded-md z-50 overflow-hidden"
                    >
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`block px-4 py-2 hover:bg-gray-100 whitespace-nowrap ${
                            pathname.startsWith(child.href) ? "text-blue-600" : ""
                          }`}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1 ${
                  pathname === item.href ? "text-blue-600" : "text-gray-600"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            )
          )}

          {/* Avatar + Profile Modal Trigger */}
          <div className="flex items-center gap-3">
            <img
              src={avatarSrc}
              alt="User Avatar"
              width={36}
              height={36}
              className="rounded-full object-cover border border-gray-300 cursor-pointer hover:opacity-85 transition"
              onClick={() => setShowProfileModal(true)}
            />
            <button
              onClick={() => signOut({ callbackUrl: "/sign-in" })}
              className="flex items-center text-red-500 gap-1"
            >
              <FiLogOut />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-2 text-sm z-50 md:hidden">
        {navItems.map((item, idx) =>
          item.children ? (
            <button
              key={idx}
              onClick={() => setMobileSheetFor(idx)}
              className={`flex flex-col items-center ${
                isGroupActive(item) ? "text-blue-600" : "text-black"
              }`}
            >
              {/* use the item's own icon */}
              <span className="text-lg">{item.icon}</span>
              <span className="text-xs">{item.label}</span>
            </button>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center ${
                pathname === item.href ? "text-blue-600" : "text-black"
              }`}
            >
              {item.icon}
              <span className="text-xs">{item.label}</span>
            </Link>
          )
        )}

        {/* Avatar + Profile Modal Trigger */}
        <button
          onClick={() => setShowProfileModal(true)}
          className={`flex flex-col items-center text-black`}
        >
          <img
            src={avatarSrc}
            alt="User Avatar"
            width={40}
            height={40}
            className="rounded-full object-cover border border-gray-300"
          />
          <span className="text-xs">Profile</span>
        </button>
      </nav>

      {/* Mobile Slide-Up Sheet — only for the tapped group */}
      <AnimatePresence>
        {mobileSheetFor !== null && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 bg-white text-black border-t shadow-lg z-50 rounded-t-lg"
          >
            {navItems[mobileSheetFor]?.children?.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                onClick={() => setMobileSheetFor(null)}
                className={`block px-4 py-4 border-b hover:bg-gray-100 ${
                  pathname.startsWith(child.href) ? "text-blue-600" : ""
                }`}
              >
                {child.label}
              </Link>
            ))}

            <button
              onClick={() => setMobileSheetFor(null)}
              className="block w-full px-4 py-4 text-center text-red-500 font-semibold"
            >
              Close
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Modal */}
      <Toaster />
      <AnimatePresence>
        {showProfileModal && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={() => setShowProfileModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 w-full max-w-sm border border-gray-150 shadow-2xl text-gray-800 relative"
            >
              <button
                onClick={() => setShowProfileModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>

              <h2 className="text-xl font-bold text-center text-gray-800 mb-6">User Profile</h2>

              <div className="flex flex-col items-center mb-6">
                <div className="relative group">
                  <img
                    src={avatarSrc}
                    alt="Profile Picture"
                    className="w-24 h-24 rounded-full object-cover border-2 border-blue-500 shadow-md"
                  />
                  <label className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full cursor-pointer shadow-md transition duration-150">
                    <FiCamera size={14} />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                      disabled={updatingPhoto || deletingPhoto}
                    />
                  </label>
                </div>
                
                <p className="mt-4 font-bold text-lg text-gray-900 capitalize">
                  {session?.user?.username || session?.user?.name || "User"}
                </p>
                <p className="text-xs text-gray-500">{session?.user?.email}</p>
                <span className="mt-2 px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full capitalize">
                  Role: {role || "staff"}
                </span>
              </div>

              <div className="space-y-3">
                {session?.user?.image && session.user.image.includes("public.blob.vercel-storage.com") && (
                  <button
                    onClick={handleDeletePhoto}
                    disabled={updatingPhoto || deletingPhoto}
                    className="w-full py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-semibold flex items-center justify-center gap-2 transition"
                  >
                    <FiTrash2 size={14} /> Remove Photo
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowProfileModal(false);
                    signOut({ callbackUrl: "/sign-in" });
                  }}
                  className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center justify-center gap-2 transition"
                >
                  <FiLogOut size={14} /> Logout
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
