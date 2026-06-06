










import mongoose from "mongoose";





const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true},
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, //  Use bcrypt to hash passwords
      role: { type: String,  default: "staff" },
    image: { type: String, default: null },
    forgotPasswordToken: { type: String, index: true }, // For password reset token
    isActive: { type: Boolean, default: true }, // For user activation status
    
  },
  {
    
    timestamps: true,
  }
);

userSchema.index({ createdAt: -1 });

// User schema model
const User = mongoose.models.User || mongoose.model("User", userSchema);

export { User};
