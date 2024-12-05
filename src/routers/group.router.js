import express from "express";
import { GroupModel } from "../models/group.model.js";
import { UserModel } from "../models/user.model.js";
import { validateJwt } from "../middleware/auth.js";  // Adjust the path if necessary
import { CourseModel } from "../models/course.model.js";

const router = express.Router();

//create a group
router.post("/:userId/createGroup", validateJwt, async (req, res) => {
    const { userId } = req.params;
    const { groupData } = req.body;

    try {
        const user = await UserModel.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const selectedCourse = await CourseModel.findById(groupData.course);

        // Create new group
        const newGroup = new GroupModel({
            name: groupData.groupName,
            courseName: selectedCourse.course_title,
            courseId: groupData.course,
            selectedTimes: groupData.selectedTimes,
            location: groupData.location,
            admin: userId, // Assign admin
            members: [userId], // Add creator as the first member
        });

        await newGroup.save();

        if (!user.groups.includes(newGroup._id)) {
            user.groups.push(newGroup._id);
        }

        // Update the user's schedule to add selectedTimes to studyGroupTime
        groupData.selectedTimes.forEach((selectedTime) => {
            const day = selectedTime.day;
            const times = selectedTime.times;

            let scheduleEntry = user.schedule.find((s) => s.day === day);

            if (scheduleEntry) {
                if (!scheduleEntry.studyGroupTime) {
                    scheduleEntry.studyGroupTime = [];
                }
                scheduleEntry.studyGroupTime = [...new Set([...scheduleEntry.studyGroupTime, ...times])];
            } else {
                user.schedule.push({ day: day, busyTimes: [], studyGroupTime: times });
            }
        });

        await user.save();

        res.status(200).json({ message: "Successfully Created Group" });
    } catch (error) {
        console.error("Error creating group:", error);
        res.status(500).json({ message: "Error creating group" });
    }
});


//join a group
router.post("/:userId/joinGroup", validateJwt, async (req, res) => {
    const { userId } = req.params;
    const { groupData } = req.body;

    try {
        // Add the user to the group members list
        const group = await GroupModel.findByIdAndUpdate(
            groupData._id,
            { $addToSet: { members: userId } }, // Avoid duplicate entries
            { new: true }
        );

        // Fetch the user
        const user = await UserModel.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        if (!user.groups.includes(groupData._id)) {
            user.groups.push(groupData._id);
        }

        // Update the user's schedule to add group's selectedTimes to studyGroupTime
        group.selectedTimes.forEach((selectedTime) => {
            const day = selectedTime.day;
            const times = selectedTime.times;

            let scheduleEntry = user.schedule.find((s) => s.day === day);

            if (scheduleEntry) {
                if (!scheduleEntry.studyGroupTime) {
                    scheduleEntry.studyGroupTime = [];
                }
                scheduleEntry.studyGroupTime = [...new Set([...scheduleEntry.studyGroupTime, ...times])];
            } else {
                user.schedule.push({ day: day, busyTimes: [], studyGroupTime: times });
            }
        });

        await user.save();

        res.status(200).json({ message: "Successfully Joined Group" });
    } catch (error) {
        console.error("Error joining group:", error);
        res.status(500).json({ message: "Error joining group" });
    }
});

//fetch matching groups
router.get("/:userId/matchingGroups", validateJwt, async (req, res) => {
    const { userId } = req.params;
    try {
        const user = await UserModel.findById(userId);

        if (!user) return res.status(404).json({ message: "User not found" });

        // Fetch all groups that match the course and location criteria
        const groups = await GroupModel.find({
            courseId: { $in: user.enrolledCourses },
            location: { $in: user.preferredLocations },
            _id: { $nin: user.groups },
        })
        .populate("admin", "username")
        .populate("members", "username");

        const matchingGroups = groups.filter((group) => {
            return group.selectedTimes.every((selectedTime) => {
                // Check if there is a time conflict for the selected day
                const userDaySchedule = user.schedule.find(
                    (schedule) => schedule.day === selectedTime.day
                );

                if (userDaySchedule) {
                    // Check if any of the group's selected times overlap with the user's busy times
                    return selectedTime.times.every((time) => {
                        return !userDaySchedule.busyTimes.includes(time);
                    });
                }

                // If no schedule is found for that day, no conflict
                return true;
            });
        });
        res.status(200).json({ matchingGroups });
    } catch (error) {
        console.error("Error fetching matching groups:", error);
        res.status(500).json({ message: "Error fetching matching groups" });
    }
});

//fetch joined groups
router.get("/:userId/myGroups", validateJwt, async (req, res) => {
    const { userId } = req.params;
    try {
        const user = await UserModel.findById(userId);

        if (!user) return res.status(404).json({ message: "User not found" });

        const myGroups = await GroupModel.find({
            _id: { $in: user.groups }
        })
        .populate("admin", "username") // Populate admin username
        .populate("members", "username"); // Populate member usernames
        res.status(200).json({ myGroups });
    } catch (error) {
        console.error("Error fetching joined groups:", error);
        res.status(500).json({ message: "Error fetching joined groups" });
    }
});

router.delete("/:userId/deleteGroup/:groupId", validateJwt, async (req, res) => {
    const { userId, groupId } = req.params;
  
    try {
      // Find the group by ID
      const group = await GroupModel.findById(groupId);
  
      if (!group) return res.status(404).json({ message: "Group not found" });
  
      // Check if the user is the admin
      if (group.admin.toString() !== userId) {
        return res.status(403).json({ message: "You are not authorized to delete this group" });
      }

        // Fetch all members of the group
        const members = await UserModel.find({ _id: { $in: group.members } });

        // For each member, remove the group's studyGroupTime from their schedule
        for (const member of members) {
            group.selectedTimes.forEach((selectedTime) => {
                const day = selectedTime.day;
                const timesToRemove = selectedTime.times;

                let scheduleEntry = member.schedule.find((s) => s.day === day);

                if (scheduleEntry && scheduleEntry.studyGroupTime) {
                    scheduleEntry.studyGroupTime = scheduleEntry.studyGroupTime.filter(
                        (time) => !timesToRemove.includes(time)
                    );

                    if (scheduleEntry.studyGroupTime.length === 0) {
                        delete scheduleEntry.studyGroupTime;
                    }
                }
            });

            await member.save();
        }
  
      // Delete the group
      await GroupModel.findByIdAndDelete(groupId);
  
      // Remove the group from all members
      await UserModel.updateMany(
        { groups: groupId },
        { $pull: { groups: groupId } }
      );
  
      res.status(200).json({ message: "Group deleted successfully" });
    } catch (error) {
      console.error("Error deleting group:", error);
      res.status(500).json({ message: "Error deleting group" });
    }
  });
  
export default router;
