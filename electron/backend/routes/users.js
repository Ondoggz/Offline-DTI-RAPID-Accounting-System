import express from "express";
import bcrypt from "bcryptjs";
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
    const users = await User.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      users,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* -------------------------
   CREATE / SYNC USER
-------------------------- */
router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const {
      localId,
      username,
      password,
      role,
      name,
      sex,
      age,
      position,
      createdAt,
      updatedAt,
    } = req.body;

    if (!username || !password || !name) {
      return res.status(400).json({
        message: "Username, password, and full name are required",
      });
    }

    const isAlreadyHashed =
      password.startsWith("$2a$") ||
      password.startsWith("$2b$") ||
      password.startsWith("$2y$");

    const finalPassword = isAlreadyHashed
      ? password
      : await bcrypt.hash(password, 10);

    const existingUser = await User.findOne({
      $or: [{ username }, ...(localId ? [{ localId }] : [])],
    });

    if (existingUser) {
      existingUser.localId = localId || existingUser.localId;
      existingUser.username = username;
      existingUser.password = finalPassword;
      existingUser.role = role || "user";
      existingUser.name = name;
      existingUser.sex = sex || "";
      existingUser.age = age ? Number(age) : null;
      existingUser.position = position || "";

      await existingUser.save();

      return res.json({
        success: true,
        user: existingUser,
      });
    }

    const user = await User.create({
      localId,
      username,
      password: finalPassword,
      role: role || "user",
      name,
      sex: sex || "",
      age: age ? Number(age) : null,
      position: position || "",
      createdAt,
      updatedAt,
    });

    res.status(201).json({
      success: true,
      user,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* -------------------------
   UPDATE USER
-------------------------- */
router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    const { username, password, role, name, sex, age, position } = req.body;

    const updateData = {
      username,
      role: role || "user",
      name,
      sex: sex || "",
      age: age ? Number(age) : null,
      position: position || "",
    };

    if (password) {
      const isAlreadyHashed =
        password.startsWith("$2a$") ||
        password.startsWith("$2b$") ||
        password.startsWith("$2y$");

      updateData.password = isAlreadyHashed
        ? password
        : await bcrypt.hash(password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      success: true,
      user: updatedUser,
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