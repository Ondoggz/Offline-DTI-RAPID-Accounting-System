import Transaction from "../models/transaction.js";

export const getTransactions = async (req, res) => {
  try {
    const { farmerName, startDate, endDate, beanType } = req.query;

    let query = {};

    if (farmerName) {
      query.farmerName = { $regex: farmerName, $options: "i" };
    }

    if (beanType) {
      query.beanType = beanType;
    }

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const transactions = await Transaction.find(query).sort({ date: -1 });

    res.json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};