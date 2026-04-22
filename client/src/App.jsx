import { useEffect, useRef, useState } from "react";
import Login from "./pages/login";
import FarmerManagement from "./pages/farmerManagement";
import BeanManagement from "./pages/beanManagement";
import { authFetch } from "./utils/authFetch";
import "./index.css";

const SESSION_TIMEOUT = 30 * 60 * 1000;

function App() {
  const [message, setMessage] = useState("Loading...");
  const [dbTime, setDbTime] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);

  const [beans, setBeans] = useState([
    {
      id: 1,
      name: "Arabica",
      pricePerUnit: 180,
      unit: "kg",
      farmers: ["Juan Dela Cruz"],
    },
    {
      id: 2,
      name: "Robusta",
      pricePerUnit: 150,
      unit: "kg",
      farmers: ["Maria Santos"],
    },
    {
      id: 3,
      name: "Excelsa",
      pricePerUnit: 170,
      unit: "kg",
      farmers: [],
    },
  ]);

  const timeoutRef = useRef(null);

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

    timeoutRef.current = setTimeout(() => {
      clearSession();
    }, SESSION_TIMEOUT);
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
            const res = await authFetch(
              `${import.meta.env.VITE_API_URL}/auth/me`
            );

            if (!res.ok) {
              clearSession();
            } else {
              const data = await res.json();
              setIsLoggedIn(true);
              setCurrentUser(data.user);

              const remaining =
                SESSION_TIMEOUT - (now - Number(lastActivity));

              timeoutRef.current = setTimeout(() => {
                clearSession();
              }, remaining);
            }
          } catch {
            clearSession();
          }
        }
      }

      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api`);
        const data = await res.json();
        setMessage(data.message);
        setDbTime(data.databaseTime);
      } catch {
        setMessage("Failed to connect to backend");
      }
    };

    initializeApp();

    const events = ["mousemove", "keydown", "click", "scroll"];

    const handleActivity = () => resetInactivityTimer();

    events.forEach((e) => window.addEventListener(e, handleActivity));

    return () => {
      events.forEach((e) => window.removeEventListener(e, handleActivity));

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleLoginSuccess = (user) => {
    setIsLoggedIn(true);
    setCurrentUser(user);
    localStorage.setItem("lastActivity", Date.now().toString());
    resetInactivityTimer();
  };

  const handleLogout = () => {
    clearSession();
  };

  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const isAdmin = currentUser?.role === "admin";

  const modules = [
    ...(isAdmin ? ["admin"] : []),
    "farmers",
    "beans",
    1,
    2,
    3,
    4,
    5,
    6,
  ];

  const renderMainContent = () => {
    if (selectedModule === "farmers") {
      return <FarmerManagement beans={beans} />;
    }

    if (selectedModule === "beans") {
      return <BeanManagement beans={beans} setBeans={setBeans} />;
    }

    if (selectedModule === "admin") {
      return <h2>Admin Module</h2>;
    }

    if (typeof selectedModule === "number") {
      return <h2>{`Module ${selectedModule}`}</h2>;
    }

    return (
      <>
        <div className="modules">
          {modules.map((item) => (
            <div
              key={item}
              className="module-card"
              onClick={() => setSelectedModule(item)}
              style={{ cursor: "pointer" }}
            >
              <div className="icon">📄</div>
              <p>
                {item === "admin"
                  ? "Admin"
                  : item === "farmers"
                  ? "Farmer Management"
                  : item === "beans"
                  ? "Bean Management"
                  : `Module ${item}`}
              </p>
            </div>
          ))}
        </div>

        <div className="status">
          <p>{message}</p>
          {dbTime && <p>Database time: {dbTime}</p>}
          {currentUser && <p>Logged in as: {currentUser.username}</p>}
        </div>
      </>
    );
  };

  return (
    <div className="app-layout">
      <div className="main">
        <div className="header">
          <div className="logo">Logo</div>
          <h1 className="title">Dashboard</h1>
        </div>

        {selectedModule && (
          <button
            onClick={() => setSelectedModule(null)}
            style={{
              marginBottom: "16px",
              padding: "8px 12px",
              cursor: "pointer",
            }}
          >
            Back to Dashboard
          </button>
        )}

        {renderMainContent()}
      </div>

      <div className="sidebar">
        <input className="search" placeholder="Search..." />

        <div className="section">
          <h4>Section Heading</h4>
          <ul>
            <li>Title</li>
            <li>Title</li>
            <li>Title</li>
          </ul>
        </div>

        <div className="section">
          <h4>Section Heading</h4>
          <ul>
            <li>Title</li>
            <li>Title</li>
          </ul>
        </div>

        <button className="logout" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}

export default App;