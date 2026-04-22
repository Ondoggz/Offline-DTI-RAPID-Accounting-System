<<<<<<< HEAD
import { useState } from "react";

function FarmerManagement({ beans }) {
  const [farmers, setFarmers] = useState([
    {
      id: 1,
      name: "Juan Dela Cruz",
      age: 45,
      address: "Bukidnon",
      beans: ["Arabica", "Excelsa"],
    },
    {
      id: 2,
      name: "Maria Santos",
      age: 39,
      address: "Misamis Oriental",
      beans: ["Robusta"],
    },
  ]);

  const [form, setForm] = useState({
    id: null,
    name: "",
    age: "",
    address: "",
    beans: [""],
  });

  const [isEditing, setIsEditing] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleBeanChange = (index, value) => {
    const updatedBeans = [...form.beans];
    updatedBeans[index] = value;
    setForm({ ...form, beans: updatedBeans });
=======
import { useEffect, useRef, useState } from "react";
import Login from "./pages/login";
import FarmerManagement from "./pages/farmerManagement";
import BeanManagement from "./pages/beanManagement";
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
>>>>>>> 268c76c5a77bd7f1e02aceb558e171d60e46357b
  };

  const addBeanField = () => {
    setForm({ ...form, beans: [...form.beans, ""] });
  };

<<<<<<< HEAD
  const removeBeanField = (index) => {
    const updatedBeans = form.beans.filter((_, i) => i !== index);
    setForm({
      ...form,
      beans: updatedBeans.length > 0 ? updatedBeans : [""],
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const cleanedBeans = form.beans.filter((bean) => bean.trim() !== "");

    if (!form.name || !form.age || !form.address || cleanedBeans.length === 0) {
      alert("Please fill in all fields and select at least one bean type.");
      return;
    }

    const farmerData = {
      ...form,
      age: Number(form.age),
      beans: cleanedBeans,
=======
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
>>>>>>> 268c76c5a77bd7f1e02aceb558e171d60e46357b
    };

    if (isEditing) {
      setFarmers((prev) =>
        prev.map((farmer) => (farmer.id === form.id ? farmerData : farmer))
      );
      setIsEditing(false);
    } else {
      const newFarmer = {
        ...farmerData,
        id: Date.now(),
      };
      setFarmers((prev) => [...prev, newFarmer]);
    }

    setForm({
      id: null,
      name: "",
      age: "",
      address: "",
      beans: [""],
    });
  };

  const handleEdit = (farmer) => {
    setForm({
      id: farmer.id,
      name: farmer.name,
      age: farmer.age,
      address: farmer.address,
      beans: farmer.beans?.length ? farmer.beans : [""],
    });
    setIsEditing(true);
  };

<<<<<<< HEAD
  const handleDelete = (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this farmer?");
    if (confirmDelete) {
      setFarmers((prev) => prev.filter((farmer) => farmer.id !== id));
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Farmer Management</h2>

      <form onSubmit={handleSubmit} style={{ marginBottom: "20px" }}>
        <input
          type="text"
          name="name"
          placeholder="Farmer name"
          value={form.name}
          onChange={handleChange}
        />

        <input
          type="number"
          name="age"
          placeholder="Age"
          value={form.age}
          onChange={handleChange}
        />

        <input
          type="text"
          name="address"
          placeholder="Address"
          value={form.address}
          onChange={handleChange}
        />

        <div style={{ margin: "10px 0" }}>
          <p style={{ marginBottom: "8px" }}>Bean Types</p>

          {form.beans.map((bean, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              <select
                value={bean}
                onChange={(e) => handleBeanChange(index, e.target.value)}
              >
                <option value="">Select bean type</option>
                {beans.map((beanItem) => (
                  <option key={beanItem.id} value={beanItem.name}>
                    {beanItem.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={addBeanField}
                style={{
                  width: "32px",
                  height: "32px",
                  fontSize: "18px",
                  cursor: "pointer",
                }}
                title="Add another bean type"
              >
                +
              </button>

              {form.beans.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeBeanField(index)}
                  style={{
                    width: "32px",
                    height: "32px",
                    fontSize: "18px",
                    cursor: "pointer",
                  }}
                  title="Remove bean type"
                >
                  -
                </button>
              )}
            </div>
          ))}
        </div>

        <button type="submit">
          {isEditing ? "Update Farmer" : "Add Farmer"}
        </button>
      </form>

      <table border="1" cellPadding="10" style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Age</th>
            <th>Address</th>
            <th>Bean Types</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {farmers.length > 0 ? (
            farmers.map((farmer) => (
              <tr key={farmer.id}>
                <td>{farmer.name}</td>
                <td>{farmer.age}</td>
                <td>{farmer.address}</td>
                <td>{farmer.beans.join(", ")}</td>
                <td>
                  <button onClick={() => handleEdit(farmer)}>Edit</button>
                  <button onClick={() => handleDelete(farmer.id)}>Delete</button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5">No farmers found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
=======
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
                  "farmers",
                  "beans",
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
                    onClick={() => {
                      if (item === "admin") return navigate("/admin");
                      if (item === "farmers") return navigate("/farmers");
                      if (item === "beans") return navigate("/beans");

                      return navigate(`/module/${item}`);
                    }}
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
                {currentUser && (
                  <p>Logged in as: {currentUser.username}</p>
                )}
              </div>
            </div>

            <div className="sidebar">
              <input className="search" placeholder="Search..." />

              <button className="logout" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        }
      />

      {/* FARMERS */}
      <Route path="/farmers" element={<FarmerManagement />} />

      {/* BEANS */}
      <Route path="/beans" element={<BeanManagement />} />

      {/* ADMIN */}
      <Route path="/admin" element={<AdminPage />} />

      {/* OTHER MODULES */}
      <Route path="/module/:id" element={<ModulePage />} />
    </Routes>
>>>>>>> 268c76c5a77bd7f1e02aceb558e171d60e46357b
  );
}

export default FarmerManagement;