import Delivery from "../models/delivery.js";
import Transaction from "../models/transaction.js";

// CREATE
export const createDelivery = async (req, res) => {
  try {
    console.log("CREATE DELIVERY BODY:", req.body);
    console.log("CREATE DELIVERY FILE:", req.file);

    const volume = Number(req.body.volume);
    const pricePerUnit = Number(req.body.pricePerUnit);
    const totalAmount = volume * pricePerUnit;

    if (
      !req.body.farmer ||
      !req.body.beanType ||
      !req.body.courier ||
      !req.body.date ||
      !req.body.deliveryGuy ||
      !req.body.consignee ||
      !req.body.deliveryGuyContact ||
      !req.body.consigneeContact
    ) {
      return res.status(400).json({
        message: "Please complete all required delivery fields.",
      });
    }

    if (Number.isNaN(volume) || volume <= 0) {
      return res.status(400).json({
        message: "Volume must be greater than 0.",
      });
    }

    if (Number.isNaN(pricePerUnit) || pricePerUnit < 0) {
      return res.status(400).json({
        message: "Invalid price per unit.",
      });
    }

    const newDelivery = await Delivery.create({
      farmer: req.body.farmer,
      farmerContact: req.body.farmerContact || "",
      beanType: req.body.beanType,
      courier: req.body.courier,
      date: req.body.date,
      deliveryGuy: req.body.deliveryGuy,
      consignee: req.body.consignee,
      deliveryGuyContact: req.body.deliveryGuyContact,
      consigneeContact: req.body.consigneeContact,
      recordedBy: req.body.recordedBy || "Unknown User",
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
      createdBy: req.user?._id || req.user?.id,
    });

    res.status(201).json(newDelivery);
  } catch (err) {
    console.error("CREATE DELIVERY ERROR:", err);

    res.status(400).json({
      message: err.message,
      errors: err.errors,
    });
  }
};

// GET
export const getDeliveries = async (req, res) => {
  try {
    const deliveries = await Delivery.find().sort({ createdAt: -1 });
    res.json(deliveries);
  } catch (err) {
    console.error("GET DELIVERIES ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

// DELETE
export const deleteDelivery = async (req, res) => {
  try {
    const ADMIN_PASSWORD = process.env.ADMIN_DELETE_PASSWORD || "admin123";
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
    console.error("DELETE DELIVERY ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};