"use client";
import { useEffect, useState } from "react";

export default function UpdateBanner({ manifestVersion }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check localStorage
    const stored = localStorage.getItem("manifestVersionDismissed");
    if (stored !== manifestVersion) {
      setShow(true);
    }
  }, [manifestVersion]);

  const handleDismiss = () => {
    localStorage.setItem("manifestVersionDismissed", manifestVersion);
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="bg-yellow-300 text-black text-center text-sm p-2 flex justify-between items-center">
      <span>
        📣 App updated! Please remove and re-add to home screen to see changes.
      </span>
      <button
        onClick={handleDismiss}
        className="ml-4 px-2 py-1 bg-black text-yellow-300 rounded"
      >
        Dismiss
      </button>
    </div>
  );
}
