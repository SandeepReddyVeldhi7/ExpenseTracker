"use client";

import { useParams, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

/* -------------------------------
   ✅ Universal UUID helper
--------------------------------*/
const uuid = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

/* -------------------------------
   ✅ UploadProofPage Component
--------------------------------*/
export default function UploadProofPage() {
  const { date } = useParams();
  const router = useRouter();

  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Handle file selection (both gallery + camera)
  const handleFileChange = (files) => {
    if (!files || !files.length) return;
    const newFiles = Array.from(files).map((f) => ({
      id: uuid(),
      file: f,
      url: URL.createObjectURL(f),
    }));
    setImages((prev) => [...prev, ...newFiles]);

    // reset file inputs so same file can be reselected
    if (galleryInputRef.current) galleryInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  // Remove a preview
  const removeImage = (id) => {
    setImages((prev) => {
      const found = prev.find((x) => x.id === id);
      if (found) URL.revokeObjectURL(found.url);
      return prev.filter((x) => x.id !== id);
    });
  };

  // Upload files to backend
  const handleSubmit = async () => {
    if (!images.length) {
      toast.error("Please select at least one image.");
      return;
    }

    setUploading(true);
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

      toast.success("Images uploaded successfully!");
      // Cleanup URLs
      images.forEach((i) => URL.revokeObjectURL(i.url));
      setImages([]);
    } catch (err) {
      console.error("Upload error:", err);
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-[90vh] bg-gradient-to-br from-black via-gray-800 to-lime-800 flex items-center justify-center p-4">
      <Toaster />
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl">
        <h1 className="text-xl font-bold mb-3">Upload Proof — {date}</h1>

        {/* Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <button
            onClick={() => galleryInputRef.current?.click()}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
          >
            Choose from Photos
          </button>
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="w-full py-3 rounded-xl bg-lime-600 text-white font-semibold hover:bg-lime-700"
          >
            Take Photo
          </button>
        </div>

        {/* Hidden inputs */}
        {/* Gallery — opens photo library */}
        <input
          ref={galleryInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileChange(e.target.files)}
        />

        {/* Camera — opens native camera */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFileChange(e.target.files)}
        />

        {/* Drag area (optional) */}
        <div
          onClick={() => galleryInputRef.current?.click()}
          className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer"
        >
          <p className="mb-2">Click or drag to select images</p>
          <p className="text-xs text-gray-500">JPG/PNG up to ~5MB each</p>
        </div>

        {/* Previews */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {images.map((img) => (
              <div key={img.id} className="relative border rounded overflow-hidden">
                <img
                  src={img.url}
                  alt="preview"
                  className="w-full h-28 object-cover"
                />
                <button
                  onClick={() => removeImage(img.id)}
                  className="absolute top-1 right-1 bg-red-600 text-white rounded px-2 py-0.5 text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={uploading || !images.length}
          className={`mt-5 w-full py-3 rounded-xl text-white font-semibold transition ${
            images.length
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          {uploading ? "Uploading..." : "Submit"}
        </button>
      </div>
    </div>
  );
}
