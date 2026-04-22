import { useEffect, useState } from "react";
import { authFetch } from "../utils/authFetch";
import "./admin.css";

function AdminPage() {
  const [users, setUsers] = useState([]);

  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "user",
  });

  const currentUser = JSON.parse(localStorage.getItem("user"));

  if (currentUser?.role !== "admin") {
    return <h1>Unauthorized</h1>;
  }

  const fetchUsers = async () => {
    const res = await authFetch(
      `${import.meta.env.VITE_API_URL}/users`
    );
    const data = await res.json();
    setUsers(data.users);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const createUser = async () => {
    await authFetch(
      `${import.meta.env.VITE_API_URL}/users`,
      {
        method: "POST",
        body: JSON.stringify(form),
      }
    );

    setForm({ username: "", password: "", role: "user" });
    fetchUsers();
  };

  const deleteUser = async (id) => {
    await authFetch(
      `${import.meta.env.VITE_API_URL}/users/${id}`,
      {
        method: "DELETE",
      }
    );

    fetchUsers();
  };

  // ✅ THIS is where your return goes
  return (
    <div className="admin-container">
      <h1>Admin Panel</h1>

      {/* CREATE USER */}
      <div className="admin-card">
        <h3>Create User</h3>

        <input
          placeholder="Username"
          value={form.username}
          onChange={(e) =>
            setForm({ ...form, username: e.target.value })
          }
        />

        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) =>
            setForm({ ...form, password: e.target.value })
          }
        />

        <select
          value={form.role}
          onChange={(e) =>
            setForm({ ...form, role: e.target.value })
          }
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

        <div className="user-list">
          {users.map((u) => (
            <div key={u._id} className="user-item">
              <span>
                {u.username} — {u.role}
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