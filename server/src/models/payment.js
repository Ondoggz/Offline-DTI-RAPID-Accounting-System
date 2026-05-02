import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    deliveryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      required: true,
    },
    farmerName: String,
    amountPaid: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      default: "Cash",
    },
    notes: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Payment", paymentSchema);