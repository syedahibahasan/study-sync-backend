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
        })

        newGroup.save();

        
        // Assign new study group the user that created it
        await UserModel.findByIdAndUpdate(
            userId,
            { $addToSet: { groups: newGroup._id } },  // Adds course if not already present
            { new: true }
        );

        res.status(200).json({ message: "Successfully Created Group" });
    } catch (error) {
        console.error("Error fetching enrolled courses:", error);
        res.status(500).json({ message: "Error fetching enrolled courses" });
    }
})

//join a group
router.post("/:userId/joinGroup", validateJwt, async (req, res) => {
    
    const { userId } = req.params;
    const { groupData } = req.body;
    
    try {

        // Assign new study group the user that created it
        await UserModel.findByIdAndUpdate(
            userId,
            { $addToSet: { groups: groupData._id } },  // Adds course if not already present
            { new: true }
        );

        res.status(200).json({ message: "Successfully Joined Group" });
    } catch (error) {
        console.error("Error joining group:", error);
        res.status(500).json({ message: "Error joining group" });
    }
})

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
        });

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
        });

        res.status(200).json({ myGroups });
    } catch (error) {
        console.error("Error fetching joined groups:", error);
        res.status(500).json({ message: "Error fetching joined groups" });
    }
});

export default router;
