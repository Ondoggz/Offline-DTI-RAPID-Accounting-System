// server/src/routes/reportRoutes.js
import express from 'express';
import { 
  generateMonthlyReport, 
  generateMultiMonthReport,
  getReportSummary
} from '../controllers/reportController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// All report routes require authentication
router.use(authMiddleware);

// Generate reports
router.post('/monthly', generateMonthlyReport);
router.post('/multi-month', generateMultiMonthReport);
router.get('/summary', getReportSummary);

export default router;