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
  const [expandedId, setExpandedId] = useState(null);
  const [imageErrors, setImageErrors] = useState({});

  const [deleteId, setDeleteId] = useState(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const getRecordedBy = () => {
    if (user?.name && user?.position) return `${user.name} (${user.position})`;
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

  const fileToDataUrl = (file) => {
    return new Promise((resolve, reject) => {
      if (!file) return resolve("");

      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;

      reader.readAsDataURL(file);
    });
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return String(date).slice(0, 10);
  };

  const fetchData = async () => {
    try {
      const [dRes, fRes, bRes] = await Promise.all([
        window.api.getDeliveries(),
        window.api.getFarmers(),
        window.api.getBeans(),
      ]);

      const safeDeliveries = (dRes || [])
        .map((d) => ({
          id: String(d.id),
          farmer: d.farmer,
          farmerContact: d.farmerContact,
          beanType: d.beanType,
          courier: d.courier,
          date: d.date,
          deliveryGuy: d.deliveryGuy,
          consignee: d.consignee,
          deliveryGuyContact: d.deliveryGuyContact,
          consigneeContact: d.consigneeContact,
          recordedBy: d.recordedBy,
          volume: d.volume,
          pricePerUnit: d.pricePerUnit,
          totalAmount: d.totalAmount,
          proofOfDelivery: d.proofOfDelivery || "",
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        }))
        .sort((a, b) => {
          const bTime = new Date(b.createdAt || b.updatedAt || b.date || 0).getTime();
          const aTime = new Date(a.createdAt || a.updatedAt || a.date || 0).getTime();
          return bTime - aTime;
        });

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

    if (name === "deliveryGuyContact" || name === "consigneeContact") {
      const numbersOnly = value.replace(/\D/g, "").slice(0, 11);

      setForm((prev) => ({
        ...prev,
        [name]: numbersOnly,
      }));

      setErrors((prev) => ({
        ...prev,
        [name]: "",
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

      setErrors((prev) => ({
        ...prev,
        farmer: "",
      }));

      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
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
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};

    if (!form.farmer) newErrors.farmer = "Select a farmer";
    if (!form.beanType) newErrors.beanType = "Select a bean type";

    if (!form.volume || Number(form.volume) <= 0) {
      newErrors.volume = "Enter a valid volume";
    }

    if (!form.courier) newErrors.courier = "Courier is required";
    if (!form.date) newErrors.date = "Pick a date";

    if (!form.deliveryGuy) {
      newErrors.deliveryGuy = "Delivery guy is required";
    }

    if (!form.deliveryGuyContact) {
      newErrors.deliveryGuyContact = "Enter contact number";
    } else if (form.deliveryGuyContact.length !== 11) {
      newErrors.deliveryGuyContact = "Must be 11 digits";
    }

    if (!form.consignee) {
      newErrors.consignee = "Consignee is required";
    }

    if (!form.consigneeContact) {
      newErrors.consigneeContact = "Enter contact number";
    } else if (form.consigneeContact.length !== 11) {
      newErrors.consigneeContact = "Must be 11 digits";
    }

    return newErrors;
  };

  const handleSubmit = async () => {
    const validationErrors = validateForm();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});

    try {
      const proofOfDeliveryDataUrl = file ? await fileToDataUrl(file) : "";

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
        proofOfDelivery: proofOfDeliveryDataUrl,
      };

      await window.api.addDelivery(payload);
      await fetchData();

      setShowForm(false);
      resetForm();
    } catch (err) {
      console.error("SAVE ERROR:", err);
    }
  };

  const openDelete = (id) => {
    setDeleteId(id);
    setDeletePassword("");
    setDeleteError("");
  };

  const confirmDelete = async () => {
    try {
      const res = await window.api.deleteDelivery(deleteId, deletePassword);

      if (!res?.success) {
        setDeleteError(res?.message || "Wrong password");
        return;
      }

      setDeliveries((prev) =>
        prev.filter((item) => String(item.id) !== String(deleteId))
      );

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
            <button className="add-btn" onClick={() => setShowForm(true)}>
              ＋ Add an Entry
            </button>
          </div>

          <div className="delivery-list">
            {deliveries.map((d) => {
              const isExpanded = expandedId === d.id;
              const hasImageError = imageErrors[d.id];
              const proofImageSrc = d.proofOfDelivery;

              return (
                <div
                  key={d.id}
                  className="delivery-item"
                  style={{
                    display: "block",
                    padding: "16px",
                    borderRadius: "14px",
                    marginBottom: "14px",
                  }}
                >
                  <div
                    onClick={() => {
                      setExpandedId(isExpanded ? null : d.id);
                    }}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "12px",
                      width: "100%",
                      cursor: "pointer",
                    }}
                  >
                    <div>
                      <strong>
                        {isExpanded ? "▼" : "▶"} {d.farmer || "Unknown Farmer"}
                      </strong>
                      <div style={{ fontSize: "13px", marginTop: "4px" }}>
                        {d.beanType || "N/A"} • {formatDate(d.date)} • Volume:{" "}
                        {d.volume || 0} • Total: ₱{d.totalAmount || 0}
                      </div>
                    </div>

                    <button
                      className="delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDelete(d.id);
                      }}
                    >
                      🗑 Delete
                    </button>
                  </div>

                  {isExpanded && (
                    <div
                      className="delivery-details"
                      style={{
                        marginTop: "16px",
                        padding: "16px",
                        borderTop: "1px solid #ddd",
                        background: "#f9fafb",
                        borderRadius: "12px",
                      }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(180px, 1fr))",
                          gap: "12px",
                        }}
                      >
                        <div>
                          <small>Farmer</small>
                          <p>
                            <strong>{d.farmer || "N/A"}</strong>
                          </p>
                        </div>

                        <div>
                          <small>Farmer Contact</small>
                          <p>
                            <strong>{d.farmerContact || "N/A"}</strong>
                          </p>
                        </div>

                        <div>
                          <small>Bean Type</small>
                          <p>
                            <strong>{d.beanType || "N/A"}</strong>
                          </p>
                        </div>

                        <div>
                          <small>Volume</small>
                          <p>
                            <strong>{d.volume || 0}</strong>
                          </p>
                        </div>

                        <div>
                          <small>Price Per Unit</small>
                          <p>
                            <strong>₱{d.pricePerUnit || 0}</strong>
                          </p>
                        </div>

                        <div>
                          <small>Total Amount</small>
                          <p>
                            <strong>₱{d.totalAmount || 0}</strong>
                          </p>
                        </div>

                        <div>
                          <small>Courier</small>
                          <p>
                            <strong>{d.courier || "N/A"}</strong>
                          </p>
                        </div>

                        <div>
                          <small>Date</small>
                          <p>
                            <strong>{formatDate(d.date)}</strong>
                          </p>
                        </div>

                        <div>
                          <small>Delivery Guy</small>
                          <p>
                            <strong>{d.deliveryGuy || "N/A"}</strong>
                          </p>
                        </div>

                        <div>
                          <small>Delivery Guy Contact</small>
                          <p>
                            <strong>{d.deliveryGuyContact || "N/A"}</strong>
                          </p>
                        </div>

                        <div>
                          <small>Consignee</small>
                          <p>
                            <strong>{d.consignee || "N/A"}</strong>
                          </p>
                        </div>

                        <div>
                          <small>Consignee Contact</small>
                          <p>
                            <strong>{d.consigneeContact || "N/A"}</strong>
                          </p>
                        </div>

                        <div>
                          <small>Recorded By</small>
                          <p>
                            <strong>{d.recordedBy || "N/A"}</strong>
                          </p>
                        </div>
                      </div>

                      <div style={{ marginTop: "18px" }}>
                        <small>Proof of Delivery</small>

                        {proofImageSrc && !hasImageError ? (
                          <div
                            style={{
                              marginTop: "8px",
                              padding: "10px",
                              background: "#fff",
                              border: "1px solid #ddd",
                              borderRadius: "12px",
                              maxWidth: "380px",
                            }}
                          >
                            <img
                              src={proofImageSrc}
                              alt="Proof of Delivery"
                              onError={() =>
                                setImageErrors((prev) => ({
                                  ...prev,
                                  [d.id]: true,
                                }))
                              }
                              style={{
                                width: "100%",
                                maxHeight: "280px",
                                objectFit: "contain",
                                borderRadius: "10px",
                                display: "block",
                              }}
                            />
                          </div>
                        ) : (
                          <p style={{ marginTop: "6px" }}>
                            No viewable proof of delivery uploaded.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {deleteId && (
        <div
          className="modal"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.45)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            padding: "20px",
          }}
          onClick={() => {
            setDeleteId(null);
            setDeletePassword("");
            setDeleteError("");
          }}
        >
          <div
            className="modal-box"
            style={{
              width: "100%",
              maxWidth: "380px",
              background: "#fff",
              borderRadius: "16px",
              padding: "24px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>Enter Admin Password</h3>

            <input
              type="password"
              value={deletePassword}
              className={deleteError ? "input-error" : ""}
              placeholder="Admin password"
              onChange={(e) => {
                setDeletePassword(e.target.value);
                setDeleteError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmDelete();
              }}
              style={{
                width: "100%",
                boxSizing: "border-box",
              }}
              autoFocus
            />

            {deleteError && <span className="error-text">{deleteError}</span>}

            <div
              className="modal-actions"
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "18px",
              }}
            >
              <button onClick={confirmDelete}>Confirm</button>

              <button
                onClick={() => {
                  setDeleteId(null);
                  setDeletePassword("");
                  setDeleteError("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="form-grid">
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
              className={errors.courier ? "input-error" : ""}
            />
            {errors.courier && (
              <small className="error-bubble">{errors.courier}</small>
            )}
          </div>

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

          <div className="form-group">
            <label>Proof of Delivery</label>
            <input
              type="file"
              accept="image/*"
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