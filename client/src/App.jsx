import { useState } from "react";

function FarmerManagement({ beans }) {
  const [farmers, setFarmers] = useState([
    {
      id: 1,
      name: "Juan Dela Cruz",
      age: 45,
      address: "Bukidnon",
      beans: ["Arabica", "Excelsa"],
    },
    {
      id: 2,
      name: "Maria Santos",
      age: 39,
      address: "Misamis Oriental",
      beans: ["Robusta"],
    },
  ]);

  const [form, setForm] = useState({
    id: null,
    name: "",
    age: "",
    address: "",
    beans: [""],
  });

  const [isEditing, setIsEditing] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleBeanChange = (index, value) => {
    const updatedBeans = [...form.beans];
    updatedBeans[index] = value;
    setForm({ ...form, beans: updatedBeans });
  };

  const addBeanField = () => {
    setForm({ ...form, beans: [...form.beans, ""] });
  };

  const removeBeanField = (index) => {
    const updatedBeans = form.beans.filter((_, i) => i !== index);
    setForm({
      ...form,
      beans: updatedBeans.length > 0 ? updatedBeans : [""],
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const cleanedBeans = form.beans.filter((bean) => bean.trim() !== "");

    if (!form.name || !form.age || !form.address || cleanedBeans.length === 0) {
      alert("Please fill in all fields and select at least one bean type.");
      return;
    }

    const farmerData = {
      ...form,
      age: Number(form.age),
      beans: cleanedBeans,
    };

    if (isEditing) {
      setFarmers((prev) =>
        prev.map((farmer) => (farmer.id === form.id ? farmerData : farmer))
      );
      setIsEditing(false);
    } else {
      const newFarmer = {
        ...farmerData,
        id: Date.now(),
      };
      setFarmers((prev) => [...prev, newFarmer]);
    }

    setForm({
      id: null,
      name: "",
      age: "",
      address: "",
      beans: [""],
    });
  };

  const handleEdit = (farmer) => {
    setForm({
      id: farmer.id,
      name: farmer.name,
      age: farmer.age,
      address: farmer.address,
      beans: farmer.beans?.length ? farmer.beans : [""],
    });
    setIsEditing(true);
  };

  const handleDelete = (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this farmer?");
    if (confirmDelete) {
      setFarmers((prev) => prev.filter((farmer) => farmer.id !== id));
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Farmer Management</h2>

      <form onSubmit={handleSubmit} style={{ marginBottom: "20px" }}>
        <input
          type="text"
          name="name"
          placeholder="Farmer name"
          value={form.name}
          onChange={handleChange}
        />

        <input
          type="number"
          name="age"
          placeholder="Age"
          value={form.age}
          onChange={handleChange}
        />

        <input
          type="text"
          name="address"
          placeholder="Address"
          value={form.address}
          onChange={handleChange}
        />

        <div style={{ margin: "10px 0" }}>
          <p style={{ marginBottom: "8px" }}>Bean Types</p>

          {form.beans.map((bean, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              <select
                value={bean}
                onChange={(e) => handleBeanChange(index, e.target.value)}
              >
                <option value="">Select bean type</option>
                {beans.map((beanItem) => (
                  <option key={beanItem.id} value={beanItem.name}>
                    {beanItem.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={addBeanField}
                style={{
                  width: "32px",
                  height: "32px",
                  fontSize: "18px",
                  cursor: "pointer",
                }}
                title="Add another bean type"
              >
                +
              </button>

              {form.beans.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeBeanField(index)}
                  style={{
                    width: "32px",
                    height: "32px",
                    fontSize: "18px",
                    cursor: "pointer",
                  }}
                  title="Remove bean type"
                >
                  -
                </button>
              )}
            </div>
          ))}
        </div>

        <button type="submit">
          {isEditing ? "Update Farmer" : "Add Farmer"}
        </button>
      </form>

      <table border="1" cellPadding="10" style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Age</th>
            <th>Address</th>
            <th>Bean Types</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {farmers.length > 0 ? (
            farmers.map((farmer) => (
              <tr key={farmer.id}>
                <td>{farmer.name}</td>
                <td>{farmer.age}</td>
                <td>{farmer.address}</td>
                <td>{farmer.beans.join(", ")}</td>
                <td>
                  <button onClick={() => handleEdit(farmer)}>Edit</button>
                  <button onClick={() => handleDelete(farmer.id)}>Delete</button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5">No farmers found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default FarmerManagement;