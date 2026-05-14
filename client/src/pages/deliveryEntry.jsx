import { useEffect, useState } from "react";
import "./delivery.css";

function DeliveryEntry() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [showForm, setShowForm] = useState(false);
  const [deliveries, setDeliveries] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [beans, setBeans] = useState([]);
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});

  // 🔥 DELETE MODAL STATE
  const [deleteId, setDeleteId] = useState(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");

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

    // 🔥 CONTACT NUMBER VALIDATION
    if (
      name === "deliveryGuyContact" ||
      name === "consigneeContact"
    ) {
      const numbersOnly = value.replace(/\D/g, "").slice(0, 11);

      setForm((prev) => ({
        ...prev,
        [name]: numbersOnly,
      }));

      return;
    }

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

  const selectedBean = beans.find(
    (b) => b.beanName === form.beanType
  );

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
  const newErrors = {};

  if (!form.farmer) newErrors.farmer = "Select a farmer";
  if (!form.beanType) newErrors.beanType = "Select a bean type";

  if (!form.volume || Number(form.volume) <= 0)
    newErrors.volume = "Enter a valid volume";

  if (!form.courier) newErrors.courier = "Courier is required";
  if (!form.date) newErrors.date = "Pick a date";

  if (!form.deliveryGuy)
    newErrors.deliveryGuy = "Delivery guy is required";

  if (!form.deliveryGuyContact)
    newErrors.deliveryGuyContact = "Enter contact number";
  else if (form.deliveryGuyContact.length !== 11)
    newErrors.deliveryGuyContact = "Must be 11 digits";

  if (!form.consignee)
    newErrors.consignee = "Consignee is required";

  if (!form.consigneeContact)
    newErrors.consigneeContact = "Enter contact number";
  else if (form.consigneeContact.length !== 11)
    newErrors.consigneeContact = "Must be 11 digits";

  return newErrors;
};

const handleSubmit = async () => {
  const validationErrors = validateForm();

  // ❌ if there are errors, stop submit
  if (Object.keys(validationErrors).length > 0) {
    setErrors(validationErrors);
    return;
  }

  // ✅ clear errors if everything is valid
  setErrors({});

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
    setModal({
      type: "alert",
      message: "Failed to save delivery.",
    });
  }
};

  // 🔥 DELETE
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

        // ❌ show inline error instead of alert
        if (!res?.success) {
          setDeleteError(res?.message || "Wrong password");
          return;
        }

        // ✅ success → remove from UI
        setDeliveries((prev) =>
          prev.filter(
            (item) => String(item.id) !== String(deleteId)
          )
        );

        // ✅ reset everything
        setDeleteId(null);
        setDeletePassword("");
        setDeleteError("");

      } catch (err) {
        console.error("DELETE ERROR:", err);
        setDeleteError("Something went wrong");
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
                  {d.date?.slice(0, 10)} • Volume:{" "}
                  {d.volume} • Price: {d.pricePerUnit} •
                  Total: {d.totalAmount}
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

      {/* 🔥 DELETE MODAL */}
    {deleteId && (
      <div className="modal">
        <div className="modal-box">
          <h3>Enter Admin Password</h3>

          <input
            type="password"
            value={deletePassword}
            className={deleteError ? "input-error" : ""}
            onChange={(e) => {
              setDeletePassword(e.target.value);
              setDeleteError("");
            }}
          />

          {deleteError && (
            <span className="error-text">{deleteError}</span>
          )}
            <div className="modal-actions">
              <button onClick={confirmDelete}>
                Confirm
              </button>

              <button
                onClick={() => setDeleteId(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="form-grid">

          {/* FARMER */}
          <div className="form-group">
            <label>Farmer</label>
            <select
              name="farmer"
              onChange={handleChange}
              value={form.farmer}
              className={errors.farmer ? "input-error" : ""}
            >
              <option value="">Select farmer</option>
              {farmers.map((f) => (
                <option key={f.id} value={f.name}>
                  {f.name}
                </option>
              ))}
            </select>
            {errors.farmer && (
              <small className="error-bubble">{errors.farmer}</small>
            )}
          </div>

          {/* FARMER CONTACT */}
          <div className="form-group">
            <label>Farmer Contact No.</label>
            <input value={form.farmerContact} readOnly />
          </div>

          {/* BEAN TYPE */}
          <div className="form-group">
            <label>Bean Type</label>
            <select
              name="beanType"
              onChange={handleChange}
              value={form.beanType}
              className={errors.beanType ? "input-error" : ""}
            >
              <option value="">Select bean</option>
              {beans.map((b) => (
                <option key={b.id} value={b.beanName}>
                  {b.beanName}
                </option>
              ))}
            </select>
            {errors.beanType && (
              <small className="error-bubble">{errors.beanType}</small>
            )}
          </div>

          {/* VOLUME */}
          <div className="form-group">
            <label>Volume</label>
            <input
              type="number"
              name="volume"
              value={form.volume}
              onChange={handleChange}
              className={errors.volume ? "input-error" : ""}
            />
            {errors.volume && (
              <small className="error-bubble">{errors.volume}</small>
            )}
          </div>

          {/* PRICE */}
          <div className="form-group">
            <label>Price per Unit</label>
            <input value={pricePerUnit} readOnly />
          </div>

          {/* TOTAL */}
          <div className="form-group">
            <label>Total Amount</label>
            <input value={totalAmount} readOnly />
          </div>

          {/* COURIER */}
          <div className="form-group">
            <label>Courier</label>
            <input
              name="courier"
              value={form.courier}
              onChange={handleChange}
              className={errors.courier ? "input-error" : ""}
            />
            {errors.courier && (
              <small className="error-bubble">{errors.courier}</small>
            )}
          </div>

          {/* DATE */}
          <div className="form-group">
            <label>Date</label>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              className={errors.date ? "input-error" : ""}
            />
            {errors.date && (
              <small className="error-bubble">{errors.date}</small>
            )}
          </div>

          {/* DELIVERY GUY */}
          <div className="form-group">
            <label>Delivery Guy</label>
            <input
              name="deliveryGuy"
              value={form.deliveryGuy}
              onChange={handleChange}
              className={errors.deliveryGuy ? "input-error" : ""}
            />
            {errors.deliveryGuy && (
              <small className="error-bubble">{errors.deliveryGuy}</small>
            )}
          </div>

          {/* DELIVERY GUY CONTACT */}
          <div className="form-group">
            <label>Delivery Guy Contact</label>
            <input
              type="text"
              name="deliveryGuyContact"
              value={form.deliveryGuyContact}
              onChange={handleChange}
              maxLength={11}
              inputMode="numeric"
              placeholder="09XXXXXXXXX"
              className={errors.deliveryGuyContact ? "input-error" : ""}
            />
            {errors.deliveryGuyContact && (
              <small className="error-bubble">
                {errors.deliveryGuyContact}
              </small>
            )}
          </div>

          {/* CONSIGNEE */}
          <div className="form-group">
            <label>Consignee</label>
            <input
              name="consignee"
              value={form.consignee}
              onChange={handleChange}
              className={errors.consignee ? "input-error" : ""}
            />
            {errors.consignee && (
              <small className="error-bubble">{errors.consignee}</small>
            )}
          </div>

          {/* CONSIGNEE CONTACT */}
          <div className="form-group">
            <label>Consignee Contact</label>
            <input
              type="text"
              name="consigneeContact"
              value={form.consigneeContact}
              onChange={handleChange}
              maxLength={11}
              inputMode="numeric"
              placeholder="09XXXXXXXXX"
              className={errors.consigneeContact ? "input-error" : ""}
            />
            {errors.consigneeContact && (
              <small className="error-bubble">
                {errors.consigneeContact}
              </small>
            )}
          </div>

          {/* FILE */}
          <div className="form-group">
            <label>Proof of Delivery</label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
            />
          </div>

          {/* RECORDED BY */}
          <div className="form-group">
            <label>Recorded By</label>
            <input value={form.recordedBy} readOnly />
          </div>

          {/* ACTIONS */}
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