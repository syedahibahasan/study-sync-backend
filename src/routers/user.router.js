import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserModel } from "../models/user.model.js";
// import { GroupModel } from "../models/group.model.js"; 
import { validateJwt } from "../middleware/auth.js";  // Adjust the path if necessary


const router = express.Router();

// router.post("/:userId/groups", createStudyGroup);

// User registration route
router.post("/register", async (req, res) => {
  try {
    const { email, password, username } = req.body;
    const userExists = await UserModel.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new UserModel({ email, username, password: hashedPassword });
    await newUser.save();

    const token = jwt.sign({ id: newUser._id, email: newUser.email }, process.env.JWT_SECRET, { expiresIn: "5h" });

    res.status(201).json({ user: newUser, token });
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({ message: "Error during registration" });
  }
});

// User login route
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await UserModel.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "1h" });

    const userWithId = { ...user.toObject(), id: user._id };

    res.status(200).json({ user: userWithId, token });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Error during login" });
  }
});

// Route to add a course to user's enrolledCourses
router.put("/:userId/courses/add", validateJwt, async (req, res) => {
  const { userId } = req.params;
  const { courseId } = req.body;

  try {
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { $addToSet: { enrolledCourses: courseId } },  // Adds course if not already present
      { new: true }
    );
    res.status(200).json({ message: "Course added successfully", user: updatedUser });
  } catch (error) {
    console.error("Error adding course:", error);
    res.status(500).json({ message: "Error adding course" });
  }
});

// Route to remove a course from user's enrolledCourses
router.put("/:userId/courses/remove", validateJwt, async (req, res) => {
  const { userId } = req.params;
  const { courseId } = req.body;

  try {
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { $pull: { enrolledCourses: courseId } },  // Removes course if present
      { new: true }
    );
    res.status(200).json({ message: "Course removed successfully", user: updatedUser });
  } catch (error) {
    console.error("Error removing course:", error);
    res.status(500).json({ message: "Error removing course" });
  }
});

//fetch enrolled courses
router.get("/:userId/enrolled-courses", validateJwt, async (req, res) => {
  const { userId } = req.params;
  try {
      const user = await UserModel.findById(userId).populate("enrolledCourses");
      if (!user) return res.status(404).json({ message: "User not found" });
      res.status(200).json({ enrolledCourses: user.enrolledCourses });
  } catch (error) {
      console.error("Error fetching enrolled courses:", error);
      res.status(500).json({ message: "Error fetching enrolled courses" });
  }
});

/* delete
//update enrolled courses with the the frontend parse
router.post("/:userId/update-course-times", validateJwt, async (req, res) => {
  const { userId } = req.params;
  const body = req.body;
  try {
      const user = await UserModel.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      console.log(body)
      

      res.status(200).json({ enrolledCourses: user.enrolledCourses });
  } catch (error) {
      console.error("Error fetching enrolled courses:", error);
      res.status(500).json({ message: "Error fetching enrolled courses" });
  }
});
*/


// Endpoint to save user schedule
router.put('/:userId/schedule', validateJwt, async (req, res) => {
  const { userId } = req.params;
  const { schedule, busyTimes, groupTimes, courseTimes } = req.body; // Schedule data sent from the frontend

  try {
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { schedule, busyTimes, groupTimes, courseTimes },
      { new: true }
    );
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Failed to save schedule:', error);
    res.status(500).json({ error: 'Failed to save schedule' });
  }
});

// Fetch schedule
router.get("/:userId/schedule", validateJwt, async (req, res) => {
  const { userId } = req.params;

  try {
      const user = await UserModel.findById(userId).select("schedule");
      if (!user) {
          return res.status(404).json({ message: "User not found" });
      }
      res.status(200).json({ schedule: user.schedule });
  } catch (error) {
      console.error("Failed to fetch schedule:", error);
      res.status(500).json({ message: "Failed to fetch schedule" });
  }
});

// Corrected Route for Preferred Locations in `user.router.js`
router.post("/:id/preferred-locations", validateJwt, async (req, res) => {
  try {
    const userId = req.params.id;
    const { preferredLocations } = req.body;

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { preferredLocations }, // Replace the entire array with the new one
      { new: true }
    );

    res.status(200).json({ user: updatedUser });
  } catch (error) {
    console.error("Error updating preferred locations", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Fetch preferred locations
router.get("/:userId/preferred-locations", validateJwt, async (req, res) => {
  const { userId } = req.params;

  try {
      const user = await UserModel.findById(userId).select("preferredLocations");
      if (!user) {
          return res.status(404).json({ message: "User not found" });
      }
      res.status(200).json({ preferredLocations: user.preferredLocations });
  } catch (error) {
      console.error("Failed to fetch preferred locations:", error);
      res.status(500).json({ message: "Failed to fetch preferred locations" });
  }
});


//fetch groups
router.get("/:userId/groups", validateJwt, async (req, res) => {
  try {
    const user = await UserModel.findById(req.params.userId).populate("groups");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ status: "success", message: "Groups fetched successfully", data: user.groups });
  } catch (error) {
    console.error("Error fetching user groups:", error);
    res.status(500).json({ message: "Error fetching user groups" });
  }
});


//study group time
router.post("/:userId/studyGroupTime", validateJwt, async (req, res) => {
  const { userId } = req.params;
  const { studyGroupTime } = req.body;

  if (!Array.isArray(studyGroupTime) || studyGroupTime.some(group => !group.day || !Array.isArray(group.times))) {
    return res.status(400).json({ error: "Invalid study group time format" });
  }

  try {
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.schedule.forEach((day) => {
      const matchingGroup = studyGroupTime.find((group) => group.day === day.day);
      if (matchingGroup) {
        day.studyGroupTime = [...new Set([...day.studyGroupTime, ...matchingGroup.times])];
      }
    });

    await user.save();
    res.status(200).json({ message: "Group schedule updated successfully" });
  } catch (error) {
    console.error("Error updating group schedule:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});




export default router;