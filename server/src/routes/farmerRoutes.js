import express from "express";
import {
  createFarmer,
  getFarmers,
  updateFarmer,
  deleteFarmer,
} from "../controllers/farmerController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.route("/")
  .get(getFarmers)
  .post(createFarmer);

router.route("/:id")
  .put(updateFarmer)
  .delete(deleteFarmer);

export default router;