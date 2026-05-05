import { useEffect, useState } from "react";
import axios from "axios";
import "./delivery.css";

function DeliveryEntry() {
  const [showForm, setShowForm] = useState(false);
  const [deliveries, setDeliveries] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [beans, setBeans] = useState([]);
  const [file, setFile] = useState(null);

  const API = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const getRecordedBy = () => {
    if (user?.name && user?.position) {
      return `${user.name} (${user.position})`;
    }
    return user?.name || user?.username || "";
  };

  const [form, setForm] = useState({
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
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dRes, fRes, bRes] = await Promise.all([
          axios.get(`${API}/api/deliveries`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API}/api/farmers`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API}/api/beans`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setDeliveries(dRes.data);
        setFarmers(fRes.data);
        setBeans(bRes.data);
      } catch (err) {
        console.error("FETCH ERROR:", err);
      }
    };

    if (API && token) {
      fetchData();
    }
  }, [API, token]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "farmer") {
      const selectedFarmer = farmers.find((f) => f.name === value);

      setForm({
        ...form,
        farmer: value,
        farmerContact:
          selectedFarmer?.contactNumber ||
          selectedFarmer?.farmerContact ||
          selectedFarmer?.contact ||
          "",
      });

      return;
    }

    setForm({ ...form, [name]: value });
  };

  const selectedBean = beans.find((b) => b.beanName === form.beanType);

  const pricePerUnit = Number(selectedBean?.pricePerUnit || 0);
  const totalAmount = Number(form.volume || 0) * pricePerUnit;

  const resetForm = () => {
    setForm({
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
    });

    setFile(null);
  };

  const handleSubmit = async () => {
    try {
      const data = new FormData();

      Object.keys(form).forEach((key) => {
        data.append(key, form[key]);
      });

      data.append("pricePerUnit", pricePerUnit);
      data.append("totalAmount", totalAmount);

      if (file) {
        data.append("proofOfDelivery", file);
      }

      const res = await axios.post(`${API}/api/deliveries`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const savedDelivery = res.data.data || res.data;

      if (savedDelivery && savedDelivery._id) {
        setDeliveries((prev) => [savedDelivery, ...prev]);
      } else {
        const refresh = await axios.get(`${API}/api/deliveries`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setDeliveries(refresh.data);
      }

      setShowForm(false);
      resetForm();
    } catch (err) {
      console.error("SUBMIT ERROR:", err);
      alert("Failed to save delivery.");
    }
  };

  const handleDelete = async (id) => {
    const password = window.prompt("Enter admin password:");
    if (!password) return;

    try {
      await axios.delete(`${API}/api/deliveries/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        data: { password },
      });

      setDeliveries((prev) => prev.filter((d) => d._id !== id));
    } catch (err) {
      console.error("DELETE ERROR:", err);
      alert("Delete failed.");
    }
  };

  return (
    <div className="delivery-container">
      <div className="delivery-header">
        <span className="back-icon" onClick={() => setShowForm(false)}>
          ←
        </span>
        <h2>Delivery Entry</h2>
      </div>

      {!showForm && (
        <>
          <div className="delivery-actions">
            <button className="add-btn" onClick={() => setShowForm(true)}>
              ＋ Add an Entry
            </button>
          </div>

          <div className="delivery-list">
            {deliveries.map((d) => (
              <div key={d._id} className="delivery-item">
                <span>
                  {d.farmer} • {d.beanType} • {d.date?.slice(0, 10)} • Volume:{" "}
                  {d.volume ?? 0} • Price: {d.pricePerUnit ?? 0} • Total:{" "}
                  {d.totalAmount ?? 0}
                </span>

                <button
                  className="delete-btn"
                  onClick={() => {
                    if (window.confirm("Delete this delivery entry?")) {
                      handleDelete(d._id);
                    }
                  }}
                >
                  🗑 Delete
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {showForm && (
        <div className="form-grid">
          <div className="form-group">
            <label>Farmer</label>
            <select name="farmer" onChange={handleChange} value={form.farmer}>
              <option value="">Select farmer</option>
              {farmers.map((f) => (
                <option key={f._id} value={f.name}>
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
                <option key={b._id} value={b.beanName}>
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
            <input name="courier" value={form.courier} onChange={handleChange} />
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
            <label>Delivery Guy Contact No.</label>
            <input
              name="deliveryGuyContact"
              value={form.deliveryGuyContact}
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
            <label>Consignee Contact No.</label>
            <input
              name="consigneeContact"
              value={form.consigneeContact}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Proof of Delivery</label>
            <input type="file" onChange={(e) => setFile(e.target.files[0])} />
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