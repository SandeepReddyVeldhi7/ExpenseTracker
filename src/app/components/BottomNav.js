"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiChevronDown,
  FiUsers,
  FiCalendar,
  FiFolder,
  FiDollarSign,
  FiBarChart2,
  FiLogOut,
} from "react-icons/fi";

export default function ResponsiveNav() {
  const pathname = usePathname();
  const [navItems, setNavItems] = useState([]);
  const [showDesktopDropdown, setShowDesktopDropdown] = useState(false);
  const [showMobileSheet, setShowMobileSheet] = useState(false);

  //  Define nav items with icons
  const ownerNavItems = [
    {
      label: "Staff",
      icon: <FiUsers />,
      children: [
        { href: "/staff", label: "Add Staff Members " },
        { href: "/staff-registation", label: "Staff Creation" },
        { href: "/staffAdvancesPage", label: "Staff Advances" },
        { href: "/staff-list", label: "Staff List" },
        { href: "/dashboard-users", label: "login Users List" }
      ],
    },
    { href: "/attendence", label: "Attendance", icon: <FiCalendar /> },
    { href: "/expenses", label: "Expenses", icon: <FiFolder /> },
    { href: "/paydetails", label: "Pay Details", icon: <FiDollarSign /> },
    { href: "/reports", label: "Reports", icon: <FiBarChart2 /> },
  ];

  const staffNavItems = [
  
    { href: "/attendence", label: "Attendance", icon: <FiCalendar /> },
    { href: "/expenses", label: "Expenses", icon: <FiFolder /> },
  ];

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    setNavItems(
      role === "staff" || role === "staff123" ? staffNavItems : ownerNavItems
    );
  }, []);

  return (
    <>
      {/*  Desktop Nav */}
      <nav className="hidden md:flex justify-between items-center bg-white px-6 py-4 shadow fixed top-0 left-0 right-0 z-50">
        <div className="text-xl font-bold text-blue-600"></div>
        <div className="flex space-x-8 items-center">
          {navItems.map((item, idx) =>
            item.children ? (
              <div
                key={idx}
                className="relative"
                onMouseEnter={() => setShowDesktopDropdown(true)}
                onMouseLeave={() => setShowDesktopDropdown(false)}
              >
                <button
                  className={`flex items-center gap-1 ${
                    pathname.startsWith("/staff")
                      ? "text-blue-600"
                      : "text-gray-600"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  <FiChevronDown className="ml-1" />
                </button>

                <AnimatePresence>
                  {showDesktopDropdown && (
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
                          className="block px-4 py-2 hover:bg-gray-100 whitespace-nowrap"
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
          <button
            onClick={() => signOut({ callbackUrl: "/sign-in" })}
            className="flex items-center text-red-500 gap-1"
          >
            <FiLogOut />
            <span>Logout</span>
          </button>
        </div>
      </nav>

      {/* ✅ Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-2 text-sm z-50 md:hidden">
        {navItems.map((item, idx) =>
          item.children ? (
            <button
              key={idx}
              onClick={() => setShowMobileSheet(true)}
              className={`flex flex-col items-center ${
                pathname.startsWith("/staff")
                  ? "text-blue-600"
                  : "text-gray-500"
              }`}
            >
              <FiUsers className="text-lg" />
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
        <button
          onClick={() => signOut({ callbackUrl: "/sign-in" })}
          className="flex flex-col items-center text-red-500"
        >
          <FiLogOut className="text-lg" />
          <span className="text-xs">Logout</span>
        </button>
      </nav>

      {/* ✅ Mobile Slide-Up Sheet */}
      <AnimatePresence>
        {showMobileSheet && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50 rounded-t-lg"
          >
            
            {navItems
              .find((i) => i.children)
              ?.children.map((child) => (
                <Link
                  key={child.href}
                  href={child.href}
                  onClick={() => setShowMobileSheet(false)}
                  className="block px-4 py-4 border-b hover:bg-gray-100"
                >
                  {child.label}
                </Link>
              ))}
            <button
              onClick={() => setShowMobileSheet(false)}
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
