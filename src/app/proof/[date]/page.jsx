"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

export default function UploadProofPage() {
  const { date } = useParams();
  const router = useRouter();
  const inputRef = useRef(null);
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  // --- Camera state (getUserMedia) ---
  const [showCamera, setShowCamera] = useState(false);
  const [cameraFacing, setCameraFacing] = useState("environment"); // or "user"
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Start / stop camera
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacing },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setShowCamera(true);
    } catch (err) {
      console.error(err);
      toast.error("Camera not available. Check permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const flipCamera = async () => {
    // toggle facing and restart stream
    const next = cameraFacing === "environment" ? "user" : "environment";
    setCameraFacing(next);
    if (streamRef.current) {
      stopCamera();
      // small delay to let state settle
      setTimeout(openCamera, 100);
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) {
      toast.error("Camera not ready yet");
      return;
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, w, h);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `photo-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        const objUrl = URL.createObjectURL(file);
        setImages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), file, url: objUrl },
        ]);
        toast.success("Photo added");
      },
      "image/jpeg",
      0.92
    );
  };

  // Handle file selection
  const handleFileChange = (files) => {
    const newFiles = Array.from(files).map((f) => ({
      id: crypto.randomUUID(),
      file: f,
      url: URL.createObjectURL(f),
    }));
    setImages((prev) => [...prev, ...newFiles]);
  };

  // Remove a preview
  const removeImage = (id) => {
    setImages((prev) => {
      const found = prev.find((x) => x.id === id);
      if (found) URL.revokeObjectURL(found.url);
      return prev.filter((x) => x.id !== id);
    });
  };

  // Upload files
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
      // cleanup object URLs
      images.forEach((i) => URL.revokeObjectURL(i.url));
      setImages([]);
      router.push("/admin/proofs");
    } catch (err) {
      console.error("Upload error:", err);
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // Cleanup camera if user navigates away
  useEffect(() => {
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-[90vh] bg-gradient-to-br from-black via-gray-800 to-lime-800 flex items-center justify-center p-4">
      <Toaster />
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl">
        <h1 className="text-xl font-bold mb-3">Upload Proof — {date}</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
          >
            Choose from Photos
          </button>
          <button
            onClick={openCamera}
            className="w-full py-3 rounded-xl bg-lime-600 text-white font-semibold hover:bg-lime-700"
          >
            Take Photo
          </button>
        </div>

        {/* Hidden input: native camera prompt on many mobiles via capture attr */}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          capture="environment"       // <- hints to open rear camera on mobile
          className="hidden"
          onChange={(e) => handleFileChange(e.target.files)}
        />

        {/* Drag area (optional: still clickable to open picker) */}
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer"
        >
          <p className="mb-2">Click or drag to select images</p>
          <p className="text-xs text-gray-500">JPG/PNG up to ~5MB each</p>
        </div>

        {images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {images.map((img) => (
              <div key={img.id} className="relative border rounded overflow-hidden">
                <img src={img.url} alt="preview" className="w-full h-28 object-cover" />
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

        <button
          onClick={handleSubmit}
          disabled={uploading || !images.length}
          className={`mt-5 w-full py-3 rounded-xl text-white font-semibold transition
            ${images.length ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"}`}
        >
          {uploading ? "Uploading..." : "Submit"}
        </button>
      </div>

      {/* Camera overlay */}
      {showCamera && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
          <div className="flex items-center justify-between p-3 text-white">
            <span className="opacity-80 text-sm">Camera — {cameraFacing}</span>
            <div className="flex gap-2">
              <button
                onClick={flipCamera}
                className="px-3 py-1 rounded bg-white/10 hover:bg-white/20"
              >
                Flip
              </button>
              <button
                onClick={stopCamera}
                className="px-3 py-1 rounded bg-white/20 hover:bg-white/30"
              >
                Close
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              className="max-h-[70vh] max-w-full rounded-lg"
              muted
            />
          </div>

          <div className="p-4 flex items-center justify-center gap-3">
            <button
              onClick={capturePhoto}
              className="px-6 py-3 rounded-full bg-lime-600 text-white font-bold hover:bg-lime-700"
            >
              Capture
            </button>
            <button
              onClick={stopCamera}
              className="px-6 py-3 rounded-full bg-gray-700 text-white hover:bg-gray-600"
            >
              Done
            </button>
          </div>

          {/* hidden canvas for capturing frames */}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </div>
  );
}
