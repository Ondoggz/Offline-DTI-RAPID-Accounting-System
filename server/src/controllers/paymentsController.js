import Payment from "../models/payment.js";
import Transaction from "../models/transaction.js";

export const addPayment = async (req, res) => {
  try {
    console.log("PAYMENT BODY RECEIVED:", req.body);

    const { deliveryId, amountPaid, paymentMethod, notes } = req.body;

    if (!deliveryId) {
      return res.status(400).json({ message: "deliveryId missing" });
    }

    if (!amountPaid || Number(amountPaid) <= 0) {
      return res.status(400).json({ message: "Invalid amountPaid" });
    }

    const transaction = await Transaction.findById(deliveryId);

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    const payment = await Payment.create({
      deliveryId,
      farmerName: transaction.farmerName,
      amountPaid: Number(amountPaid),
      paymentMethod: paymentMethod || "Cash",
      notes: notes || "",
    });

    console.log("PAYMENT SAVED:", payment);

    res.status(201).json({
      success: true,
      data: payment,
    });
  } catch (err) {
    console.error("ADD PAYMENT ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

export const getPaymentsByDelivery = async (req, res) => {
  try {
    const payments = await Payment.find({
      deliveryId: req.params.deliveryId,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: payments,
    });
  } catch (err) {
    console.error("GET PAYMENTS ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};