import { useEffect, useState } from "react";
import "./delivery.css";

function DeliveryEntry() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [showForm, setShowForm] = useState(false);
  const [deliveries, setDeliveries] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [beans, setBeans] = useState([]);
  const [file, setFile] = useState(null);

  // 🔥 DELETE MODAL STATE (ONLY ADDITION)
  const [deleteId, setDeleteId] = useState(null);
  const [deletePassword, setDeletePassword] = useState("");

  const getRecordedBy = () => {
    if (user?.name && user?.position)
      return `${user.name} (${user.position})`;
    return user?.name || user?.username || "Unknown User";
  };

  const emptyForm = {
    farmer: "",
    farmerContact: "",
    beanType: "",
    courier: "",
    date: "",
    deliveryGuy: "",
    consignee: "",
    deliveryGuyContact: "",
    consigneeContact: "",
    recordedBy: getRecordedBy(),
    volume: "",
  };

  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    try {
      const [dRes, fRes, bRes] = await Promise.all([
        window.api.getDeliveries(),
        window.api.getFarmers(),
        window.api.getBeans(),
      ]);

      const safeDeliveries = (dRes || []).map((d) => ({
        id: String(d.id),
        farmer: d.farmer,
        beanType: d.beanType,
        date: d.date,
        volume: d.volume,
        pricePerUnit: d.pricePerUnit,
        totalAmount: d.totalAmount,
      }));

      setDeliveries(safeDeliveries);
      setFarmers(fRes || []);
      setBeans(bRes || []);
    } catch (err) {
      console.error("FETCH ERROR:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "farmer") {
      const selectedFarmer = farmers.find((f) => f.name === value);

      setForm((prev) => ({
        ...prev,
        farmer: value,
        farmerContact: selectedFarmer?.contactNumber || "",
      }));

      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const selectedBean = beans.find((b) => b.beanName === form.beanType);

  const pricePerUnit = Number(selectedBean?.pricePerUnit || 0);
  const volume = Number(form.volume || 0);
  const totalAmount = volume * pricePerUnit;

  const resetForm = () => {
    setForm({
      ...emptyForm,
      recordedBy: getRecordedBy(),
    });
    setFile(null);
  };

  const validateForm = () => {
    if (!form.farmer) return "Please select a farmer.";
    if (!form.beanType) return "Please select a bean type.";
    if (!form.volume || Number(form.volume) <= 0)
      return "Invalid volume.";
    if (!form.courier) return "Enter courier.";
    if (!form.date) return "Select date.";
    if (!form.deliveryGuy) return "Enter delivery guy.";
    if (!form.deliveryGuyContact)
      return "Enter delivery guy contact.";
    if (!form.consignee) return "Enter consignee.";
    if (!form.consigneeContact)
      return "Enter consignee contact.";
    return null;
  };

  const handleSubmit = async () => {
    const error = validateForm();
    if (error) return alert(error);

    try {
      const payload = {
        id: crypto.randomUUID(),
        farmer: form.farmer,
        farmerContact: form.farmerContact,
        beanType: form.beanType,
        courier: form.courier,
        date: form.date,
        deliveryGuy: form.deliveryGuy,
        consignee: form.consignee,
        deliveryGuyContact: form.deliveryGuyContact,
        consigneeContact: form.consigneeContact,
        recordedBy: form.recordedBy,
        volume: Number(form.volume),
        pricePerUnit,
        totalAmount,
        proofOfDelivery: file ? file.name : "",
      };

      await window.api.addDelivery(payload);

      await fetchData();
      setShowForm(false);
      resetForm();
    } catch (err) {
      console.error("SAVE ERROR:", err);
      alert("Failed to save delivery.");
    }
  };

  // 🔥 DELETE (REPLACED prompt WITH MODAL)
  const openDelete = (id) => {
    setDeleteId(id);
    setDeletePassword("");
  };

  const confirmDelete = async () => {
    try {
      const res = await window.api.deleteDelivery(
        deleteId,
        deletePassword
      );

      if (!res?.success) {
        alert(res?.message || "Wrong password");
        return;
      }

      setDeliveries((prev) =>
        prev.filter((item) => String(item.id) !== String(deleteId))
      );

      setDeleteId(null);
      setDeletePassword("");
    } catch (err) {
      console.error("DELETE ERROR:", err);
    }
  };

  return (
    <div className="delivery-container">
      <div className="delivery-header">
        <h2>Delivery Entry</h2>
      </div>

      {!showForm && (
        <>
          <div className="delivery-actions">
            <button
              className="add-btn"
              onClick={() => setShowForm(true)}
            >
              ＋ Add an Entry
            </button>
          </div>

          <div className="delivery-list">
            {deliveries.map((d) => (
              <div key={d.id} className="delivery-item">
                <span>
                  {d.farmer} • {d.beanType} •{" "}
                  {d.date?.slice(0, 10)} • Volume: {d.volume} •
                  Price: {d.pricePerUnit} • Total:{" "}
                  {d.totalAmount}
                </span>

                <button
                  className="delete-btn"
                  onClick={() => openDelete(d.id)}
                >
                  🗑 Delete
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 🔥 DELETE MODAL (ONLY ADDITION) */}
      {deleteId && (
        <div className="modal">
          <div className="modal-box">
            <h3>Enter Admin Password</h3>

            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
            />

            <div className="modal-actions">
              <button onClick={confirmDelete}>Confirm</button>
              <button onClick={() => setDeleteId(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* 👇 YOUR FORM + FILE UPLOAD + EVERYTHING BELOW IS STILL INTACT */}
      {showForm && (
        <div className="form-grid">
          <div className="form-group">
            <label>Farmer</label>
            <select
              name="farmer"
              onChange={handleChange}
              value={form.farmer}
            >
              <option value="">Select farmer</option>
              {farmers.map((f) => (
                <option key={f.id} value={f.name}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Farmer Contact No.</label>
            <input value={form.farmerContact} readOnly />
          </div>

          <div className="form-group">
            <label>Bean Type</label>
            <select
              name="beanType"
              onChange={handleChange}
              value={form.beanType}
            >
              <option value="">Select bean</option>
              {beans.map((b) => (
                <option key={b.id} value={b.beanName}>
                  {b.beanName}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Volume</label>
            <input
              type="number"
              name="volume"
              value={form.volume}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Price per Unit</label>
            <input value={pricePerUnit} readOnly />
          </div>

          <div className="form-group">
            <label>Total Amount</label>
            <input value={totalAmount} readOnly />
          </div>

          <div className="form-group">
            <label>Courier</label>
            <input
              name="courier"
              value={form.courier}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Date</label>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Delivery Guy</label>
            <input
              name="deliveryGuy"
              value={form.deliveryGuy}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Consignee</label>
            <input
              name="consignee"
              value={form.consignee}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Proof of Delivery</label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
            />
          </div>

          <div className="form-group">
            <label>Recorded By</label>
            <input value={form.recordedBy} readOnly />
          </div>

          <div className="form-actions">
            <button className="save-btn" onClick={handleSubmit}>
              Save
            </button>

            <button
              className="cancel-btn"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeliveryEntry;