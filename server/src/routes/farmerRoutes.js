import express from "express";
import {
  createFarmer,
  getFarmers,
  updateFarmer,
  deleteFarmer,
} from "../controllers/farmerController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// 🔐 protect all routes
router.use(protect);

// GET all farmers / CREATE farmer
router
  .route("/")
  .get(getFarmers)
  .post(createFarmer);

// UPDATE farmer / DELETE farmer
router
  .route("/:id")
  .put(updateFarmer)
  .delete(deleteFarmer);

export default router;