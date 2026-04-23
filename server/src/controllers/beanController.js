import Bean from "../models/bean.js";

export const createBean = async (req, res) => {
  try {
    const bean = await Bean.create(req.body);
    res.status(201).json(bean);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getBeans = async (req, res) => {
  try {
    const beans = await Bean.find();
    res.json(beans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateBean = async (req, res) => {
  try {
    const bean = await Bean.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(bean);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteBean = async (req, res) => {
  try {
    await Bean.findByIdAndDelete(req.params.id);
    res.json({ message: "Bean deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};