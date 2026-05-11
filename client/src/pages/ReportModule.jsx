import React, { useState } from "react";
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
    "July","August","September","October","November","December",
  ];

  const years = Array.from(
    { length: 10 },
    (_, i) => new Date().getFullYear() - 5 + i
  );

  /* =========================
     OFFLINE GENERATE REPORT
  ========================= */
  const generateReport = async () => {
    setLoading(true);
    setError(null);
    setReportData(null);

    try {
      // 🔥 OFFLINE IPC CALLS (Electron DB)
      const deliveries = await window.api.getDeliveries();
      const payments = await window.api.getPayments();
      const farmers = await window.api.getFarmers();

      if (!deliveries) {
        setError("No offline data found.");
        setLoading(false);
        return;
      }

      const filterByDate = (d) => {
        const date = new Date(d.date);

        if (rangeType === "single") {
          return (
            date.getMonth() + 1 === month &&
            date.getFullYear() === year
          );
        }

        const start = new Date(startYear, startMonth - 1);
        const end = new Date(endYear, endMonth - 1);
        return date >= start && date <= end;
      };

      const filtered = deliveries.filter(filterByDate);

      /* =========================
         ORGANIZATION SUMMARY
      ========================= */
      const totalDeliveries = filtered.length;

      const totalVolumeSold = filtered.reduce(
        (sum, d) => sum + (d.volume || 0),
        0
      );

      const totalSalesGenerated = filtered.reduce(
        (sum, d) => sum + (d.totalAmount || 0),
        0
      );

      const uniqueFarmers = new Set(filtered.map((d) => d.farmer)).size;

      const beanTypeSummary = {};

      filtered.forEach((d) => {
        if (!beanTypeSummary[d.beanType]) {
          beanTypeSummary[d.beanType] = {
            volumeSold: 0,
            salesGenerated: 0,
          };
        }

        beanTypeSummary[d.beanType].volumeSold += d.volume || 0;
        beanTypeSummary[d.beanType].salesGenerated += d.totalAmount || 0;
      });

      /* =========================
         PER FARMER SUMMARY
      ========================= */
      const farmerMap = {};

      filtered.forEach((d) => {
        if (!farmerMap[d.farmer]) {
          farmerMap[d.farmer] = {
            farmerId: d.farmer,
            farmerName: d.farmer,
            farmerAddress: "-",
            contactNumber: d.farmerContact || "-",
            deliveries: 0,
            volumeSold: 0,
            salesGenerated: 0,
          };
        }

        farmerMap[d.farmer].deliveries += 1;
        farmerMap[d.farmer].volumeSold += d.volume || 0;
        farmerMap[d.farmer].salesGenerated += d.totalAmount || 0;
      });

      setReportData({
        data: {
          organization: {
            totalDeliveries,
            totalVolumeSold,
            totalSalesGenerated,
            uniqueFarmers,
            beanTypeSummary,
          },
          perFarmer: Object.values(farmerMap),
          payments,
          farmers,
        },
      });

    } catch (err) {
      console.error(err);
      setError("Failed to generate offline report.");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     PRINT
  ========================= */
  const handlePrint = () => {
    if (!reportData) return alert("Generate report first");
    setTimeout(() => window.print(), 300);
  };

  /* =========================
     PDF EXPORT
  ========================= */
  const exportPDF = async () => {
    const report = document.getElementById("report-content");
    if (!report) return alert("Generate report first");

    try {
      setExporting(true);

      const canvas = await html2canvas(report, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pageWidth, imgHeight);
      pdf.save("DTI-Coffee-Bean-Report.pdf");

    } catch (err) {
      console.error("PDF ERROR:", err);
    } finally {
      setExporting(false);
    }
  };

  /* =========================
     CHARTS (UNCHANGED)
  ========================= */
  const renderSalesChart = () => {
    if (!reportData?.data) return null;

    const org = reportData.data.organization;

    const barData = {
      labels: ["Volume Sold (kg)", "Sales Generated (₱)"],
      datasets: [
        {
          label: "Current Month",
          data: [
            org.totalVolumeSold || 0,
            org.totalSalesGenerated || 0
          ],
          backgroundColor: ["#4CAF50", "#2196F3"],
        },
      ],
    };

    let pieData = null;

    if (org.beanTypeSummary && Object.keys(org.beanTypeSummary).length > 0) {
      pieData = {
        labels: Object.keys(org.beanTypeSummary),
        datasets: [
          {
            label: "Sales by Bean Type",
            data: Object.values(org.beanTypeSummary).map(
              (v) => v.salesGenerated || 0
            ),
            backgroundColor: [
              "#FF6384",
              "#36A2EB",
              "#FFCE56",
              "#4BC0C0",
              "#9966FF",
            ],
          },
        ],
      };
    }

    return (
      <div className="charts-grid">
        <div className="chart-card">
          <h4>Monthly Summary</h4>
          <div className="chart-wrapper-small">
            <Bar data={barData} options={{ responsive: true }} />
          </div>
        </div>

        {pieData && (
          <div className="chart-card">
            <h4>Sales by Bean Type</h4>
            <div className="chart-wrapper-small">
              <Pie data={pieData} options={{ responsive: true }} />
            </div>
          </div>
        )}
      </div>
    );
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount || 0);

  /* =========================
     UI (UNCHANGED)
  ========================= */
  return (
    <div className="report-module">

      <div className="report-header no-print">
        <div>
          <h2>Monthly Report Generation</h2>
          <p>Offline Mode (Electron DB)</p>
        </div>

        <div className="report-actions">
          <button onClick={handlePrint}>🖨️ Print</button>
          <button onClick={exportPDF}>
            {exporting ? "Exporting..." : "📄 Export PDF"}
          </button>
        </div>
      </div>

      <div className="report-controls no-print">
        <button onClick={generateReport}>
          {loading ? "Generating..." : "🚀 Generate Report"}
        </button>
      </div>

      {error && <div>{error}</div>}

      {reportData && (
        <div id="report-content">

          <div className="charts-section">
            {renderSalesChart()}
          </div>

          <h3>Per Farmer</h3>

          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Deliveries</th>
                <th>Volume</th>
                <th>Sales</th>
              </tr>
            </thead>

            <tbody>
              {reportData.data.perFarmer.map((f, i) => (
                <tr key={i}>
                  <td>{f.farmerName}</td>
                  <td>{f.deliveries}</td>
                  <td>{f.volumeSold}</td>
                  <td>{f.salesGenerated}</td>
                </tr>
              ))}
            </tbody>
          </table>

        </div>
      )}
    </div>
  );
};

export default ReportModule;