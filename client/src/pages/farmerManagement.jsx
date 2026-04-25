import { useEffect, useState } from "react";
import axios from "axios";

function FarmerManagement({ beans = [] }) {
  const [farmers, setFarmers] = useState([]);

  const [form, setForm] = useState({
    id: null,
    name: "",
    age: "",
    address: "",
    beans: [""], // stores bean IDs now
  });

  const [isEditing, setIsEditing] = useState(false);

  const token = localStorage.getItem("token");

  // 🔄 LOAD FARMERS (POPULATED FROM BACKEND)
  useEffect(() => {
    const fetchFarmers = async () => {
      try {
        const res = await axios.get("http://localhost:3000/api/farmers", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setFarmers(
          res.data.map((f) => ({
            id: f._id,
            name: f.name,
            age: f.age,
            address: f.address,
            beans: f.beans || [], // populated objects
          }))
        );
      } catch (err) {
        console.error(err);
      }
    };

    fetchFarmers();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // 🔥 STORE BEAN IDs (IMPORTANT CHANGE)
  const handleBeanChange = (index, value) => {
    const updatedBeans = [...form.beans];
    updatedBeans[index] = value; // now storing ObjectId
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

  // 🔥 CREATE / UPDATE (NOW SENDING OBJECTIDS)
  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanedBeans = form.beans.filter((bean) => bean.trim() !== "");

    if (!form.name || !form.age || !form.address || cleanedBeans.length === 0) {
      alert("Please fill in all fields and select at least one bean type.");
      return;
    }

    const farmerData = {
      name: form.name,
      age: Number(form.age),
      address: form.address,
      beans: cleanedBeans, // ObjectIds now
    };

    try {
      if (isEditing) {
        await axios.put(
          `http://localhost:3000/api/farmers/${form.id}`,
          farmerData,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      } else {
        await axios.post(
          "http://localhost:3000/api/farmers",
          farmerData,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }

      // refresh
      const res = await axios.get("http://localhost:3000/api/farmers", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setFarmers(
        res.data.map((f) => ({
          id: f._id,
          name: f.name,
          age: f.age,
          address: f.address,
          beans: f.beans || [],
        }))
      );

      setForm({
        id: null,
        name: "",
        age: "",
        address: "",
        beans: [""],
      });

      setIsEditing(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (farmer) => {
    setForm({
      id: farmer.id,
      name: farmer.name,
      age: farmer.age,
      address: farmer.address,

      // convert populated beans → IDs
      beans: farmer.beans?.length
        ? farmer.beans.map((b) => b._id)
        : [""],
    });

    setIsEditing(true);
  };

  // ❌ DELETE
  const handleDelete = async (id) => {
    if (window.confirm("Delete this farmer?")) {
      try {
        await axios.delete(
          `http://localhost:3000/api/farmers/${id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setFarmers((prev) => prev.filter((f) => f.id !== id));
      } catch (err) {
        console.error(err);
      }
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
          <p>Bean Types</p>

          {form.beans.map((bean, index) => (
            <div key={index} style={{ display: "flex", gap: "8px" }}>
              <select
                value={bean}
                onChange={(e) => handleBeanChange(index, e.target.value)}
              >
                <option value="">Select bean type</option>

                {/* now uses real IDs */}
                {beans.map((b) => (
                  <option key={b._id || b.id} value={b._id || b.id}>
                    {b.beanName || b.name}
                  </option>
                ))}
              </select>

              <button type="button" onClick={addBeanField}>+</button>

              {form.beans.length > 1 && (
                <button type="button" onClick={() => removeBeanField(index)}>
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
            <th>Beans</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {farmers.map((f) => (
            <tr key={f.id}>
              <td>{f.name}</td>
              <td>{f.age}</td>
              <td>{f.address}</td>

              {/* populated beans */}
              <td>
                {f.beans.map((b) => b.beanName || b.name).join(", ")}
              </td>

              <td>
                <button onClick={() => handleEdit(f)}>Edit</button>
                <button onClick={() => handleDelete(f.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default FarmerManagement;