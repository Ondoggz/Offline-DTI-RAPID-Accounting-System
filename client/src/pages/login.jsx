import { useState } from "react";
import "./login.css";
import dtiLogo from "../assets/logos/dti-logo.png";

export default function Login({ onLoginSuccess }) {
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);

  const [modal, setModal] = useState(null);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await window.api.login(
        form.username,
        form.password
      );

      if (!data?.success) {
        setModal({
          type: "alert",
          message: data?.message || "Login failed",
        });
        return;
      }

      onLoginSuccess(data.user);
    } catch (error) {
      console.error("LOGIN ERROR:", error);
      setModal({
        type: "alert",
        message: "Login error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo-section">
          <img src={dtiLogo} alt="DTI Logo" className="login-logo" />
        </div>

        <p className="login-label">Login</p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={form.username}
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Password..."
            value={form.password}
            onChange={handleChange}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>

      {/* MODAL */}
      {modal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <p>{modal.message}</p>

            {modal.type === "alert" && (
              <button onClick={() => setModal(null)}>
                OK
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}