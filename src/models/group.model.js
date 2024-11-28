import mongoose from "mongoose";

const GroupSchema = new mongoose.Schema({
    groupName: { type: String, required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    meetingType: { type: String, enum: ['In-Person', 'Online'], required: true },
    location: { type: String },
    selectedTimes: [
      {
        day: { type: String, required: true },
        times: [{ type: String, required: true }],
      },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  });
  
  
  export const GroupModel = mongoose.model("Group", GroupSchema);
  
  