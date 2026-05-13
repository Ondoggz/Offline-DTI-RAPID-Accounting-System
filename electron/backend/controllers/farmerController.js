import Farmer from "../models/farmer.js";

// CREATE / UPSERT
export const createFarmer = async (req, res) => {
  try {
    const {
      localId,
      farmerID,
      name,
      sex,
      age,
      residentialAddress,
      farmAddress,
      contactNumber,
      emailAddress,
      beans,
    } = req.body;

    const data = {
      localId: localId || null,
      farmerID,
      name,
      sex,
      age,
      residentialAddress,
      farmAddress,
      contactNumber,
      emailAddress,
      beans: beans || [],
    };

    let farmer;

    if (localId) {
      farmer = await Farmer.findOneAndUpdate(
        { localId },
        data,
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      ).populate("beans");
    } else {
      farmer = await Farmer.create(data);
      farmer = await Farmer.findById(farmer._id).populate("beans");
    }

    res.status(201).json(farmer);
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
        sex: req.body.sex,
        age: req.body.age,
        residentialAddress: req.body.residentialAddress,
        farmAddress: req.body.farmAddress,
        contactNumber: req.body.contactNumber,
        emailAddress: req.body.emailAddress,
        beans: req.body.beans || [],
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