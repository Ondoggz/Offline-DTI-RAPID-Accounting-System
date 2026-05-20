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
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const years = Array.from(
    { length: 10 },
    (_, i) => new Date().getFullYear() - 5 + i
  );

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    setReportData(null);

    try {
      const deliveries = await window.api.getDeliveries();
      const payments = await window.api.getPayments();
      const farmers = await window.api.getFarmers();

      if (!deliveries) {
        setError("No offline data found.");
        setLoading(false);
        return;
      }

      if (rangeType === "single") {
        const filtered = deliveries.filter((d) => {
          const date = new Date(d.date);
          return date.getMonth() + 1 === month && date.getFullYear() === year;
        });

        const organization = buildOrgSummary(filtered);
        const perFarmer = buildPerFarmerSummary(filtered, farmers);

        setReportData({
          data: { organization, perFarmer, payments, farmers },
        });
      } else {
        const monthlyData = [];

        let cur = new Date(startYear, startMonth - 1);
        const end = new Date(endYear, endMonth - 1);

        while (cur <= end) {
          const m = cur.getMonth() + 1;
          const y = cur.getFullYear();

          const filtered = deliveries.filter((d) => {
            const date = new Date(d.date);
            return date.getMonth() + 1 === m && date.getFullYear() === y;
          });

          monthlyData.push({
            monthName: months[m - 1],
            year: y,
            organization: buildOrgSummary(filtered),
            perFarmer: buildPerFarmerSummary(filtered, farmers),
          });

          cur.setMonth(cur.getMonth() + 1);
        }

        const allFiltered = deliveries.filter((d) => {
          const date = new Date(d.date);
          const start = new Date(startYear, startMonth - 1);
          const endDate = new Date(endYear, endMonth);
          return date >= start && date < endDate;
        });

        setReportData({
          data: monthlyData,
          perFarmer: buildPerFarmerSummary(allFiltered, farmers),
          payments,
          farmers,
        });
      }
    } catch (err) {
      console.error(err);
      setError("Failed to generate offline report.");
    } finally {
      setLoading(false);
    }
  };

  function buildOrgSummary(filtered) {
    const beanTypeSummary = {};

    filtered.forEach((d) => {
      if (!beanTypeSummary[d.beanType]) {
        beanTypeSummary[d.beanType] = { volumeSold: 0, salesGenerated: 0 };
      }

      beanTypeSummary[d.beanType].volumeSold += d.volume || 0;
      beanTypeSummary[d.beanType].salesGenerated += d.totalAmount || 0;
    });

    return {
      totalDeliveries: filtered.length,
      totalVolumeSold: filtered.reduce((sum, d) => sum + (d.volume || 0), 0),
      totalSalesGenerated: filtered.reduce(
        (sum, d) => sum + (d.totalAmount || 0),
        0
      ),
      uniqueFarmers: new Set(filtered.map((d) => d.farmer)).size,
      beanTypeSummary,
    };
  }

  function buildPerFarmerSummary(filtered, farmers) {
    const farmerMap = {};

    filtered.forEach((d) => {
      if (!farmerMap[d.farmer]) {
        const fullFarmer = farmers.find((f) => f.name === d.farmer);

        farmerMap[d.farmer] = {
          farmerId: fullFarmer?.farmerID || d.farmer,
          farmerName: d.farmer,
          farmerAddress: fullFarmer?.residentialAddress || "-",
          contactNumber: fullFarmer?.contactNumber || d.farmerContact || "-",
          deliveries: 0,
          volumeSold: 0,
          salesGenerated: 0,
        };
      }

      farmerMap[d.farmer].deliveries += 1;
      farmerMap[d.farmer].volumeSold += d.volume || 0;
      farmerMap[d.farmer].salesGenerated += d.totalAmount || 0;
    });

    return Object.values(farmerMap);
  }

  const exportPDF = async () => {
    const report = document.getElementById("report-content");

    if (!report) {
      setError("Generate report first.");
      return;
    }

    try {
      setExporting(true);
      setError(null);

      const sections = report.querySelectorAll(
        ".report-title, .charts-section, .organization-summary, .monthly-breakdown, .farmer-table-container, .no-data"
      );

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const margin = 10;
      const usableWidth = pageWidth - margin * 2;
      let y = margin;

      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];

        const canvas = await html2canvas(section, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
        });

        const imgHeight = (canvas.height * usableWidth) / canvas.width;

        if (imgHeight > pageHeight - margin * 2) {
          let sourceY = 0;

          while (sourceY < canvas.height) {
            const sliceCanvas = document.createElement("canvas");
            const sliceCtx = sliceCanvas.getContext("2d");

            const sliceHeight = Math.min(
              canvas.height - sourceY,
              ((pageHeight - margin * 2) * canvas.width) / usableWidth
            );

            sliceCanvas.width = canvas.width;
            sliceCanvas.height = sliceHeight;

            sliceCtx.drawImage(
              canvas,
              0,
              sourceY,
              canvas.width,
              sliceHeight,
              0,
              0,
              canvas.width,
              sliceHeight
            );

            const sliceImgData = sliceCanvas.toDataURL("image/png");
            const sliceImgHeight =
              (sliceCanvas.height * usableWidth) / sliceCanvas.width;

            if (y !== margin) {
              pdf.addPage();
              y = margin;
            }

            pdf.addImage(
              sliceImgData,
              "PNG",
              margin,
              y,
              usableWidth,
              sliceImgHeight
            );

            sourceY += sliceHeight;

            if (sourceY < canvas.height) {
              pdf.addPage();
              y = margin;
            }
          }
        } else {
          if (y + imgHeight > pageHeight - margin && y !== margin) {
            pdf.addPage();
            y = margin;
          }

          const imgData = canvas.toDataURL("image/png");

          pdf.addImage(imgData, "PNG", margin, y, usableWidth, imgHeight);
          y += imgHeight + 8;
        }
      }

      pdf.save("DTI-Product-Report.pdf");
    } catch (err) {
      console.error("PDF EXPORT ERROR:", err);
      setError("Failed to export PDF.");
    } finally {
      setExporting(false);
    }
  };

  const renderSalesChart = () => {
    if (!reportData?.data) return null;

    if (rangeType === "single" && reportData.data.organization) {
      const org = reportData.data.organization;

      const barData = {
        labels: ["Volume Sold", "Sales Generated (₱)"],
        datasets: [
          {
            label: "Current Month",
            data: [org.totalVolumeSold || 0, org.totalSalesGenerated || 0],
            backgroundColor: ["#4CAF50", "#2196F3"],
            borderColor: ["#388E3C", "#1976D2"],
            borderWidth: 1,
          },
        ],
      };

      let pieData = null;

      if (org.beanTypeSummary && Object.keys(org.beanTypeSummary).length > 0) {
        pieData = {
          labels: Object.keys(org.beanTypeSummary),
          datasets: [
            {
              label: "Sales by Product Type",
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
              <Bar
                data={barData}
                options={{ responsive: true, maintainAspectRatio: false }}
              />
            </div>
          </div>

          {pieData && (
            <div className="chart-card">
              <h4>Sales by Product Type</h4>

              <div className="chart-wrapper-small">
                <Pie
                  data={pieData}
                  options={{ responsive: true, maintainAspectRatio: false }}
                />
              </div>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(amount || 0);

  const getPerFarmer = () => {
    if (rangeType === "single") return reportData?.data?.perFarmer || [];
    return reportData?.perFarmer || [];
  };

  return (
    <div className="report-module">
      <div className="report-header no-print">
        <div>
          <h2>Monthly Report Generation</h2>
        </div>

        <div className="report-actions">
          <button
            onClick={exportPDF}
            className="print-btn"
            disabled={exporting}
          >
            {exporting ? "Exporting..." : "📄 Export PDF"}
          </button>
        </div>
      </div>

      <div className="report-controls no-print">
        <button
          onClick={generateReport}
          disabled={loading}
          className="generate-btn"
        >
          {loading ? "⏳ Generating..." : "🚀 Generate Report"}
        </button>
      </div>

      {error && (
        <div className="warning-bubble no-print">
          ⚠️ {error}
        </div>
      )}

      {reportData && (
        <div className="report-content" id="report-content">
          <div className="report-title">
            <h2>DTI Product Trading Report</h2>

            <p>
              {months[month - 1]} {year}
            </p>

            <p className="generated-date">
              Generated on: {new Date().toLocaleString()}
            </p>
          </div>

          <div className="charts-section">
            <h3>Visual Analytics</h3>
            {renderSalesChart()}
          </div>

          {reportData.data?.organization && (
            <div className="organization-summary">
              <h3>Organization-Wide Summary</h3>

              <div className="summary-cards">
                <div className="card">
                  <h4>Total Deliveries</h4>
                  <p>{reportData.data.organization.totalDeliveries || 0}</p>
                  <small>deliveries recorded</small>
                </div>

                <div className="card">
                  <h4>Volume Sold</h4>
                  <p>
                    {(
                      reportData.data.organization.totalVolumeSold || 0
                    ).toFixed(2)}
                  </p>
                  <small>products sold</small>
                </div>

                <div className="card">
                  <h4>Sales Generated</h4>

                  <p>
                    {formatCurrency(
                      reportData.data.organization.totalSalesGenerated
                    )}
                  </p>

                  <small>total revenue</small>
                </div>

                <div className="card">
                  <h4>Active Farmers</h4>

                  <p>{reportData.data.organization.uniqueFarmers || 0}</p>

                  <small>with transactions</small>
                </div>
              </div>

              {reportData.data.organization.beanTypeSummary &&
                Object.keys(reportData.data.organization.beanTypeSummary)
                  .length > 0 && (
                  <div className="bean-breakdown">
                    <h4>Product Type Breakdown</h4>

                    <table className="report-table">
                      <thead>
                        <tr>
                          <th>Product Type</th>
                          <th>Volume Sold</th>
                          <th>Sales Generated</th>
                        </tr>
                      </thead>

                      <tbody>
                        {Object.entries(
                          reportData.data.organization.beanTypeSummary
                        ).map(([beanType, data]) => (
                          <tr key={beanType}>
                            <td>
                              <strong>{beanType}</strong>
                            </td>

                            <td>{(data.volumeSold || 0).toFixed(2)}</td>

                            <td>{formatCurrency(data.salesGenerated)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
            </div>
          )}

          {reportType !== "organization" && getPerFarmer().length > 0 && (
            <div className="farmer-table-container">
              <h3>👨‍🌾 Per-Farmer Report</h3>

              <div className="table-responsive">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Farmer ID</th>
                      <th>Farmer Name</th>
                      <th>Address</th>
                      <th>Contact</th>
                      <th>Deliveries</th>
                      <th>Volume Sold</th>
                      <th>Sales Generated</th>
                    </tr>
                  </thead>

                  <tbody>
                    {getPerFarmer().map((farmer, idx) => (
                      <tr key={idx}>
                        <td>{farmer.farmerId}</td>

                        <td>
                          <strong>{farmer.farmerName}</strong>
                        </td>

                        <td>{farmer.farmerAddress || "-"}</td>

                        <td>{farmer.contactNumber || "-"}</td>

                        <td>{farmer.deliveries || 0}</td>

                        <td>{(farmer.volumeSold || 0).toFixed(2)}</td>

                        <td className="sales-amount">
                          {formatCurrency(farmer.salesGenerated)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportModule;