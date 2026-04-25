import express from "express";
import multer from "multer";
import {
  createDelivery,
  getDeliveries,
} from "../controllers/deliveryController.js";

const router = express.Router();

// 📸 file storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// CREATE delivery WITH IMAGE
router.post("/", upload.single("proofOfDelivery"), createDelivery);

router.get("/", getDeliveries);

export default router;