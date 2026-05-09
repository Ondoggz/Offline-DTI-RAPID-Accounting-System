import React, { useState, useEffect } from "react";
import "./report.css";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from "chart.js";
import { Bar, Pie, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const ReportModule = () => {
  const API = import.meta.env.VITE_API_URL;

  const [reportType, setReportType] = useState("both");
  const [rangeType, setRangeType] = useState("single");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [startMonth, setStartMonth] = useState(1);
  const [startYear, setStartYear] = useState(new Date().getFullYear());
  const [endMonth, setEndMonth] = useState(new Date().getMonth() + 1);
  const [endYear, setEndYear] = useState(new Date().getFullYear());
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];

  const years = Array.from(
    { length: 10 },
    (_, i) => new Date().getFullYear() - 5 + i
  );

  const getAuthToken = () =>
    localStorage.getItem("token") || sessionStorage.getItem("token");

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    setReportData(null);

    const token = getAuthToken();

    if (!token) {
      setError("Please login first");
      setLoading(false);
      return;
    }

    try {
      let endpoint = `${API}/api/reports/`;
      const body = { reportType };

      if (rangeType === "single") {
        endpoint += "monthly";
        body.month = month;
        body.year = year;
      } else {
        endpoint += "multi-month";
        body.startMonth = startMonth;
        body.startYear = startYear;
        body.endMonth = endMonth;
        body.endYear = endYear;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed");

      setReportData(data);

      // force chart rerender stability
      setTimeout(() => window.dispatchEvent(new Event("resize")), 300);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    if (!reportData) return alert("Generate report first");

    await new Promise((r) => setTimeout(r, 1000));
    window.print();
  };

  const exportPDF = async () => {
    const el = document.getElementById("report-content");
    if (!el) return;

    try {
      setExporting(true);

      await new Promise((r) => setTimeout(r, 1200));

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#fff",
        scrollY: -window.scrollY,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save("report.pdf");
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (v) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(v || 0);

  return (
    <div className="report-module">
      <div className="report-header no-print">
        <div>
          <h1>Monthly Report</h1>
          <p>Generate coffee bean reports</p>
        </div>

        <div className="report-actions">
          <button className="print-btn" onClick={handlePrint}>
            Print
          </button>
          <button className="print-btn" onClick={exportPDF} disabled={exporting}>
            {exporting ? "Exporting..." : "Export PDF"}
          </button>
        </div>
      </div>

      <div className="report-controls no-print">
        <button onClick={generateReport} disabled={loading} className="generate-btn">
          {loading ? "Loading..." : "Generate"}
        </button>
      </div>

      {error && <div className="error-message no-print">{error}</div>}

      {reportData && (
        <div id="report-content" className="report-content">
          <h2 className="report-title">Coffee Report</h2>

          <div className="charts-grid">
            <div className="chart-card">
              <Bar data={{ labels: ["A"], datasets: [{ data: [10] }] }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportModule;