import { useState } from "react";

function BeanManagement() {
  const [beans, setBeans] = useState([
    {
      id: 1,
      name: "Mongo Beans",
      pricePerUnit: 120,
      unit: "kg",
      farmers: ["Juan Dela Cruz", "Maria Santos"],
    },
    {
      id: 2,
      name: "Arabica Beans",
      pricePerUnit: 180,
      unit: "kg",
      farmers: ["Pedro Reyes"],
    },
  ]);

  const [form, setForm] = useState({
    id: null,
    name: "",
    pricePerUnit: "",
    unit: "kg",
    farmers: "",
  });

  const [isEditing, setIsEditing] = useState(false);

  const resetForm = () => {
    setForm({
      id: null,
      name: "",
      pricePerUnit: "",
      unit: "kg",
      farmers: "",
    });
    setIsEditing(false);
  };

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.name.trim() || !form.pricePerUnit || !form.unit.trim()) {
      alert("Please fill in bean name, price per unit, and unit.");
      return;
    }

    const parsedFarmers = form.farmers
      .split(",")
      .map((farmer) => farmer.trim())
      .filter(Boolean);

    const beanData = {
      id: isEditing ? form.id : Date.now(),
      name: form.name.trim(),
      pricePerUnit: Number(form.pricePerUnit),
      unit: form.unit.trim(),
      farmers: parsedFarmers,
    };

    if (isEditing) {
      setBeans((prev) =>
        prev.map((bean) => (bean.id === form.id ? beanData : bean))
      );
    } else {
      setBeans((prev) => [...prev, beanData]);
    }

    resetForm();
  };

  const handleEdit = (bean) => {
    setForm({
      id: bean.id,
      name: bean.name,
      pricePerUnit: bean.pricePerUnit,
      unit: bean.unit,
      farmers: bean.farmers.join(", "),
    });
    setIsEditing(true);
  };

  const handleDelete = (id) => {
    const confirmed = window.confirm("Are you sure you want to delete this bean?");
    if (!confirmed) return;

    setBeans((prev) => prev.filter((bean) => bean.id !== id));
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Bean Management</h2>

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
          placeholder="Unit (kg, sack, box, etc.)"
          value={form.unit}
          onChange={handleChange}
        />

        <input
          type="text"
          name="farmers"
          placeholder="Farmers (comma-separated)"
          value={form.farmers}
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
                <td>
                  {bean.farmers.length > 0
                    ? bean.farmers.join(", ")
                    : "No farmers listed"}
                </td>
                <td>
                  <button onClick={() => handleEdit(bean)}>Edit</button>{" "}
                  <button onClick={() => handleDelete(bean.id)}>Delete</button>
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