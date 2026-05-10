import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./models/user.js";

await mongoose.connect(process.env.DATABASE_URL);

const hashedPassword = await bcrypt.hash("admin123", 10);

await User.create({
  username: "admin",
  password: hashedPassword,
});

console.log("User created");
process.exit();