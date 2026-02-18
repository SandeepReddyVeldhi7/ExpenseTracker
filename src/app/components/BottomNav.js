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
} from "react-icons/fi";

export default function ResponsiveNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const avatarSrc =
    session?.user?.image || "https://cdn-icons-png.flaticon.com/512/149/149071.png";

  const [openDropdown, setOpenDropdown] = useState(null); 

  const [mobileSheetFor, setMobileSheetFor] = useState(null); 


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
    { href: "/paydetails", label: "Pay Details", icon: <FiDollarSign /> },
    { href: "/reports", label: "Reports", icon: <FiBarChart2 /> },


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

          {/* Avatar + Logout */}
          <div className="flex items-center gap-3">
            <img
              src={avatarSrc}
              alt="User Avatar"
              width={36}
              height={36}
              className="rounded-full object-cover border border-gray-300"
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

        {/* Avatar + Logout */}
        <button
          onClick={() => signOut({ callbackUrl: "/sign-in" })}
          className={`flex flex-col items-center ${
            pathname === "/sign-in" ? "text-blue-600" : "text-black"
          }`}
        >
          <img
            src={avatarSrc}
            alt="User Avatar"
            width={40}
            height={40}
            className="rounded-full object-cover border border-gray-300"
          />
          <span className="text-xs">Logout</span>
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
    </>
  );
}
