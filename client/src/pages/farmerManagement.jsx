import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

function FarmerManagement({ beans = [] }) {
  const [farmers, setFarmers] = useState([]);

  const [form, setForm] = useState({
    id: null,
    farmerID: "",
    name: "",
    age: "",
    address: "",
    contactNumber: "",
    emailAddress: "",
    beans: [""],
  });

  const [isEditing, setIsEditing] = useState(false);
  const token = localStorage.getItem("token");

  const fetchFarmers = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/farmers`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setFarmers(
        res.data.map((f) => ({
          id: f._id,
          farmerID: f.farmerID || "",
          name: f.name || "",
          age: f.age || "",
          address: f.address || "",
          contactNumber: f.contactNumber || "",
          emailAddress: f.emailAddress || "",
          beans: f.beans || [],
        }))
      );
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchFarmers();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleBeanChange = (index, value) => {
    const updated = [...form.beans];
    updated[index] = value;
    setForm({ ...form, beans: updated });
  };

  const addBeanField = () => {
    setForm({ ...form, beans: [...form.beans, ""] });
  };

  const removeBeanField = (index) => {
    const updated = form.beans.filter((_, i) => i !== index);
    setForm({ ...form, beans: updated.length ? updated : [""] });
  };

  const resetForm = () => {
    setForm({
      id: null,
      farmerID: "",
      name: "",
      age: "",
      address: "",
      contactNumber: "",
      emailAddress: "",
      beans: [""],
    });
    setIsEditing(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanedBeans = form.beans.filter((b) => b.trim() !== "");

    const farmerData = {
      farmerID: form.farmerID,
      name: form.name,
      age: Number(form.age),
      address: form.address,
      contactNumber: form.contactNumber,
      emailAddress: form.emailAddress,
      beans: cleanedBeans,
    };

    try {
      if (isEditing) {
        await axios.put(
          `${API_URL}/api/farmers/${form.id}`,
          farmerData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          `${API_URL}/api/farmers`,
          farmerData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      fetchFarmers();
      resetForm();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (farmer) => {
    setForm({
      id: farmer.id,
      farmerID: farmer.farmerID,
      name: farmer.name,
      age: farmer.age,
      address: farmer.address,
      contactNumber: farmer.contactNumber,
      emailAddress: farmer.emailAddress,
      beans: farmer.beans || [""],
    });

    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this farmer?")) return;

    try {
      await axios.delete(`${API_URL}/api/farmers/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setFarmers((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Farmer Management</h2>

      {/* form unchanged */}
      <form onSubmit={handleSubmit}>
        <input name="farmerID" value={form.farmerID} onChange={handleChange} />
        <input name="name" value={form.name} onChange={handleChange} />
        <input name="age" value={form.age} onChange={handleChange} />
        <input name="address" value={form.address} onChange={handleChange} />
        <input name="contactNumber" value={form.contactNumber} onChange={handleChange} />
        <input name="emailAddress" value={form.emailAddress} onChange={handleChange} />

        <button type="submit">
          {isEditing ? "Update Farmer" : "Add Farmer"}
        </button>
      </form>
    </div>
  );
}

export default FarmerManagement;