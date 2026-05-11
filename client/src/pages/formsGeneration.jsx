import { useEffect, useMemo, useState } from "react";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";

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

  /* =========================
     OFFLINE LOAD (ELECTRON IPC)
  ========================= */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const farmersRes = await window.api.getFarmers();
        const beansRes = await window.api.getBeans();

        // ✅ normalize farmer IDs
        setFarmers(
          (farmersRes || []).map((f) => ({
            ...f,
            id: String(f.id),
          }))
        );

        // ✅ fix bean IDs
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
     FIXED LOOKUPS
  ========================= */
  const selectedFarmer = useMemo(() => {
    return (
      farmers.find(
        (f) => String(f.id) === String(form.farmerId)
      ) || null
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
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleRowChange = (index, field, value) => {
    setRows((prev) =>
      prev.map((r, i) =>
        i === index ? { ...r, [field]: value } : r
      )
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
const response = await fetch(
        window.location.origin + "/templates/Sample_Palamboon.docx"
      );
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

  const printTemplate = async () => {
    if (!validateForm()) return;

    try {
      const pdfBuffer = await window.api.printForm(buildDocData());

      const blob = new Blob([pdfBuffer], {
        type: "application/pdf",
      });

      const url = URL.createObjectURL(blob);

      const win = window.open(url);

      if (!win) {
        alert("Popup blocked. Please allow popups.");
        return;
      }

      win.onload = () => {
        win.print();
      };
    } catch (err) {
      console.error(err);
      alert("Print failed (offline backend).");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Forms Generation (Offline Electron Mode)</h2>

      <div style={{ display: "grid", gap: "10px", maxWidth: "900px" }}>
        <select
          name="farmerId"
          value={form.farmerId}
          onChange={handleFormChange}
        >
          <option value="">Select Farmer</option>
          {farmers.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>

        <input
          type="datetime-local"
          name="deliveryDT"
          value={form.deliveryDT}
          onChange={handleFormChange}
          onInput={(e) => e.target.blur()}
        />

        <input name="beanOrigin" placeholder="Bean Origin" value={form.beanOrigin} onChange={handleFormChange} />
        <input name="beanAltitude" placeholder="Bean Altitude" value={form.beanAltitude} onChange={handleFormChange} />
        <input name="remarks" placeholder="Remarks" value={form.remarks} onChange={handleFormChange} />
        <input name="receiverName" placeholder="Receiver Name" value={form.receiverName} onChange={handleFormChange} />
        <input name="payorName" placeholder="Payor Name" value={form.payorName} onChange={handleFormChange} />
      </div>

      <h3 style={{ marginTop: "20px" }}>Rows</h3>

      {rows.map((row, i) => {
        const bean = getBeanById(row.beanId);
        const unitCost = bean?.pricePerUnit || 0;
        const total = unitCost * (row.volume || 0);

        return (
          <div key={i} style={{ border: "1px solid #ccc", padding: "10px" }}>
            <strong>Row {i + 1}</strong>

            <input value={row.arNo} placeholder="AR No" onChange={(e) => handleRowChange(i, "arNo", e.target.value)} />

            <select value={row.beanId} onChange={(e) => handleRowChange(i, "beanId", e.target.value)}>
              <option value="">Select Bean</option>
              {beans.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            <input value={unitCost} readOnly />
            <input
              type="number"
              placeholder="Volume"
              value={row.volume}
              onChange={(e) => handleRowChange(i, "volume", e.target.value)}
            />
            <input value={total} readOnly />

            <input type="datetime-local" value={row.paymentDT} onChange={(e) => { handleRowChange(i, "paymentDT", e.target.value); e.target.blur(); }} />

            <input
              placeholder="Remarks"
              value={row.remarks2}
              onChange={(e) => handleRowChange(i, "remarks2", e.target.value)}
            />

            <button onClick={() => removeRow(i)}>Remove</button>
          </div>
        );
      })}

      <button onClick={addRow}>+ Add Row</button>

      <h3>Grand Total: ₱{grandTotal.toFixed(2)}</h3>

      <div style={{ display: "flex", gap: "10px" }}>
        <button onClick={exportDocx}>Export DOCX</button>
        <button onClick={printTemplate}>Print</button>
      </div>
    </div>
  );
}

export default FormsGeneration;