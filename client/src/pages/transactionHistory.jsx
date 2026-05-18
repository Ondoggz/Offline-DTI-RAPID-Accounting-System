import { useEffect, useState } from "react";

function TransactionHistory() {
  const [transactions, setTransactions] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [details, setDetails] = useState({});
  const [amounts, setAmounts] = useState({});
  const [errors, setErrors] = useState({});

  /* =========================
     LOAD OFFLINE DATA
  ========================= */
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

  /* =========================
     ADD PAYMENT (OFFLINE)
  ========================= */
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
    <div style={{ padding: 20 }}>
      <h2>Transactions</h2>

      {errors.global && (
        <div className="warning-bubble">
          ⚠️ {errors.global}
        </div>
      )}

      {transactions.length === 0 && (
        <p style={{ color: "#6b7280" }}>No transactions found.</p>
      )}

      {transactions.map((t) => {
        const data = details[t.id];
        const summary = data?.summary;
        const payments = data?.payments;
        const balance = Number(summary?.balance ?? 0);

        return (
          <div
            key={t.id}
            style={{
              border: "1px solid #ddd",
              marginBottom: 10,
              padding: 10,
              borderRadius: 6,
              background: "#fff",
            }}
          >
            {/* HEADER */}
            <div
              onClick={() => toggle(t.id)}
              style={{
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <strong>{t.farmer}</strong>

              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {summary && (
                  <span
                    style={{
                      fontSize: 12,
                      padding: "2px 8px",
                      borderRadius: 10,
                      background:
                        summary.status === "PAID" ? "#d1fae5" : "#fef3c7",
                      color:
                        summary.status === "PAID" ? "#065f46" : "#92400e",
                      fontWeight: 600,
                    }}
                  >
                    {summary.status}
                  </span>
                )}

                <span>₱{Number(t.totalAmount || 0).toFixed(2)}</span>
              </div>
            </div>

            {/* DROPDOWN */}
            {openId === t.id && (
              <div style={{ marginTop: 10 }}>
                {errors[t.id] && (
                  <div className="warning-bubble">
                    ⚠️ {errors[t.id]}
                  </div>
                )}

                <p>Bean: {t.beanType}</p>

                <p>
                  Date:{" "}
                  {t.date ? new Date(t.date).toLocaleDateString() : "—"}
                </p>

                <hr />

                {summary ? (
                  <>
                    <p>Total: ₱{Number(t.totalAmount || 0).toFixed(2)}</p>
                    <p>Paid: ₱{Number(summary.totalPaid || 0).toFixed(2)}</p>
                    <p>Balance: ₱{Number(balance).toFixed(2)}</p>
                    <p>Status: {balance <= 0 ? "Fully Paid" : summary.status}</p>
                  </>
                ) : (
                  <p>Loading summary...</p>
                )}

                <hr />

                <h4>Payments</h4>

                {payments?.length > 0 ? (
                  payments.map((p, i) => (
                    <p key={i}>
                      ₱{Number(p.amountPaid || 0).toFixed(2)}
                      {p.createdAt && (
                        <span
                          style={{
                            color: "#6b7280",
                            fontSize: 12,
                            marginLeft: 8,
                          }}
                        >
                          {new Date(p.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                  ))
                ) : (
                  <p>No payments yet</p>
                )}

                <hr />

                {balance > 0 ? (
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      marginTop: 8,
                    }}
                  >
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
                  <p style={{ color: "#065f46", fontWeight: 600 }}>
                    ✓ Fully paid
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default TransactionHistory;