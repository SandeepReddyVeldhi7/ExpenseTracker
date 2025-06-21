// models/DashboardUsers.js
import mongoose from "mongoose";

const DashboardUsersSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "staff" },
}, { timestamps: true });

export default mongoose.models.DashboardUser || mongoose.model("DashboardUser", DashboardUsersSchema);
