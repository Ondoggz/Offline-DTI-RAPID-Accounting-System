import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";

const API_URL = import.meta.env.VITE_API_URL;

function FormsGeneration() {
  const [farmers, setFarmers] = useState([]);
  const [beans, setBeans] = useState([]);

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

  const token = localStorage.getItem("token");
  const API = import.meta.env.VITE_API_URL;

  /* =========================
     FETCH DATA
  ========================= */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [farmersRes, beansRes] = await Promise.all([
          axios.get(`${API_URL}/api/farmers`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_URL}/api/beans`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setFarmers(farmersRes.data || []);

        setBeans(
          (beansRes.data || []).map((bean) => ({
            id: bean._id,
            name: bean.beanName,
            pricePerUnit: bean.pricePerUnit,
            unit: bean.unit,
          }))
        );
      } catch (err) {
        console.error("Fetch error:", err);
      }
    };

    if (API && token) {
      fetchData();
    }
  }, [API, token]);

  /* =========================
     HELPERS
  ========================= */
  const selectedFarmer = useMemo(() => {
    return farmers.find((f) => f._id === form.farmerId) || null;
  }, [farmers, form.farmerId]);

  const getBeanById = (id) => beans.find((b) => b.id === id);

  /* =========================
     ROW CALCULATIONS
  ========================= */
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

  /* =========================
     FORM HANDLERS
  ========================= */
  const handleFormChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleRowChange = (index, field, value) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        arNo: "",
        beanId: "",
        volume: "",
        paymentDT: "",
        remarks2: "",
      },
    ]);
  };

  const removeRow = (index) => {
    setRows((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== index) : prev
    );
  };

  /* =========================
     VALIDATION
  ========================= */
  const validateForm = () => {
    if (!selectedFarmer) {
      alert("Please select a farmer.");
      return false;
    }

    if (computedRows.some((r) => !r.beanId || !r.volume)) {
      alert("Please complete all rows.");
      return false;
    }

    return true;
  };

  /* =========================
     DOC DATA
  ========================= */
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
     DOCX EXPORT
  ========================= */
  const exportDocx = async () => {
    if (!validateForm()) return;

    try {
      const response = await fetch("/templates/Sample_Palamboon.docx");
      const content = await response.arrayBuffer();

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
      alert("DOCX generation failed.");
    }
  };

  /* =========================
     PRINT
  ========================= */
  const printTemplate = async () => {
  if (!validateForm()) return;

  try {
    const res = await axios.post(
      `${API_URL}/api/forms/print`,
      buildDocData(),
      {
        responseType: "blob",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const pdfBlob = new Blob([res.data], {
      type: "application/pdf",
    });

    const url = URL.createObjectURL(pdfBlob);

    const win = window.open(url);

    if (!win) {
      alert("Popup blocked. Please allow popups for this site.");
      return;
    }

    win.onload = () => {
      win.print();
    };
  } catch (err) {
    console.error(err);
    alert("Print failed.");
  }
};

  /* =========================
     UI
  ========================= */
  return (
    <div style={{ padding: "20px" }}>
      <h2>Forms Generation</h2>

      {/* FARMER DETAILS */}
      <div style={{ display: "grid", gap: "10px", maxWidth: "900px" }}>
        <select
          name="farmerId"
          value={form.farmerId}
          onChange={handleFormChange}
        >
          <option value="">Select Farmer</option>

          {farmers.map((f) => (
            <option key={f._id} value={f._id}>
              {f.name}
            </option>
          ))}
        </select>

        {selectedFarmer && (
          <div
            style={{
              border: "1px solid #ccc",
              padding: "15px",
              borderRadius: "8px",
              background: "#f9f9f9",
            }}
          >
            <h4>Farmer Information</h4>

            <p>
              <strong>ID:</strong> {selectedFarmer.farmerID}
            </p>

            <p>
              <strong>Name:</strong> {selectedFarmer.name}
            </p>

            <p>
              <strong>Sex:</strong> {selectedFarmer.sex}
            </p>

            <p>
              <strong>Age:</strong> {selectedFarmer.age}
            </p>

            <p>
              <strong>Residential Address:</strong>{" "}
              {selectedFarmer.residentialAddress}
            </p>

            <p>
              <strong>Farm Address:</strong>{" "}
              {selectedFarmer.farmAddress}
            </p>

            <p>
              <strong>Contact:</strong>{" "}
              {selectedFarmer.contactNumber}
            </p>

            <p>
              <strong>Email:</strong>{" "}
              {selectedFarmer.emailAddress}
            </p>
          </div>
        )}

        <input
          type="datetime-local"
          name="deliveryDT"
          value={form.deliveryDT}
          onChange={handleFormChange}
        />

        <input
          name="beanOrigin"
          placeholder="Bean Origin"
          value={form.beanOrigin}
          onChange={handleFormChange}
        />

        <input
          name="beanAltitude"
          placeholder="Bean Altitude"
          value={form.beanAltitude}
          onChange={handleFormChange}
        />

        <input
          name="remarks"
          placeholder="Remarks"
          value={form.remarks}
          onChange={handleFormChange}
        />

        <input
          name="receiverName"
          placeholder="Receiver Name"
          value={form.receiverName}
          onChange={handleFormChange}
        />

        <input
          name="payorName"
          placeholder="Payor Name"
          value={form.payorName}
          onChange={handleFormChange}
        />
      </div>

      {/* ROWS */}
      <h3 style={{ marginTop: "20px" }}>Rows</h3>

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
              display: "grid",
              gap: "10px",
            }}
          >
            <strong>Row {i + 1}</strong>

            <input
              placeholder="AR No"
              value={row.arNo}
              onChange={(e) =>
                handleRowChange(i, "arNo", e.target.value)
              }
            />

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

            <input
              value={unitCost}
              readOnly
              placeholder="Unit Cost"
            />

            <input
              type="number"
              placeholder="Volume"
              value={row.volume}
              onChange={(e) =>
                handleRowChange(i, "volume", e.target.value)
              }
            />

            <input
              value={total}
              readOnly
              placeholder="Total Amount"
            />

            <input
              type="datetime-local"
              value={row.paymentDT}
              onChange={(e) =>
                handleRowChange(i, "paymentDT", e.target.value)
              }
            />

            <input
              placeholder="Remarks"
              value={row.remarks2}
              onChange={(e) =>
                handleRowChange(i, "remarks2", e.target.value)
              }
            />

            <button onClick={() => removeRow(i)}>
              Remove
            </button>
          </div>
        );
      })}

      <button onClick={addRow}>+ Add Row</button>

      {/* TOTAL */}
      <div style={{ marginTop: "20px" }}>
        <h3>Grand Total: ₱{grandTotal.toFixed(2)}</h3>
      </div>

      {/* ACTIONS */}
      <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
        <button onClick={exportDocx}>
          Export DOCX
        </button>

        <button onClick={printTemplate}>
          Print
        </button>
      </div>
    </div>
  );
}

export default FormsGeneration;