"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
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
  FiGrid,
  FiX,
  FiCheckCircle,
  FiMenu,
} from "react-icons/fi";
import toast, { Toaster } from "react-hot-toast";

export default function ResponsiveNav() {
  const pathname = usePathname();
  const { data: session, update } = useSession();

  const avatarSrc =
    session?.user?.image || session?.user?.picture || "/icons/icon3-192.png";

  const [openDropdown, setOpenDropdown] = useState(null);
  const [mobileSheetFor, setMobileSheetFor] = useState(null);
  const [showAllModulesSheet, setShowAllModulesSheet] = useState(false);

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
      await update();
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove photo", { id: toastId });
    } finally {
      setDeletingPhoto(false);
    }
  };

  const role =
    session?.user?.role ||
    (typeof window !== "undefined" ? localStorage.getItem("userRole") : "") ||
    "staff";

  useEffect(() => {
    if (session?.user?.role) {
      localStorage.setItem("userRole", session.user.role);
    }
  }, [session]);

  const ownerNavItems = [
    { href: "/", label: "Dashboard", icon: <FiGrid size={18} /> },
    { href: "/expenses", label: "Expenses", icon: <FiFolder size={18} /> },
    { href: "/attendence", label: "Attendance", icon: <FiCalendar size={18} /> },
    { href: "/reports", label: "Reports", icon: <FiBarChart2 size={18} /> },
    {
      label: "Staff & Users",
      icon: <FiUsers size={18} />,
      children: [
        { href: "/staff", label: "Add Staff Member" },
        { href: "/staff-list", label: "Staff List & Advances" },
        { href: "/staffAdvancesPage", label: "Staff Advances" },
        { href: "/staffAttendance", label: "Staff Attendance Overview" },
        { href: "/staff-registation", label: "Create Staff Login" },
        { href: "/dashboard-users", label: "Staff Accounts" },
        { href: "/sign-up", label: "Create Admin User" },
        { href: "/admin-users", label: "Admin Users" },
      ],
    },
    { href: "/monthly-reports", label: "Month Report", icon: <FiBarChart2 size={18} /> },
    { href: "/analytics", label: "Analytics", icon: <FiBarChart2 size={18} /> },
    { href: "/extra-expenses", label: "Monthly Extra", icon: <FiDollarSign size={18} /> },
    {
      label: "Proofs",
      icon: <FiImage size={18} />,
      children: [
        { href: "/proof", label: "Upload Proof" },
        { href: "/images", label: "View Proofs" },
      ],
    },
  ];

  const staffNavItems = [
    { href: "/expenses", label: "Expenses", icon: <FiFolder size={18} /> },
    { href: "/attendence", label: "Attendance", icon: <FiCalendar size={18} /> },
    { href: "/extra-expenses", label: "Monthly Extra", icon: <FiDollarSign size={18} /> },
    { href: "/proof", label: "Proof", icon: <FiImage size={18} /> },
  ];

  const isOwner = role === "owner";
  const navItems = isOwner ? ownerNavItems : staffNavItems;

  const isGroupActive = (item) =>
    Array.isArray(item.children) &&
    item.children.some((c) => pathname.startsWith(c.href));

  // Quick primary items for mobile bottom dock
  const mobileDockItems = isOwner
    ? [
        { href: "/", label: "Home", icon: <FiGrid size={18} /> },
        { href: "/expenses", label: "Expenses", icon: <FiFolder size={18} /> },
        { href: "/attendence", label: "Attendance", icon: <FiCalendar size={18} /> },
        { href: "/reports", label: "Reports", icon: <FiBarChart2 size={18} /> },
      ]
    : [
        { href: "/expenses", label: "Expenses", icon: <FiFolder size={18} /> },
        { href: "/attendence", label: "Attendance", icon: <FiCalendar size={18} /> },
        { href: "/extra-expenses", label: "Monthly", icon: <FiDollarSign size={18} /> },
        { href: "/proof", label: "Proof", icon: <FiImage size={18} /> },
      ];

  return (
    <>
      <Toaster position="top-right" />

      {/* Desktop Neo-Brutalist Top Navigation Bar */}
      <nav className="hidden md:flex justify-between items-center bg-white border-b-[2.5px] border-[#0A0A0A] px-8 py-3.5 fixed top-0 left-0 right-0 z-50 shadow-[0px_4px_0px_0px_#0A0A0A]">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg border-2 border-black overflow-hidden shadow-[2px_2px_0px_0px_#000] bg-white">
              <img
                src="/icons/icon3-192.png"
                alt="Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="font-black text-sm tracking-tight text-black">
              Sri Raghavendra Udupi Veg
            </span>
          </Link>

          <span className="text-xs font-black px-2.5 py-0.5 rounded-full border-2 border-black bg-[#FFDE59] text-black">
            {isOwner ? "👑 OWNER" : "STAFF"}
          </span>
        </div>

        {/* Nav Links */}
        <div className="flex space-x-2.5 items-center">
          {navItems.map((item, idx) =>
            item.children ? (
              <div
                key={idx}
                className="relative"
                onMouseEnter={() => setOpenDropdown(idx)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <button
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs border-2 transition-all cursor-pointer ${
                    isGroupActive(item)
                      ? "bg-[#D4FF00] border-black shadow-[2px_2px_0px_0px_#000] text-black font-black"
                      : "border-transparent hover:border-black hover:bg-[#F4F4F0] text-black"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                  <FiChevronDown className="ml-0.5 text-xs" />
                </button>

                <AnimatePresence>
                  {openDropdown === idx && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      className="absolute left-0 top-full mt-1.5 bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000] rounded-xl z-50 min-w-[220px] overflow-hidden py-1"
                    >
                      {item.children.map((child) => {
                        const isActive = pathname.startsWith(child.href);
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`block px-4 py-2 text-xs font-bold transition ${
                              isActive
                                ? "bg-[#D4FF00] text-black font-black"
                                : "text-black hover:bg-[#F4F4F0]"
                            }`}
                          >
                            {child.label}
                          </Link>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs border-2 transition-all ${
                  pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
                    ? "bg-[#D4FF00] border-black shadow-[2px_2px_0px_0px_#000] text-black font-black"
                    : "border-transparent hover:border-black hover:bg-[#F4F4F0] text-black"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          )}

          {/* User Avatar & Profile Trigger */}
          <div className="flex items-center gap-3 pl-3 border-l-2 border-black">
            <button
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-2 p-0.5 rounded-full border-2 border-black hover:shadow-[2px_2px_0px_0px_#000] transition bg-white cursor-pointer"
              title="View Profile"
            >
              <img
                src={avatarSrc}
                alt="User Avatar"
                width={30}
                height={30}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = "/icons/icon3-192.png";
                }}
                className="w-7 h-7 rounded-full object-cover"
              />
            </button>

            <button
              onClick={() => signOut({ callbackUrl: "/sign-in" })}
              className="px-2.5 py-1 text-xs font-black border-2 border-black bg-[#FF5A5F] text-white rounded-lg shadow-[2px_2px_0px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition flex items-center gap-1 cursor-pointer"
            >
              <FiLogOut size={13} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Neo-Brutalist Bottom Dock */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-[2.5px] border-[#0A0A0A] flex justify-around items-center py-2 px-1.5 z-50 md:hidden shadow-[0px_-4px_0px_0px_#000]">
        {mobileDockItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-1.5 px-3 rounded-xl border-2 transition-all ${
                isActive
                  ? "bg-[#D4FF00] border-black shadow-[2px_2px_0px_0px_#000] text-black font-black scale-105"
                  : "border-transparent text-black font-bold opacity-80"
              }`}
            >
              <span>{item.icon}</span>
              <span className="text-[10px] font-black uppercase tracking-tight mt-0.5">{item.label}</span>
            </Link>
          );
        })}

        {/* Mobile "More..." Modules Sheet Trigger for Owners */}
        {isOwner && (
          <button
            onClick={() => setShowAllModulesSheet(true)}
            className="flex flex-col items-center py-1.5 px-3 rounded-xl border-2 border-transparent text-black font-bold opacity-80 cursor-pointer"
          >
            <FiMenu size={18} />
            <span className="text-[10px] font-black uppercase tracking-tight mt-0.5">More</span>
          </button>
        )}

        {/* Profile Button */}
        <button
          onClick={() => setShowProfileModal(true)}
          className="flex flex-col items-center py-1 px-2.5 rounded-xl border-2 border-transparent text-black cursor-pointer"
        >
          <img
            src={avatarSrc}
            alt="User Avatar"
            width={22}
            height={22}
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.src = "/icons/icon3-192.png";
            }}
            className="w-5 h-5 rounded-full object-cover border-2 border-black"
          />
          <span className="text-[10px] font-black uppercase tracking-tight mt-0.5">Profile</span>
        </button>
      </nav>

      {/* Mobile "More..." Modules Slide-Up Sheet */}
      <AnimatePresence>
        {showAllModulesSheet && (
          <div
            className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center"
            onClick={() => setShowAllModulesSheet(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white border-t-[3px] border-black rounded-t-2xl max-h-[85vh] overflow-y-auto p-5 pb-10 shadow-[0px_-6px_0px_0px_#000]"
            >
              <div className="flex justify-between items-center pb-3 mb-4 border-b-2 border-black">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-md bg-[#D4FF00] border-2 border-black">
                    <FiGrid size={16} />
                  </span>
                  <h3 className="font-black text-base text-black uppercase tracking-wider">
                    All Application Modules
                  </h3>
                </div>
                <button
                  onClick={() => setShowAllModulesSheet(false)}
                  className="p-1.5 rounded-md border-2 border-black bg-white hover:bg-gray-100 font-bold"
                >
                  <FiX size={16} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Staff Section */}
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-gray-600 block mb-2">
                    Staff & User Administration
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { href: "/staff", label: "Add Staff" },
                      { href: "/staff-list", label: "Staff List" },
                      { href: "/staffAdvancesPage", label: "Staff Advances" },
                      { href: "/staffAttendance", label: "Staff Attendance" },
                      { href: "/staff-registation", label: "Create Staff Login" },
                      { href: "/dashboard-users", label: "Staff Accounts" },
                      { href: "/sign-up", label: "Create Admin" },
                      { href: "/admin-users", label: "Admin Users" },
                    ].map((s) => (
                      <Link
                        key={s.href}
                        href={s.href}
                        onClick={() => setShowAllModulesSheet(false)}
                        className={`p-2.5 rounded-xl border-2 border-black text-xs font-black text-center transition ${
                          pathname === s.href
                            ? "bg-[#D4FF00] shadow-[2px_2px_0px_0px_#000]"
                            : "bg-[#F4F4F0] hover:bg-white"
                        }`}
                      >
                        {s.label}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Reports & Financials */}
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-gray-600 block mb-2">
                    Reports & Analytics
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { href: "/reports", label: "Daily Reports" },
                      { href: "/monthly-reports", label: "Monthly Reports" },
                      { href: "/analytics", label: "Visual Analytics" },
                      { href: "/extra-expenses", label: "Monthly Extra" },
                      { href: "/proof", label: "Upload Proof" },
                      { href: "/images", label: "View Proofs" },
                    ].map((s) => (
                      <Link
                        key={s.href}
                        href={s.href}
                        onClick={() => setShowAllModulesSheet(false)}
                        className={`p-2.5 rounded-xl border-2 border-black text-xs font-black text-center transition ${
                          pathname === s.href
                            ? "bg-[#00F0FF] shadow-[2px_2px_0px_0px_#000]"
                            : "bg-[#F4F4F0] hover:bg-white"
                        }`}
                      >
                        {s.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowAllModulesSheet(false)}
                className="w-full mt-6 py-3 neo-btn neo-btn-secondary text-sm font-black"
              >
                Close Menu
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Neo-Brutalist Profile Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <div
            className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center z-50 p-4"
            onClick={() => setShowProfileModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 w-full max-w-sm border-[3px] border-black shadow-[8px_8px_0px_0px_#000] relative"
            >
              <button
                onClick={() => setShowProfileModal(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full border-2 border-black flex items-center justify-center hover:bg-red-100 font-black cursor-pointer"
              >
                ✕
              </button>

              <div className="inline-block bg-[#D4FF00] border-2 border-black px-3 py-1 font-black text-xs uppercase rounded-md shadow-[2px_2px_0px_0px_#000] mb-4">
                User Account
              </div>

              <div className="flex flex-col items-center mb-6">
                <div className="relative group">
                  <img
                    src={avatarSrc}
                    alt="Profile Picture"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.src = "/icons/icon3-192.png";
                    }}
                    className="w-24 h-24 rounded-2xl object-cover border-[2.5px] border-black shadow-[4px_4px_0px_0px_#000]"
                  />
                  <label className="absolute -bottom-2 -right-2 bg-[#D4FF00] hover:bg-lime-300 text-black p-2 rounded-lg border-2 border-black cursor-pointer shadow-[2px_2px_0px_0px_#000] transition active:translate-x-0.5 active:translate-y-0.5">
                    <FiCamera size={16} />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                      disabled={updatingPhoto || deletingPhoto}
                    />
                  </label>
                </div>

                <h3 className="mt-4 font-black text-xl text-black capitalize tracking-tight">
                  {session?.user?.username || session?.user?.name || "User"}
                </h3>
                <p className="text-xs font-semibold text-gray-600 mt-0.5">{session?.user?.email}</p>
                <span className="mt-2.5 px-3 py-1 bg-black text-[#D4FF00] text-xs font-black rounded-full uppercase tracking-wider">
                  Role: {role}
                </span>
              </div>

              <div className="space-y-3">
                {session?.user?.image && session.user.image.includes("public.blob.vercel-storage.com") && (
                  <button
                    onClick={handleDeletePhoto}
                    disabled={updatingPhoto || deletingPhoto}
                    className="w-full py-2.5 rounded-xl border-2 border-black bg-white hover:bg-red-50 text-red-600 font-black text-xs shadow-[3px_3px_0px_0px_#000] flex items-center justify-center gap-2 active:translate-x-0.5 active:translate-y-0.5 transition cursor-pointer"
                  >
                    <FiTrash2 size={16} /> Remove Photo
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowProfileModal(false);
                    signOut({ callbackUrl: "/sign-in" });
                  }}
                  className="w-full py-2.5 neo-btn neo-btn-danger text-sm font-black cursor-pointer"
                >
                  <FiLogOut size={16} /> Sign Out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
