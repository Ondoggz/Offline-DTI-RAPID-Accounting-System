import express from "express";
import {
  getTransactions,
  getDeliverySummary,
} from "../controllers/transactionController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET all transactions
router.get("/", protect, getTransactions);

// GET single transaction + payments + summary
router.get("/:id", protect, getDeliverySummary);

export default router;