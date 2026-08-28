"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  FiFolder,
  FiCalendar,
  FiBarChart2,
  FiDollarSign,
  FiUsers,
  FiUploadCloud,
  FiArrowRight,
  FiCheckCircle,
  FiTrendingUp,
} from "react-icons/fi";
import dayjs from "dayjs";

export default function Home() {
  const { data: session } = useSession();
  const role = session?.user?.role || "staff";
  const isOwner = role === "owner";
  const todayFormatted = dayjs().format("dddd, D MMMM YYYY");

  const cards = [
    {
      title: "Daily Expenses",
      desc: "Record cashier totals, drinks sales, deductions & daily payouts.",
      href: "/expenses",
      icon: <FiFolder size={28} />,
      bg: "bg-[#D4FF00]",
      badge: "Fast Entry",
    },
    {
      title: "Attendance Tracker",
      desc: "Log daily staff presence, manage shifts & absent lists.",
      href: "/attendence",
      icon: <FiCalendar size={28} />,
      bg: "bg-[#00F0FF]",
      badge: "Daily Log",
    },
    {
      title: "Monthly Expenses",
      desc: "Add month-end recurring bills, vendor payments & audit totals.",
      href: "/extra-expenses",
      icon: <FiDollarSign size={28} />,
      bg: "bg-[#FFDE59]",
      badge: "Monthly",
    },
    {
      title: "Proof Submission",
      desc: "Upload expense receipts, bill photos & payment confirmations.",
      href: "/proof",
      icon: <FiUploadCloud size={28} />,
      bg: "bg-[#FF7043]",
      badge: "Receipts",
    },
  ];

  const ownerCards = [
    {
      title: "Financial Reports",
      desc: "Comprehensive daily expense breakdowns, payouts & search filters.",
      href: "/reports",
      icon: <FiBarChart2 size={28} />,
      bg: "bg-[#B794F4]",
      badge: "Reports",
    },
    {
      title: "Staff & Payroll",
      desc: "Manage salary payments, cash advances & staff registration.",
      href: "/staff-list",
      icon: <FiUsers size={28} />,
      bg: "bg-[#FF6B8B]",
      badge: "Payroll",
    },
    {
      title: "Performance Analytics",
      desc: "Visual charts, category breakdowns and profit-and-loss insights.",
      href: "/analytics",
      icon: <FiTrendingUp size={28} />,
      bg: "bg-[#70E000]",
      badge: "Insights",
    },
    {
      title: "Monthly Summary",
      desc: "Complete calendar month overview and audit sheets.",
      href: "/monthly-reports",
      icon: <FiCheckCircle size={28} />,
      bg: "bg-[#E2E8F0]",
      badge: "Audit",
    },
  ];

  const displayCards = isOwner ? [...cards, ...ownerCards] : cards;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Welcome Banner Card */}
      <div className="neo-card p-6 sm:p-8 mb-8 bg-white relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-black text-[#D4FF00] rounded-full text-xs font-black uppercase tracking-wider mb-3">
              <span className="w-2 h-2 rounded-full bg-[#D4FF00] animate-ping" />
              {todayFormatted}
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-black">
              Welcome back, {session?.user?.username || session?.user?.name || "Team"}!
            </h1>
            <p className="text-sm sm:text-base font-semibold text-gray-700 mt-1.5">
              {isOwner
                ? "Full management control: Daily summaries, payroll, advances & business reports."
                : "Record daily cash registers, drinks sales, attendance and receipts."}
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center">
            <Link
              href="/expenses"
              className="neo-btn neo-btn-primary px-5 py-3 text-sm flex items-center gap-2"
            >
              <span>Add Today Expense</span>
              <FiArrowRight />
            </Link>
          </div>
        </div>
      </div>

      {/* Grid of Quick Action Cards */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-black tracking-tight flex items-center gap-2">
          <span>⚡ Quick Actions & Modules</span>
        </h2>
        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
          {displayCards.length} Modules Available
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {displayCards.map((card, idx) => (
          <Link
            key={idx}
            href={card.href}
            className="neo-card neo-card-hover p-6 flex flex-col justify-between group bg-white"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-12 h-12 rounded-xl border-2 border-black flex items-center justify-center ${card.bg} shadow-[2px_2px_0px_0px_#000]`}
                >
                  {card.icon}
                </div>
                <span className="neo-badge bg-[#F4F4F0] text-black">
                  {card.badge}
                </span>
              </div>

              <h3 className="text-lg font-black text-black group-hover:text-blue-600 transition-colors">
                {card.title}
              </h3>
              <p className="text-xs sm:text-sm font-semibold text-gray-600 mt-2 leading-relaxed">
                {card.desc}
              </p>
            </div>

            <div className="mt-6 pt-3 border-t-2 border-dashed border-gray-200 flex items-center justify-between font-bold text-xs text-black">
              <span>Open Module</span>
              <span className="p-1 rounded-md border-2 border-black bg-[#D4FF00] group-hover:translate-x-1 transition-transform">
                <FiArrowRight size={14} />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
