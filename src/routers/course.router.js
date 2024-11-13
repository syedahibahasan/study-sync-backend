import express from "express";
import { CourseModel } from "../models/course.model.js";

const router = express.Router();

// Route to fetch all courses
router.get("/", async (req, res) => {
  try {
    const courses = await CourseModel.find();
    res.status(200).json(courses);
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ message: "Error fetching courses" });
  }
});

export default router;
