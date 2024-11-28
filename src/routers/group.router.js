import express from "express";
import { GroupModel } from "../models/group.model.js";
import { UserModel } from "../models/user.model.js";
import { validateJwt } from "../middleware/auth.js";

const router = express.Router();

// Create Study Group
// Update the group creation endpoint
router.post("/", validateJwt, async (req, res) => {
    try {
      const { groupName, course, meetingType, location, selectedTimes, userId } = req.body;
  
      if (!groupName || !course || !meetingType || !selectedTimes || !userId) {
        return res.status(400).json({ message: "Missing required fields" });
      }
  
      // Create a new group
      const newGroup = new GroupModel({
        groupName,
        course,
        meetingType,
        location,
        selectedTimes,
        createdBy: userId,
      });
  
      const savedGroup = await newGroup.save();
  
      // Update the user's groups array
      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
  
      // Add group ID to the user's groups
      user.groups.push(savedGroup._id);
  
      // Update the user's schedule with studyGroupTime
      selectedTimes.forEach(({ day, times }) => {
        const matchingDay = user.schedule.find((d) => d.day === day);
  
        if (matchingDay) {
          // Merge new times with existing studyGroupTime
          matchingDay.studyGroupTime = [...new Set([...matchingDay.studyGroupTime, ...times])];
        } else {
          // Add a new day if it doesn't exist
          user.schedule.push({ day, studyGroupTime: times, busyTimes: [] });
        }
      });
  
      // Save the updated user document
      await user.save();
  
      res.status(201).json({ message: "Group created successfully", group: savedGroup });
    } catch (error) {
      console.error("Error creating study group:", error);
      res.status(500).json({ message: "Error creating study group", error });
    }
  });
  

// Save study group times for a user
router.post("/:userId/studyGroupTimes", async (req, res) => {
    const { userId } = req.params;
    const { selectedTimes } = req.body;
  
    try {
      const user = await UserModel.findById(userId);
      if (!user) return res.status(404).json({ status: "error", message: "User not found" });
  
      // Iterate through selectedTimes and update the user's schedule
      selectedTimes.forEach(({ day, time }) => {
        const scheduleDay = user.schedule.find((entry) => entry.day === day);
  
        if (scheduleDay) {
          // Ensure studyGroupTime is an array
          if (!Array.isArray(scheduleDay.studyGroupTime)) {
            scheduleDay.studyGroupTime = [];
          }
  
          // Add the time to studyGroupTime without duplicates
          scheduleDay.studyGroupTime = [...new Set([...scheduleDay.studyGroupTime, time])];
        } else {
          // If the day doesn't exist, add it to the schedule
          user.schedule.push({
            day,
            busyTimes: [],
            studyGroupTime: [time],
          });
        }
      });
  
      // Save the updated user document
      await user.save();
  
      res.status(200).json({ status: "success", message: "Study group times saved successfully" });
    } catch (error) {
      console.error("Error saving study group times:", error);
      res.status(500).json({ status: "error", message: "Error saving study group times", error });
    }
  });
  

// Fetch all groups for a user (with pagination)
router.get("/user/:userId", validateJwt, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const groups = await GroupModel.find({ createdBy: req.params.userId })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("course");

    res.status(200).json({ status: "success", message: "Groups fetched successfully", groups });
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({ status: "error", message: "Error fetching groups" });
  }
});

// Fetch group by ID
router.get("/:groupId", validateJwt, async (req, res) => {
  try {
    const group = await GroupModel.findById(req.params.groupId).populate("course");
    if (!group) return res.status(404).json({ status: "error", message: "Group not found" });

    res.status(200).json({ status: "success", message: "Group fetched successfully", group });
  } catch (error) {
    console.error("Error fetching group:", error);
    res.status(500).json({ status: "error", message: "Error fetching group" });
  }
});

// Update group times
router.put("/:groupId/times", validateJwt, async (req, res) => {
  try {
    const { selectedTimes } = req.body;

    // Validate input
    if (!Array.isArray(selectedTimes)) {
      return res.status(400).json({ status: "error", message: "Invalid selectedTimes format" });
    }

    const updatedGroup = await GroupModel.findByIdAndUpdate(
      req.params.groupId,
      { selectedTimes },
      { new: true }
    );

    if (!updatedGroup) return res.status(404).json({ status: "error", message: "Group not found" });

    res.status(200).json({ status: "success", message: "Group times updated successfully", group: updatedGroup });
  } catch (error) {
    console.error("Error updating group times:", error);
    res.status(500).json({ status: "error", message: "Error updating group times" });
  }
});

router.delete('/:groupId', validateJwt, async (req, res) => {
    const { groupId } = req.params;
  
    try {
      const group = await GroupModel.findById(groupId);
      if (!group) return res.status(404).json({ message: 'Group not found' });
  
      // Remove studyGroupTime from user's schedule
      const user = await UserModel.findById(group.createdBy);
      if (user) {
        group.selectedTimes.forEach(({ day, times }) => {
          const scheduleDay = user.schedule.find((entry) => entry.day === day);
          if (scheduleDay) {
            // Remove study group times associated with this group
            scheduleDay.studyGroupTime = scheduleDay.studyGroupTime.filter(
              (time) => !times.includes(time)
            );
          }
        });
        await user.save();
      }
  
      // Delete the group
      await group.deleteOne();
      res.status(200).json({ message: 'Group deleted successfully' });
    } catch (error) {
      console.error('Error deleting group:', error);
      res.status(500).json({ message: 'Error deleting group', error });
    }
  });

export default router;
