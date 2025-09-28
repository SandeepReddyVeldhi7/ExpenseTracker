// pages/api/v1/staff/advances/confirmed/save.js
import { connectDB } from "@/lib/db";
import ConfirmedAdvance from "@/models/ConfirmedAdvance";

export default async function handler(req, res) {
  await connectDB();

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    let {
      staffId,
      month,
      year,
      systemCalculatedAdvance,
      ownerAdjustment, // DELTA (+/-)
      note,            // optional
    } = req.body;

    const m = Number(month) || new Date().getMonth() + 1;
    const y = Number(year) || new Date().getFullYear();
    const sys = Number(systemCalculatedAdvance) || 0;
    const delta = Number(ownerAdjustment) || 0;

    if (!staffId || !m || !y) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const now = new Date();
    const query = { staff: staffId, month: m, year: y };

    // Optional one-time baseline backfill for legacy docs — preserve existing behavior
    const existing = await ConfirmedAdvance.findOne(query).lean();
    if (existing) {
      const hasHistory =
        Array.isArray(existing.ownerAdjustmentHistory) &&
        existing.ownerAdjustmentHistory.length > 0;
      const legacyTotal = Number(existing.ownerAdjustment) || 0;

      if (!hasHistory && legacyTotal !== 0) {
        await ConfirmedAdvance.updateOne(query, {
          $push: {
            ownerAdjustmentHistory: {
              amount: legacyTotal,
              note: "Baseline (pre-history total)",
              at: now,
            },
          },
        });
      }
    }

    // Build update doc
    const update = {
      $inc: { ownerAdjustment: delta },
      $set: { systemCalculatedAdvance: sys, confirmedAt: now },
      $setOnInsert: { staff: staffId, month: m, year: y },
    };

    if (delta !== 0 || (typeof note === "string" && note.trim() !== "")) {
      update.$push = {
        ownerAdjustmentHistory: {
          amount: delta,
          note: typeof note === "string" ? note : "",
          at: now,
        },
      };
    }

    // Upsert and return the updated document (populated)
    let doc = await ConfirmedAdvance.findOneAndUpdate(query, update, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }).populate("staff", "name designation");

    // Ensure confirmedAdvance is recomputed and saved if needed
    const currentSys = Number(doc.systemCalculatedAdvance) || 0;
    const currentAdj = Number(doc.ownerAdjustment) || 0;
    const newConfirmed = Math.max(0, currentSys + currentAdj);

    if (Number(doc.confirmedAdvance) !== newConfirmed) {
      doc.confirmedAdvance = newConfirmed;
      await doc.save();
      // repopulate in case save changed doc shape
      doc = await ConfirmedAdvance.findById(doc._id).populate("staff", "name designation");
    }

    // Return populated record for optimistic UI updates
    return res.status(200).json({ success: true, record: doc });
  } catch (error) {
    console.error("POST /staff/advances/confirmed/save error:", error);
    return res.status(500).json({ message: "Server error", error: error?.message || String(error) });
  }
}
