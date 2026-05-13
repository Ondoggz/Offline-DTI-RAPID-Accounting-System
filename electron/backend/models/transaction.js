import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    localId: {
      type: String,
      default: null,
      index: true,
    },

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
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Transaction ||
  mongoose.model("Transaction", transactionSchema);