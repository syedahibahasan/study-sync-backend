import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  enrolledCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
  schedule: [
    {
      day: String,  // e.g., "Sunday"
      busyTimes: [String],  // e.g., ["9:00 AM", "11:00 AM"]
    }],
  preferredLocations: {
      type: [String], // Store an array of location names (e.g., ["MLK Library", "Engineering Building"])
      default: []
    },
});

export const UserModel = mongoose.model("User", UserSchema);
