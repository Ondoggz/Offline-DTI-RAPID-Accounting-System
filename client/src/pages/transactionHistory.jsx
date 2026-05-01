import { useEffect, useState } from "react";
import { authFetch } from "../utils/authFetch";

function TransactionHistory() {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const fetchTransactions = async () => {
      const res = await authFetch("/api/transactions");
      const data = await res.json();
      setTransactions(data.data || []);
    };

    fetchTransactions();
  }, []);

  return (
    <div>
      <h2>Transaction History</h2>

      {transactions.map((t) => (
        <div key={t._id} style={{ borderBottom: "1px solid #ccc" }}>
          <p><strong>{t.type}</strong></p>
          <p>Farmer: {t.farmerName}</p>
          <p>Bean: {t.beanType}</p>
          <p>Date: {new Date(t.date).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  );
}

export default TransactionHistory;