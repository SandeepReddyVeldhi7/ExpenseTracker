"use client";

import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import CreatableSelect from "react-select/creatable";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { FiUserPlus, FiArrowLeft, FiCheck } from "react-icons/fi";

export default function AddStaffForm() {
  const { data: session, status } = useSession();
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("");
  const [salary, setSalary] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);

  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      if (!session?.user?.role || session.user.role !== "owner") {
        router.push("/no-permission");
      }
    }
  }, [status, session, router]);

  if (status === "unauthenticated") {
    return <p className="text-center mt-10 font-bold">You must be logged in.</p>;
  }

  if (status === "authenticated" && (!session?.user?.role || session.user.role !== "owner")) {
    return null;
  }

  const designationOptions = [
    { value: "Waiter", label: "Waiter" },
    { value: "Cook", label: "Cook" },
    { value: "Cleaner", label: "Cleaner" },
    { value: "Manager", label: "Manager" },
    { value: "Cashier", label: "Cashier" },
    { value: "Other", label: "Other" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    const toastId = toast.loading("Saving staff...");
    setSubmitLoading(true);

    try {
      const res = await fetch("/api/v1/staff/add-staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          designation,
          salary: parseFloat(salary),
        }),
      });

      if (res.ok) {
        toast.success("Staff profile saved successfully!", { id: toastId });
        setName("");
        setDesignation("");
        setSalary("");
        router.push("/staff-list");
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to save", { id: toastId });
      }
    } catch (error) {
      toast.error("Failed to save staff.", { id: toastId });
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8 sm:py-14">
      <Toaster position="top-right" />

      {/* Main Neo Card */}
      <div className="neo-card p-6 sm:p-8 bg-white mb-6">
        <div className="flex items-center justify-between pb-4 mb-6 border-b-2 border-black">
          <button
            onClick={() => router.push("/staff-list")}
            className="neo-btn neo-btn-secondary px-3.5 py-1.5 text-xs flex items-center gap-1.5"
          >
            <FiArrowLeft size={15} />
            <span>Staff Directory</span>
          </button>
          <span className="neo-badge bg-[#D4FF00] text-black">New Staff</span>
        </div>

        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-[#D4FF00] border-2 border-black shadow-[3px_3px_0px_0px_#000] mb-3">
            <FiUserPlus size={28} className="text-black" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
            Register New Staff Member
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-gray-600 mt-1">
            Create employee records and baseline payroll compensation
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">
              Full Legal Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Ramesh Kumar"
              className="neo-input text-sm font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">
              Designation / Role
            </label>
            <CreatableSelect
              isClearable
              options={designationOptions}
              value={designation ? { value: designation, label: designation } : null}
              onChange={(selected) => setDesignation(selected ? selected.value : "")}
              placeholder="Select role or type new..."
              styles={{
                control: (base) => ({
                  ...base,
                  borderColor: "#0A0A0A",
                  borderWidth: "2.5px",
                  borderRadius: "10px",
                  boxShadow: "2px 2px 0px 0px #0A0A0A",
                  padding: "4px",
                  fontWeight: "600",
                  "&:hover": { borderColor: "#0A0A0A" },
                }),
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">
              Monthly Base Salary (₹)
            </label>
            <input
              type="number"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              required
              min="0"
              placeholder="e.g. 18000"
              className="neo-input text-sm font-mono font-bold"
            />
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={submitLoading}
              className="w-full py-4 neo-btn neo-btn-primary text-base font-black flex items-center justify-center gap-2"
            >
              <FiCheck size={18} />
              <span>{submitLoading ? "Saving Staff Profile..." : "🚀 Save Staff Member"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
