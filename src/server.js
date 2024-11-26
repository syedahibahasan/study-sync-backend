import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import userRouter from "./routers/user.router.js";  // Import user routes
import courseRouter from "./routers/course.router.js";
import groupRouter from "./routers/group.router.js"
import { dbconnect } from "./config/database.config.js";  // Import database connection

// Connect to the database
dbconnect();

const app = express();
app.use(express.json());  // To parse JSON requests
app.use(express.static("public"));

app.use(
  cors({
    credentials: true,
    origin: ["http://localhost:3000"],  // Update this for production if necessary
  })
);

// Routes
app.use("/api/users", userRouter);  // Register the user routes
app.use("/api/courses", courseRouter);
app.use("/api/groups", groupRouter);


const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
