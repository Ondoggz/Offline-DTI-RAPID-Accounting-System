import { useEffect, useState } from "react";
import axios from "axios";

function FarmerManagement() {
  const API = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("token");

  const [farmers, setFarmers] = useState([]);
  const [beans, setBeans] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState({});

  const initialForm = {
    id: null,
    farmerID: "",
    name: "",
    sex: "",
    age: "",
    residentialAddress: "",
    farmAddress: "",
    contactNumber: "",
    emailAddress: "",
    beans: [""],
  };

  const [form, setForm] = useState(initialForm);

  const authHeaders = {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };

  const isMongoId = (val) =>
    /^[0-9a-fA-F]{24}$/.test(String(val));

  const fetchData = async () => {
    try {
      const [farmersRes, beansRes] = await Promise.all([
        axios.get(`${API}/api/farmers`, authHeaders),
        axios.get(`${API}/api/beans`, authHeaders),
      ]);

      const farmerList = Array.isArray(farmersRes.data)
        ? farmersRes.data
        : farmersRes.data.data || [];

      setFarmers(
        farmerList.map((f) => ({
          id: f._id,
          farmerID: f.farmerID || "",
          name: f.name || "",
          sex: f.sex || "",
          age: f.age || "",
          residentialAddress: f.residentialAddress || "",
          farmAddress: f.farmAddress || "",
          contactNumber: f.contactNumber || "",
          emailAddress: f.emailAddress || "",
          beans: Array.isArray(f.beans) ? f.beans : [],
        }))
      );

      setBeans(beansRes.data || []);
    } catch (err) {
      console.error("FETCH ERROR:", err);
      alert("Failed to load data.");
    }
  };

  useEffect(() => {
    if (API && token) fetchData();
  }, [API, token]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const handleBeanChange = (index, value) => {
    const updated = [...form.beans];
    updated[index] = value;

    setForm((prev) => ({ ...prev, beans: updated }));

    setErrors((prev) => ({
      ...prev,
      beans: "",
    }));
  };

  const addBeanField = () => {
    setForm((prev) => ({
      ...prev,
      beans: [...prev.beans, ""],
    }));
  };

  const removeBeanField = (index) => {
    const updated = form.beans.filter((_, i) => i !== index);

    setForm((prev) => ({
      ...prev,
      beans: updated.length ? updated : [""],
    }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setErrors({});
    setIsEditing(false);
  };

  const validateForm = () => {
    const newErrors = {};

    const selectedBeans = form.beans.filter(
      (b) => String(b).trim() !== ""
    );

    if (!form.farmerID.trim()) {
      newErrors.farmerID = "Farmer ID required";
    }

    if (!form.name.trim()) {
      newErrors.name = "Full name required";
    } else {
      const wordCount = form.name
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;

      if (wordCount < 3) {
        newErrors.name =
          "Include first name, middle name, and surname. Use N/A if none.";
      }
    }

    if (!form.sex.trim()) {
      newErrors.sex = "Sex required";
    }

    if (!form.age || Number(form.age) <= 0) {
      newErrors.age = "Valid age required";
    }

    if (!form.residentialAddress.trim()) {
      newErrors.residentialAddress =
        "Residential address required";
    }

    if (!form.farmAddress.trim()) {
      newErrors.farmAddress = "Farm address required";
    }

    if (!form.contactNumber.trim()) {
      newErrors.contactNumber = "Contact number required";
    } else if (!/^\d{11}$/.test(form.contactNumber)) {
      newErrors.contactNumber =
        "Contact number must be exactly 11 digits";
    }

    if (!form.emailAddress.trim()) {
      newErrors.emailAddress = "Email required";
    }

    if (selectedBeans.length === 0) {
      newErrors.beans = "Select at least one bean";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const valid = validateForm();

    if (!valid) return;

    const cleanedBeans = form.beans
      .map((b) => String(b).trim())
      .filter((b) => isMongoId(b));

    const payload = {
      farmerID: form.farmerID,
      name: form.name,
      sex: form.sex,
      age: Number(form.age),
      residentialAddress: form.residentialAddress,
      farmAddress: form.farmAddress,
      contactNumber: form.contactNumber,
      emailAddress: form.emailAddress,
      beans: cleanedBeans,
    };

    try {
      if (isEditing) {
        await axios.put(
          `${API}/api/farmers/${form.id}`,
          payload,
          authHeaders
        );
      } else {
        await axios.post(
          `${API}/api/farmers`,
          payload,
          authHeaders
        );
      }

      await fetchData();
      resetForm();
    } catch (err) {
      console.error(err);
      alert("Save failed");
    }
  };

  const handleEdit = (f) => {
    setForm({
      id: f.id,
      farmerID: f.farmerID || "",
      name: f.name || "",
      sex: f.sex || "",
      age: f.age || "",
      residentialAddress: f.residentialAddress || "",
      farmAddress: f.farmAddress || "",
      contactNumber: f.contactNumber || "",
      emailAddress: f.emailAddress || "",
      beans:
        f.beans?.length
          ? f.beans.map((b) => b._id || "")
          : [""],
    });

    setErrors({});
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete farmer?")) return;

    try {
      await axios.delete(
        `${API}/api/farmers/${id}`,
        authHeaders
      );

      setFarmers((prev) =>
        prev.filter((f) => f.id !== id)
      );
    } catch (err) {
      console.error(err);
      alert("Delete failed");
    }
  };

  const bubbleStyle = {
    background: "#fff4e5",
    border: "1px solid #f5c26b",
    color: "#8a5700",
    padding: "6px 10px",
    borderRadius: "12px",
    fontSize: "12px",
    marginTop: "4px",
    display: "inline-block",
    maxWidth: "400px",
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Farmer Management</h2>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gap: "14px",
          maxWidth: "700px",
        }}
      >
        <div>
          <input
            name="farmerID"
            placeholder="Farmer ID"
            value={form.farmerID}
            onChange={handleChange}
          />

          {errors.farmerID && (
            <div style={bubbleStyle}>
              {errors.farmerID}
            </div>
          )}
        </div>

        <div>
          <input
            name="name"
            placeholder="Full Name"
            value={form.name}
            onChange={handleChange}
          />

          <div style={bubbleStyle}>
            Include middle name. Use N/A if none.
          </div>

          {errors.name && (
            <div style={bubbleStyle}>
              {errors.name}
            </div>
          )}
        </div>

        <div>
          <select
            name="sex"
            value={form.sex}
            onChange={handleChange}
          >
            <option value="">Select Sex</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>

          {errors.sex && (
            <div style={bubbleStyle}>
              {errors.sex}
            </div>
          )}
        </div>

        <div>
          <input
            name="age"
            type="number"
            placeholder="Age"
            value={form.age}
            onChange={handleChange}
          />

          {errors.age && (
            <div style={bubbleStyle}>
              {errors.age}
            </div>
          )}
        </div>

        <div>
          <input
            name="residentialAddress"
            placeholder="Residential Address"
            value={form.residentialAddress}
            onChange={handleChange}
          />

          {errors.residentialAddress && (
            <div style={bubbleStyle}>
              {errors.residentialAddress}
            </div>
          )}
        </div>

        <div>
          <input
            name="farmAddress"
            placeholder="Farm Address"
            value={form.farmAddress}
            onChange={handleChange}
          />

          {errors.farmAddress && (
            <div style={bubbleStyle}>
              {errors.farmAddress}
            </div>
          )}
        </div>

        <div>
          <input
            name="contactNumber"
            placeholder="11-digit Contact Number"
            value={form.contactNumber}
            maxLength={11}
            onChange={(e) => {
              const numbersOnly = e.target.value.replace(/\D/g, "");

              setForm((prev) => ({
                ...prev,
                contactNumber: numbersOnly,
              }));

              setErrors((prev) => ({
                ...prev,
                contactNumber: "",
              }));
            }}
          />

          {errors.contactNumber && (
            <div style={bubbleStyle}>
              {errors.contactNumber}
            </div>
          )}
        </div>

        <div>
          <input
            name="emailAddress"
            placeholder="Email"
            value={form.emailAddress}
            onChange={handleChange}
          />

          {errors.emailAddress && (
            <div style={bubbleStyle}>
              {errors.emailAddress}
            </div>
          )}
        </div>

        <div>
          <p>Beans</p>

          {form.beans.map((bean, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: "10px",
                marginBottom: "10px",
              }}
            >
              <select
                value={bean}
                onChange={(e) =>
                  handleBeanChange(i, e.target.value)
                }
              >
                <option value="">Select bean</option>

                {beans.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.beanName}
                  </option>
                ))}
              </select>

              <button type="button" onClick={addBeanField}>
                +
              </button>

              {form.beans.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeBeanField(i)}
                >
                  -
                </button>
              )}
            </div>
          ))}

          {errors.beans && (
            <div style={bubbleStyle}>
              {errors.beans}
            </div>
          )}
        </div>

        <button type="submit">
          {isEditing ? "Update" : "Add"}
        </button>
      </form>

      <table
        border="1"
        style={{
          marginTop: "20px",
          width: "100%",
        }}
      >
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Sex</th>
            <th>Age</th>
            <th>Residential Address</th>
            <th>Farm Address</th>
            <th>Contact</th>
            <th>Email</th>
            <th>Beans</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {farmers.map((f) => (
            <tr key={f.id}>
              <td>{f.farmerID}</td>
              <td>{f.name}</td>
              <td>{f.sex}</td>
              <td>{f.age}</td>
              <td>{f.residentialAddress}</td>
              <td>{f.farmAddress}</td>
              <td>{f.contactNumber}</td>
              <td>{f.emailAddress}</td>

              <td>
                {f.beans?.map((b) => b.beanName).join(", ")}
              </td>

              <td>
                <button onClick={() => handleEdit(f)}>
                  Edit
                </button>

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