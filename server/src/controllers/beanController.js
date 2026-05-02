import Bean from "../models/Bean.js";
import Farmer from "../models/Farmer.js";

// 📌 CREATE Bean
export const createBean = async (req, res) => {
  try {
    const { beanName, pricePerUnit, unit } = req.body;

    if (!beanName || !pricePerUnit || !unit) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const newBean = new Bean({
      beanName,
      pricePerUnit,
      unit,
    });

    const savedBean = await newBean.save();
    res.status(201).json(savedBean);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 📌 GET all Beans (WITH REVERSE QUERY → FARMERS)
export const getBeans = async (req, res) => {
  try {
    const beans = await Bean.find().sort({ createdAt: -1 });

    const result = await Promise.all(
      beans.map(async (bean) => {
        const farmers = await Farmer.find({
          beans: bean._id,
        }).select("name age address");

        return {
          _id: bean._id,
          beanName: bean.beanName,
          pricePerUnit: bean.pricePerUnit,
          unit: bean.unit,
          farmers, // 🔥 computed dynamically
        };
      })
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 📌 UPDATE Bean
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

// 📌 DELETE Bean
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