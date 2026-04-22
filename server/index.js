import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import authRoutes from "./src/routes/auth.js";
import userRoutes from "./src/routes/users.js";
import { protect } from "./src/middleware/authMiddleware.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Public test route
app.get("/api", (req, res) => {
  res.json({
    message: "Backend connected successfully",
    databaseTime: new Date(),
  });
});

// Auth routes
app.use("/auth", authRoutes);
app.use("/users", userRoutes);

// Example protected route
app.get("/protected", protect, (req, res) => {
  res.json({
    message: "Protected route accessed successfully",
    user: req.user,
  });
});

// Unknown routes
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Connect to MongoDB and start server
mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => {
    console.log("MongoDB connected");

    app.listen(process.env.PORT || 3000, () => {
      console.log(`Server running on port ${process.env.PORT || 3000}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });