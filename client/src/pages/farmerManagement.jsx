import { useEffect, useState } from "react";
import axios from "axios";

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

  /* =========================
     FETCH FARMERS (FIXED)
  ========================= */
  const fetchFarmers = async () => {
    try {
      const res = await axios.get("http://localhost:3000/api/farmers", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setFarmers(
        res.data.map((f) => ({
          id: f._id,

          // 🟢 HANDLE DIFFERENT BACKEND FIELD NAMES
          farmerID: f.farmerID || f.farmerId || f.idNumber || "",
          name: f.name || f.farmerName || "",
          age: f.age || "",
          address: f.address || "",

          contactNumber:
            f.contactNumber || f.contact || f.phoneNumber || "",

          emailAddress: f.emailAddress || f.email || "",

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

  /* =========================
     FORM HANDLING
  ========================= */
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
    setForm({
      ...form,
      beans: updated.length ? updated : [""],
    });
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

  /* =========================
     SUBMIT (CREATE / UPDATE)
  ========================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanedBeans = form.beans.filter((b) => b.trim() !== "");

    if (
      !form.farmerID ||
      !form.name ||
      !form.age ||
      !form.address ||
      !form.contactNumber ||
      !form.emailAddress ||
      cleanedBeans.length === 0
    ) {
      alert("Please complete all fields.");
      return;
    }

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
          `http://localhost:3000/api/farmers/${form.id}`,
          farmerData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          "http://localhost:3000/api/farmers",
          farmerData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      await fetchFarmers();
      resetForm();
    } catch (err) {
      console.error(err);
    }
  };

  /* =========================
     EDIT / DELETE
  ========================= */
  const handleEdit = (farmer) => {
    setForm({
      id: farmer.id,
      farmerID: farmer.farmerID,
      name: farmer.name,
      age: farmer.age,
      address: farmer.address,
      contactNumber: farmer.contactNumber,
      emailAddress: farmer.emailAddress,

      // FIX: ensure IDs only
      beans: farmer.beans?.length
        ? farmer.beans.map((b) => b._id || b.id || b)
        : [""],
    });

    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this farmer?")) return;

    try {
      await axios.delete(`http://localhost:3000/api/farmers/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setFarmers((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  /* =========================
     UI
  ========================= */
  return (
    <div style={{ padding: "20px" }}>
      <h2>Farmer Management</h2>

      <form onSubmit={handleSubmit}>
        <input name="farmerID" placeholder="Farmer ID" value={form.farmerID} onChange={handleChange} />
        <input name="name" placeholder="Name" value={form.name} onChange={handleChange} />
        <input name="age" type="number" placeholder="Age" value={form.age} onChange={handleChange} />
        <input name="address" placeholder="Address" value={form.address} onChange={handleChange} />
        <input name="contactNumber" placeholder="Contact Number" value={form.contactNumber} onChange={handleChange} />
        <input name="emailAddress" placeholder="Email Address" value={form.emailAddress} onChange={handleChange} />

        <div>
          <p>Bean Types</p>

          {form.beans.map((bean, i) => (
            <div key={i}>
              <select value={bean} onChange={(e) => handleBeanChange(i, e.target.value)}>
                <option value="">Select bean type</option>
                {beans.map((b) => (
                  <option key={b._id || b.id} value={b._id || b.id}>
                    {b.beanName || b.name}
                  </option>
                ))}
              </select>

              <button type="button" onClick={addBeanField}>+</button>

              {form.beans.length > 1 && (
                <button type="button" onClick={() => removeBeanField(i)}>-</button>
              )}
            </div>
          ))}
        </div>

        <button type="submit">
          {isEditing ? "Update Farmer" : "Add Farmer"}
        </button>
      </form>

      {/* TABLE */}
      <table border="1" style={{ width: "100%", marginTop: "20px" }}>
        <thead>
          <tr>
            <th>Farmer ID</th>
            <th>Name</th>
            <th>Age</th>
            <th>Address</th>
            <th>Contact</th>
            <th>Email</th>
            <th>Beans</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {farmers.map((f) => (
            <tr key={f.id}>
              <td>{f.farmerID || "-"}</td>
              <td>{f.name || "-"}</td>
              <td>{f.age || "-"}</td>
              <td>{f.address || "-"}</td>
              <td>{f.contactNumber || "-"}</td>
              <td>{f.emailAddress || "-"}</td>

              {/* FIXED BEANS DISPLAY */}
              <td>
                {f.beans?.length
                  ? f.beans.map((b) => b.beanName || b.name || b).join(", ")
                  : "-"}
              </td>

              <td>
                <button onClick={() => handleEdit(f)}>Edit</button>
                <button onClick={() => handleDelete(f.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default FarmerManagement;