import Bean from "../models/bean.js";
import Farmer from "../models/farmer.js";

export const createBean = async (req, res) => {
  try {
    const { localId, beanName, pricePerUnit, unit } = req.body;

    if (!beanName || pricePerUnit === undefined || !unit) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    let savedBean;

    if (localId) {
      savedBean = await Bean.findOneAndUpdate(
        { localId },
        {
          localId,
          beanName,
          pricePerUnit,
          unit,
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );
    } else {
      savedBean = await Bean.create({
        beanName,
        pricePerUnit,
        unit,
      });
    }

    res.status(201).json(savedBean);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getBeans = async (req, res) => {
  try {
    const beans = await Bean.find().sort({ createdAt: -1 });

    const result = await Promise.all(
      beans.map(async (bean) => {
        const farmers = await Farmer.find({
          beans: bean._id,
        }).select("name sex age residentialAddress farmAddress");

        return {
          _id: bean._id,
          localId: bean.localId,
          beanName: bean.beanName,
          pricePerUnit: bean.pricePerUnit,
          unit: bean.unit,
          farmers,
          createdAt: bean.createdAt,
          updatedAt: bean.updatedAt,
        };
      })
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateBean = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedBean = await Bean.findByIdAndUpdate(
      id,
      {
        beanName: req.body.beanName,
        pricePerUnit: req.body.pricePerUnit,
        unit: req.body.unit,
      },
      { new: true, runValidators: true }
    );

    if (!updatedBean) {
      return res.status(404).json({ message: "Bean not found" });
    }

    res.json(updatedBean);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteBean = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedBean = await Bean.findByIdAndDelete(id);

    if (!deletedBean) {
      return res.status(404).json({ message: "Bean not found" });
    }

    res.json({ message: "Bean deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};