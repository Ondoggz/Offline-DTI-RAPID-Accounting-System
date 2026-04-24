import { useState } from "react";
import "./delivery.css";

function DeliveryEntry() {
  const [entries, setEntries] = useState([
    "Label text",
    "Label text",
    "Label text",
    "Label text",
    "Label text",
    "Label text",
  ]);

  const [showForm, setShowForm] = useState(false);

 if (showForm) {
  return (
    <div className="delivery-container">
      <div className="delivery-header">
        <span className="back-icon" onClick={() => setShowForm(false)}>←</span>
        <h2>Delivery Entry</h2>
        <div className="menu-dots">•••</div>
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label>Farmer</label>
          <input />
        </div>

        <div className="form-group">
          <label>Farmer Contact No.</label>
          <input />
        </div>

        <div className="form-group">
          <label>Bean Type</label>
          <input />
        </div>

        <div className="form-group">
          <label>Courier</label>
          <input />
        </div>

        <div className="form-group">
          <label>Date</label>
          <input type="date" />
        </div>

        <div className="form-group">
          <label>Delivery Guy</label>
          <input />
        </div>

        <div className="form-group">
          <label>Consignee</label>
          <input />
        </div>

        <div className="form-group">
          <label>Delivery Guy Contact No.</label>
          <input />
        </div>

        <div className="form-group">
          <label>Consignee Contact No.</label>
          <input />
        </div>

        <div className="proof-record-wrapper">
          <div className="proof-section">
            <label>Proof of Delivery</label>
            <div className="upload-box">
              <input type="file" style={{ display: "none" }} id="fileUpload" />
              <label htmlFor="fileUpload" style={{ cursor: "pointer" }}>
                ⬆ Upload
              </label>
            </div>
          </div>

          <div className="recorded">
            <label>Recorded By:</label>
            <input />
          </div>
        </div>

        <div className="form-actions">
          <button className="save-btn">Save</button>
          <button className="cancel-btn">Cancel</button>
        </div>
      </div>
    </div>
  );
}

  return (
    <div className="delivery-container">
      {/* HEADER */}
      <div className="delivery-header">
        <span className="back-icon">←</span>
        <h2>Delivery Entry</h2>
        <div className="menu-dots">•••</div>
      </div>

      {/* ACTIONS */}
      <div className="delivery-actions">
        <button className="add-btn" onClick={() => setShowForm(true)}>
  ＋ Add an Entry
        </button>

        <input
          className="search-input"
          placeholder="Search according to date, farmer..."
        />
      </div>

      {/* LIST */}
      <div className="delivery-list">
        {entries.map((item, index) => (
          <div key={index} className="delivery-item">
            <span>{item}</span>
            <span className="arrow">›</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DeliveryEntry;