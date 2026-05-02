import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    farmerName: {
      type: String,
      required: true,
      trim: true,
    },

    beanType: {
      type: String,
      required: true,
      trim: true,
    },

    volume: {
      type: Number,
      required: true,
      min: 0,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    date: {
      type: Date,
      default: Date.now,
    },

    remarks: {
      type: String,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Transaction", transactionSchema);