import express from "express";
import bcrypt from "bcryptjs"; // ✅ ADD THIS
import User from "../models/user.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access only" });
  }
  next();
};

/* -------------------------
   GET USERS
-------------------------- */
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find()
      .select("-password") // keep hidden
      .sort({ createdAt: -1 });

    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* -------------------------
   CREATE USER (FIXED)
-------------------------- */
router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const { username, password, role, name, sex, age, position } = req.body;

    if (!username || !password || !name) {
      return res.status(400).json({
        message: "Username, password, and full name are required",
      });
    }

    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.status(400).json({
        message: "Username already exists",
      });
    }

    // ✅ FIX: HASH PASSWORD
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      password: hashedPassword, // 🔥 IMPORTANT
      role: role || "user",
      name,
      sex: sex || "",
      age: age ? Number(age) : null,
      position: position || "",
    });

    res.status(201).json({
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        role: user.role,
        name: user.name,
        sex: user.sex,
        age: user.age,
        position: user.position,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* -------------------------
   DELETE USER
-------------------------- */
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;