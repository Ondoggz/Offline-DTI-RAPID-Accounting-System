import { useEffect, useState } from "react";
import axios from "axios";

function BeanManagement({ beans, setBeans }) {
  const [form, setForm] = useState({
    id: null,
    name: "",
    pricePerUnit: "",
    unit: "kg",
  });

  const [isEditing, setIsEditing] = useState(false);

  const token = localStorage.getItem("token");

  // 🔄 LOAD FROM BACKEND (with reverse farmers)
  useEffect(() => {
    const fetchBeans = async () => {
      try {
        const res = await axios.get("http://localhost:3000/api/beans", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const mapped = res.data.map((bean) => ({
          id: bean._id,
          name: bean.beanName,
          pricePerUnit: bean.pricePerUnit,
          unit: bean.unit,
          farmers: bean.farmers || [], // from reverse query
        }));

        setBeans(mapped);
      } catch (err) {
        console.error(err);
      }
    };

    fetchBeans();
  }, []);

  const resetForm = () => {
    setForm({
      id: null,
      name: "",
      pricePerUnit: "",
      unit: "kg",
    });
    setIsEditing(false);
  };

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // 🔥 CREATE / UPDATE
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim() || !form.pricePerUnit || !form.unit.trim()) {
      alert("Please fill in bean name, price per unit, and unit.");
      return;
    }

    const beanData = {
      beanName: form.name.trim(),
      pricePerUnit: Number(form.pricePerUnit),
      unit: form.unit.trim(),
    };

    try {
      if (isEditing) {
        await axios.put(
          `http://localhost:3000/api/beans/${form.id}`,
          beanData,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      } else {
        await axios.post(
          "http://localhost:3000/api/beans",
          beanData,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }

      // refresh
      const res = await axios.get("http://localhost:3000/api/beans", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setBeans(
        res.data.map((bean) => ({
          id: bean._id,
          name: bean.beanName,
          pricePerUnit: bean.pricePerUnit,
          unit: bean.unit,
          farmers: bean.farmers || [],
        }))
      );

      resetForm();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (bean) => {
    setForm({
      id: bean.id,
      name: bean.name,
      pricePerUnit: bean.pricePerUnit,
      unit: bean.unit,
    });

    setIsEditing(true);
  };

  // 🔥 DELETE
  const handleDelete = async (id) => {
    const confirmed = window.confirm("Are you sure you want to delete this bean?");
    if (!confirmed) return;

    try {
      await axios.delete(`http://localhost:3000/api/beans/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setBeans((prev) => prev.filter((bean) => bean.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Bean Management</h2>

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gap: "10px",
          marginBottom: "20px",
          maxWidth: "700px",
        }}
      >
        <input
          type="text"
          name="name"
          placeholder="Bean name"
          value={form.name}
          onChange={handleChange}
        />

        <input
          type="number"
          name="pricePerUnit"
          placeholder="Price per unit"
          value={form.pricePerUnit}
          onChange={handleChange}
        />

        <input
          type="text"
          name="unit"
          placeholder="Unit"
          value={form.unit}
          onChange={handleChange}
        />

        <div style={{ display: "flex", gap: "10px" }}>
          <button type="submit">
            {isEditing ? "Update Bean" : "Add Bean"}
          </button>

          {isEditing && (
            <button type="button" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* TABLE */}
      <table border="1" cellPadding="10" style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>Bean Name</th>
            <th>Price Per Unit</th>
            <th>Unit</th>
            <th>Farmers</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {beans.length > 0 ? (
            beans.map((bean) => (
              <tr key={bean.id}>
                <td>{bean.name}</td>
                <td>{bean.pricePerUnit}</td>
                <td>{bean.unit}</td>

                {/* 🔥 reverse query result */}
                <td>
                  {bean.farmers.length
                    ? bean.farmers.map((f) => f.name).join(", ")
                    : "No farmers"}
                </td>

                <td>
                  <button onClick={() => handleEdit(bean)}>Edit</button>{" "}
                  <button onClick={() => handleDelete(bean.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5">No beans found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default BeanManagement;