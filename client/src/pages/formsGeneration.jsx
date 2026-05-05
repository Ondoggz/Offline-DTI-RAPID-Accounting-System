import { useEffect, useMemo, useState } from "react";
import axios from "axios";
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

  const token = localStorage.getItem("token");
  const API = import.meta.env.VITE_API_URL;

  const numberToWords = (num) => {
    const ones = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ];

    const tens = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];

    const convertHundreds = (n) => {
      let word = "";

      if (n >= 100) {
        word += `${ones[Math.floor(n / 100)]} Hundred `;
        n %= 100;
      }

      if (n >= 20) {
        word += `${tens[Math.floor(n / 10)]} `;
        n %= 10;
      }

      if (n > 0) {
        word += `${ones[n]} `;
      }

      return word.trim();
    };

    if (!num || Number(num) === 0) return "Zero Pesos Only";

    let words = "";
    let n = Math.floor(Number(num));

    if (n >= 1000000) {
      words += `${convertHundreds(Math.floor(n / 1000000))} Million `;
      n %= 1000000;
    }

    if (n >= 1000) {
      words += `${convertHundreds(Math.floor(n / 1000))} Thousand `;
      n %= 1000;
    }

    if (n > 0) {
      words += convertHundreds(n);
    }

    return `${words.trim()} Pesos Only`;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [farmersRes, beansRes] = await Promise.all([
          axios.get(`${API}/api/farmers`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API}/api/beans`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setFarmers(farmersRes.data);

        setBeans(
          beansRes.data.map((bean) => ({
            id: bean._id,
            name: bean.beanName,
            pricePerUnit: bean.pricePerUnit,
            unit: bean.unit,
          }))
        );
      } catch (err) {
        console.error(err);
        alert("Failed to load farmers or beans.");
      }
    };

    if (API && token) {
      fetchData();
    }
  }, [API, token]);

  const selectedFarmer = useMemo(() => {
    return farmers.find((farmer) => farmer._id === form.farmerId);
  }, [farmers, form.farmerId]);

  const getBeanById = (beanId) => {
    return beans.find((bean) => bean.id === beanId);
  };

  const computedRows = rows.map((row) => {
    const bean = getBeanById(row.beanId);
    const unitCost = Number(bean?.pricePerUnit || 0);
    const volume = Number(row.volume || 0);
    const totalAmount = unitCost * volume;

    return {
      arNo: row.arNo,
      particulars: bean?.name || "",
      unitCost,
      volume: row.volume,
      totalAmount,
      totalPayable: totalAmount,
      paymentDT: row.paymentDT,
      payment_DT: row.paymentDT,
      remarks2: row.remarks2,
    };
  });

  const grandTotal = computedRows.reduce(
    (sum, row) => sum + Number(row.totalAmount || 0),
    0
  );

  const buildDocData = () => ({
    idNumber: selectedFarmer?.farmerID || "",
    name: selectedFarmer?.name || "",
    residentialAddress: selectedFarmer?.address || "",
    farmAddress: selectedFarmer?.farmAddress || selectedFarmer?.address || "",
    sex: selectedFarmer?.sex || "",
    age: selectedFarmer?.age || "",
    contactNumber: selectedFarmer?.contactNumber || "",
    emailAddress: selectedFarmer?.emailAddress || "",

    deliveryDT: form.deliveryDT,
    beanOrigin: form.beanOrigin,
    beanAltitude: form.beanAltitude,
    remarks: form.remarks,

    senderName: selectedFarmer?.name || "",
    receiverName: form.receiverName,
    payeeName: selectedFarmer?.name || "",
    payorName: form.payorName,

    amountInFigures: grandTotal,
    amountInWords: numberToWords(grandTotal),

    rows: computedRows,
  });

  const validateForm = () => {
    if (!selectedFarmer) {
      alert("Please select a farmer.");
      return false;
    }

    if (computedRows.some((row) => !row.particulars || !row.volume)) {
      alert("Please complete all row bean types and volumes.");
      return false;
    }

    return true;
  };

  const handleFormChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleRowChange = (index, field, value) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
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

      saveAs(blob, `Palamboon-${selectedFarmer.name || "form"}.docx`);
    } catch (err) {
      console.error(err);
      alert("Failed to generate DOCX. Check your placeholders.");
    }
  };

  const printTemplate = async () => {
    if (!validateForm()) return;

    try {
      const response = await axios.post(
        `${API}/api/forms/print`,
        buildDocData(),
        {
          responseType: "blob",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const pdfBlob = new Blob([response.data], {
        type: "application/pdf",
      });

      const pdfUrl = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(pdfUrl, "_blank");

      if (!printWindow) {
        alert("Popup blocked. Please allow popups for this site.");
        return;
      }

      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
    } catch (err) {
      console.error(err);
      alert("Failed to print template.");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Forms Generation</h2>

      <div style={{ display: "grid", gap: "10px", maxWidth: "900px" }}>
        <select
          name="farmerId"
          value={form.farmerId}
          onChange={handleFormChange}
        >
          <option value="">Select Farmer</option>
          {farmers.map((farmer) => (
            <option key={farmer._id} value={farmer._id}>
              {farmer.name}
            </option>
          ))}
        </select>

        <input
          name="deliveryDT"
          type="datetime-local"
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
          placeholder="Received By"
          value={form.receiverName}
          onChange={handleFormChange}
        />

        <input
          name="payorName"
          placeholder="Payor"
          value={form.payorName}
          onChange={handleFormChange}
        />
      </div>

      <h3 style={{ marginTop: "20px" }}>Rows</h3>

      {rows.map((row, index) => {
        const bean = getBeanById(row.beanId);
        const unitCost = Number(bean?.pricePerUnit || 0);
        const totalAmount = unitCost * Number(row.volume || 0);

        return (
          <div
            key={index}
            style={{
              border: "1px solid #555",
              padding: "12px",
              marginBottom: "12px",
              display: "grid",
              gap: "8px",
              maxWidth: "900px",
            }}
          >
            <strong>Row {index + 1}</strong>

            <input
              placeholder="AR No."
              value={row.arNo}
              onChange={(e) =>
                handleRowChange(index, "arNo", e.target.value)
              }
            />

            <select
              value={row.beanId}
              onChange={(e) =>
                handleRowChange(index, "beanId", e.target.value)
              }
            >
              <option value="">Select Bean</option>
              {beans.map((bean) => (
                <option key={bean.id} value={bean.id}>
                  {bean.name}
                </option>
              ))}
            </select>

            <input value={unitCost} readOnly placeholder="Unit Cost" />

            <input
              type="number"
              placeholder="Volume"
              value={row.volume}
              onChange={(e) =>
                handleRowChange(index, "volume", e.target.value)
              }
            />

            <input value={totalAmount} readOnly placeholder="Total" />

            <input
              type="datetime-local"
              value={row.paymentDT}
              onChange={(e) =>
                handleRowChange(index, "paymentDT", e.target.value)
              }
            />

            <input
              placeholder="Row Remarks"
              value={row.remarks2}
              onChange={(e) =>
                handleRowChange(index, "remarks2", e.target.value)
              }
            />

            {rows.length > 1 && (
              <button type="button" onClick={() => removeRow(index)}>
                Remove Row
              </button>
            )}
          </div>
        );
      })}

      <button type="button" onClick={addRow}>
        + Add Row
      </button>

      <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
        <button onClick={exportDocx}>Export DOCX</button>
        <button onClick={printTemplate}>Print Template</button>
      </div>
    </div>
  );
}

export default FormsGeneration;