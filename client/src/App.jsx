import { useEffect, useRef, useState } from "react";
import Login from "./pages/login";
import AdminPage from "./pages/AdminPage";
import FarmerManagement from "./pages/farmerManagement";
import BeanManagement from "./pages/beanManagement";
import DeliveryEntry from "./pages/deliveryEntry";
import FormsGeneration from "./pages/formsGeneration";
import TransactionHistory from "./pages/transactionHistory";
import ReportModule from "./pages/ReportModule";
import { authFetch } from "./utils/authFetch";
import "./index.css";
import dtiLogo from "./assets/logos/dti-logo.png";

const SESSION_TIMEOUT = 30 * 60 * 1000;

function App() {
  const [message, setMessage] = useState("Loading...");
  const [dbTime, setDbTime] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);

  // ✅ FIX: beans now come from backend
  const [beans, setBeans] = useState([]);

  const timeoutRef = useRef(null);

  const API = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("token");

  const authHeaders = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  /* =========================
     FETCH BEANS FROM BACKEND
  ========================= */
  const fetchBeans = async () => {
    try {
      const res = await fetch(`${API}/api/beans`, authHeaders);
      const data = await res.json();

      setBeans(data || []);
    } catch (err) {
      console.error("FETCH BEANS ERROR:", err);
    }
  };

  const clearSession = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("lastActivity");
    setIsLoggedIn(false);
    setCurrentUser(null);
    setSelectedModule(null);
  };

  const resetInactivityTimer = () => {
    if (!localStorage.getItem("token")) return;

    localStorage.setItem("lastActivity", Date.now().toString());

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(clearSession, SESSION_TIMEOUT);
  };

  useEffect(() => {
    const initializeApp = async () => {
      const savedToken = localStorage.getItem("token");
      const savedUser = localStorage.getItem("user");
      const lastActivity = localStorage.getItem("lastActivity");

      if (savedToken && savedUser) {
        const now = Date.now();

        if (!lastActivity || now - Number(lastActivity) > SESSION_TIMEOUT) {
          clearSession();
        } else {
          try {
            const res = await authFetch(`${API}/auth/me`);

            if (!res.ok) {
              clearSession();
            } else {
              const data = await res.json();
              setIsLoggedIn(true);
              setCurrentUser(data.user);

              const remaining =
                SESSION_TIMEOUT - (now - Number(lastActivity));

              timeoutRef.current = setTimeout(clearSession, remaining);
            }
          } catch {
            clearSession();
          }
        }
      }

      try {
        const res = await fetch(`${API}/api`);
        const data = await res.json();
        setMessage(data.message);
        setDbTime(data.databaseTime);
      } catch {
        setMessage("Failed to connect to backend");
      }

      // ✅ FIX: load beans on startup
      fetchBeans();
    };

    initializeApp();

    const events = ["mousemove", "keydown", "click", "scroll"];

    const handleActivity = () => {
      if (localStorage.getItem("token")) {
        resetInactivityTimer();
      }
    };

    events.forEach((e) => window.addEventListener(e, handleActivity));

    return () => {
      events.forEach((e) =>
        window.removeEventListener(e, handleActivity)
      );
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleLoginSuccess = (user) => {
    setIsLoggedIn(true);
    setCurrentUser(user);
    localStorage.setItem("lastActivity", Date.now().toString());
    resetInactivityTimer();

    // reload beans after login
    fetchBeans();
  };

  const handleLogout = () => clearSession();

  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const isAdmin = currentUser?.role === "admin";

  const modules = [
    ...(isAdmin ? ["admin"] : []),
    "farmers",
    "beans",
    "delivery",
    "forms",
    "reports",
    "transactions",
  ];

  const renderMainContent = () => {
    if (selectedModule === "farmers") {
      return <FarmerManagement beans={beans} />;
    }

    if (selectedModule === "beans") {
      return (
        <BeanManagement
          beans={beans}
          setBeans={setBeans}
          refreshBeans={fetchBeans}
        />
      );
    }

    if (selectedModule === "admin") return <AdminPage />;
    if (selectedModule === "delivery") return <DeliveryEntry />;
    if (selectedModule === "forms") return <FormsGeneration />;
    if (selectedModule === "reports") return <ReportModule />;
    if (selectedModule === "transactions") return <TransactionHistory />;

    return (
      <>
        <div className="modules">
          {modules.map((item) => (
            <div
              key={item}
              className="module-card"
              onClick={() => setSelectedModule(item)}
            >
              <div className="icon">📄</div>
              <p>
                {item === "admin"
                  ? "Admin"
                  : item === "farmers"
                  ? "Farmer Management"
                  : item === "beans"
                  ? "Bean Management"
                  : item === "delivery"
                  ? "Delivery Entry"
                  : item === "forms"
                  ? "Forms Generation"
                  : item === "reports"
                  ? "Generate Reports"
                  : "Transaction History"}
              </p>
            </div>
          ))}
        </div>

        <div className="status">
          <p>{message}</p>
          {dbTime && <p>Database time: {dbTime}</p>}
          <p>Logged in as: {currentUser?.username}</p>
        </div>
      </>
    );
  };

  return (
    <div className="app-layout">
      <div className="main">
        <div className="header">
          <div className="logo-container">
            <img src={dtiLogo} className="main-logo" />
            <div>
              <h2 className="system-name">DTI Accounting System</h2>
              <p className="system-subtitle">
                Palamboun Farmers Association
              </p>
            </div>
          </div>

          <h1 className="title">Dashboard</h1>
        </div>

        {selectedModule && (
          <button onClick={() => setSelectedModule(null)}>
            Back to Dashboard
          </button>
        )}

        {renderMainContent()}
      </div>

      <div className="sidebar">
        <div className="profile-card">
          <h3>{currentUser?.name || currentUser?.username}</h3>
          <p>{currentUser?.role}</p>
        </div>

        <button className="logout" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}

export default App;