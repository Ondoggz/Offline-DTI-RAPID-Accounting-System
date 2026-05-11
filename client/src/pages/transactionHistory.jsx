import { useEffect, useState } from "react";

function TransactionHistory() {
  const [transactions, setTransactions] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [details, setDetails] = useState({});
  const [amounts, setAmounts] = useState({});

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

      // build details per transaction
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
    }
  };

  useEffect(() => {
    fetchTransactions();

    // 🔥 auto refresh (so it updates when deliveries change)
    const interval = setInterval(fetchTransactions, 2000);

    return () => clearInterval(interval);
  }, []);

  const toggle = (id) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  /* =========================
     ADD PAYMENT (OFFLINE)
  ========================= */
  const addPayment = async (id) => {
    const amount = Number(amounts[id] || 0);
    const balance = Number(details[id]?.summary?.balance || 0);

    if (amount <= 0) {
      alert("Payment must be greater than 0");
      return;
    }

    if (amount > balance) {
      alert(`Payment exceeds remaining balance (₱${balance})`);
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

      fetchTransactions();
    } catch (err) {
      console.error("Payment error:", err);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Transactions (Offline)</h2>

      {transactions.map((t) => {
        const data = details[t.id];
        const summary = data?.summary;
        const payments = data?.payments;

        return (
          <div
            key={t.id}
            style={{
              border: "1px solid #ddd",
              marginBottom: 10,
              padding: 10,
              borderRadius: 6,
            }}
          >
            {/* HEADER */}
            <div
              onClick={() => toggle(t.id)}
              style={{
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <strong>{t.farmer}</strong>
              <span>₱{t.totalAmount}</span>
            </div>

            {/* DROPDOWN */}
            {openId === t.id && (
              <div style={{ marginTop: 10 }}>
                <p>Bean: {t.beanType}</p>
                <p>Date: {t.date?.slice(0, 10)}</p>

                <hr />

                {summary ? (
                  <>
                    <p>Total: ₱{t.totalAmount}</p>
                    <p>Paid: ₱{summary.totalPaid}</p>
                    <p>Balance: ₱{summary.balance}</p>
                    <p>Status: {summary.status}</p>
                  </>
                ) : (
                  <p>Loading...</p>
                )}

                <hr />

                <h4>Payments</h4>

                {payments?.length > 0 ? (
                  payments.map((p, i) => (
                    <p key={i}>₱{p.amountPaid}</p>
                  ))
                ) : (
                  <p>No payments yet</p>
                )}

                <hr />

                {/* PAYMENT INPUT */}
                <input
                  type="number"
                  placeholder="Enter payment"
                  value={amounts[t.id] || ""}
                  onChange={(e) =>
                    setAmounts((prev) => ({
                      ...prev,
                      [t.id]: e.target.value,
                    }))
                  }
                />

                <button
                  onClick={() => addPayment(t.id)}
                  style={{ marginLeft: 10 }}
                >
                  Add Payment
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default TransactionHistory;