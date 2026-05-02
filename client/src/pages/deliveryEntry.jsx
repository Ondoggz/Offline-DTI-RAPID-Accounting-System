import { useEffect, useState } from "react";
import axios from "axios";
import "./delivery.css";

function DeliveryEntry() {
  const [showForm, setShowForm] = useState(false);
  const [deliveries, setDeliveries] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [beans, setBeans] = useState([]);
  const [file, setFile] = useState(null);

  const token = localStorage.getItem("token");

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
    recordedBy: "",
    volume: "", // ✅ ADDED
  });

  // 📥 LOAD DATA
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dRes, fRes, bRes] = await Promise.all([
          axios.get("http://localhost:3000/api/deliveries"),
          axios.get("http://localhost:3000/api/farmers", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get("http://localhost:3000/api/beans", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setDeliveries(dRes.data);
        setFarmers(fRes.data);
        setBeans(bRes.data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchData();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // 🧠 ADDED computed logic (no refactor)
  const selectedBean = beans.find(
    (b) => b.beanName === form.beanType
  );

  const pricePerUnit = Number(selectedBean?.pricePerUnit || 0);
  const totalAmount = Number(form.volume || 0) * pricePerUnit;

  // 📤 SUBMIT DELIVERY
  const handleSubmit = async () => {
    try {
      const data = new FormData();

      Object.keys(form).forEach((key) => {
        data.append(key, form[key]);
      });

      // ✅ ADD computed values
      data.append("pricePerUnit", pricePerUnit);
      data.append("totalAmount", totalAmount);

      if (file) {
        data.append("proofOfDelivery", file);
      }

      const res = await axios.post(
        "http://localhost:3000/api/deliveries",
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // ✅ FIX: instant UI update (no reload needed)
      if (res.data && res.data._id) {
        setDeliveries((prev) => [res.data, ...prev]);
      } else {
        const refresh = await axios.get("http://localhost:3000/api/deliveries");
        setDeliveries(refresh.data);
      }

      setShowForm(false);

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
        recordedBy: "",
        volume: "", // ✅ reset
      });

      setFile(null);
    } catch (err) {
      console.error(err);
    }
  };

  // 🗑 DELETE DELIVERY
  const handleDelete = async (id) => {
    const password = window.prompt("Enter admin password:");

    if (!password) return;

    try {
      await axios.delete(`http://localhost:3000/api/deliveries/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        data: {
          password,
        },
      });

      const res = await axios.get("http://localhost:3000/api/deliveries");
      setDeliveries(res.data);

    } catch (err) {
      console.error(err);
      alert("Delete failed (wrong password or error)");
    }
  };

  return (
    <div className="delivery-container">

      {/* HEADER */}
      <div className="delivery-header">
        <span className="back-icon" onClick={() => setShowForm(false)}>←</span>
        <h2>Delivery Entry</h2>
      </div>

      {/* LIST VIEW */}
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
                  {d.farmer} • {d.beanType} • {d.date?.slice(0, 10)}
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

      {/* FORM VIEW */}
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
            <input
              name="farmerContact"
              value={form.farmerContact}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Bean Type</label>
            <select name="beanType" onChange={handleChange} value={form.beanType}>
              <option value="">Select bean</option>
              {beans.map((b) => (
                <option key={b._id} value={b.beanName}>
                  {b.beanName}
                </option>
              ))}
            </select>
          </div>

          {/* ✅ ADDED FIELDS (no changes elsewhere) */}

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

          {/* rest unchanged */}

          <div className="form-group">
            <label>Courier</label>
            <input name="courier" value={form.courier} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Date</label>
            <input type="date" name="date" value={form.date} onChange={handleChange} />
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
            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
            />
          </div>

          <div className="form-group">
            <label>Recorded By</label>
            <input
              name="recordedBy"
              value={form.recordedBy}
              onChange={handleChange}
            />
          </div>

          <div className="form-actions">
            <button className="save-btn" onClick={handleSubmit}>
              Save
            </button>

            <button className="cancel-btn" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeliveryEntry;