import mongoose from "mongoose";

const beanSchema = new mongoose.Schema(
  {
    localId: {
      type: String,
      default: null,
      index: true,
    },

    beanName: {
      type: String,
      required: true,
      trim: true,
    },

    pricePerUnit: {
      type: Number,
      required: true,
    },

    unit: {
      type: String,
      default: "kg",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Bean || mongoose.model("Bean", beanSchema);