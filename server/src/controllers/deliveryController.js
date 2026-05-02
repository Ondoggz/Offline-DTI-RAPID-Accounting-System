import Delivery from "../models/delivery.js";
import Transaction from "../models/transaction.js";

// CREATE
export const createDelivery = async (req, res) => {
  try {
    const volume = Number(req.body.volume) || 0;
    const pricePerUnit = Number(req.body.pricePerUnit) || 0;
    const totalAmount = volume * pricePerUnit;

    const newDelivery = await Delivery.create({
      farmer: req.body.farmer,
      farmerContact: req.body.farmerContact,
      beanType: req.body.beanType,
      courier: req.body.courier,
      date: req.body.date,
      deliveryGuy: req.body.deliveryGuy,
      consignee: req.body.consignee,
      deliveryGuyContact: req.body.deliveryGuyContact,
      consigneeContact: req.body.consigneeContact,
      recordedBy: req.body.recordedBy,
      proofOfDelivery: req.file ? req.file.filename : "",

      volume,
      pricePerUnit,
      totalAmount,
    });

    await Transaction.create({
      type: "DELIVERY",
      farmerName: newDelivery.farmer,
      beanType: newDelivery.beanType,
      amount: totalAmount,
      volume,
      date: newDelivery.date,
      remarks: "Delivery recorded",
      createdBy: req.user?.id,
    });

    res.status(201).json(newDelivery);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET
export const getDeliveries = async (req, res) => {
  try {
    const deliveries = await Delivery.find().sort({ createdAt: -1 });
    res.json(deliveries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE
export const deleteDelivery = async (req, res) => {
  try {
    const ADMIN_PASSWORD = "admin123";
    const { id } = req.params;
    const { password } = req.body;

    if (password !== ADMIN_PASSWORD) {
      return res.status(403).json({ message: "Incorrect admin password" });
    }

    const deletedDelivery = await Delivery.findByIdAndDelete(id);

    if (!deletedDelivery) {
      return res.status(404).json({ message: "Delivery not found" });
    }

    res.json({ message: "Delivery deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};