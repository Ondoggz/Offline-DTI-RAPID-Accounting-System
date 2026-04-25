import Farmer from "../models/Farmer.js";

// CREATE
export const createFarmer = async (req, res) => {
  try {
    const farmer = await Farmer.create(req.body);
    res.status(201).json(farmer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// GET (with beans populated)
export const getFarmers = async (req, res) => {
  try {
    const farmers = await Farmer.find().populate("beans");
    res.json(farmers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE
export const updateFarmer = async (req, res) => {
  try {
    const farmer = await Farmer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!farmer) {
      return res.status(404).json({ message: "Farmer not found" });
    }

    res.json(farmer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE
export const deleteFarmer = async (req, res) => {
  try {
    const farmer = await Farmer.findByIdAndDelete(req.params.id);

    if (!farmer) {
      return res.status(404).json({ message: "Farmer not found" });
    }

    res.json({ message: "Farmer deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};