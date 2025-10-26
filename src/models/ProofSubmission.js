import mongoose from "mongoose";

const ProofSchema =new mongoose.Schema(
  {
    date: { type: Date, required: true, unique: true },
    images: [{ type: String }],
  },
  { timestamps: true }
);


export default mongoose.models.ProofSubmission  ||
  mongoose.model("ProofSubmission", ProofSchema)