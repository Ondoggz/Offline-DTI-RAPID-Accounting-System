import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["DELIVERY", "PAYMENT"],
      required: true,
    },

    farmerName: {
      type: String,
      required: true,
    },

    beanType: {
      type: String,
    },

    amount: {
      type: Number,
      required: true,
    },

    volume: {
      type: Number,
    },

    date: {
      type: Date,
      default: Date.now,
    },

    remarks: {
      type: String,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Transaction", transactionSchema);