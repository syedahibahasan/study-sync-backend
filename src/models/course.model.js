import mongoose from "mongoose";

const CourseSchema = new mongoose.Schema({
  courseName: { type: String, required: true },
  courseCode: { type: String, required: true },
});

export const CourseModel = mongoose.model("Course", CourseSchema);
