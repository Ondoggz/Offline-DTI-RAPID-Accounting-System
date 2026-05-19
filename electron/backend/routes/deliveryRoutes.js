import express from "express";
import multer from "multer";
import {
  createDelivery,
  getDeliveries,
  deleteDelivery,
} from "../controllers/deliveryController.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

// CREATE delivery WITH IMAGE
router.post("/", upload.single("proofOfDelivery"), createDelivery);

router.get("/", getDeliveries);

router.delete("/:id", deleteDelivery);

export default router;