import { useEffect, useState } from "react";
import { authFetch } from "../utils/authFetch";

function TransactionHistory() {
  const [transactions, setTransactions] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [details, setDetails] = useState({});
  const [amounts, setAmounts] = useState({});

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    const res = await authFetch(
      `${import.meta.env.VITE_API_URL}/api/transactions`
    );
    const data = await res.json();
    setTransactions(data.data || []);
  };

  const fetchDetails = async (id) => {
    try {
      const res = await authFetch(
        `${import.meta.env.VITE_API_URL}/api/transactions/${id}`
      );
      const data = await res.json();

      setDetails((prev) => ({
        ...prev,
        [id]: data,
      }));
    } catch (err) {
      console.error("Error fetching details:", err);
    }
  };

  const toggle = (id) => {
    const newId = openId === id ? null : id;
    setOpenId(newId);

    if (newId) fetchDetails(id);
  };

  const addPayment = async (id) => {
    const amount = Number(amounts[id]);

    if (!amount || amount <= 0) return;

    await authFetch(`${import.meta.env.VITE_API_URL}/api/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deliveryId: id,
        amountPaid: amount,
      }),
    });

    setAmounts((prev) => ({
      ...prev,
      [id]: "",
    }));

    fetchDetails(id);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Transactions</h2>

      {transactions.map((t) => {
        const data = details[t._id];
        const summary = data?.summary;
        const payments = data?.payments;

        return (
          <div
            key={t._id}
            style={{
              border: "1px solid #ddd",
              marginBottom: 10,
              padding: 10,
              borderRadius: 6,
            }}
          >
            {/* HEADER */}
            <div
              onClick={() => toggle(t._id)}
              style={{
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <strong>{t.farmerName}</strong>
              <span>₱{t.amount}</span>
            </div>

            {/* DROPDOWN */}
            {openId === t._id && (
              <div style={{ marginTop: 10 }}>
                <p>Bean: {t.beanType}</p>
                <p>Date: {new Date(t.date).toLocaleDateString()}</p>

                <hr />

                {summary ? (
                  <>
                    <p>Total: ₱{t.amount}</p>
                    <p>Paid: ₱{summary.totalPaid}</p>
                    <p>Balance: ₱{summary.balance}</p>
                    <p>Status: {summary.status}</p>
                  </>
                ) : (
                  <p>Loading summary...</p>
                )}

                <hr />

                <h4>Payments</h4>

                {payments?.length > 0 ? (
                  payments.map((p) => (
                    <p key={p._id}>₱{p.amountPaid}</p>
                  ))
                ) : (
                  <p>No payments yet</p>
                )}

                <hr />

                {/* PAYMENT INPUT (FIXED) */}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Enter payment"
                  value={amounts[t._id] || ""}
                  onChange={(e) =>
                    setAmounts((prev) => ({
                      ...prev,
                      [t._id]: e.target.value,
                    }))
                  }
                />

                <button
                  onClick={() => addPayment(t._id)}
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