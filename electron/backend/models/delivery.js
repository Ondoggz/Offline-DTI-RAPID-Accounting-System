import mongoose from "mongoose";

const deliverySchema = new mongoose.Schema(
  {
    localId: {
      type: String,
      default: null,
      index: true,
    },

    farmer: {
      type: String,
      required: true,
    },

    farmerContact: {
      type: String,
    },

    beanType: {
      type: String,
      required: true,
    },

    courier: {
      type: String,
    },

    date: {
      type: Date,
      required: true,
    },

    deliveryGuy: {
      type: String,
    },

    consignee: {
      type: String,
    },

    deliveryGuyContact: {
      type: String,
    },

    consigneeContact: {
      type: String,
    },

    proofOfDelivery: {
      type: String,
      default: "",
    },

    recordedBy: {
      type: String,
    },

    volume: {
      type: Number,
      default: 0,
      min: 0,
    },

    pricePerUnit: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Delivery ||
  mongoose.model("Delivery", deliverySchema);