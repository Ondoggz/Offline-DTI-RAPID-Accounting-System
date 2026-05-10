import { useEffect, useState } from "react";
import { authFetch } from "../utils/authFetch";
import "./admin.css";

function AdminPage() {
  const [users, setUsers] = useState([]);
  const [showPasswords, setShowPasswords] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [form, setForm] = useState({
    name: "",
    username: "",
    password: "",
    confirmPassword: "",
    sex: "",
    age: "",
    position: "",
    role: "user",
  });

  const currentUser = JSON.parse(localStorage.getItem("user"));

  if (currentUser?.role !== "admin") {
    return <h1>Unauthorized</h1>;
  }

  const fetchUsers = async () => {
    try {
      const res = await authFetch(`${import.meta.env.VITE_API_URL}/users`);
      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to fetch users");
        return;
      }

      setUsers(data.users || []);
    } catch (err) {
      console.error("FETCH USERS ERROR:", err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const createUser = async () => {
    try {
      if (!form.name || !form.username || !form.password) {
        alert("Full name, username, and password are required");
        return;
      }

      if (form.password !== form.confirmPassword) {
        alert("Passwords do not match");
        return;
      }

      const res = await authFetch(`${import.meta.env.VITE_API_URL}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          username: form.username,
          password: form.password,
          sex: form.sex,
          age: form.age ? Number(form.age) : null,
          position: form.position,
          role: form.role,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || data.error || "Failed to create user");
        return;
      }

      setForm({
        name: "",
        username: "",
        password: "",
        confirmPassword: "",
        sex: "",
        age: "",
        position: "",
        role: "user",
      });

      setShowPassword(false);
      setShowConfirmPassword(false);

      fetchUsers();
    } catch (err) {
      console.error("CREATE USER ERROR:", err);
      alert("Failed to create user");
    }
  };

  const deleteUser = async (id) => {
    try {
      const confirmDelete = window.confirm("Delete this user?");
      if (!confirmDelete) return;

      const res = await authFetch(
        `${import.meta.env.VITE_API_URL}/users/${id}`,
        { method: "DELETE" }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || data.error || "Failed to delete user");
        return;
      }

      fetchUsers();
    } catch (err) {
      console.error("DELETE USER ERROR:", err);
      alert("Failed to delete user");
    }
  };

  return (
    <div className="admin-container">
      <h1>Admin Panel</h1>

      {/* CREATE USER */}
      <div className="admin-card">
        <h3>Create User</h3>

        <input
          placeholder="Full Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        <input
          placeholder="Username"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
        />

        {/* PASSWORD */}
        <div className="password-field">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={form.password}
            onChange={(e) =>
              setForm({ ...form, password: e.target.value })
            }
          />
          <button
            type="button"
            className="eye-btn"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        {/* CONFIRM PASSWORD */}
        <div className="password-field">
          <input
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm Password"
            value={form.confirmPassword}
            onChange={(e) =>
              setForm({ ...form, confirmPassword: e.target.value })
            }
          />
          <button
            type="button"
            className="eye-btn"
            onClick={() =>
              setShowConfirmPassword(!showConfirmPassword)
            }
          >
            {showConfirmPassword ? "Hide" : "Show"}
          </button>
        </div>

        <select
          value={form.sex}
          onChange={(e) => setForm({ ...form, sex: e.target.value })}
        >
          <option value="">Select Sex</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>

        <input
          type="number"
          placeholder="Age"
          value={form.age}
          onChange={(e) => setForm({ ...form, age: e.target.value })}
        />

        <input
          placeholder="Position"
          value={form.position}
          onChange={(e) => setForm({ ...form, position: e.target.value })}
        />

        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>

        <button className="admin-btn" onClick={createUser}>
          Create User
        </button>
      </div>

      {/* USER LIST */}
      <div className="admin-card">
        <h3>User List</h3>

        <button
          className="admin-btn"
          onClick={() => setShowPasswords(!showPasswords)}
        >
          {showPasswords
            ? "Hide Hashed Passwords"
            : "Show Hashed Passwords"}
        </button>

        <div className="user-list">
          {users.map((u) => (
            <div key={u._id} className="user-item">
              <span>
                <strong>{u.name || u.username}</strong> — {u.role}
                <br />
                <small>
                  Username: {u.username}
                  <br />
                  Sex: {u.sex || "N/A"} • Age: {u.age || "N/A"} • Position:{" "}
                  {u.position || "N/A"}
                  {showPasswords && (
                    <>
                      <br />
                      Hashed Password: {u.password || "Hidden / Not returned"}
                    </>
                  )}
                </small>
              </span>

              <button
                className="delete-btn"
                onClick={() => deleteUser(u._id)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AdminPage;