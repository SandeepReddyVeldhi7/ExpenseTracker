










import mongoose from "mongoose";

// Permission schema for modular use
const permissionSchema = new mongoose.Schema(
  {
    resource: { type: String, required: true }, // e.g., "dashboard", "settings"
    actions: [{ type: String, enum: ["read", "write", "delete", "update"] }], // strict actions
  },
  { _id: false }
);

// Role schema as per your structure
const roleSchema = new mongoose.Schema(
  {
    templateName: { type: String, required: true, unique: true }, // e.g., "Project Manager"

    masterDataPermissions: [permissionSchema], // Links and actions for master data

    currentProjectPermissions: [permissionSchema], // e.g., [{ resource: 'procurement', actions: ['read'] }]
    completedProjectPermissions: [permissionSchema],
    generalPermissions: [
      {
        resource: String,
        actions: [String],
      },
    ],
    
    accessibleCurrentProjects: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    ],
    accessibleCompletedProjects: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    ],
  },
  {
    timestamps: true,
    collection: "dashboard-roles",
  }
);

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, //  Use bcrypt to hash passwords
    roles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Role", // Reference to the Role schema
      },
    ],
    forgotPasswordToken: { type: String }, // For password reset token
    isActive: { type: Boolean, default: true }, // For user activation status
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    
    timestamps: true,
  }
);

// Pre-save middleware to update `updatedAt` automatically
userSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Role schema model
const Role = mongoose.models.Role || mongoose.model("Role", roleSchema);

// User schema model
const User = mongoose.models.User || mongoose.model("User", userSchema);

export { User, Role };
