import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./models/user.js";

const run = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL);

    const hashedPassword = await bcrypt.hash("user123", 10);

    await User.create({
      username: "user",
      password: hashedPassword,
      role: "user",
    });

    console.log("User created successfully");
    process.exit();
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }
};

run();