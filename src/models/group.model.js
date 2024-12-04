import mongoose from "mongoose";

const GroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  courseName: { type: String, required: true },
  courseId: { type: String, required: true },
  selectedTimes: [
    {
      day: String,  // e.g., "Sunday"
      times: [String],  // e.g., ["9:00 AM", "11:00 AM"]
    }],
  location: { type: String, required: true },
  admin: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Admin user
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Group members
});

export const GroupModel = mongoose.model("Group", GroupSchema);
