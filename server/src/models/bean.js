import mongoose from "mongoose";

const beanSchema = new mongoose.Schema({
  beanName: {
    type: String,
    required: true,
  },
  pricePerUnit: {
    type: Number,
    required: true,
  },
}, { timestamps: true });

export default mongoose.model("Bean", beanSchema);