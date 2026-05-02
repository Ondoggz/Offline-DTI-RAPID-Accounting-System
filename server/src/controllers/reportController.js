// server/src/controllers/reportController.js
import Delivery from '../models/delivery.js';
import Transaction from '../models/transaction.js';
import Farmer from '../models/farmer.js';
import Bean from '../models/bean.js';

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
      return res.status(400).json({ error: 'Month and year are required' });
    }

    const { startDate, endDate } = getMonthRange(month, year);
    let reportData = {};

    if (reportType === 'per-farmer' || reportType === 'both') {
      // Get all farmers
      const farmers = await Farmer.find({});
      
      const perFarmerReport = await Promise.all(farmers.map(async (farmer) => {
        // Get deliveries for this farmer in the month
        const deliveries = await Delivery.find({
          farmer: farmer.name,
          date: { $gte: startDate, $lte: endDate }
        });

        // Get PAYMENT transactions (sales) for this farmer in the month
        const transactions = await Transaction.find({
          farmerName: farmer.name,
          type: 'PAYMENT',  // Only PAYMENT type represents sales
          date: { $gte: startDate, $lte: endDate }
        });

        // Since deliveries don't have volume, we need to calculate from transactions
        // Or you need to add volume field to delivery schema
        const volumeReceived = 0; // TEMP: Add volume to delivery schema
        const volumeSold = transactions.reduce((sum, t) => sum + (t.volume || 0), 0);
        const salesGenerated = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
        const volumeBalance = volumeReceived - volumeSold;

        return {
          farmerId: farmer.farmerID,
          farmerName: farmer.name,
          farmerAddress: farmer.address,
          contactNumber: farmer.contactNumber,
          deliveries: deliveries.length,
          volumeReceived,
          volumeSold,
          salesGenerated,
          volumeBalance,
          transactions: transactions
        };
      }));

      reportData.perFarmer = perFarmerReport.filter(f => f.transactions.length > 0 || f.deliveries > 0);
    }

    if (reportType === 'organization' || reportType === 'both') {
      // Organization-wide totals
      const deliveries = await Delivery.find({
        date: { $gte: startDate, $lte: endDate }
      });

      const transactions = await Transaction.find({
        type: 'PAYMENT',
        date: { $gte: startDate, $lte: endDate }
      });

      // Group by bean type
      const beanTypeSummary = {};
      transactions.forEach(t => {
        if (t.beanType) {
          if (!beanTypeSummary[t.beanType]) {
            beanTypeSummary[t.beanType] = {
              volumeSold: 0,
              salesGenerated: 0
            };
          }
          beanTypeSummary[t.beanType].volumeSold += t.volume || 0;
          beanTypeSummary[t.beanType].salesGenerated += t.amount || 0;
        }
      });

      const totalDeliveries = deliveries.length;
      const totalVolumeSold = transactions.reduce((sum, t) => sum + (t.volume || 0), 0);
      const totalSalesGenerated = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
      const uniqueFarmers = new Set(transactions.map(t => t.farmerName)).size;

      reportData.organization = {
        totalDeliveries,
        totalVolumeSold,
        totalSalesGenerated,
        uniqueFarmers,
        beanTypeSummary,
        month,
        year,
        monthName: new Date(year, month - 1).toLocaleString('default', { month: 'long' })
      };
    }

    res.json({ success: true, data: reportData, reportType, month, year });

  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ error: 'Failed to generate report: ' + error.message });
  }
};

// Generate multi-month report (range)
export const generateMultiMonthReport = async (req, res) => {
  try {
    const { reportType, startMonth, startYear, endMonth, endYear } = req.body;

    let startDate = new Date(startYear, startMonth - 1, 1);
    let endDate = new Date(endYear, endMonth, 0, 23, 59, 59);

    const months = [];
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      months.push({
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear(),
        monthName: currentDate.toLocaleString('default', { month: 'long' })
      });
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    let monthlyData = [];

    for (const period of months) {
      const periodStart = new Date(period.year, period.month - 1, 1);
      const periodEnd = new Date(period.year, period.month, 0, 23, 59, 59);

      const deliveries = await Delivery.find({
        date: { $gte: periodStart, $lte: periodEnd }
      });

      const transactions = await Transaction.find({
        type: 'PAYMENT',
        date: { $gte: periodStart, $lte: periodEnd }
      });

      // Group by bean type for this month
      const beanTypeSummary = {};
      transactions.forEach(t => {
        if (t.beanType) {
          if (!beanTypeSummary[t.beanType]) {
            beanTypeSummary[t.beanType] = {
              volumeSold: 0,
              salesGenerated: 0
            };
          }
          beanTypeSummary[t.beanType].volumeSold += t.volume || 0;
          beanTypeSummary[t.beanType].salesGenerated += t.amount || 0;
        }
      });

      monthlyData.push({
        month: period.month,
        year: period.year,
        monthName: period.monthName,
        organization: {
          totalDeliveries: deliveries.length,
          totalVolumeSold: transactions.reduce((sum, t) => sum + (t.volume || 0), 0),
          totalSalesGenerated: transactions.reduce((sum, t) => sum + (t.amount || 0), 0),
          uniqueFarmers: new Set(transactions.map(t => t.farmerName)).size,
          beanTypeSummary
        }
      });
    }

    res.json({ success: true, data: monthlyData, reportType, startMonth, startYear, endMonth, endYear });

  } catch (error) {
    console.error('Multi-month report error:', error);
    res.status(500).json({ error: 'Failed to generate multi-month report: ' + error.message });
  }
};

// Get report summary for dashboard widget
export const getReportSummary = async (req, res) => {
  try {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    const { startDate, endDate } = getMonthRange(currentMonth, currentYear);

    const transactions = await Transaction.find({
      type: 'PAYMENT',
      date: { $gte: startDate, $lte: endDate }
    });

    const deliveries = await Delivery.find({
      date: { $gte: startDate, $lte: endDate }
    });

    const totalSales = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalVolume = transactions.reduce((sum, t) => sum + (t.volume || 0), 0);
    const totalDeliveries = deliveries.length;

    res.json({
      success: true,
      currentMonth: currentDate.toLocaleString('default', { month: 'long' }),
      currentYear,
      totalSales,
      totalVolume,
      totalDeliveries,
      transactionCount: transactions.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};