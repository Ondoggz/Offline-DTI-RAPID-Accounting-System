import mongoose from "mongoose";

const beanSchema = new mongoose.Schema(
  {
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

export default mongoose.model("Bean", beanSchema);