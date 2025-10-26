"use client";

import { useEffect, useState, useRef } from "react";
import DataTable from "react-data-table-component";
import toast, { Toaster } from "react-hot-toast";

export default function ProofsAdminPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selected, setSelected] = useState(null);

  // Selected table rows (dates) for bulk delete
  const [selectedRows, setSelectedRows] = useState([]);

  // Lightbox
  const [lightbox, setLightbox] = useState({
    open: false,
    index: 0,
    images: [],
    date: "",
  });

  // Fetch all proofs
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

  useEffect(() => { fetchProofs(); }, []);

  // Delete one image (also remove the row entirely if it becomes empty)
  const handleDeleteImage = async (row, imgUrl) => {
    const filename = imgUrl.split("/").pop();
    setLoading(true);
    try {
      const res = await fetch(
        `/api/v1/proof/delete-single?date=${row.date}&filename=${filename}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Delete failed");

      // 1) Update table rows. Drop the row if count hits 0.
      setRows((prev) => {
        const out = [];
        for (const r of prev) {
          if (r.date !== row.date) { out.push(r); continue; }
          const newImages = r.images.filter((i) => i !== imgUrl);
          const newCount = r.count - 1;
          if (newCount > 0) out.push({ ...r, images: newImages, count: newCount });
          // else drop the row
        }
        return out;
      });

      // 2) Update modal selection
      setSelected((prev) => {
        if (!prev) return prev;
        const imgs = prev.images.filter((i) => i !== imgUrl);
        if (imgs.length === 0) return null; // close modal
        return { ...prev, images: imgs, count: imgs.length };
      });

      // 3) Update lightbox if open
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

  // Bulk delete selected dates (Select All in table header controls this)
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

      // Remove from UI
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
    { name: "Date", selector: (r) => r.date, sortable: true },
    { name: "Images", selector: (r) => r.count, sortable: true },
    {
      name: "Actions",
      cell: (row) => (
        <button
          onClick={() => setSelected(row)}
          className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
        >
          View
        </button>
      ),
    },
  ];

  const openLightbox = (row, index) => {
    setLightbox({ open: true, index, images: row.images, date: row.date });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-800 to-lime-800 flex items-center justify-center p-4">
      <Toaster />
      <div className="w-full max-w-6xl bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/30 shadow-2xl">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-8 text-center">
          📷 Uploaded Proofs
        </h1>

        {/* Top Actions for table selection */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="text-white/80 text-sm">
            Selected dates: <span className="font-semibold">{selectedRows.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDeleteSelectedDates}
              disabled={loading || selectedRows.length === 0}
              className="bg-red-600 text-white px-3 py-2 rounded font-semibold hover:bg-red-700 disabled:opacity-50"
            >
              Delete Selected Dates
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-white mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-3 rounded border bg-white/20 backdrop-blur text-white"
            />
          </div>
          <div>
            <label className="block text-white mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-3 rounded border bg-white/20 backdrop-blur text-white"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchProofs}
              disabled={loading}
              className="w-full bg-lime-600 text-white p-3 rounded font-bold hover:opacity-90 transition"
            >
              {loading ? "Loading..." : "🔍 Get Reports"}
            </button>
          </div>
        </div>

        {/* Table with selectable rows (header has select-all) */}
        {rows.length > 0 ? (
          <DataTable
            keyField="date"
            columns={columns}
            data={rows}
            pagination
            highlightOnHover
            striped
            paginationPerPage={30}
            responsive
            theme="dark"
            selectableRows
            selectableRowsHighlight
            onSelectedRowsChange={({ selectedRows }) => setSelectedRows(selectedRows)}
            clearSelectedRows={false}
            customStyles={{
              headRow: { style: { backgroundColor: "rgba(255,255,255,0.1)" } },
              rows: {
                style: { backgroundColor: "transparent", color: "white" },
                stripedStyle: { backgroundColor: "rgba(255,255,255,0.05)" },
              },
              headCells: { style: { color: "white" } },
              pagination: { style: { backgroundColor: "transparent", color: "white" } },
            }}
          />
        ) : (
          <p className="text-center text-white/70">{loading ? "" : "No records found. Please search!"}</p>
        )}

        {/* Modal Grid */}
        {selected && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setSelected(null)}
          >
            <div
              className="bg-white rounded-lg w-full max-w-4xl p-4 max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Images — {selected.date}</h2>
                <button
                  onClick={() => setSelected(null)}
                  className="bg-red-600 text-white px-3 py-1 rounded"
                >
                  Close
                </button>
              </div>

              {selected.images.length ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {selected.images.map((img, idx) => (
                    <div key={img} className="relative border rounded overflow-hidden">
                      <img
                        src={img}
                        alt="upload"
                        className="w-full h-32 object-cover cursor-zoom-in"
                        onClick={() => setLightbox({ open: true, index: idx, images: selected.images, date: selected.date })}
                      />
                      <button
                        onClick={() => handleDeleteImage(selected, img)}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded px-2 py-0.5 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No images for this day.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Full-screen Lightbox (pinch/zoom/drag) */}
      {lightbox.open && (
        <Lightbox
          images={lightbox.images}
          index={lightbox.index}
          date={lightbox.date}
          onClose={() => setLightbox({ open: false, index: 0, images: [], date: "" })}
          onChangeIndex={(next) => setLightbox((lb) => ({ ...lb, index: next }))}
          onDelete={(url) => handleDeleteImage({ date: lightbox.date, images: lightbox.images }, url)}
        />
      )}
    </div>
  );
}

/* ============================
   Lightbox (no deps, mobile OK)
   ============================ */
function Lightbox({ images, index, date, onClose, onChangeIndex, onDelete }) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const posRef = useRef({ x: 0, y: 0 });
  const startRef = useRef({ x: 0, y: 0 });

  const touchData = useRef({
    pinchStartDist: 0,
    pinchStartScale: 1,
    lastTouch: [],
    swipeStartX: 0,
  });

  const imgSrc = images[index] || "";
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const zoom = (d) => setScale((s) => clamp(s + d, 0.5, 5));
  const reset = () => { setScale(1); setPos({ x: 0, y: 0 }); posRef.current = { x: 0, y: 0 }; };
  const prev = () => onChangeIndex((index - 1 + images.length) % images.length);
  const next = () => onChangeIndex((index + 1) % images.length);

  useEffect(() => reset(), [imgSrc]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowRight") next(); if (e.key === "ArrowLeft") prev(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, images]);

  const onWheel = (e) => { e.preventDefault(); zoom(e.deltaY > 0 ? -0.1 : 0.1); };
  const onMouseDown = (e) => { if (scale <= 1) return; setDragging(true); startRef.current = { x: e.clientX, y: e.clientY }; };
  const onMouseMove = (e) => { if (!dragging) return; const dx = e.clientX - startRef.current.x; const dy = e.clientY - startRef.current.y; const newPos = { x: posRef.current.x + dx, y: posRef.current.y + dy }; setPos(newPos); };
  const onMouseUp = () => { if (!dragging) return; setDragging(false); posRef.current = pos; };

  const dist = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  const onTouchStart = (e) => {
    if (e.touches.length === 1) { touchData.current.swipeStartX = e.touches[0].clientX; touchData.current.lastTouch = [e.touches[0]]; }
    else if (e.touches.length === 2) { touchData.current.pinchStartDist = dist(e.touches[0], e.touches[1]); touchData.current.pinchStartScale = scale; }
  };
  const onTouchMove = (e) => {
    if (e.touches.length === 1 && scale > 1) {
      const dx = e.touches[0].clientX - touchData.current.lastTouch[0].clientX;
      const dy = e.touches[0].clientY - touchData.current.lastTouch[0].clientY;
      const np = { x: pos.x + dx, y: pos.y + dy }; setPos(np); posRef.current = np; touchData.current.lastTouch = [e.touches[0]];
    } else if (e.touches.length === 2) {
      const ratio = dist(e.touches[0], e.touches[1]) / touchData.current.pinchStartDist;
      setScale(clamp(touchData.current.pinchStartScale * ratio, 0.5, 5));
    }
  };
  const onTouchEnd = (e) => {
    if (e.touches.length === 0 && scale <= 1) {
      const endX = touchData.current.lastTouch[0]?.clientX;
      if (endX != null) {
        const diff = endX - touchData.current.swipeStartX;
        if (diff > 80) prev();
        else if (diff < -80) next();
      }
    }
    touchData.current.lastTouch = [];
  };

  const deleteCurrent = () => onDelete(images[index]);

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/95 text-white flex flex-col select-none touch-none"
      onWheel={onWheel}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 text-sm md:text-base">
        <div>
          <span className="opacity-70">Date:</span> {date} &nbsp;|&nbsp; <span className="opacity-70">Image:</span> {index + 1}/{images.length}
        </div>
        <div className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
          <button onClick={() => zoom(-0.1)} className="px-2 md:px-3 py-1 rounded bg-white/10 hover:bg-white/20">−</button>
          <span className="w-10 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={() => zoom(+0.1)} className="px-2 md:px-3 py-1 rounded bg-white/10 hover:bg-white/20">+</button>
          <button onClick={() => reset()} className="px-2 md:px-3 py-1 rounded bg-white/10 hover:bg-white/20">Reset</button>
          <button onClick={() => onChangeIndex((index - 1 + images.length) % images.length)} className="px-2 md:px-3 py-1 rounded bg-white/10 hover:bg-white/20">⟵</button>
          <button onClick={() => onChangeIndex((index + 1) % images.length)} className="px-2 md:px-3 py-1 rounded bg-white/10 hover:bg-white/20">⟶</button>
          <button onClick={deleteCurrent} className="px-2 md:px-3 py-1 rounded bg-red-600 hover:bg-red-700">Delete</button>
          <button onClick={onClose} className="px-2 md:px-3 py-1 rounded bg-white/20 hover:bg-white/30">Close</button>
        </div>
      </div>

      <div
        className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={(e) => {
          if (scale > 1) {
            setDragging(true);
            startRef.current = { x: e.clientX, y: e.clientY };
          }
        }}
      >
        <img
          src={imgSrc}
          alt="preview"
          draggable={false}
          className="absolute top-1/2 left-1/2 max-w-none"
          style={{
            transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
            transition: dragging ? "none" : "transform 120ms ease",
            touchAction: "none",
          }}
        />
      </div>
    </div>
  );
}
