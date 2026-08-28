"use client";

import { useEffect, useState, useRef } from "react";
import DataTable from "react-data-table-component";
import toast, { Toaster } from "react-hot-toast";
import {
  FiImage,
  FiTrash2,
  FiSearch,
  FiX,
  FiEye,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiZoomIn,
  FiZoomOut,
  FiRotateCw,
} from "react-icons/fi";

export default function ProofsAdminPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selected, setSelected] = useState(null);

  const [selectedRows, setSelectedRows] = useState([]);

  const [lightbox, setLightbox] = useState({
    open: false,
    index: 0,
    images: [],
    date: "",
  });

  const fetchProofs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/v1/proof/list?${params.toString()}`);
      const data = await res.json();
      setRows(data.items || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load proofs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProofs();
  }, []);

  const handleDeleteImage = async (row, imgUrl) => {
    const filename = imgUrl.split("/").pop();
    setLoading(true);
    try {
      const res = await fetch(
        `/api/v1/proof/delete-single?date=${row.date}&filename=${filename}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Delete failed");

      setRows((prev) => {
        const out = [];
        for (const r of prev) {
          if (r.date !== row.date) {
            out.push(r);
            continue;
          }
          const newImages = r.images.filter((i) => i !== imgUrl);
          const newCount = r.count - 1;
          if (newCount > 0) out.push({ ...r, images: newImages, count: newCount });
        }
        return out;
      });

      setSelected((prev) => {
        if (!prev) return prev;
        const imgs = prev.images.filter((i) => i !== imgUrl);
        if (imgs.length === 0) return null;
        return { ...prev, images: imgs, count: imgs.length };
      });

      setLightbox((lb) => {
        if (!lb.open) return lb;
        const imgs = lb.images.filter((i) => i !== imgUrl);
        if (!imgs.length) return { open: false, index: 0, images: [], date: "" };
        return { ...lb, images: imgs, index: Math.min(lb.index, imgs.length - 1) };
      });

      toast.success("Image deleted");
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSelectedDates = async () => {
    if (!selectedRows.length) {
      toast.error("No rows selected");
      return;
    }
    const dates = selectedRows.map((r) => r.date);
    if (!confirm(`Delete ${dates.length} date(s) and all their images?`)) return;

    setLoading(true);
    try {
      const res = await fetch("/api/v1/proof/delete-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dates }),
      });
      if (!res.ok) throw new Error("Bulk delete failed");

      setRows((prev) => prev.filter((r) => !dates.includes(r.date)));
      setSelected(null);
      setSelectedRows([]);

      toast.success(`Deleted ${dates.length} date(s)`);
    } catch (e) {
      console.error(e);
      toast.error("Bulk delete failed");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      name: "Date",
      selector: (r) => r.date,
      sortable: true,
      cell: (r) => <span className="font-black text-xs sm:text-sm text-black">{r.date}</span>,
    },
    {
      name: "Uploaded Images",
      selector: (r) => r.count,
      sortable: true,
      cell: (r) => (
        <span className="font-mono font-bold text-xs sm:text-sm px-2.5 py-0.5 rounded-full border border-black bg-[#D4FF00] text-black">
          {r.count} Photos
        </span>
      ),
    },
    {
      name: "Actions",
      cell: (row) => (
        <button
          onClick={() => setSelected(row)}
          className="neo-btn neo-btn-cyan px-3 py-1 text-xs font-black flex items-center gap-1"
        >
          <FiEye size={13} /> View Gallery
        </button>
      ),
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <Toaster position="top-right" />

      {/* Main Neo Card */}
      <div className="neo-card p-6 sm:p-8 bg-white mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-6 border-b-2 border-black">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
              Uploaded Proofs & Bills
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-gray-600">
              Audit and inspect all scanned receipt photos organized by date
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDeleteSelectedDates}
              disabled={loading || selectedRows.length === 0}
              className="py-2 px-3 neo-btn neo-btn-danger text-xs font-black flex items-center gap-1.5"
            >
              <FiTrash2 size={14} />
              <span>Delete Selected ({selectedRows.length})</span>
            </button>
          </div>
        </div>

        {/* Date Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl border-2 border-black bg-[#F4F4F0] mb-6">
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-black mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="neo-input text-xs font-bold py-1.5"
            />
          </div>
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-black mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="neo-input text-xs font-bold py-1.5"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchProofs}
              disabled={loading}
              className="w-full py-2.5 neo-btn neo-btn-primary text-xs font-black flex items-center justify-center gap-1.5"
            >
              <FiSearch size={14} />
              <span>{loading ? "Searching..." : "Filter Proofs"}</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto table-scrollbar border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#000]">
          {rows.length > 0 ? (
            <DataTable
              keyField="date"
              columns={columns}
              data={rows}
              pagination
              highlightOnHover
              selectableRows
              selectableRowsHighlight
              onSelectedRowsChange={({ selectedRows }) => setSelectedRows(selectedRows)}
              customStyles={{
                headRow: {
                  style: {
                    backgroundColor: "#F4F4F0",
                    borderBottom: "2px solid #0A0A0A",
                    fontWeight: "900",
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    color: "#0A0A0A",
                  },
                },
                rows: {
                  style: {
                    backgroundColor: "#FFFFFF",
                    borderBottom: "1px solid #E2E8F0",
                    fontWeight: "600",
                    "&:hover": {
                      backgroundColor: "#F8FAFC",
                    },
                  },
                },
                pagination: {
                  style: {
                    borderTop: "2px solid #0A0A0A",
                    backgroundColor: "#F4F4F0",
                    fontWeight: "700",
                  },
                },
              }}
            />
          ) : (
            <p className="text-center text-gray-500 font-bold py-12">
              {loading ? "Loading proofs..." : "No proof records found. Please adjust filters."}
            </p>
          )}
        </div>
      </div>

      {/* Gallery Modal for Date */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto border-[3px] border-black shadow-[8px_8px_0px_0px_#000] relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b-2 border-black pb-3 mb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-gray-500 block">Proof Photo Gallery</span>
                <h2 className="text-xl font-black text-black">Date: {selected.date}</h2>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center hover:bg-gray-100 font-black cursor-pointer"
              >
                <FiX size={16} />
              </button>
            </div>

            {selected.images?.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                {selected.images.map((img, idx) => (
                  <div
                    key={img}
                    className="relative rounded-xl border-2 border-black overflow-hidden bg-black shadow-[2px_2px_0px_0px_#000] group aspect-square"
                  >
                    <img
                      src={img}
                      alt="Proof"
                      className="w-full h-full object-cover cursor-zoom-in group-hover:scale-105 transition"
                      onClick={() =>
                        setLightbox({
                          open: true,
                          index: idx,
                          images: selected.images,
                          date: selected.date,
                        })
                      }
                    />
                    <button
                      onClick={() => handleDeleteImage(selected, img)}
                      className="absolute top-1.5 right-1.5 p-1.5 rounded-lg border border-black bg-[#FF5A5F] text-white hover:opacity-90 font-black"
                      title="Delete this photo"
                    >
                      <FiTrash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 font-bold py-6">No images remaining for this date.</p>
            )}

            <div className="mt-6 pt-3 border-t-2 border-black flex justify-end">
              <button
                onClick={() => setSelected(null)}
                className="py-2 px-5 neo-btn neo-btn-secondary text-xs font-black"
              >
                Close Gallery
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox.open && (
        <Lightbox
          images={lightbox.images}
          index={lightbox.index}
          date={lightbox.date}
          onClose={() => setLightbox({ open: false, index: 0, images: [], date: "" })}
          onChangeIndex={(next) => setLightbox((lb) => ({ ...lb, index: next }))}
          onDelete={(url) =>
            handleDeleteImage({ date: lightbox.date, images: lightbox.images }, url)
          }
        />
      )}
    </div>
  );
}

function Lightbox({ images, index, date, onClose, onChangeIndex, onDelete }) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const currentUrl = images[index];

  const resetZoom = () => {
    setScale(1);
    setPos({ x: 0, y: 0 });
  };

  const handlePrev = () => {
    if (index > 0) {
      resetZoom();
      onChangeIndex(index - 1);
    }
  };

  const handleNext = () => {
    if (index < images.length - 1) {
      resetZoom();
      onChangeIndex(index + 1);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/90 flex flex-col justify-between p-4"
      onClick={onClose}
    >
      <div
        className="flex justify-between items-center text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="font-black text-sm text-[#D4FF00]">
          {date} — {index + 1} of {images.length}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale((s) => Math.min(3, s + 0.25))}
            className="p-2 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 text-white"
            title="Zoom in"
          >
            <FiZoomIn size={16} />
          </button>
          <button
            onClick={() => setScale((s) => Math.max(1, s - 0.25))}
            className="p-2 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 text-white"
            title="Zoom out"
          >
            <FiZoomOut size={16} />
          </button>
          <button
            onClick={resetZoom}
            className="p-2 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 text-white"
            title="Reset Zoom"
          >
            <FiRotateCw size={16} />
          </button>
          <button
            onClick={() => {
              if (confirm("Delete this image?")) onDelete(currentUrl);
            }}
            className="p-2 rounded-lg border border-red-400 bg-red-600 text-white"
            title="Delete Image"
          >
            <FiTrash2 size={16} />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg border border-white/20 bg-white text-black font-black text-xs"
          >
            Close
          </button>
        </div>
      </div>

      <div
        className="flex-1 flex items-center justify-center overflow-hidden my-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={currentUrl}
          alt="Proof zoomed"
          style={{
            transform: `scale(${scale}) translate(${pos.x}px, ${pos.y}px)`,
            cursor: scale > 1 ? "grab" : "default",
          }}
          className="max-w-full max-h-[75vh] object-contain select-none transition-transform"
        />
      </div>

      <div
        className="flex justify-between items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handlePrev}
          disabled={index === 0}
          className="py-2.5 px-4 rounded-xl border-2 border-black bg-white disabled:opacity-30 text-black font-black text-xs flex items-center gap-1 cursor-pointer"
        >
          <FiChevronLeft size={16} /> Previous
        </button>

        <button
          onClick={handleNext}
          disabled={index === images.length - 1}
          className="py-2.5 px-4 rounded-xl border-2 border-black bg-white disabled:opacity-30 text-black font-black text-xs flex items-center gap-1 cursor-pointer"
        >
          Next <FiChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
