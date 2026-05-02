// server/src/controllers/reportController.js
import Delivery from "../models/delivery.js";
import Farmer from "../models/farmer.js";

// Helper function to get month range
const getMonthRange = (month, year) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  return { startDate, endDate };
};

// Generate monthly report
export const generateMonthlyReport = async (req, res) => {
  try {
    const { reportType, month, year } = req.body;

    if (!month || !year) {
      return res.status(400).json({ error: "Month and year are required" });
    }

    const { startDate, endDate } = getMonthRange(month, year);
    const reportData = {};

    if (reportType === "per-farmer" || reportType === "both") {
      const farmers = await Farmer.find({});

      const perFarmerReport = await Promise.all(
        farmers.map(async (farmer) => {
          const deliveries = await Delivery.find({
            farmer: farmer.name,
            date: { $gte: startDate, $lte: endDate },
          });

          const volumeSold = deliveries.reduce(
            (sum, d) => sum + Number(d.volume || 0),
            0
          );

          const salesGenerated = deliveries.reduce(
            (sum, d) => sum + Number(d.totalAmount || 0),
            0
          );

          return {
            farmerId: farmer.farmerID,
            farmerName: farmer.name,
            farmerAddress: farmer.address,
            contactNumber: farmer.contactNumber,
            deliveries: deliveries.length,
            volumeSold,
            salesGenerated,
          };
        })
      );

      reportData.perFarmer = perFarmerReport.filter((f) => f.deliveries > 0);
    }

    if (reportType === "organization" || reportType === "both") {
      const deliveries = await Delivery.find({
        date: { $gte: startDate, $lte: endDate },
      });

      const beanTypeSummary = {};

      deliveries.forEach((d) => {
        const beanType = d.beanType || "Unknown";

        if (!beanTypeSummary[beanType]) {
          beanTypeSummary[beanType] = {
            volumeSold: 0,
            salesGenerated: 0,
          };
        }

        beanTypeSummary[beanType].volumeSold += Number(d.volume || 0);
        beanTypeSummary[beanType].salesGenerated += Number(d.totalAmount || 0);
      });

      const totalDeliveries = deliveries.length;

      const totalVolumeSold = deliveries.reduce(
        (sum, d) => sum + Number(d.volume || 0),
        0
      );

      const totalSalesGenerated = deliveries.reduce(
        (sum, d) => sum + Number(d.totalAmount || 0),
        0
      );

      const uniqueFarmers = new Set(deliveries.map((d) => d.farmer)).size;

      reportData.organization = {
        totalDeliveries,
        totalVolumeSold,
        totalSalesGenerated,
        uniqueFarmers,
        beanTypeSummary,
        month,
        year,
        monthName: new Date(year, month - 1).toLocaleString("default", {
          month: "long",
        }),
      };
    }

    return res.json({
      success: true,
      data: reportData,
      reportType,
      month,
      year,
    });
  } catch (error) {
    console.error("Report generation error:", error);
    return res.status(500).json({
      error: "Failed to generate report: " + error.message,
    });
  }
};

// Generate multi-month report
export const generateMultiMonthReport = async (req, res) => {
  try {
    const { reportType, startMonth, startYear, endMonth, endYear } = req.body;

    if (!startMonth || !startYear || !endMonth || !endYear) {
      return res.status(400).json({
        error: "Start month/year and end month/year are required",
      });
    }

    const startDate = new Date(startYear, startMonth - 1, 1);
    const endDate = new Date(endYear, endMonth, 0, 23, 59, 59);

    const months = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      months.push({
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear(),
        monthName: currentDate.toLocaleString("default", { month: "long" }),
      });

      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    const monthlyData = [];

    for (const period of months) {
      const periodStart = new Date(period.year, period.month - 1, 1);
      const periodEnd = new Date(period.year, period.month, 0, 23, 59, 59);

      const deliveries = await Delivery.find({
        date: { $gte: periodStart, $lte: periodEnd },
      });

      const beanTypeSummary = {};

      deliveries.forEach((d) => {
        const beanType = d.beanType || "Unknown";

        if (!beanTypeSummary[beanType]) {
          beanTypeSummary[beanType] = {
            volumeSold: 0,
            salesGenerated: 0,
          };
        }

        beanTypeSummary[beanType].volumeSold += Number(d.volume || 0);
        beanTypeSummary[beanType].salesGenerated += Number(d.totalAmount || 0);
      });

      monthlyData.push({
        month: period.month,
        year: period.year,
        monthName: period.monthName,
        organization: {
          totalDeliveries: deliveries.length,
          totalVolumeSold: deliveries.reduce(
            (sum, d) => sum + Number(d.volume || 0),
            0
          ),
          totalSalesGenerated: deliveries.reduce(
            (sum, d) => sum + Number(d.totalAmount || 0),
            0
          ),
          uniqueFarmers: new Set(deliveries.map((d) => d.farmer)).size,
          beanTypeSummary,
        },
      });
    }

    return res.json({
      success: true,
      data: monthlyData,
      reportType,
      startMonth,
      startYear,
      endMonth,
      endYear,
    });
  } catch (error) {
    console.error("Multi-month report error:", error);
    return res.status(500).json({
      error: "Failed to generate multi-month report: " + error.message,
    });
  }
};

// Get report summary for dashboard widget
export const getReportSummary = async (req, res) => {
  try {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    const { startDate, endDate } = getMonthRange(currentMonth, currentYear);

    const deliveries = await Delivery.find({
      date: { $gte: startDate, $lte: endDate },
    });

    const totalSales = deliveries.reduce(
      (sum, d) => sum + Number(d.totalAmount || 0),
      0
    );

    const totalVolume = deliveries.reduce(
      (sum, d) => sum + Number(d.volume || 0),
      0
    );

    return res.json({
      success: true,
      currentMonth: currentDate.toLocaleString("default", { month: "long" }),
      currentYear,
      totalSales,
      totalVolume,
      totalDeliveries: deliveries.length,
      transactionCount: deliveries.length,
    });
  } catch (error) {
    console.error("REPORT SUMMARY ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
};