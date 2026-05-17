import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    localId: {
      type: String,
      index: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    name: {
      type: String,
      default: "",
    },
    sex: {
      type: String,
      default: "",
    },
    age: {
      type: Number,
      default: null,
    },
    position: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;