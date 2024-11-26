import express from "express";
import { CourseModel } from "../models/course.model.js";

const router = express.Router();

// Route to fetch all courses
router.get("/", async (req, res) => {
  try {
    const searchTerm = req.query.search;
    
    const courses = await CourseModel.find(
      {
        $or: [
          { section: { $regex: searchTerm, $options: "i" } },
          { course_title: { $regex: searchTerm, $options: "i" } }
        ]
      },
      "section class_number course_title days times"
    ).limit(20);
    res.status(200).json(courses);
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ message: "Error fetching courses" });
  }
});

export default router;
