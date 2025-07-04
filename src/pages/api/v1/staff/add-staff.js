import { connectDB } from "@/lib/db";
import Staff from "@/models/Staff";

export default async function handler(req, res) {
  try {
    await connectDB();

    const { name, designation, salary } = req.body;
    console.log("body", req.body);

    if (!name || !designation || typeof salary !== "number") {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
      });
    }
    // Check if staff with the same name already exists
    const existingStaff = await Staff.findOne({ name });
    if (existingStaff) {
      return res
        .status(409)
        .json({ message: "Staff with this name already exists" }); 
    }

    const staff = new Staff({ name, designation, salary });
    await staff.save();
    res.status(201).json({ message: "Staff saved successfully" });
    return new Response(
      JSON.stringify({ message: "Staff saved successfully" }),
      { status: 201 }
    );
  } catch (err) {
    console.error(" Error saving staff:", err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
    });
  }
}
