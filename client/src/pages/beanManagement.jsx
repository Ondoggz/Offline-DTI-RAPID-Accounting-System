import { useEffect, useState } from "react";

function BeanManagement({ beans, setBeans }) {
  const [form, setForm] = useState({
    id: null,
    name: "",
    pricePerUnit: "",
    unit: "",
  });

  const [errors, setErrors] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [modal, setModal] = useState(null);

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
        console.error("Failed to load products:", err);
      }
    };

    fetchBeans();
  }, [setBeans]);

  const resetForm = () => {
    setForm({
      id: null,
      name: "",
      pricePerUnit: "",
      unit: "",
    });
    setErrors({});
    setIsEditing(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const newErrors = {};

    const cleanedName = form.name.trim();
    const cleanedPrice = Number(form.pricePerUnit);
    const cleanedUnit = form.unit.trim();

    if (!cleanedName) {
      newErrors.name = "Product name is required";
    }

    if (!form.pricePerUnit || cleanedPrice <= 0) {
      newErrors.pricePerUnit = "Enter a valid price";
    }

    if (!cleanedUnit) {
      newErrors.unit = "Unit is required";
    }

    const duplicateProduct = beans.find(
      (bean) =>
        bean.id !== form.id &&
        bean.name.trim().toLowerCase() === cleanedName.toLowerCase() &&
        Number(bean.pricePerUnit) === cleanedPrice &&
        bean.unit.trim().toLowerCase() === cleanedUnit.toLowerCase()
    );

    if (duplicateProduct) {
      newErrors.name =
        "Duplicate product already exists with the same name, price, and unit.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const beanData = {
      id: isEditing ? form.id : Date.now().toString(),
      beanName: form.name.trim(),
      pricePerUnit: Number(form.pricePerUnit),
      unit: form.unit.trim(),
    };

    try {
      await window.api.addBean(beanData);

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
      console.error("Failed to save product:", err);
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

  const handleDelete = (id) => {
    setModal({
      type: "confirm",
      message: "Are you sure you want to delete this product?",
      onConfirm: async () => {
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
      },
    });
  };

  const errorStyle = {
    background: "#fff4e5",
    border: "1px solid #f5c26b",
    color: "#8a5700",
    padding: "6px 10px",
    borderRadius: "10px",
    fontSize: "12px",
    marginTop: "5px",
    display: "inline-block",
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Product Management</h2>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gap: "10px",
          marginBottom: "20px",
          maxWidth: "700px",
        }}
      >
        <div>
          <input
            name="name"
            placeholder="Product name"
            value={form.name}
            onChange={handleChange}
          />
          {errors.name && <div style={errorStyle}>{errors.name}</div>}
        </div>

        <div>
          <input
            type="number"
            name="pricePerUnit"
            placeholder="Price"
            value={form.pricePerUnit}
            onChange={handleChange}
          />
          {errors.pricePerUnit && (
            <div style={errorStyle}>{errors.pricePerUnit}</div>
          )}
        </div>

        <div>
          <input
            type="text"
            name="unit"
            placeholder="Unit, e.g. per kg, per piece, per sack"
            value={form.unit}
            onChange={handleChange}
          />
          {errors.unit && <div style={errorStyle}>{errors.unit}</div>}
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button type="submit">
            {isEditing ? "Update Product" : "Add Product"}
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
            <th>Product Name</th>
            <th>Price</th>
            <th>Unit</th>
            <th>Farmers</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {beans.map((bean) => (
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
                <button onClick={() => handleDelete(bean.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {modal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <p>{modal.message}</p>

            {modal.type === "confirm" && (
              <div className="modal-actions">
                <button
                  onClick={() => {
                    modal.onConfirm?.();
                    setModal(null);
                  }}
                >
                  Yes
                </button>

                <button onClick={() => setModal(null)}>Cancel</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default BeanManagement;