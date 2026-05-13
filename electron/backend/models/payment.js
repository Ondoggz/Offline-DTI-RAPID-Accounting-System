import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    localId: {
      type: String,
      default: null,
      index: true,
    },

    deliveryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      required: true,
    },

    farmerName: {
      type: String,
      default: "",
    },

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

export default mongoose.models.Payment ||
  mongoose.model("Payment", paymentSchema);