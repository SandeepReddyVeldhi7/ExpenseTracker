"use client";

import { useParams, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { FiArrowLeft, FiCamera, FiImage, FiUploadCloud, FiTrash2 } from "react-icons/fi";

const uuid = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

export default function UploadProofPage() {
  const { date } = useParams();
  const router = useRouter();

  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (files) => {
    if (!files || !files.length) return;
    const newFiles = Array.from(files).map((f) => ({
      id: uuid(),
      file: f,
      url: URL.createObjectURL(f),
    }));
    setImages((prev) => [...prev, ...newFiles]);

    if (galleryInputRef.current) galleryInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const removeImage = (id) => {
    setImages((prev) => {
      const found = prev.find((x) => x.id === id);
      if (found) URL.revokeObjectURL(found.url);
      return prev.filter((x) => x.id !== id);
    });
  };

  const handleSubmit = async () => {
    if (!images.length) {
      toast.error("Please select at least one image.");
      return;
    }

    setUploading(true);
    const toastId = toast.loading("Uploading proof images...");

    try {
      const form = new FormData();
      images.forEach((img) => form.append("images", img.file));

      const res = await fetch(`/api/v1/proof/upload?date=${date}`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Upload failed");
      }

      toast.success("Images uploaded successfully!", { id: toastId });
      images.forEach((i) => URL.revokeObjectURL(i.url));
      setImages([]);
      router.push("/images");
    } catch (err) {
      console.error("Upload error:", err);
      toast.error(err.message || "Upload failed", { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <Toaster position="top-right" />

      {/* Main Neo Card */}
      <div className="neo-card p-6 sm:p-8 bg-white mb-6">
        <div className="flex items-center justify-between pb-4 mb-6 border-b-2 border-black flex-wrap gap-3">
          <button
            onClick={() => router.push("/proof")}
            className="neo-btn neo-btn-secondary px-3.5 py-2 text-xs flex items-center gap-1.5"
          >
            <FiArrowLeft size={16} />
            <span>Select Date</span>
          </button>

          <span className="neo-badge bg-[#D4FF00] text-black">
            Date: {date}
          </span>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
            Upload Expense Proofs & Bills
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-gray-600 mt-1">
            Attach photo receipts, physical bills, or vouchers for this date
          </p>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => galleryInputRef.current?.click()}
            className="py-3.5 neo-btn neo-btn-cyan text-sm flex items-center justify-center gap-2"
          >
            <FiImage size={18} />
            <span>Choose from Photos</span>
          </button>
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="py-3.5 neo-btn neo-btn-primary text-sm flex items-center justify-center gap-2"
          >
            <FiCamera size={18} />
            <span>Capture with Camera</span>
          </button>
        </div>

        {/* Hidden inputs */}
        <input
          ref={galleryInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileChange(e.target.files)}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFileChange(e.target.files)}
        />

        {/* Drop / Select zone */}
        <div
          onClick={() => galleryInputRef.current?.click()}
          className="border-2 border-dashed border-black rounded-xl p-8 text-center cursor-pointer bg-[#F4F4F0] hover:bg-white transition mb-6"
        >
          <FiUploadCloud size={32} className="mx-auto text-black mb-2" />
          <p className="font-black text-sm text-black">Click or drop images here</p>
          <p className="text-xs font-bold text-gray-500 mt-1">PNG, JPG, WEBP up to ~5MB per image</p>
        </div>

        {/* Previews */}
        {images.length > 0 && (
          <div className="mb-6">
            <span className="text-xs font-black uppercase tracking-wider text-black block mb-3">
              Selected Proof Images ({images.length})
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="relative rounded-xl border-2 border-black overflow-hidden bg-black shadow-[2px_2px_0px_0px_#000] aspect-square"
                >
                  <img src={img.url} alt="Proof preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeImage(img.id)}
                    className="absolute top-1.5 right-1.5 p-1.5 rounded-lg border border-black bg-[#FF5A5F] text-white hover:opacity-90 font-black text-xs"
                    title="Remove"
                  >
                    <FiTrash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action button */}
        <button
          onClick={handleSubmit}
          disabled={uploading || images.length === 0}
          className="w-full py-4 neo-btn neo-btn-primary text-base font-black flex items-center justify-center gap-2"
        >
          <span>{uploading ? "Uploading Proofs..." : `🚀 Upload ${images.length} Images`}</span>
        </button>
      </div>
    </div>
  );
}
