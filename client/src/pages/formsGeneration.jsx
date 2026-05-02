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
          axios.get(`${API_URL}/api/farmers`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_URL}/api/beans`, {
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
      }
    };

    fetchData();
  }, [token]);

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
      prev.map((row, i) =>
        i === index ? { ...row, [field]: value } : row
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
        `${API_URL}/api/forms/print`,
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
      const printWindow = window.open(pdfUrl);

      printWindow.onload = () => {
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

      {/* UI unchanged */}
    </div>
  );
}

export default FormsGeneration;