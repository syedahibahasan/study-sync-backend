import mongoose from "mongoose";

const CourseSchema = new mongoose.Schema({
  section: { type: String, required: true },
  class_number: { type: String, required: true },
  mode_of_instruction: { type: String, required: true },
  course_title: { type: String, required: true },
  satisfies: { type: String },
  units: { type: String, required: true },
  class_type: { type: String, required: true },
  days: { type: String, required: true },
  times: { type: String, required: true },
  instructor: { type: String, required: true },
  location: { type: String, required: true },
  dates: { type: String, required: true },
});

export const CourseModel = mongoose.model("scrappedcourses", CourseSchema);
