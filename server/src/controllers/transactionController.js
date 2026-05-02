import Transaction from "../models/transaction.js";
import Payment from "../models/payment.js";

/* -------------------------
   SUMMARY (Transaction + Payments)
-------------------------- */
export const getDeliverySummary = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    const payments = await Payment.find({
      deliveryId: req.params.id,
    }).sort({ createdAt: -1 });

    const totalPaid = payments.reduce(
      (sum, p) => sum + Number(p.amountPaid || 0),
      0
    );

    const totalAmount = Number(transaction.amount || 0);
    const balance = totalAmount - totalPaid;

    let status = "unpaid";
    if (balance <= 0) status = "paid";
    else if (totalPaid > 0) status = "partially paid";

    return res.json({
      success: true,
      delivery: transaction,
      payments,
      summary: {
        totalPaid,
        balance,
        status,
      },
    });
  } catch (err) {
    console.error("SUMMARY ERROR:", err);
    return res.status(500).json({ message: err.message });
  }
};

/* -------------------------
   GET ALL TRANSACTIONS
-------------------------- */
export const getTransactions = async (req, res) => {
  try {
    const { farmerName, startDate, endDate, beanType } = req.query;

    const query = {};

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

    return res.json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (error) {
    console.error("GET TRANSACTIONS ERROR:", error);
    return res.status(500).json({ message: error.message });
  }
};

/* -------------------------
   UPDATE TRANSACTION
-------------------------- */
export const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, volume, pricePerUnit } = req.body;

    const updated = await Transaction.findByIdAndUpdate(
      id,
      {
        amount: Number(amount || 0),
        volume: Number(volume || 0),
        pricePerUnit: Number(pricePerUnit || 0),
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    return res.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    console.error("UPDATE TRANSACTION ERROR:", err);
    return res.status(500).json({ message: err.message });
  }
};