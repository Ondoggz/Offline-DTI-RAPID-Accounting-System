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
     GENERATE REPORT (OFFLINE)
  ========================= */
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

      // ── Single month report ──────────────────────────────────────────────
      if (rangeType === "single") {
        const filtered = deliveries.filter((d) => {
          const date = new Date(d.date);
          return (
            date.getMonth() + 1 === month &&
            date.getFullYear() === year
          );
        });

        const organization = buildOrgSummary(filtered);
        const perFarmer = buildPerFarmerSummary(filtered, farmers);

        setReportData({
          data: { organization, perFarmer, payments, farmers },
        });

      // ── Month range report ───────────────────────────────────────────────
      } else {
        // Build a month-by-month breakdown between start and end
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

        // Also build an aggregate perFarmer for the full range
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

  /* =========================
     HELPERS
  ========================= */
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
      totalSalesGenerated: filtered.reduce((sum, d) => sum + (d.totalAmount || 0), 0),
      uniqueFarmers: new Set(filtered.map((d) => d.farmer)).size,
      beanTypeSummary,
    };
  }

  function buildPerFarmerSummary(filtered, farmers) {
    const farmerMap = {};

    filtered.forEach((d) => {
      if (!farmerMap[d.farmer]) {
        // Try to find full farmer info from local DB
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

  /* =========================
     PDF EXPORT (MULTI-PAGE)
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
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save("DTI-Coffee-Bean-Report.pdf");
    } catch (err) {
      console.error("PDF EXPORT ERROR:", err);
      alert("Failed to export PDF.");
    } finally {
      setExporting(false);
    }
  };

  /* =========================
     CHARTS
  ========================= */
  const renderSalesChart = () => {
    if (!reportData?.data) return null;

    // Single month — bar + pie
    if (rangeType === "single" && reportData.data.organization) {
      const org = reportData.data.organization;

      const barData = {
        labels: ["Volume Sold (kg)", "Sales Generated (₱)"],
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
              label: "Sales by Bean Type",
              data: Object.values(org.beanTypeSummary).map(
                (v) => v.salesGenerated || 0
              ),
              backgroundColor: [
                "#FF6384","#36A2EB","#FFCE56","#4BC0C0","#9966FF",
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
              <h4>Sales by Bean Type</h4>
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

    // Month range — line chart
    if (rangeType === "range" && Array.isArray(reportData.data)) {
      const lineData = {
        labels: reportData.data.map((d) => `${d.monthName} ${d.year}`),
        datasets: [
          {
            label: "Volume Sold (kg)",
            data: reportData.data.map(
              (d) => d.organization?.totalVolumeSold || 0
            ),
            borderColor: "#4CAF50",
            backgroundColor: "rgba(76, 175, 80, 0.1)",
            fill: true,
            tension: 0.4,
          },
          {
            label: "Sales Generated (₱)",
            data: reportData.data.map(
              (d) => d.organization?.totalSalesGenerated || 0
            ),
            borderColor: "#FF9800",
            backgroundColor: "rgba(255, 152, 0, 0.1)",
            fill: true,
            tension: 0.4,
          },
        ],
      };

      return (
        <div className="chart-card full-width">
          <h4>Trend Analysis</h4>
          <div className="chart-wrapper-large">
            <Line
              data={lineData}
              options={{ responsive: true, maintainAspectRatio: false }}
            />
          </div>
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

  // Helper to get perFarmer regardless of rangeType shape
  const getPerFarmer = () => {
    if (rangeType === "single") return reportData?.data?.perFarmer || [];
    return reportData?.perFarmer || [];
  };

  /* =========================
     UI
  ========================= */
  return (
    <div className="report-module">
      <div className="report-header no-print">
        <div>
          <h2>Monthly Report Generation</h2>
          <p>Offline Mode (Electron DB)</p>
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

      {/* Controls */}
      <div className="report-controls no-print">
        <div className="form-group">
          <label>Report Type:</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
          >
            <option value="per-farmer">👨‍🌾 Per-Farmer Report</option>
            <option value="organization">🏢 Organization-Wide Report</option>
            <option value="both">📋 Combined Report</option>
          </select>
        </div>

        <div className="form-group">
          <label>Date Range:</label>
          <select
            value={rangeType}
            onChange={(e) => setRangeType(e.target.value)}
          >
            <option value="single">📅 Single Month</option>
            <option value="range">📆 Month Range</option>
          </select>
        </div>

        {rangeType === "single" ? (
          <>
            <div className="form-group">
              <label>Month:</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {months.map((m, idx) => (
                  <option key={m} value={idx + 1}>{m}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Year:</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <>
            <div className="form-group">
              <label>Start Month:</label>
              <select
                value={startMonth}
                onChange={(e) => setStartMonth(Number(e.target.value))}
              >
                {months.map((m, idx) => (
                  <option key={m} value={idx + 1}>{m}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Start Year:</label>
              <select
                value={startYear}
                onChange={(e) => setStartYear(Number(e.target.value))}
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>End Month:</label>
              <select
                value={endMonth}
                onChange={(e) => setEndMonth(Number(e.target.value))}
              >
                {months.map((m, idx) => (
                  <option key={m} value={idx + 1}>{m}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>End Year:</label>
              <select
                value={endYear}
                onChange={(e) => setEndYear(Number(e.target.value))}
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </>
        )}

        <button
          onClick={generateReport}
          disabled={loading}
          className="generate-btn"
        >
          {loading ? "⏳ Generating..." : "🚀 Generate Report"}
        </button>
      </div>

      {error && <div className="error-message no-print">⚠️ {error}</div>}

      {reportData && (
        <div className="report-content" id="report-content">
          {/* Title */}
          <div className="report-title">
            <h2>DTI Coffee Bean Trading Report</h2>
            <p>
              {rangeType === "single"
                ? `${months[month - 1]} ${year}`
                : `${months[startMonth - 1]} ${startYear} — ${months[endMonth - 1]} ${endYear}`}
            </p>
            <p className="generated-date">
              Generated on: {new Date().toLocaleString()}
            </p>
          </div>

          {/* Charts */}
          <div className="charts-section">
            <h3>Visual Analytics</h3>
            {renderSalesChart()}
          </div>

          {/* Organization summary — single month */}
          {reportType !== "per-farmer" && rangeType === "single" &&
            reportData.data?.organization && (
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
                    {(reportData.data.organization.totalVolumeSold || 0).toFixed(2)} kg
                  </p>
                  <small>coffee beans</small>
                </div>

                <div className="card">
                  <h4>Sales Generated</h4>
                  <p>{formatCurrency(reportData.data.organization.totalSalesGenerated)}</p>
                  <small>total revenue</small>
                </div>

                <div className="card">
                  <h4>Active Farmers</h4>
                  <p>{reportData.data.organization.uniqueFarmers || 0}</p>
                  <small>with transactions</small>
                </div>
              </div>

              {/* Bean type breakdown */}
              {reportData.data.organization.beanTypeSummary &&
                Object.keys(reportData.data.organization.beanTypeSummary).length > 0 && (
                <div className="bean-breakdown">
                  <h4>Bean Type Breakdown</h4>
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Bean Type</th>
                        <th>Volume Sold (kg)</th>
                        <th>Sales Generated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(
                        reportData.data.organization.beanTypeSummary
                      ).map(([beanType, data]) => (
                        <tr key={beanType}>
                          <td><strong>{beanType}</strong></td>
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

          {/* Monthly breakdown — range */}
          {rangeType === "range" && Array.isArray(reportData.data) && (
            <div className="monthly-breakdown">
              <h3>Monthly Breakdown</h3>
              <div className="table-responsive">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Deliveries</th>
                      <th>Volume Sold (kg)</th>
                      <th>Sales Generated</th>
                      <th>Active Farmers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.data.map((monthData, idx) => (
                      <tr key={idx}>
                        <td><strong>{monthData.monthName} {monthData.year}</strong></td>
                        <td>{monthData.organization?.totalDeliveries || 0}</td>
                        <td>
                          {(monthData.organization?.totalVolumeSold || 0).toFixed(2)}
                        </td>
                        <td>
                          {formatCurrency(monthData.organization?.totalSalesGenerated)}
                        </td>
                        <td>{monthData.organization?.uniqueFarmers || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Per-farmer table */}
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
                      <th>Volume Sold (kg)</th>
                      <th>Sales Generated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPerFarmer().map((farmer, idx) => (
                      <tr key={idx}>
                        <td>{farmer.farmerId}</td>
                        <td><strong>{farmer.farmerName}</strong></td>
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
                  <tfoot>
                    <tr className="total-row">
                      <td colSpan="5"><strong>Total</strong></td>
                      <td>
                        <strong>
                          {getPerFarmer()
                            .reduce((sum, f) => sum + (f.volumeSold || 0), 0)
                            .toFixed(2)}
                        </strong>
                      </td>
                      <td>
                        <strong>
                          {formatCurrency(
                            getPerFarmer().reduce(
                              (sum, f) => sum + (f.salesGenerated || 0),
                              0
                            )
                          )}
                        </strong>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {reportType !== "organization" && getPerFarmer().length === 0 && (
            <div className="no-data">
              <p>📭 No farmer transactions found for this period.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportModule;