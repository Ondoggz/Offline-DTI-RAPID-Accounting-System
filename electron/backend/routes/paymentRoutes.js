import express from "express";
import {
  addPayment,
  getPayments,
  getPaymentsByDelivery,
} from "../controllers/paymentsController.js";

const router = express.Router();

// CREATE PAYMENT
router.post("/", addPayment);

// GET ALL PAYMENTS
router.get("/", getPayments);

// GET PAYMENTS BY DELIVERY
router.get("/:deliveryId", getPaymentsByDelivery);

export default router;