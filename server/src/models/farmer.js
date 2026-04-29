import mongoose from "mongoose";

const farmerSchema = new mongoose.Schema(
  {
    farmerID: {
      type: String,
      required: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    age: {
      type: Number,
      required: true,
    },

    address: {
      type: String,
      required: true,
      trim: true,
    },

    contactNumber: {
      type: String,
      required: true,
      trim: true,
    },

    emailAddress: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    // 🔥 RELATION
    beans: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Bean",
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Farmer", farmerSchema);