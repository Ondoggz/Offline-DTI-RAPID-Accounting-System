import { useEffect, useRef, useState } from "react";
import Login from "./pages/Login";
import AdminPage from "./pages/AdminPage";
import ModulePage from "./pages/ModulePage";
import { authFetch } from "./utils/authFetch";
import "./index.css";

import { Routes, Route, useNavigate } from "react-router-dom";

const SESSION_TIMEOUT = 30 * 60 * 1000;

function App() {
  const [message, setMessage] = useState("Loading...");
  const [dbTime, setDbTime] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const navigate = useNavigate();
  const timeoutRef = useRef(null);

  const clearSession = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("lastActivity");
    setIsLoggedIn(false);
    setCurrentUser(null);
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

    events.forEach((e) =>
      window.addEventListener(e, handleActivity)
    );

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
  };

  const handleLogout = () => {
    clearSession();
  };

  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const isAdmin = currentUser?.role === "admin";

  return (
    <Routes>
      {/* DASHBOARD */}
      <Route
        path="/"
        element={
          <div className="app-layout">
            <div className="main">
              <div className="header">
                <div className="logo">Logo</div>
                <h1 className="title">Dashboard</h1>
              </div>

              <div className="modules">
                {[
                  ...(isAdmin ? ["admin"] : []),
                  1,
                  2,
                  3,
                  4,
                  5,
                  6,
                ].map((item) => (
                  <div
                    key={item}
                    className="module-card"
                    onClick={() =>
                      item === "admin"
                        ? navigate("/admin")
                        : navigate(`/module/${item}`)
                    }
                    style={{ cursor: "pointer" }}
                  >
                    <div className="icon">📄</div>
                    <p>
                      {item === "admin"
                        ? "Admin"
                        : `Module ${item}`}
                    </p>
                  </div>
                ))}
              </div>

              <div className="status">
                <p>{message}</p>
                {dbTime && <p>Database time: {dbTime}</p>}
                {currentUser && (
                  <p>
                    Logged in as: {currentUser.username}
                  </p>
                )}
              </div>
            </div>

            <div className="sidebar">
              <input
                className="search"
                placeholder="Search..."
              />

              <button className="logout" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        }
      />

      {/* ADMIN PAGE */}
      <Route path="/admin" element={<AdminPage />} />

      {/* MODULE PAGE */}
      <Route path="/module/:id" element={<ModulePage />} />
    </Routes>
  );
}

export default App;