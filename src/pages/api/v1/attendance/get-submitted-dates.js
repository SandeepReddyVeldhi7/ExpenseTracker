import { connectDB } from "@/lib/db";
import Attendance from "@/models/Attendance";
import { withAuth } from "@/lib/apiAuth";

async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  await connectDB();

  // Fetch distinct dates using distinct for speed
  const dates = await Attendance.distinct("date");
  const uniqueDates = Array.from(
    new Set(
      dates
        .filter(Boolean)
        .map((d) => new Date(d).toISOString().split("T")[0])
    )
  );

  return res.status(200).json({ dates: uniqueDates });
}

export default withAuth(handler, { roles: ["owner", "staff", "staff123"] });
