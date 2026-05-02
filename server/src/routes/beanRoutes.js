import express from "express";
import {
  createBean,
  getBeans,
  updateBean,
  deleteBean,
} from "../controllers/beanController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/", createBean);
router.get("/", getBeans);
router.put("/:id", updateBean);
router.delete("/:id", deleteBean);

export default router;