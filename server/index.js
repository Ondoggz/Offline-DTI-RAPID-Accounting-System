import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import fs from "fs";

import authRoutes from "./src/routes/auth.js";
import userRoutes from "./src/routes/users.js";
import beanRoutes from "./src/routes/beanRoutes.js";
import farmerRoutes from "./src/routes/farmerRoutes.js";
import deliveryRoutes from "./src/routes/deliveryRoutes.js";
import formsRoutes from "./src/routes/formsRoutes.js";
import transactionRoutes from "./src/routes/transactionRoutes.js";
import paymentRoutes from "./src/routes/paymentRoutes.js";

import { protect } from "./src/middleware/authMiddleware.js";

["uploads", "temp", "templates"].forEach((folder) => {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder);
  }
});

const app = express();

/* Middleware FIRST */
app.use(cors());
app.use(express.json());

/* Test route */
app.get("/api", (req, res) => {
  res.json({
    message: "Backend connected successfully",
    databaseTime: new Date(),
  });
});

/* Routes */
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/api/beans", beanRoutes);
app.use("/api/farmers", farmerRoutes);
app.use("/api/deliveries", deliveryRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/forms", formsRoutes);

/* Static files */
app.use("/uploads", express.static("uploads"));

app.get("/protected", protect, (req, res) => {
  res.json({
    message: "Protected route accessed successfully",
    user: req.user,
  });
});

/* 404 */
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

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