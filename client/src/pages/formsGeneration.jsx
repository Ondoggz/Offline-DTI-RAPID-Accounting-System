import { useEffect, useMemo, useState } from "react";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";
import "./formsGeneration.css";

function FormsGeneration() {
  const [farmers, setFarmers] = useState([]);
  const [beans, setBeans] = useState([]);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    farmerId: "",
    deliveryDT: "",
    beanOrigin: "",
    beanAltitude: "",
    remarks: "",
    receiverName: "",
    payorName: "",
  });

  const [rows, setRows] = useState([
    {
      arNo: "",
      beanId: "",
      volume: "",
      paymentDT: "",
      remarks2: "",
    },
  ]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const farmersRes = await window.api.getFarmers();
        const beansRes = await window.api.getBeans();

        setFarmers(
          (farmersRes || []).map((f) => ({
            ...f,
            id: String(f.id),
          }))
        );

        setBeans(
          (beansRes || []).map((bean) => ({
            id: String(bean.id),
            name: bean.beanName,
            pricePerUnit: Number(bean.pricePerUnit) || 0,
            unit: bean.unit,
          }))
        );
      } catch (err) {
        console.error("Offline fetch error:", err);
      }
    };

    fetchData();
  }, []);

  const selectedFarmer = useMemo(() => {
    return farmers.find((f) => String(f.id) === String(form.farmerId)) || null;
  }, [farmers, form.farmerId]);

  const getBeanById = (id) => beans.find((b) => String(b.id) === String(id));

  const computedRows = rows.map((row) => {
    const bean = getBeanById(row.beanId);
    const unitCost = Number(bean?.pricePerUnit || 0);
    const volume = Number(row.volume || 0);

    return {
      ...row,
      particulars: bean?.name || "",
      unitCost,
      totalAmount: unitCost * volume,
    };
  });

  const grandTotal = computedRows.reduce(
    (sum, r) => sum + Number(r.totalAmount || 0),
    0
  );

  const handleFormChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

    setErrors((prev) => ({
      ...prev,
      [e.target.name]: "",
    }));
  };

  const handleRowChange = (index, field, value) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );

    setErrors((prev) => {
      const updatedRowErrors = { ...(prev.rowErrors || {}) };

      if (updatedRowErrors[index]) {
        updatedRowErrors[index] = {
          ...updatedRowErrors[index],
          [field]: "",
        };
      }

      return {
        ...prev,
        rows: "",
        rowErrors: updatedRowErrors,
      };
    });
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { arNo: "", beanId: "", volume: "", paymentDT: "", remarks2: "" },
    ]);

    setErrors((prev) => ({
      ...prev,
      rows: "",
    }));
  };

  const removeRow = (index) => {
    setRows((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== index) : prev
    );

    setErrors((prev) => ({
      ...prev,
      rows: "",
      rowErrors: {},
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    const rowErrors = {};

    if (!selectedFarmer) {
      newErrors.farmerId = "Please select a farmer";
    }

    if (!form.deliveryDT) {
      newErrors.deliveryDT = "Delivery date required";
    }

    if (!form.beanOrigin.trim()) {
      newErrors.beanOrigin = "Required";
    }

    if (!form.beanAltitude.trim()) {
      newErrors.beanAltitude = "Required";
    }

    if (!form.receiverName.trim()) {
      newErrors.receiverName = "Required";
    }

    if (!form.payorName.trim()) {
      newErrors.payorName = "Required";
    }

    computedRows.forEach((row, index) => {
      const currentRowErrors = {};

      if (!row.arNo.trim()) {
        currentRowErrors.arNo = "AR No required";
      }

      const duplicateAr = computedRows.findIndex(
        (r, idx) =>
          idx !== index &&
          r.arNo.trim().toLowerCase() === row.arNo.trim().toLowerCase()
      );

      if (row.arNo.trim() && duplicateAr !== -1) {
        currentRowErrors.arNo = "Duplicate AR No not allowed";
      }

      if (!row.beanId) {
        currentRowErrors.beanId = "Select a product";
      }

      if (!row.volume || Number(row.volume) <= 0) {
        currentRowErrors.volume = "Enter valid volume";
      }

      if (!row.paymentDT) {
        currentRowErrors.paymentDT = "Payment date required";
      }

      if (Object.keys(currentRowErrors).length > 0) {
        rowErrors[index] = currentRowErrors;
      }
    });

    if (Object.keys(rowErrors).length > 0) {
      newErrors.rows = "Complete all row fields";
      newErrors.rowErrors = rowErrors;
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const buildDocData = () => ({
    idNumber: selectedFarmer?.farmerID || "",
    name: selectedFarmer?.name || "",
    sex: selectedFarmer?.sex || "",
    age: selectedFarmer?.age || "",
    residentialAddress: selectedFarmer?.residentialAddress || "",
    farmAddress: selectedFarmer?.farmAddress || "",
    contactNumber: selectedFarmer?.contactNumber || "",
    emailAddress: selectedFarmer?.emailAddress || "",
    deliveryDT: form.deliveryDT,
    beanOrigin: form.beanOrigin,
    beanAltitude: form.beanAltitude,
    remarks: form.remarks,
    receiverName: form.receiverName,
    payorName: form.payorName,
    amountInFigures: grandTotal,
    rows: computedRows,
  });

  const exportDocx = async () => {
    if (!validateForm()) return;

    try {
      const content = await window.api.getTemplate();

      const zip = new PizZip(content);

      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      doc.render(buildDocData());

      const blob = doc.getZip().generate({
        type: "blob",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      saveAs(blob, `Form-${selectedFarmer?.name || "output"}.docx`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="forms-container">
      <h2>Forms Generation</h2>

      <div className="forms-card">
        <h3>Farmer and Delivery Details</h3>

        <div className="forms-grid">
          <div>
            <select
              name="farmerId"
              value={form.farmerId}
              onChange={handleFormChange}
              className={errors.farmerId ? "input-error" : ""}
            >
              <option value="">Select Farmer</option>
              {farmers.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>

            {errors.farmerId && (
              <small className="error-bubble">{errors.farmerId}</small>
            )}
          </div>

          <div>
            <input
              type="datetime-local"
              name="deliveryDT"
              value={form.deliveryDT}
              onChange={handleFormChange}
              onInput={(e) => e.target.blur()}
              className={errors.deliveryDT ? "input-error" : ""}
            />

            {errors.deliveryDT && (
              <small className="error-bubble">{errors.deliveryDT}</small>
            )}
          </div>

          <div>
            <input
              name="beanOrigin"
              placeholder="Product Origin"
              value={form.beanOrigin}
              onChange={handleFormChange}
              className={errors.beanOrigin ? "input-error" : ""}
            />
            {errors.beanOrigin && (
              <small className="error-bubble">{errors.beanOrigin}</small>
            )}
          </div>

          <div>
            <input
              name="beanAltitude"
              placeholder="Product Altitude"
              value={form.beanAltitude}
              onChange={handleFormChange}
              className={errors.beanAltitude ? "input-error" : ""}
            />
            {errors.beanAltitude && (
              <small className="error-bubble">{errors.beanAltitude}</small>
            )}
          </div>

          <div>
            <input
              name="remarks"
              placeholder="Remarks"
              value={form.remarks}
              onChange={handleFormChange}
              className={errors.remarks ? "input-error" : ""}
            />
            {errors.remarks && (
              <small className="error-bubble">{errors.remarks}</small>
            )}
          </div>

          <div>
            <input
              name="receiverName"
              placeholder="Receiver Name"
              value={form.receiverName}
              onChange={handleFormChange}
              className={errors.receiverName ? "input-error" : ""}
            />
            {errors.receiverName && (
              <small className="error-bubble">{errors.receiverName}</small>
            )}
          </div>

          <div>
            <input
              name="payorName"
              placeholder="Payor Name"
              value={form.payorName}
              onChange={handleFormChange}
              className={errors.payorName ? "input-error" : ""}
            />
            {errors.payorName && (
              <small className="error-bubble">{errors.payorName}</small>
            )}
          </div>
        </div>
      </div>

      <div className="forms-card">
        <div className="forms-section-header">
          <div>
            <h3>Rows</h3>
            <p>Add one or more acknowledgment receipt rows.</p>
          </div>

          <button className="forms-secondary-btn" onClick={addRow}>
            + Add Row
          </button>
        </div>

        {errors.rows && <small className="error-bubble">{errors.rows}</small>}

        {rows.map((row, i) => {
          const bean = getBeanById(row.beanId);
          const unitCost = bean?.pricePerUnit || 0;
          const total = unitCost * (row.volume || 0);
          const rowError = errors.rowErrors?.[i] || {};

          return (
            <div key={i} className="forms-row-card">
              <div className="forms-row-title">
                <strong>Row {i + 1}</strong>

                <button
                  className="forms-danger-btn"
                  onClick={() => removeRow(i)}
                >
                  Remove
                </button>
              </div>

              <div className="forms-row-grid">
                <div>
                  <input
                    value={row.arNo}
                    placeholder="AR No"
                    onChange={(e) =>
                      handleRowChange(i, "arNo", e.target.value)
                    }
                    className={rowError.arNo ? "input-error" : ""}
                  />

                  {rowError.arNo && (
                    <small className="error-bubble">{rowError.arNo}</small>
                  )}
                </div>

                <div>
                  <select
                    value={row.beanId}
                    onChange={(e) =>
                      handleRowChange(i, "beanId", e.target.value)
                    }
                    className={rowError.beanId ? "input-error" : ""}
                  >
                    <option value="">Select Product</option>
                    {beans.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>

                  {rowError.beanId && (
                    <small className="error-bubble">{rowError.beanId}</small>
                  )}
                </div>

                <input value={unitCost} readOnly />

                <div>
                  <input
                    type="number"
                    placeholder="Volume"
                    value={row.volume}
                    onChange={(e) =>
                      handleRowChange(i, "volume", e.target.value)
                    }
                    className={rowError.volume ? "input-error" : ""}
                  />

                  {rowError.volume && (
                    <small className="error-bubble">{rowError.volume}</small>
                  )}
                </div>

                <input value={total} readOnly />

                <div>
                  <input
                    type="datetime-local"
                    value={row.paymentDT}
                    onChange={(e) => {
                      handleRowChange(i, "paymentDT", e.target.value);
                      e.target.blur();
                    }}
                    className={rowError.paymentDT ? "input-error" : ""}
                  />

                  {rowError.paymentDT && (
                    <small className="error-bubble">{rowError.paymentDT}</small>
                  )}
                </div>

                <input
                  placeholder="Remarks"
                  value={row.remarks2}
                  onChange={(e) =>
                    handleRowChange(i, "remarks2", e.target.value)
                  }
                />
              </div>
            </div>
          );
        })}

        <div className="forms-footer">
          <div className="forms-total">
            Grand Total: ₱{grandTotal.toFixed(2)}
          </div>

          <div className="forms-actions">
            <button className="forms-primary-btn" onClick={exportDocx}>
              Export DOCX
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FormsGeneration;