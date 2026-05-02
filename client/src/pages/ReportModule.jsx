import React, { useState } from "react";
import "./report.css";
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
  const [error, setError] = useState(null);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const years = Array.from(
    { length: 10 },
    (_, i) => new Date().getFullYear() - 5 + i
  );

  const getAuthToken = () => {
    return localStorage.getItem("token") || sessionStorage.getItem("token");
  };

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    setReportData(null);

    const token = getAuthToken();

    if (!token) {
      setError("Please login to generate reports");
      setLoading(false);
      return;
    }

    try {
      let endpoint = `${import.meta.env.VITE_API_URL}/api/reports/`;
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

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || "Failed to generate report");
      }

      setReportData(result);
    } catch (err) {
      console.error("REPORT ERROR:", err);
      setError(err.message || "Failed to fetch");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const renderSalesChart = () => {
    if (!reportData?.data) return null;

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

    if (rangeType === "range" && Array.isArray(reportData.data)) {
      const lineData = {
        labels: reportData.data.map((d) => d.monthName),
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  return (
    <div className="report-module">
      <div className="report-header">
        <div>
          <h1>📊 Monthly Report Generation</h1>
          <p>Generate consolidated reports for coffee bean transactions</p>
        </div>

        <button onClick={handlePrint} className="print-btn">
          🖨️ Print / Save as PDF
        </button>
      </div>

      <div className="report-controls">
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
                  <option key={m} value={idx + 1}>
                    {m}
                  </option>
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
                  <option key={y} value={y}>
                    {y}
                  </option>
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
                  <option key={m} value={idx + 1}>
                    {m}
                  </option>
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
                  <option key={y} value={y}>
                    {y}
                  </option>
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
                  <option key={m} value={idx + 1}>
                    {m}
                  </option>
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
                  <option key={y} value={y}>
                    {y}
                  </option>
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

      {error && <div className="error-message">⚠️ {error}</div>}

      {reportData && (
        <div className="report-content" id="report-content">
          <div className="report-title">
            <h2>☕ DTI Coffee Bean Trading Report</h2>
            <p>
              {rangeType === "single"
                ? `${months[month - 1]} ${year}`
                : `${months[startMonth - 1]} ${startYear} - ${
                    months[endMonth - 1]
                  } ${endYear}`}
            </p>
            <p className="generated-date">
              Generated on: {new Date().toLocaleString()}
            </p>
          </div>

          <div className="charts-section">
            <h3>📈 Visual Analytics</h3>
            {renderSalesChart()}
          </div>

          {reportType !== "per-farmer" && (
            <div className="organization-summary">
              <h3>🏢 Organization-Wide Summary</h3>

              {rangeType === "single" && reportData.data.organization && (
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
                      ).toFixed(2)}{" "}
                      kg
                    </p>
                    <small>coffee beans</small>
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
              )}

              {rangeType === "single" &&
                reportData.data.organization?.beanTypeSummary &&
                Object.keys(reportData.data.organization.beanTypeSummary)
                  .length > 0 && (
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

          {rangeType === "range" && Array.isArray(reportData.data) && (
            <div className="monthly-breakdown">
              <h3>📆 Monthly Breakdown</h3>

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
                        <td>
                          <strong>
                            {monthData.monthName} {monthData.year}
                          </strong>
                        </td>
                        <td>
                          {monthData.organization?.totalDeliveries || 0}
                        </td>
                        <td>
                          {(
                            monthData.organization?.totalVolumeSold || 0
                          ).toFixed(2)}
                        </td>
                        <td>
                          {formatCurrency(
                            monthData.organization?.totalSalesGenerated
                          )}
                        </td>
                        <td>{monthData.organization?.uniqueFarmers || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {reportType !== "organization" &&
            reportData.data.perFarmer &&
            reportData.data.perFarmer.length > 0 && (
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
                      {reportData.data.perFarmer.map((farmer, idx) => (
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

                    <tfoot>
                      <tr className="total-row">
                        <td colSpan="5">
                          <strong>Total</strong>
                        </td>
                        <td>
                          <strong>
                            {reportData.data.perFarmer
                              .reduce(
                                (sum, f) => sum + (f.volumeSold || 0),
                                0
                              )
                              .toFixed(2)}
                          </strong>
                        </td>
                        <td>
                          <strong>
                            {formatCurrency(
                              reportData.data.perFarmer.reduce(
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

          {reportType !== "organization" &&
            reportData.data.perFarmer &&
            reportData.data.perFarmer.length === 0 && (
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