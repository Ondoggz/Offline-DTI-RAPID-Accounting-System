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

    if (!form.farmerID.trim()) newErrors.farmerID = "Required";
    if (!form.name.trim()) newErrors.name = "Required";
    if (!form.sex.trim()) newErrors.sex = "Required";
    if (!form.age || Number(form.age) <= 0) newErrors.age = "Invalid age";

    if (!form.residentialAddress.trim())
      newErrors.residentialAddress = "Required";

    if (!form.farmAddress.trim())
      newErrors.farmAddress = "Required";

    if (!form.contactNumber.trim())
      newErrors.contactNumber = "Required";

    if (!form.emailAddress.trim())
      newErrors.emailAddress = "Required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

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
      beans: form.beans.filter((b) => b),
    };

    try {
      await window.api.addFarmer(payload);

      await fetchData();
      resetForm();
    } catch (err) {
      console.error("SAVE ERROR:", err);
      alert("Save failed");
    }
  };

  const handleEdit = (f) => {
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
      beans: Array.isArray(f.beans) ? f.beans : [],
    });

    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete farmer?")) return;

    try {
      await window.api.deleteFarmer?.(id);
      setFarmers((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      console.error(err);
      alert("Delete failed");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Farmer Management</h2>

      <form
        onSubmit={handleSubmit}
        style={{ display: "grid", gap: "14px", maxWidth: "700px" }}
      >
        <input
          name="farmerID"
          value={form.farmerID}
          onChange={handleChange}
          placeholder="Farmer ID"
        />
        {errors.farmerID && <p>{errors.farmerID}</p>}

        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Full Name"
        />
        {errors.name && <p>{errors.name}</p>}

        <select name="sex" value={form.sex} onChange={handleChange}>
          <option value="">Select Sex</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>

        <input
          name="age"
          value={form.age}
          onChange={handleChange}
          placeholder="Age"
        />

        <input
          name="residentialAddress"
          value={form.residentialAddress}
          onChange={handleChange}
          placeholder="Residential Address"
        />

        <input
          name="farmAddress"
          value={form.farmAddress}
          onChange={handleChange}
          placeholder="Farm Address"
        />

        <input
          name="contactNumber"
          value={form.contactNumber}
          onChange={handleChange}
          placeholder="Contact Number"
        />

        <input
          name="emailAddress"
          value={form.emailAddress}
          onChange={handleChange}
          placeholder="Email"
        />

        <div>
          <p>Beans</p>

          {form.beans.map((bean, i) => (
            <div key={i} style={{ display: "flex", gap: "10px" }}>
              <select
                value={bean}
                onChange={(e) => handleBeanChange(i, e.target.value)}
              >
                <option value="">Select bean</option>
                {beans.map((b) => (
                  <option key={b.id} value={b.id}>
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
        </div>

        <button type="submit">
          {isEditing ? "Update" : "Add"}
        </button>
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