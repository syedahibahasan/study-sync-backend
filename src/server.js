import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import http from "http";
import userRouter from "./routers/user.router.js"; // Import user routes
import { dbconnect } from "./config/database.config.js"; // Import database connection
import courseRouter from "./routers/course.router.js";
import groupRouter from "./routers/group.router.js";

// Connect to the database
dbconnect();

const app = express();
app.use(express.json()); // To parse JSON requests
app.use(express.static("public"));

app.use(
  cors({
    credentials: true,
    origin: ["http://localhost:3000"], // Update this for production if necessary
  })
);

// Routes
app.use("/api/users", userRouter); // Register the user routes
app.use("/api/courses", courseRouter);
app.use("/api/groups", groupRouter);

// Create HTTP server and Socket.io instance
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "DELETE"],
  },
});

// Handle socket connections
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle user joining a group
  socket.on("joinGroup", (groupId) => {
    socket.join(groupId);
    console.log(`User ${socket.id} joined group: ${groupId}`);
  });

  // Handle user disconnect
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Pass `io` to the routers
app.set("io", io);

// Start the server
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});