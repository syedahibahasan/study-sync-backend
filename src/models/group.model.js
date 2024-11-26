import mongoose from "mongoose";

const GroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  courseId: { type: String, required: true },
  times: [
    {
      day: String,  // e.g., "Sunday"
      busyTimes: [String],  // e.g., ["9:00 AM", "11:00 AM"]
    }],
  location: { type: String, required: true },
});

export const GroupModel = mongoose.model("Group", GroupSchema);
