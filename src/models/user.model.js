import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },

    enrolledCourses: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "scrappedcourses" }],
      default: [],
    },

    schedule: {
      type: [
        {
          day: { type: String, required: true },
          busyTimes: { type: [String], default: [] },
          studyGroupTime: { type: [String], default: [] },
        },
      ],
      default: [],
    },

    groups: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Group" }],
      default: [],
    },

    preferredLocations: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true } // Add timestamps
);

export const UserModel = mongoose.model("User", UserSchema);
