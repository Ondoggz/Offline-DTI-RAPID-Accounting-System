import { useEffect, useState } from "react";

function BeanManagement({ beans, setBeans }) {
  const [form, setForm] = useState({
    id: null,
    name: "",
    pricePerUnit: "",
    unit: "kg",
  });

  const [isEditing, setIsEditing] = useState(false);

  // 🔄 LOAD FROM LOCAL SQLITE (IPC)
  useEffect(() => {
    const fetchBeans = async () => {
      try {
        const data = await window.api.getBeans();

        const mapped = data.map((bean) => ({
          id: bean.id,
          name: bean.beanName,
          pricePerUnit: bean.pricePerUnit,
          unit: bean.unit,
          farmers: Array.isArray(bean.farmers) ? bean.farmers : [],
        }));

        setBeans(mapped);
      } catch (err) {
        console.error("Failed to load beans:", err);
      }
    };

    fetchBeans();
  }, [setBeans]);

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

  // 🔥 CREATE / UPDATE (LOCAL IPC)
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim() || !form.pricePerUnit || !form.unit.trim()) {
      alert("Please fill in bean name, price per unit, and unit.");
      return;
    }

    const beanData = {
      id: isEditing ? form.id : Date.now().toString(),
      beanName: form.name.trim(),
      pricePerUnit: Number(form.pricePerUnit),
      unit: form.unit.trim(),
    };

    try {
      if (isEditing) {
        await window.api.addBean(beanData); // same function handles overwrite in your DB
      } else {
        await window.api.addBean(beanData);
      }

      const data = await window.api.getBeans();

      setBeans(
        data.map((bean) => ({
          id: bean.id,
          name: bean.beanName,
          pricePerUnit: bean.pricePerUnit,
          unit: bean.unit,
          farmers: Array.isArray(bean.farmers) ? bean.farmers : [],
        }))
      );

      resetForm();
    } catch (err) {
      console.error("Failed to save bean:", err);
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

  // 🔥 DELETE (LOCAL IPC - you will need db.deleteBean later)
  const handleDelete = async (id) => {
    const confirmed = window.confirm("Are you sure you want to delete this bean?");
    if (!confirmed) return;

    try {
      await window.api.deleteBean(id);

      const updated = await window.api.getBeans();

      setBeans(
        updated.map((bean) => ({
          id: bean.id,
          name: bean.beanName,
          pricePerUnit: bean.pricePerUnit,
          unit: bean.unit,
          farmers: Array.isArray(bean.farmers) ? bean.farmers : [],
        }))
      );
    } catch (err) {
      console.error("Delete failed:", err);
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
                <td>
                  {Array.isArray(bean.farmers) && bean.farmers.length > 0
                    ? bean.farmers.map((f) => f.name || f).join(", ")
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