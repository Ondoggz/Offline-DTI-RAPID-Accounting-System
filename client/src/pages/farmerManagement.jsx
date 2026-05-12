import { useEffect, useState } from "react";

function FarmerManagement() {
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

  const fetchData = async () => {
    try {
      const [farmersRes, beansRes] = await Promise.all([
        window.api.getFarmers(),
        window.api.getBeans(),
      ]);

      const farmerList = Array.isArray(farmersRes) ? farmersRes : [];

      setFarmers(
        farmerList.map((f) => ({
          id: f.id,
          farmerID: f.farmerID || "",
          name: f.name || "",
          sex: f.sex || "",
          age: f.age || "",
          residentialAddress: f.residentialAddress || "",
          farmAddress: f.farmAddress || "",
          contactNumber: f.contactNumber || "",
          emailAddress: f.emailAddress || "",
          beans: parseBeans(f.beans),
        }))
      );

      setBeans(Array.isArray(beansRes) ? beansRes : []);
    } catch (err) {
      console.error("FETCH ERROR:", err);
      alert("Failed to load data.");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const parseBeans = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleBeanChange = (index, value) => {
    const updated = [...form.beans];
    updated[index] = value;
    setForm((prev) => ({ ...prev, beans: updated }));
    setErrors((prev) => ({ ...prev, beans: "" }));
  };

  const addBeanField = () => {
    setForm((prev) => ({ ...prev, beans: [...prev.beans, ""] }));
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

    // Farmer ID
    if (!form.farmerID.trim()) {
      newErrors.farmerID = "Farmer ID required";
    }

    // Full name — must have at least 3 words
    if (!form.name.trim()) {
      newErrors.name = "Full name required";
    } else {
      const wordCount = form.name.trim().split(/\s+/).filter(Boolean).length;
      if (wordCount < 3) {
        newErrors.name =
          "Include first name, middle name, and surname. Use N/A if no middle name.";
      }
    }

    // Sex
    if (!form.sex.trim()) {
      newErrors.sex = "Sex required";
    }

    // Age
    if (!form.age || Number(form.age) <= 0) {
      newErrors.age = "Valid age required";
    }

    // Residential address
    if (!form.residentialAddress.trim()) {
      newErrors.residentialAddress = "Residential address required";
    }

    // Farm address
    if (!form.farmAddress.trim()) {
      newErrors.farmAddress = "Farm address required";
    }

    // Contact number — exactly 11 digits
    if (!form.contactNumber.trim()) {
      newErrors.contactNumber = "Contact number required";
    } else if (!/^\d{11}$/.test(form.contactNumber)) {
      newErrors.contactNumber = "Contact number must be exactly 11 digits";
    }

    // Email
    if (!form.emailAddress.trim()) {
      newErrors.emailAddress = "Email required";
    }

    // Beans — at least one selected
    const selectedBeans = form.beans.filter((b) => String(b).trim() !== "");
    if (selectedBeans.length === 0) {
      newErrors.beans = "Select at least one bean";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    // Deduplicate and filter out empty selections
    const uniqueBeans = [...new Set(form.beans.filter((b) => b))];

    const payload = {
      id: isEditing ? form.id : crypto.randomUUID(),
      farmerID: form.farmerID,
      name: form.name,
      sex: form.sex,
      age: Number(form.age),
      residentialAddress: form.residentialAddress,
      farmAddress: form.farmAddress,
      contactNumber: form.contactNumber,
      emailAddress: form.emailAddress,
      beans: uniqueBeans,
    };

    try {
      if (isEditing) {
        await window.api.updateFarmer(payload.id, payload);
      } else {
        await window.api.addFarmer(payload);
      }

      await fetchData();
      resetForm();
    } catch (err) {
      console.error("SAVE ERROR:", err);
      alert("Save failed");
    }
  };

  const handleEdit = (f) => {
    // Filter out any bean IDs that no longer exist in the current beans list
    // (e.g. a bean was deleted after the farmer was created)
    const validBeanIds = Array.isArray(f.beans)
      ? f.beans.filter((beanId) => beans.some((b) => b.id === beanId))
      : [];

    setForm({
      id: f.id,
      farmerID: f.farmerID,
      name: f.name,
      sex: f.sex,
      age: f.age,
      residentialAddress: f.residentialAddress,
      farmAddress: f.farmAddress,
      contactNumber: f.contactNumber,
      emailAddress: f.emailAddress,
      beans: validBeanIds.length ? validBeanIds : [""],
    });

    setErrors({});
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete farmer?")) return;

    try {
      await window.api.deleteFarmer(id);
      setFarmers((prev) => prev.filter((f) => f.id !== id));
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
        style={{ display: "grid", gap: "14px", maxWidth: "700px" }}
      >
        {/* Farmer ID */}
        <div>
          <input
            name="farmerID"
            placeholder="Farmer ID"
            value={form.farmerID}
            onChange={handleChange}
          />
          {errors.farmerID && <div style={bubbleStyle}>{errors.farmerID}</div>}
        </div>

        {/* Full Name */}
        <div>
          <input
            name="name"
            placeholder="Full Name"
            value={form.name}
            onChange={handleChange}
          />
          {errors.name && <div style={bubbleStyle}>{errors.name}</div>}
        </div>

        {/* Sex */}
        <div>
          <select name="sex" value={form.sex} onChange={handleChange}>
            <option value="">Select Sex</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          {errors.sex && <div style={bubbleStyle}>{errors.sex}</div>}
        </div>

        {/* Age */}
        <div>
          <input
            name="age"
            type="number"
            placeholder="Age"
            value={form.age}
            onChange={handleChange}
          />
          {errors.age && <div style={bubbleStyle}>{errors.age}</div>}
        </div>

        {/* Residential Address */}
        <div>
          <input
            name="residentialAddress"
            placeholder="Residential Address"
            value={form.residentialAddress}
            onChange={handleChange}
          />
          {errors.residentialAddress && (
            <div style={bubbleStyle}>{errors.residentialAddress}</div>
          )}
        </div>

        {/* Farm Address */}
        <div>
          <input
            name="farmAddress"
            placeholder="Farm Address"
            value={form.farmAddress}
            onChange={handleChange}
          />
          {errors.farmAddress && (
            <div style={bubbleStyle}>{errors.farmAddress}</div>
          )}
        </div>

        {/* Contact Number — numbers only, max 11 digits */}
        <div>
          <input
            name="contactNumber"
            placeholder="11-digit Contact Number"
            value={form.contactNumber}
            maxLength={11}
            onChange={(e) => {
              const numbersOnly = e.target.value.replace(/\D/g, "");
              setForm((prev) => ({ ...prev, contactNumber: numbersOnly }));
              setErrors((prev) => ({ ...prev, contactNumber: "" }));
            }}
          />
          {errors.contactNumber && (
            <div style={bubbleStyle}>{errors.contactNumber}</div>
          )}
        </div>

        {/* Email */}
        <div>
          <input
            name="emailAddress"
            placeholder="Email"
            value={form.emailAddress}
            onChange={handleChange}
          />
          {errors.emailAddress && (
            <div style={bubbleStyle}>{errors.emailAddress}</div>
          )}
        </div>

        {/* Beans */}
        <div>
          <p>Beans</p>
          {form.beans.map((bean, i) => {
            // Beans already selected in OTHER slots (not this one)
            const otherSelected = form.beans.filter((b, idx) => b && idx !== i);

            return (
            <div
              key={i}
              style={{ display: "flex", gap: "10px", marginBottom: "10px" }}
            >
              <select
                value={bean}
                onChange={(e) => handleBeanChange(i, e.target.value)}
              >
                <option value="">Select bean</option>
                {beans.map((b) => (
                  <option
                    key={b.id}
                    value={b.id}
                    disabled={otherSelected.includes(b.id)}
                  >
                    {b.beanName}
                    {otherSelected.includes(b.id) ? " (already added)" : ""}
                  </option>
                ))}
              </select>

              <button type="button" onClick={addBeanField}>
                +
              </button>

              {form.beans.length > 1 && (
                <button type="button" onClick={() => removeBeanField(i)}>
                  -
                </button>
              )}
            </div>
            );
          })}
          {errors.beans && <div style={bubbleStyle}>{errors.beans}</div>}
        </div>

        <button type="submit">{isEditing ? "Update" : "Add"}</button>

        {isEditing && (
          <button type="button" onClick={resetForm}>
            Cancel
          </button>
        )}
      </form>

      <table border="1" style={{ marginTop: "20px", width: "100%" }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Sex</th>
            <th>Age</th>
            <th>Residential</th>
            <th>Farm</th>
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
                {f.beans
                  ?.map((beanId) => {
                    const bean = beans.find((b) => b.id === beanId);
                    return bean ? bean.beanName : beanId;
                  })
                  .join(", ")}
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