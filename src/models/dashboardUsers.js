// models/DashboardUsers.js
import mongoose from "mongoose";

const DashboardUsersSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "staff" },
  image: { type: String, default: null },
  forgotPasswordToken: { type: String, index: true },
  forgotPasswordExpires: { type: Date },
}, { timestamps: true });

DashboardUsersSchema.index({ createdAt: -1 });
DashboardUsersSchema.index({ email: 1 });
DashboardUsersSchema.index({ username: 1 });


export default mongoose.models.DashboardUser || mongoose.model("DashboardUser", DashboardUsersSchema);
