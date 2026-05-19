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

  const [beans, setBeans] = useState([]);

  const timeoutRef = useRef(null);

  const API = import.meta.env.VITE_API_URL;
  const isElectron = !!window.api;

  const fetchBeans = async () => {
    try {
      if (isElectron) {
        const data = await window.api.getBeans();
        setBeans(Array.isArray(data) ? data : []);
        return;
      }

      const token = localStorage.getItem("token");

      const res = await fetch(`${API}/api/beans`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      setBeans(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Bean fetch error:", err);
    }
  };

  const clearSession = async () => {
    localStorage.clear();

    if (isElectron) {
      try {
        await window.api.logout();
      } catch (err) {
        console.error("Electron logout error:", err);
      }
    }

    setIsLoggedIn(false);
    setCurrentUser(null);
    setSelectedModule(null);
  };

  const resetInactivityTimer = () => {
    if (!isElectron && !localStorage.getItem("token")) return;

    localStorage.setItem("lastActivity", Date.now().toString());

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(clearSession, SESSION_TIMEOUT);
  };

  useEffect(() => {
    const init = async () => {
      if (isElectron) {
        try {
          const session = await window.api.getSession();

          if (session?.user) {
            setIsLoggedIn(true);
            setCurrentUser(session.user);
          }

          setMessage("Backend connected successfully");
          setDbTime(new Date().toISOString());

          await fetchBeans();
        } catch (err) {
          console.error("Electron init error:", err);
          setMessage("Local database connection failed");
        }

        return;
      }

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
        setMessage("Backend connection failed");
      }

      fetchBeans();
    };

    init();

    const events = ["mousemove", "keydown", "click", "scroll"];

    const handleActivity = () => {
      if (isElectron || localStorage.getItem("token")) {
        resetInactivityTimer();
      }
    };

    events.forEach((e) => window.addEventListener(e, handleActivity));

    return () => {
      events.forEach((e) => window.removeEventListener(e, handleActivity));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleLoginSuccess = async (user) => {
    setIsLoggedIn(true);
    setCurrentUser(user);

    localStorage.setItem("user", JSON.stringify(user));

    resetInactivityTimer();
    await fetchBeans();
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

  const getModuleLabel = (item) => {
  return item === "admin"
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
    ? "Reports"
    : "Transactions";
};

const getModuleCode = (item) => {
  return item === "admin"
    ? "AD"
    : item === "farmers"
    ? "FM"
    : item === "beans"
    ? "BM"
    : item === "delivery"
    ? "DE"
    : item === "forms"
    ? "FG"
    : item === "reports"
    ? "GR"
    : "TH";
};

  const renderMainContent = () => {
    switch (selectedModule) {
      case "farmers":
        return <FarmerManagement beans={beans} />;

      case "beans":
        return (
          <BeanManagement
            beans={beans}
            setBeans={setBeans}
            refreshBeans={fetchBeans}
          />
        );

      case "admin":
        return <AdminPage />;

      case "delivery":
        return <DeliveryEntry />;

      case "forms":
        return <FormsGeneration />;

      case "reports":
        return <ReportModule />;

      case "transactions":
        return <TransactionHistory />;

      default:
        return (
          <>
            <div className="modules">
              {modules.map((item) => (
                <div
                  key={item}
                  className="module-card"
                  onClick={() => setSelectedModule(item)}
                >
                  <div className="module-code">{getModuleCode(item)}</div>
                      <p>{getModuleLabel(item)}</p>
                        <span>Open module</span>
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
    }
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
          <div className="avatar"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="7" r="4"></circle>
          <path d="M5.5 21a6.5 6.5 0 0 1 13 0"></path>
          </svg></div>

          <h3>{currentUser?.name || currentUser?.username}</h3>

          <p className="role">
            {currentUser?.role === "admin" ? "Admin" : "User"}
          </p>

          <p className="meta">
            <strong>Username:</strong>
            <br />
            {currentUser?.username || "N/A"}
          </p>

          <p className="meta">
            <strong>Position:</strong>
            <br />
            {currentUser?.position || "N/A"}
          </p>

          <p className="meta">
            <strong>Sex:</strong> {currentUser?.sex || "N/A"}
            <br />
            <strong>Age:</strong> {currentUser?.age || "N/A"}
          </p>

          <p className="meta">
            <strong>Account Created:</strong>
            <br />
            {currentUser?.createdAt
              ? new Date(currentUser.createdAt).toLocaleString()
              : "N/A"}
          </p>
        </div>

        <button className="logout" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}

export default App;