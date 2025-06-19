// models/Staff.js
import mongoose from "mongoose";

const dashboardUsersSchema = new mongoose.Schema({
  
  email: {
      type: String,
      required: true,
      unique: true,   // make it unique
    },
  username: { 
    type: String, 
    required: true, 
    unique: true 
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    default: "staff"
  }
}, { timestamps: true });

export default mongoose.models.dashboardUsers || mongoose.model("dashboardUsers", dashboardUsersSchema);
