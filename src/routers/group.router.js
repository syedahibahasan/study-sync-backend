import express from "express";
import { GroupModel } from "../models/group.model.js";
import { UserModel } from "../models/user.model.js";
import { validateJwt } from "../middleware/auth.js";  // Adjust the path if necessary

const router = express.Router();

//create a group
router.post("/:userId/createGroup", validateJwt, async (req, res) => {
    
    const { userId } = req.params;
    const { groupData } = req.body;
    
    try {
        const user = await UserModel.findById(userId);

        if (!user) return res.status(404).json({ message: "User not found" });

        // Create new group
        const newGroup = new GroupModel({
            name: groupData.groupName,
            courseId: groupData.course,
            selectedTimes: groupData.selectedTimes,
            location: groupData.location,
        })

        newGroup.save();

        
        // Assign new study group the user that created it
        await UserModel.findByIdAndUpdate(
            userId,
            { $addToSet: { joinedGroups: newGroup._id } },  // Adds course if not already present
            { new: true }
        );

        res.status(200).json({ message: "Successfully Created Group" });
    } catch (error) {
        console.error("Error fetching enrolled courses:", error);
        res.status(500).json({ message: "Error fetching enrolled courses" });
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
            course: { $in: user.enrolledCourses },
            location: { $in: user.preferredLocations }
        });

        // Filter out groups that conflict with the user's schedule
        const matchingGroups = groups.filter(group => {
            return group.times.every(groupTime => {
                // Check if there is a conflict for this particular group time
                return !user.schedule.some(userSchedule => {
                    if (userSchedule.day === groupTime.day) {
                        // Check for overlapping busy times
                        return groupTime.busyTimes.some(groupTimeSlot =>
                            userSchedule.busyTimes.includes(groupTimeSlot)
                        );
                    }
                    return false;
                });
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

        res.status(200).json({ joinedGroups: user.groups });
    } catch (error) {
        console.error("Error fetching joined groups:", error);
        res.status(500).json({ message: "Error fetching joined groups" });
    }
});

export default router;
