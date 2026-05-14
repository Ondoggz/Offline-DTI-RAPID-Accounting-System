import { useEffect, useMemo, useState } from "react";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";

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

  /* =========================
     OFFLINE LOAD (ELECTRON IPC)
  ========================= */
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

  /* =========================
     LOOKUPS
  ========================= */
  const selectedFarmer = useMemo(() => {
    return (
      farmers.find((f) => String(f.id) === String(form.farmerId)) || null
    );
  }, [farmers, form.farmerId]);

  const getBeanById = (id) =>
    beans.find((b) => String(b.id) === String(id));

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
  };

  const handleRowChange = (index, field, value) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { arNo: "", beanId: "", volume: "", paymentDT: "", remarks2: "" },
    ]);
  };

  const removeRow = (index) => {
    setRows((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== index) : prev
    );
  };

  const validateForm = () => {
    const newErrors = {};

    if (!selectedFarmer) {
      newErrors.farmerId = "Please select a farmer";
    }

    if (!form.deliveryDT) {
      newErrors.deliveryDT = "Delivery date required";
    }

    if (!form.beanOrigin) newErrors.beanOrigin = "Required";
    if (!form.beanAltitude) newErrors.beanAltitude = "Required";
    if (!form.receiverName) newErrors.receiverName = "Required";
    if (!form.payorName) newErrors.payorName = "Required";

    if (computedRows.some((r) => !r.beanId || !r.volume)) {
      newErrors.rows = "Complete all row fields";
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

  /* =========================
     EXPORT DOCX
  ========================= */
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
 <div style={{ padding: "20px" }}>
  <h2>Forms Generation</h2>

  {/* =========================
      TOP FORM
  ========================= */}
  <div style={{ display: "grid", gap: "10px", maxWidth: "900px" }}>
    
    {/* Farmer */}
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

    {/* Delivery Date */}
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

    {/* Bean Origin */}
    <div>
      <input
        name="beanOrigin"
        placeholder="Bean Origin"
        value={form.beanOrigin}
        onChange={handleFormChange}
        className={errors.beanOrigin ? "input-error" : ""}
      />
      {errors.beanOrigin && (
        <small className="error-bubble">{errors.beanOrigin}</small>
      )}
    </div>

    {/* Bean Altitude */}
    <div>
      <input
        name="beanAltitude"
        placeholder="Bean Altitude"
        value={form.beanAltitude}
        onChange={handleFormChange}
        className={errors.beanAltitude ? "input-error" : ""}
      />
      {errors.beanAltitude && (
        <small className="error-bubble">{errors.beanAltitude}</small>
      )}
    </div>

    {/* Remarks */}
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

    {/* Receiver */}
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

    {/* Payor */}
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

  {/* =========================
      ROWS SECTION
  ========================= */}
  <h3 style={{ marginTop: "20px" }}>Rows</h3>

  {/* GLOBAL ROW ERROR */}
  {errors.rows && (
    <small className="error-bubble">{errors.rows}</small>
  )}

  {rows.map((row, i) => {
    const bean = getBeanById(row.beanId);
    const unitCost = bean?.pricePerUnit || 0;
    const total = unitCost * (row.volume || 0);

    return (
      <div
        key={i}
        style={{
          border: "1px solid #ccc",
          padding: "10px",
          marginBottom: "10px",
        }}
      >
        <strong>Row {i + 1}</strong>

        {/* AR No */}
        <input
          value={row.arNo}
          placeholder="AR No"
          onChange={(e) =>
            handleRowChange(i, "arNo", e.target.value)
          }
        />

        {/* Bean */}
        <select
          value={row.beanId}
          onChange={(e) =>
            handleRowChange(i, "beanId", e.target.value)
          }
        >
          <option value="">Select Bean</option>
          {beans.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        {/* Unit Cost */}
        <input value={unitCost} readOnly />

        {/* Volume */}
        <input
          type="number"
          placeholder="Volume"
          value={row.volume}
          onChange={(e) =>
            handleRowChange(i, "volume", e.target.value)
          }
        />

        {/* Total */}
        <input value={total} readOnly />

        {/* Payment Date */}
        <input
          type="datetime-local"
          value={row.paymentDT}
          onChange={(e) => {
            handleRowChange(i, "paymentDT", e.target.value);
            e.target.blur();
          }}
        />

        {/* Remarks */}
        <input
          placeholder="Remarks"
          value={row.remarks2}
          onChange={(e) =>
            handleRowChange(i, "remarks2", e.target.value)
          }
        />

        <button onClick={() => removeRow(i)}>Remove</button>
      </div>
    );
  })}

  {/* ADD ROW */}
  <button onClick={addRow}>+ Add Row</button>

  {/* TOTAL */}
  <h3>Grand Total: ₱{grandTotal.toFixed(2)}</h3>

  {/* EXPORT */}
  <div style={{ display: "flex", gap: "10px" }}>
    <button onClick={exportDocx}>Export DOCX</button>
  </div>
</div>
  );
};

export default FormsGeneration;