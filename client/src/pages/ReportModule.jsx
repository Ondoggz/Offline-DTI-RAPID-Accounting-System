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
  const [scaleType, setScaleType] = useState("monthly");

  const [day, setDay] = useState(new Date().toISOString().slice(0, 10));
  const [startDay, setStartDay] = useState(new Date().toISOString().slice(0, 10));
  const [endDay, setEndDay] = useState(new Date().toISOString().slice(0, 10));

  const [weekStart, setWeekStart] = useState(new Date().toISOString().slice(0, 10));
  const [startWeek, setStartWeek] = useState(new Date().toISOString().slice(0, 10));
  const [endWeek, setEndWeek] = useState(new Date().toISOString().slice(0, 10));

  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [startMonth, setStartMonth] = useState(1);
  const [startYear, setStartYear] = useState(new Date().getFullYear());
  const [endMonth, setEndMonth] = useState(new Date().getMonth() + 1);
  const [endYear, setEndYear] = useState(new Date().getFullYear());

  const [singleYear, setSingleYear] = useState(new Date().getFullYear());
  const [rangeStartYear, setRangeStartYear] = useState(new Date().getFullYear());
  const [rangeEndYear, setRangeEndYear] = useState(new Date().getFullYear());

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

  const getDateOnly = (date) => {
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };

  const getWeekEnd = (dateValue) => {
    const start = getDateOnly(dateValue);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return end;
  };

  const getReportTitle = () => {
    if (scaleType === "daily") {
      if (rangeType === "single") return `Daily Report - ${new Date(day).toLocaleDateString()}`;
      return `Daily Range Report - ${new Date(startDay).toLocaleDateString()} to ${new Date(endDay).toLocaleDateString()}`;
    }

    if (scaleType === "weekly") {
      if (rangeType === "single") {
        return `Weekly Report - ${new Date(weekStart).toLocaleDateString()} to ${getWeekEnd(weekStart).toLocaleDateString()}`;
      }

      return `Weekly Range Report - ${new Date(startWeek).toLocaleDateString()} to ${getWeekEnd(endWeek).toLocaleDateString()}`;
    }

    if (scaleType === "monthly") {
      if (rangeType === "single") return `Monthly Report - ${months[month - 1]} ${year}`;
      return `Monthly Range Report - ${months[startMonth - 1]} ${startYear} to ${months[endMonth - 1]} ${endYear}`;
    }

    if (scaleType === "yearly") {
      if (rangeType === "single") return `Yearly Report - ${singleYear}`;
      return `Yearly Range Report - ${rangeStartYear} to ${rangeEndYear}`;
    }

    return "Report";
  };

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

      let filtered = [];
      let rangeData = [];

      if (rangeType === "single") {
        filtered = deliveries.filter((d) => {
          const date = getDateOnly(d.date);

          if (scaleType === "daily") {
            return date.getTime() === getDateOnly(day).getTime();
          }

          if (scaleType === "weekly") {
            const start = getDateOnly(weekStart);
            const end = getWeekEnd(weekStart);
            return date >= start && date <= end;
          }

          if (scaleType === "monthly") {
            return date.getMonth() + 1 === month && date.getFullYear() === year;
          }

          if (scaleType === "yearly") {
            return date.getFullYear() === Number(singleYear);
          }

          return false;
        });

        const organization = buildOrgSummary(filtered);
        const perFarmer = buildPerFarmerSummary(filtered, farmers);

        setReportData({
          data: { organization, perFarmer, payments, farmers },
          title: getReportTitle(),
        });
      } else {
        if (scaleType === "daily") {
          let cur = getDateOnly(startDay);
          const end = getDateOnly(endDay);

          while (cur <= end) {
            const currentDate = new Date(cur);

            const dayFiltered = deliveries.filter((d) => {
              const date = getDateOnly(d.date);
              return date.getTime() === currentDate.getTime();
            });

            rangeData.push({
              label: currentDate.toLocaleDateString(),
              organization: buildOrgSummary(dayFiltered),
              perFarmer: buildPerFarmerSummary(dayFiltered, farmers),
            });

            cur.setDate(cur.getDate() + 1);
          }

          filtered = deliveries.filter((d) => {
            const date = getDateOnly(d.date);
            return date >= getDateOnly(startDay) && date <= getDateOnly(endDay);
          });
        }

        if (scaleType === "weekly") {
          let cur = getDateOnly(startWeek);
          const end = getDateOnly(endWeek);

          while (cur <= end) {
            const currentStart = new Date(cur);
            const currentEnd = getWeekEnd(currentStart);

            const weekFiltered = deliveries.filter((d) => {
              const date = getDateOnly(d.date);
              return date >= currentStart && date <= currentEnd;
            });

            rangeData.push({
              label: `${currentStart.toLocaleDateString()} - ${currentEnd.toLocaleDateString()}`,
              organization: buildOrgSummary(weekFiltered),
              perFarmer: buildPerFarmerSummary(weekFiltered, farmers),
            });

            cur.setDate(cur.getDate() + 7);
          }

          filtered = deliveries.filter((d) => {
            const date = getDateOnly(d.date);
            return date >= getDateOnly(startWeek) && date <= getWeekEnd(endWeek);
          });
        }

        if (scaleType === "monthly") {
          let cur = new Date(startYear, startMonth - 1);
          const end = new Date(endYear, endMonth - 1);

          while (cur <= end) {
            const m = cur.getMonth() + 1;
            const y = cur.getFullYear();

            const monthFiltered = deliveries.filter((d) => {
              const date = new Date(d.date);
              return date.getMonth() + 1 === m && date.getFullYear() === y;
            });

            rangeData.push({
              label: `${months[m - 1]} ${y}`,
              organization: buildOrgSummary(monthFiltered),
              perFarmer: buildPerFarmerSummary(monthFiltered, farmers),
            });

            cur.setMonth(cur.getMonth() + 1);
          }

          filtered = deliveries.filter((d) => {
            const date = new Date(d.date);
            const start = new Date(startYear, startMonth - 1);
            const endDate = new Date(endYear, endMonth);
            return date >= start && date < endDate;
          });
        }

        if (scaleType === "yearly") {
          for (let y = Number(rangeStartYear); y <= Number(rangeEndYear); y++) {
            const yearFiltered = deliveries.filter((d) => {
              const date = new Date(d.date);
              return date.getFullYear() === y;
            });

            rangeData.push({
              label: `${y}`,
              organization: buildOrgSummary(yearFiltered),
              perFarmer: buildPerFarmerSummary(yearFiltered, farmers),
            });
          }

          filtered = deliveries.filter((d) => {
            const date = new Date(d.date);
            return (
              date.getFullYear() >= Number(rangeStartYear) &&
              date.getFullYear() <= Number(rangeEndYear)
            );
          });
        }

        setReportData({
          data: rangeData,
          perFarmer: buildPerFarmerSummary(filtered, farmers),
          payments,
          farmers,
          title: getReportTitle(),
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
            label: reportData.title || "Current Report",
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
            <h4>{reportData.title || "Summary"}</h4>

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

    if (rangeType === "range" && Array.isArray(reportData.data)) {
      const lineData = {
        labels: reportData.data.map((item) => item.label),
        datasets: [
          {
            label: "Volume Sold",
            data: reportData.data.map(
              (item) => item.organization?.totalVolumeSold || 0
            ),
            borderWidth: 2,
            tension: 0.3,
          },
          {
            label: "Sales Generated",
            data: reportData.data.map(
              (item) => item.organization?.totalSalesGenerated || 0
            ),
            borderWidth: 2,
            tension: 0.3,
          },
        ],
      };

      return (
        <div className="charts-grid">
          <div className="chart-card">
            <h4>{reportData.title || "Range Summary"}</h4>

            <div className="chart-wrapper-small">
              <Line
                data={lineData}
                options={{ responsive: true, maintainAspectRatio: false }}
              />
            </div>
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

  const getPerFarmer = () => {
    if (rangeType === "single") return reportData?.data?.perFarmer || [];
    return reportData?.perFarmer || [];
  };

  const getOrganizationSummary = () => {
    if (rangeType === "single") return reportData?.data?.organization || null;

    if (rangeType === "range" && Array.isArray(reportData?.data)) {
      return reportData.data.reduce(
        (summary, item) => {
          const org = item.organization || {};

          summary.totalDeliveries += org.totalDeliveries || 0;
          summary.totalVolumeSold += org.totalVolumeSold || 0;
          summary.totalSalesGenerated += org.totalSalesGenerated || 0;

          Object.entries(org.beanTypeSummary || {}).forEach(([beanType, data]) => {
            if (!summary.beanTypeSummary[beanType]) {
              summary.beanTypeSummary[beanType] = {
                volumeSold: 0,
                salesGenerated: 0,
              };
            }

            summary.beanTypeSummary[beanType].volumeSold += data.volumeSold || 0;
            summary.beanTypeSummary[beanType].salesGenerated +=
              data.salesGenerated || 0;
          });

          return summary;
        },
        {
          totalDeliveries: 0,
          totalVolumeSold: 0,
          totalSalesGenerated: 0,
          uniqueFarmers: getPerFarmer().length,
          beanTypeSummary: {},
        }
      );
    }

    return null;
  };

  const organizationSummary = getOrganizationSummary();

  return (
    <div className="report-module">
      <div className="report-header no-print">
        <div>
          <h2>Report Generation</h2>
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
        <div className="filter-group">
          <label>Report Content</label>
          <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
            <option value="both">Organization Wide + Farmers</option>
            <option value="organization">Organization Wide Only</option>
            <option value="farmers">Farmers Only</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Scale</label>
          <select value={scaleType} onChange={(e) => setScaleType(e.target.value)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Range Type</label>
          <select value={rangeType} onChange={(e) => setRangeType(e.target.value)}>
            <option value="single">Single</option>
            <option value="range">Range</option>
          </select>
        </div>

        {scaleType === "daily" && rangeType === "single" && (
          <div className="filter-group">
            <label>Date</label>
            <input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
          </div>
        )}

        {scaleType === "daily" && rangeType === "range" && (
          <>
            <div className="filter-group">
              <label>Start Date</label>
              <input type="date" value={startDay} onChange={(e) => setStartDay(e.target.value)} />
            </div>

            <div className="filter-group">
              <label>End Date</label>
              <input type="date" value={endDay} onChange={(e) => setEndDay(e.target.value)} />
            </div>
          </>
        )}

        {scaleType === "weekly" && rangeType === "single" && (
          <div className="filter-group">
            <label>Week Start</label>
            <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
          </div>
        )}

        {scaleType === "weekly" && rangeType === "range" && (
          <>
            <div className="filter-group">
              <label>Start Week</label>
              <input type="date" value={startWeek} onChange={(e) => setStartWeek(e.target.value)} />
            </div>

            <div className="filter-group">
              <label>End Week</label>
              <input type="date" value={endWeek} onChange={(e) => setEndWeek(e.target.value)} />
            </div>
          </>
        )}

        {scaleType === "monthly" && rangeType === "single" && (
          <>
            <div className="filter-group">
              <label>Month</label>
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {months.map((m, index) => (
                  <option key={m} value={index + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Year</label>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {scaleType === "monthly" && rangeType === "range" && (
          <>
            <div className="filter-group">
              <label>Start Month</label>
              <select value={startMonth} onChange={(e) => setStartMonth(Number(e.target.value))}>
                {months.map((m, index) => (
                  <option key={m} value={index + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Start Year</label>
              <select value={startYear} onChange={(e) => setStartYear(Number(e.target.value))}>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>End Month</label>
              <select value={endMonth} onChange={(e) => setEndMonth(Number(e.target.value))}>
                {months.map((m, index) => (
                  <option key={m} value={index + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>End Year</label>
              <select value={endYear} onChange={(e) => setEndYear(Number(e.target.value))}>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {scaleType === "yearly" && rangeType === "single" && (
          <div className="filter-group">
            <label>Year</label>
            <select value={singleYear} onChange={(e) => setSingleYear(Number(e.target.value))}>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        )}

        {scaleType === "yearly" && rangeType === "range" && (
          <>
            <div className="filter-group">
              <label>Start Year</label>
              <select value={rangeStartYear} onChange={(e) => setRangeStartYear(Number(e.target.value))}>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>End Year</label>
              <select value={rangeEndYear} onChange={(e) => setRangeEndYear(Number(e.target.value))}>
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
          {loading ? "⏳ Generating..." : "Generate Report"}
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

            <p>{reportData.title || getReportTitle()}</p>

            <p className="generated-date">
              Generated on: {new Date().toLocaleString()}
            </p>
          </div>

          {reportType !== "farmers" && (
            <div className="charts-section">
              <h3>Visual Analytics</h3>
              {renderSalesChart()}
            </div>
          )}

          {reportType !== "farmers" && organizationSummary && (
            <div className="organization-summary">
              <h3>Organization-Wide Summary</h3>

              <div className="summary-cards">
                <div className="card">
                  <h4>Total Deliveries</h4>
                  <p>{organizationSummary.totalDeliveries || 0}</p>
                  <small>deliveries recorded</small>
                </div>

                <div className="card">
                  <h4>Volume Sold</h4>
                  <p>
                    {(organizationSummary.totalVolumeSold || 0).toFixed(2)}
                  </p>
                  <small>products sold</small>
                </div>

                <div className="card">
                  <h4>Sales Generated</h4>

                  <p>
                    {formatCurrency(
                      organizationSummary.totalSalesGenerated
                    )}
                  </p>

                  <small>total revenue</small>
                </div>

                <div className="card">
                  <h4>Active Farmers</h4>

                  <p>{organizationSummary.uniqueFarmers || 0}</p>

                  <small>with transactions</small>
                </div>
              </div>

              {organizationSummary.beanTypeSummary &&
                Object.keys(organizationSummary.beanTypeSummary).length > 0 && (
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
                          organizationSummary.beanTypeSummary
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

          {rangeType === "range" && reportType !== "farmers" && Array.isArray(reportData.data) && (
            <div className="monthly-breakdown">
              <h3>Range Breakdown</h3>

              <table className="report-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Total Deliveries</th>
                    <th>Volume Sold</th>
                    <th>Sales Generated</th>
                  </tr>
                </thead>

                <tbody>
                  {reportData.data.map((item, index) => (
                    <tr key={index}>
                      <td>
                        <strong>{item.label}</strong>
                      </td>
                      <td>{item.organization?.totalDeliveries || 0}</td>
                      <td>{(item.organization?.totalVolumeSold || 0).toFixed(2)}</td>
                      <td>{formatCurrency(item.organization?.totalSalesGenerated || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

          {reportType !== "organization" && getPerFarmer().length === 0 && (
            <div className="no-data">
              <p>No farmer data found for the selected report filter.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportModule;