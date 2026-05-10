import express from "express";
import {
  addPayment,
  getPaymentsByDelivery,
} from "../controllers/paymentsController.js";

const router = express.Router();

router.post("/", addPayment);
router.get("/:deliveryId", getPaymentsByDelivery);

export default router;