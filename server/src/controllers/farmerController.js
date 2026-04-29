import Farmer from "../models/Farmer.js";

// CREATE
export const createFarmer = async (req, res) => {
  try {
    const farmer = await Farmer.create({
      farmerID: req.body.farmerID,
      name: req.body.name,
      age: req.body.age,
      address: req.body.address,
      contactNumber: req.body.contactNumber,
      emailAddress: req.body.emailAddress,
      beans: req.body.beans,
    });

    const populatedFarmer = await Farmer.findById(farmer._id).populate("beans");

    res.status(201).json(populatedFarmer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// GET
export const getFarmers = async (req, res) => {
  try {
    const farmers = await Farmer.find()
      .populate("beans")
      .sort({ createdAt: -1 });

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
      {
        farmerID: req.body.farmerID,
        name: req.body.name,
        age: req.body.age,
        address: req.body.address,
        contactNumber: req.body.contactNumber,
        emailAddress: req.body.emailAddress,
        beans: req.body.beans,
      },
      {
        new: true,
        runValidators: true,
      }
    ).populate("beans");

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