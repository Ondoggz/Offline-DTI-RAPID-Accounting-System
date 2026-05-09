import { useEffect, useState } from "react";
import axios from "axios";

function FarmerManagement({ beans = [] }) {
  const API = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("token");

  const [farmers, setFarmers] = useState([]);
  const [isEditing, setIsEditing] = useState(false);

  const initialForm = {
    id: null,
    farmerID: "",
    name: "",
    sex: "",
    age: "",
    homeAddress: "",
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

  const normalizedBeans = beans
    .map((b) => ({
      _id: b._id || b.id,
      beanName: b.beanName || b.name,
    }))
    .filter((b) => b._id && b.beanName);

  /* =========================
     FETCH FARMERS
  ========================= */
  const fetchFarmers = async () => {
    try {
      const res = await axios.get(
        `${API}/api/farmers`,
        authHeaders
      );

      const farmerList = Array.isArray(res.data)
        ? res.data
        : res.data.data || [];

      setFarmers(
        farmerList.map((f) => ({
          id: f._id,
          farmerID: f.farmerID || "",
          name: f.name || "",
          sex: f.sex || "",
          age: f.age || "",
          homeAddress: f.homeAddress || "",
          farmAddress: f.farmAddress || "",
          contactNumber: f.contactNumber || "",
          emailAddress: f.emailAddress || "",
          beans: Array.isArray(f.beans) ? f.beans : [],
        }))
      );
    } catch (err) {
      console.error(
        "FETCH FARMERS ERROR:",
        err.response?.data || err.message
      );

      alert(
        err.response?.data?.message ||
          "Failed to fetch farmers."
      );
    }
  };

  useEffect(() => {
    if (API && token) fetchFarmers();
  }, [API, token]);

  /* =========================
     FORM HANDLERS
  ========================= */
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleBeanChange = (index, value) => {
    const updatedBeans = [...form.beans];
    updatedBeans[index] = value;

    setForm((prev) => ({
      ...prev,
      beans: updatedBeans,
    }));
  };

  const addBeanField = () => {
    setForm((prev) => ({
      ...prev,
      beans: [...prev.beans, ""],
    }));
  };

  const removeBeanField = (index) => {
    const updatedBeans = form.beans.filter(
      (_, i) => i !== index
    );

    setForm((prev) => ({
      ...prev,
      beans: updatedBeans.length
        ? updatedBeans
        : [""],
    }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setIsEditing(false);
  };

  /* =========================
     VALIDATION
  ========================= */
  const validateForm = () => {
    const selectedBeans = form.beans.filter(
      (b) => String(b).trim() !== ""
    );

    if (!form.farmerID.trim())
      return "Farmer ID is required.";

    if (!form.name.trim())
      return "Name is required.";

    if (!form.sex.trim())
      return "Sex is required.";

    if (!form.age || Number(form.age) <= 0)
      return "Valid age is required.";

    if (!form.homeAddress.trim())
      return "Home address is required.";

    if (!form.farmAddress.trim())
      return "Farm address is required.";

    if (!form.contactNumber.trim())
      return "Contact number is required.";

    if (!form.emailAddress.trim())
      return "Email address is required.";

    if (selectedBeans.length === 0)
      return "Please select at least one bean type.";

    const invalidBean = selectedBeans.find(
      (beanId) => !isMongoId(beanId)
    );

    if (invalidBean)
      return "Invalid bean selected.";

    return null;
  };

  /* =========================
     SUBMIT
  ========================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const errorMessage = validateForm();

    if (errorMessage) {
      alert(errorMessage);
      return;
    }

    const cleanedBeans = form.beans
      .map((b) => String(b).trim())
      .filter((b) => isMongoId(b));

    const farmerData = {
      farmerID: form.farmerID.trim(),
      name: form.name.trim(),
      sex: form.sex.trim(),
      age: Number(form.age),

      homeAddress: form.homeAddress.trim(),
      farmAddress: form.farmAddress.trim(),

      contactNumber: form.contactNumber.trim(),
      emailAddress: form.emailAddress.trim(),

      beans: cleanedBeans,
    };

    console.log("FARMER PAYLOAD:", farmerData);

    try {
      if (isEditing) {
        await axios.put(
          `${API}/api/farmers/${form.id}`,
          farmerData,
          authHeaders
        );
      } else {
        await axios.post(
          `${API}/api/farmers`,
          farmerData,
          authHeaders
        );
      }

      await fetchFarmers();
      resetForm();
    } catch (err) {
      console.error("SAVE FARMER ERROR:", err);

      console.log(
        "BACKEND RESPONSE:",
        err.response?.data
      );

      alert(
        err.response?.data?.message ||
          "Failed to save farmer."
      );
    }
  };

  /* =========================
     EDIT
  ========================= */
  const handleEdit = (farmer) => {
    setForm({
      id: farmer.id,

      farmerID: farmer.farmerID || "",
      name: farmer.name || "",
      sex: farmer.sex || "",
      age: farmer.age || "",

      homeAddress: farmer.homeAddress || "",
      farmAddress: farmer.farmAddress || "",

      contactNumber: farmer.contactNumber || "",
      emailAddress: farmer.emailAddress || "",

      beans:
        farmer.beans?.length > 0
          ? farmer.beans
              .map((b) => b._id || b.id || "")
              .filter(Boolean)
          : [""],
    });

    setIsEditing(true);
  };

  /* =========================
     DELETE
  ========================= */
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this farmer?"))
      return;

    try {
      await axios.delete(
        `${API}/api/farmers/${id}`,
        authHeaders
      );

      setFarmers((prev) =>
        prev.filter((f) => f.id !== id)
      );
    } catch (err) {
      console.error(
        "DELETE FARMER ERROR:",
        err.response?.data || err.message
      );

      alert(
        err.response?.data?.message ||
          "Failed to delete farmer."
      );
    }
  };

  /* =========================
     UI
  ========================= */
  return (
    <div style={{ padding: "20px" }}>
      <h2>Farmer Management</h2>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gap: "10px",
          maxWidth: "700px",
        }}
      >
        <input
          name="farmerID"
          placeholder="Farmer ID"
          value={form.farmerID}
          onChange={handleChange}
        />

        <input
          name="name"
          placeholder="Full Name"
          value={form.name}
          onChange={handleChange}
        />

        <select
          name="sex"
          value={form.sex}
          onChange={handleChange}
        >
          <option value="">Select Sex</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>

        <input
          name="age"
          type="number"
          placeholder="Age"
          value={form.age}
          onChange={handleChange}
        />

        <input
          name="homeAddress"
          placeholder="Home Address"
          value={form.homeAddress}
          onChange={handleChange}
        />

        <input
          name="farmAddress"
          placeholder="Farm Address"
          value={form.farmAddress}
          onChange={handleChange}
        />

        <input
          name="contactNumber"
          placeholder="Contact Number"
          value={form.contactNumber}
          onChange={handleChange}
        />

        <input
          name="emailAddress"
          type="email"
          placeholder="Email Address"
          value={form.emailAddress}
          onChange={handleChange}
        />

        {/* BEANS */}
        <div>
          <p>Bean Types</p>

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
                <option value="">
                  Select bean type
                </option>

                {normalizedBeans.map((b) => (
                  <option
                    key={b._id}
                    value={b._id}
                  >
                    {b.beanName}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={addBeanField}
              >
                +
              </button>

              {form.beans.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    removeBeanField(i)
                  }
                >
                  -
                </button>
              )}
            </div>
          ))}
        </div>

        <button type="submit">
          {isEditing
            ? "Update Farmer"
            : "Add Farmer"}
        </button>

        {isEditing && (
          <button
            type="button"
            onClick={resetForm}
          >
            Cancel Edit
          </button>
        )}
      </form>

      {/* TABLE */}
      <table
        border="1"
        style={{
          marginTop: "20px",
          width: "100%",
          borderCollapse: "collapse",
        }}
      >
        <thead>
          <tr>
            <th>Farmer ID</th>
            <th>Name</th>
            <th>Sex</th>
            <th>Age</th>
            <th>Home Address</th>
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
              <td>{f.farmerID || "-"}</td>
              <td>{f.name || "-"}</td>
              <td>{f.sex || "-"}</td>
              <td>{f.age || "-"}</td>
              <td>{f.homeAddress || "-"}</td>
              <td>{f.farmAddress || "-"}</td>
              <td>{f.contactNumber || "-"}</td>
              <td>{f.emailAddress || "-"}</td>

              <td>
                {f.beans?.length
                  ? f.beans
                      .map(
                        (b) =>
                          b.beanName ||
                          b.name ||
                          ""
                      )
                      .filter(Boolean)
                      .join(", ")
                  : "-"}
              </td>

              <td>
                <button
                  type="button"
                  onClick={() => handleEdit(f)}
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleDelete(f.id)
                  }
                >
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