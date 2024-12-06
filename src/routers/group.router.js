import express from "express";
import { GroupModel } from "../models/group.model.js";
import { UserModel } from "../models/user.model.js";
import { validateJwt } from "../middleware/auth.js";  // Adjust the path if necessary
import { CourseModel } from "../models/course.model.js";
import { Server } from "socket.io";

const router = express.Router();
router.use((req, res, next) => {
    req.io = req.app.get("io");
    next();
  });

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

//Delete Group
router.delete("/:userId/deleteGroup/:groupId", async (req, res) => {
    const { userId, groupId } = req.params;
    console.log("Delete Group Endpoint Hit:", { userId, groupId }); // Debugging

    try {
        const group = await GroupModel.findById(groupId); // Use GroupModel here
        if (!group) {
            console.log("Group not found in the database");
            return res.status(404).send({ error: "Group not found" });
        }

        if (group.admin.toString() !== userId) {
            console.log("Unauthorized delete attempt");
            return res.status(403).send({ error: "Only the admin can delete this group" });
        }

        // Delete the group
        await GroupModel.findByIdAndDelete(groupId);

        console.log("Group deleted successfully");
        res.status(200).send({ message: "Group deleted successfully" });
    } catch (error) {
        console.error("Error in delete group endpoint:", error);
        res.status(500).send({ error: "An error occurred while deleting the group" });
    }
});

//Leave Group
router.delete("/:userId/leaveGroup/:groupId", async (req, res) => {
    const { userId, groupId } = req.params;

    try {
        // Remove user from group
        await GroupModel.findByIdAndUpdate(
            groupId,
            { $pull: { members: userId } }, // Avoid duplicate entries
            { new: true }
        );
        
        // Remove group form user
        await UserModel.findByIdAndUpdate(
            userId,
            { $pull: { groups: groupId } }, // Avoid duplicate entries
            { new: true }
        );
        
        

        console.log("Left group successfully");
        res.status(200).send({ message: "Left group successfully" });
    } catch (error) {
        console.error("Error in leave group endpoint:", error);
        res.status(500).send({ error: "An error occurred while removing user from group" });
    }
});
  
  

  router.get("/:groupId", validateJwt, async (req, res) => {
    const { groupId } = req.params;
    try {
      const group = await GroupModel.findById(groupId)
        .populate("admin", "username")
        .populate("members", "username")
        .populate("messages.sender", "username");
      if (!group) return res.status(404).json({ message: "Group not found" });
      res.status(200).json(group);
    } catch (error) {
      console.error("Error fetching group:", error);
      res.status(500).json({ message: "Failed to fetch group" });
    }
  });
  

  //Chatting
  // Chatting endpoint
  router.post("/:groupId/message", validateJwt, async (req, res) => {
    const { groupId } = req.params;
    const { text } = req.body;
    const userId = req.auth.id;
  
    try {
      const user = await UserModel.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
  
      const group = await GroupModel.findById(groupId);
      if (!group) return res.status(404).json({ message: "Group not found" });
  
      const message = {
        sender: userId, // Save as ObjectId
        senderName: user.username,
        text,
        timestamp: new Date(),
      };
  
      group.messages.push(message);
      await group.save();
  
      // Emit normalized message
      req.io.to(groupId).emit("newMessage", {
        ...message,
        sender: userId.toString(), // Ensure sender is a string
      });
  
      res.status(200).json({ message: "Message sent successfully", messages: group.messages });
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });
  
  //Fetch group msges
  router.get("/:groupId/messages", validateJwt, async (req, res) => {
    const { groupId } = req.params;
  
    try {
      const group = await GroupModel.findById(groupId).populate("messages.sender", "username");
      if (!group) return res.status(404).json({ message: "Group not found" });
  
      const messages = group.messages.map((msg) => ({
        _id: msg._id,
        sender: msg.sender?._id.toString(), // Normalize sender to string
        senderName: msg.sender?.username || "Unknown",
        text: msg.text,
        timestamp: msg.timestamp,
      }));
  
      res.status(200).json({ messages });
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });
  
export default router;
