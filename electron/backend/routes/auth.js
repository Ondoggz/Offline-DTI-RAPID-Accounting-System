import express from "express";
import {
  loginUser,
  getCurrentUser,
} from "../controllers/authController.js";

import { protect } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

// public
router.post("/login", loginUser);

// logged-in user
router.get("/me", protect, getCurrentUser);

// 🔥 ADMIN ONLY ROUTE EXAMPLE
router.get("/admin", protect, requireAdmin, (req, res) => {
  res.json({ message: "Welcome Admin Dashboard" });
});

export default router;