// server/src/routes/reportRoutes.js
import express from "express";
import {
  generateMonthlyReport,
  generateMultiMonthReport,
  getReportSummary,
} from "../controllers/reportController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/* -------------------------
   PROTECTED ROUTES
-------------------------- */
router.use(protect);

/* -------------------------
   REPORT ROUTES
-------------------------- */

// Generate monthly report
router.post("/monthly", generateMonthlyReport);

// Generate multi-month report
router.post("/multi-month", generateMultiMonthReport);

// Get summary (quick stats)
router.get("/summary", getReportSummary);

/* -------------------------
   DEBUG (optional)
-------------------------- */
router.get("/test", (req, res) => {
  res.json({
    message: "Report routes working",
    user: req.user,
  });
});

export default router;