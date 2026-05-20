import { useEffect, useState } from "react";
import "./transactions.css";

function TransactionHistory() {
  const [transactions, setTransactions] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [details, setDetails] = useState({});
  const [amounts, setAmounts] = useState({});
  const [errors, setErrors] = useState({});

  const fetchTransactions = async () => {
    try {
      const deliveries = await window.api.getDeliveries();
      const payments = await window.api.getPayments();

      const safeDeliveries = deliveries || [];
      const safePayments = payments || [];

      setTransactions(safeDeliveries);

      const detailMap = {};

      safeDeliveries.forEach((t) => {
        const relatedPayments = safePayments.filter(
          (p) => String(p.deliveryId) === String(t.id)
        );

        const totalPaid = relatedPayments.reduce(
          (sum, p) => sum + Number(p.amountPaid || 0),
          0
        );

        const balance = Number(t.totalAmount || 0) - totalPaid;

        detailMap[t.id] = {
          summary: {
            totalPaid,
            balance,
            status: balance <= 0 ? "PAID" : "PENDING",
          },
          payments: relatedPayments,
        };
      });

      setDetails(detailMap);
    } catch (err) {
      console.error("Transaction load error:", err);

      setErrors((prev) => ({
        ...prev,
        global: "Failed to load transactions.",
      }));
    }
  };

  useEffect(() => {
    fetchTransactions();

    const unsubPayments = window.api.onDataUpdated(
      "payments:updated",
      fetchTransactions
    );

    const unsubDeliveries = window.api.onDataUpdated(
      "deliveries:updated",
      fetchTransactions
    );

    return () => {
      unsubPayments?.();
      unsubDeliveries?.();
    };
  }, []);

  const toggle = (id) => {
    setOpenId((prev) => (prev === id ? null : id));

    setErrors((prev) => ({
      ...prev,
      [id]: "",
    }));
  };

  const addPayment = async (id) => {
    const amount = Number(amounts[id] || 0);
    const balance = Number(details[id]?.summary?.balance || 0);

    setErrors((prev) => ({
      ...prev,
      [id]: "",
    }));

    if (amount <= 0) {
      setErrors((prev) => ({
        ...prev,
        [id]: "Payment must be greater than 0.",
      }));
      return;
    }

    if (amount > balance) {
      setErrors((prev) => ({
        ...prev,
        [id]: `Payment exceeds remaining balance of ₱${balance.toFixed(2)}.`,
      }));
      return;
    }

    try {
      await window.api.addPayment({
        deliveryId: id,
        amountPaid: amount,
      });

      setAmounts((prev) => ({
        ...prev,
        [id]: "",
      }));

      await fetchTransactions();
    } catch (err) {
      console.error("Payment error:", err);

      setErrors((prev) => ({
        ...prev,
        [id]: "Failed to add payment. Please try again.",
      }));
    }
  };

  return (
    <div className="transaction-container">
      <div className="transaction-header-main">
        <div>
          <h2 className="transaction-title">Transactions</h2>
          <p>Track delivery balances and payment progress.</p>
        </div>
      </div>

      {errors.global && (
        <div className="warning-bubble">⚠️ {errors.global}</div>
      )}

      {transactions.length === 0 && (
        <div className="transaction-empty">
          <p>No transactions found.</p>
        </div>
      )}

      <div className="transaction-list">
        {transactions.map((t) => {
          const data = details[t.id];
          const summary = data?.summary;
          const payments = data?.payments;
          const balance = Number(summary?.balance ?? 0);
          const isOpen = openId === t.id;

          return (
            <div key={t.id} className="transaction-card">
              <div
                onClick={() => toggle(t.id)}
                className="transaction-header"
              >
                <div>
                  <strong>{t.farmer}</strong>
                  <p>
                    {t.beanType || "N/A"} •{" "}
                    {t.date ? new Date(t.date).toLocaleDateString() : "—"}
                  </p>
                </div>

                <div className="transaction-amount-group">
                  {summary && (
                    <span
                      className={`status-badge ${
                        summary.status === "PAID"
                          ? "status-paid"
                          : "status-pending"
                      }`}
                    >
                      {summary.status}
                    </span>
                  )}

                  <span className="transaction-total">
                    ₱{Number(t.totalAmount || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {isOpen && (
                <div className="transaction-details">
                  {errors[t.id] && (
                    <div className="warning-bubble">⚠️ {errors[t.id]}</div>
                  )}

                  <div className="transaction-summary-grid">
                    <div>
                     <small>Delivery ID</small>
                     <strong>{t.id || "N/A"}</strong>
                    </div>
                    <div>
                      <small>Total</small>
                      <strong>₱{Number(t.totalAmount || 0).toFixed(2)}</strong>
                    </div>

                    <div>
                      <small>Paid</small>
                      <strong>
                        ₱{Number(summary?.totalPaid || 0).toFixed(2)}
                      </strong>
                    </div>

                    <div>
                      <small>Balance</small>
                      <strong>₱{Number(balance).toFixed(2)}</strong>
                    </div>

                    <div>
                      <small>Status</small>
                      <strong>{balance <= 0 ? "Fully Paid" : summary?.status}</strong>
                    </div>
                  </div>

                  <div className="transaction-section">
                    <h4>Payments</h4>

                    {payments?.length > 0 ? (
                      <div className="payment-list">
                        {payments.map((p, i) => (
                          <div key={i} className="payment-item">
                            <strong>
                              ₱{Number(p.amountPaid || 0).toFixed(2)}
                            </strong>

                            {p.createdAt && (
                              <span>
                                {new Date(p.createdAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="empty-text">No payments yet</p>
                    )}
                  </div>

                  {balance > 0 ? (
                    <div className="payment-form">
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder={`Enter payment (max ₱${Number(
                          balance
                        ).toFixed(2)})`}
                        value={amounts[t.id] || ""}
                        onChange={(e) => {
                          const val = e.target.value;

                          if (val === "" || /^\d*\.?\d*$/.test(val)) {
                            setAmounts((prev) => ({
                              ...prev,
                              [t.id]: val,
                            }));

                            setErrors((prev) => ({
                              ...prev,
                              [t.id]: "",
                            }));
                          }
                        }}
                      />

                      <button onClick={() => addPayment(t.id)}>
                        Add Payment
                      </button>
                    </div>
                  ) : (
                    <div className="fully-paid-box">Fully paid</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TransactionHistory;