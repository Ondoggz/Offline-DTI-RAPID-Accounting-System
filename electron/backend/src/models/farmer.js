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

    sex: {
      type: String,
      required: true,
      enum: ["Male", "Female"],
      trim: true,
    },

    age: {
      type: Number,
      required: true,
    },

    residentialAddress: {
      type: String,
      required: true,
      trim: true,
    },

    farmAddress: {
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

export default mongoose.models.Farmer || mongoose.model("Farmer", farmerSchema);