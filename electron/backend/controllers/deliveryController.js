import Delivery from "../models/delivery.js";
import Transaction from "../models/transaction.js";

// CREATE / UPSERT
export const createDelivery = async (req, res) => {
  try {
    const localId = req.body.localId || null;

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

    const deliveryData = {
      localId,
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
      proofOfDelivery: req.file
        ? req.file.filename
        : req.body.proofOfDelivery || "",
      volume,
      pricePerUnit,
      totalAmount,
    };

    let delivery;

    if (localId) {
      delivery = await Delivery.findOneAndUpdate(
        { localId },
        deliveryData,
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );
    } else {
      delivery = await Delivery.create(deliveryData);
    }

    const transactionData = {
      localId,
      farmerName: delivery.farmer,
      beanType: delivery.beanType,
      amount: totalAmount,
      volume,
      date: delivery.date,
      remarks: "Delivery recorded",
      createdBy: req.user?._id || req.user?.id || null,
    };

    if (localId) {
      await Transaction.findOneAndUpdate(
        { localId },
        transactionData,
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );
    } else {
      await Transaction.create(transactionData);
    }

    res.status(201).json(delivery);
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

    if (deletedDelivery.localId) {
      await Transaction.findOneAndDelete({ localId: deletedDelivery.localId });
    }

    res.json({ message: "Delivery deleted successfully" });
  } catch (err) {
    console.error("DELETE DELIVERY ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};