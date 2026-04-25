import mongoose from "mongoose";

const deliverySchema = new mongoose.Schema(
  {
    farmer: {
      type: String,
      required: true,
    },

    farmerContact: {
      type: String,
      required: false,
    },

    beanType: {
      type: String,
      required: true,
    },

    courier: {
      type: String,
      required: false,
    },

    date: {
      type: Date,
      required: true,
    },

    deliveryGuy: {
      type: String,
      required: false,
    },

    consignee: {
      type: String,
      required: false,
    },

    deliveryGuyContact: {
      type: String,
      required: false,
    },

    consigneeContact: {
      type: String,
      required: false,
    },

    // 📸 stored filename from multer
    proofOfDelivery: {
      type: String,
      default: "",
    },

    recordedBy: {
      type: String,
      required: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Delivery", deliverySchema);