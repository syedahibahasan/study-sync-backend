import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  senderName: { type: String },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

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
  messages: {
    type: [MessageSchema],
    default: [], // Default to an empty array
  },
  formattedGroupTimes: { type: [Boolean], default: [] },
});

export const GroupModel = mongoose.model("Group", GroupSchema);
