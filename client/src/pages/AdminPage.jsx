import { useEffect, useState } from "react";
import "./admin.css";

function AdminPage() {
  const [users, setUsers] = useState([]);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [editingUser, setEditingUser] = useState(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPasswordError, setAdminPasswordError] = useState("");

  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [deleteAdminPassword, setDeleteAdminPassword] = useState("");
  const [deletePasswordError, setDeletePasswordError] = useState("");

  const [formError, setFormError] = useState("");
  const [systemError, setSystemError] = useState("");

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
      const data = await window.api.getUsers();
      setUsers(data || []);
    } catch (err) {
      console.error("FETCH USERS ERROR:", err);
      setSystemError("Failed to load users.");
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const getCurrentAdminFromUsers = () => {
    return users.find((u) => u.username === currentUser.username);
  };

  const resetForm = () => {
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

    setEditingUser(null);
    setAdminPassword("");
    setAdminPasswordError("");
    setFormError("");
    setSystemError("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const resetDeleteConfirmation = () => {
    setPendingDeleteId(null);
    setDeleteAdminPassword("");
    setDeletePasswordError("");
    setSystemError("");
  };

  const createUser = async () => {
    try {
      setFormError("");
      setSystemError("");

      if (!form.name || !form.username || !form.password) {
        setFormError("Full name, username, and password are required.");
        return;
      }

      if (form.password !== form.confirmPassword) {
        setFormError("Passwords do not match.");
        return;
      }

      await window.api.addUser({
        id: Date.now().toString(),
        name: form.name,
        username: form.username,
        password: form.password,
        sex: form.sex,
        age: form.age ? Number(form.age) : null,
        position: form.position,
        role: form.role,
      });

      resetForm();
      fetchUsers();
    } catch (err) {
      console.error("CREATE USER ERROR:", err);
      setSystemError("Failed to create user.");
    }
  };

  const startEdit = (user) => {
    setEditingUser(user);
    setPendingDeleteId(null);
    setDeleteAdminPassword("");
    setDeletePasswordError("");
    setFormError("");
    setSystemError("");

    setForm({
      name: user.name || "",
      username: user.username || "",
      password: "",
      confirmPassword: "",
      sex: user.sex || "",
      age: user.age || "",
      position: user.position || "",
      role: user.role || "user",
    });

    setAdminPassword("");
    setAdminPasswordError("");
  };

  const updateUser = async () => {
    try {
      if (!editingUser) return;

      setFormError("");
      setSystemError("");
      setAdminPasswordError("");

      if (!form.name || !form.username) {
        setFormError("Full name and username are required.");
        return;
      }

      if (form.password || form.confirmPassword) {
        if (form.password !== form.confirmPassword) {
          setFormError("Passwords do not match.");
          return;
        }
      }

      if (!adminPassword) {
        setAdminPasswordError("Enter your admin password to confirm changes.");
        return;
      }

      const currentAdmin = getCurrentAdminFromUsers();

      if (!currentAdmin || adminPassword !== currentAdmin.password) {
        setAdminPasswordError("Incorrect admin password.");
        return;
      }

      await window.api.updateUser({
        id: editingUser.id,
        name: form.name,
        username: form.username,
        password: form.password || editingUser.password,
        sex: form.sex,
        age: form.age ? Number(form.age) : null,
        position: form.position,
        role: form.role,
      });

      resetForm();
      fetchUsers();
    } catch (err) {
      console.error("UPDATE USER ERROR:", err);
      setSystemError("Failed to update user.");
    }
  };

  const askDeleteUser = (id) => {
    setPendingDeleteId(id);
    setDeleteAdminPassword("");
    setDeletePasswordError("");
    setSystemError("");
    setEditingUser(null);
  };

  const confirmDeleteUser = async () => {
    try {
      setDeletePasswordError("");
      setSystemError("");

      if (!deleteAdminPassword) {
        setDeletePasswordError("Enter your admin password to confirm deletion.");
        return;
      }

      const currentAdmin = getCurrentAdminFromUsers();

      if (!currentAdmin || deleteAdminPassword !== currentAdmin.password) {
        setDeletePasswordError("Incorrect admin password.");
        return;
      }

      await window.api.deleteUser(pendingDeleteId);
      resetDeleteConfirmation();
      fetchUsers();
    } catch (err) {
      console.error("DELETE USER ERROR:", err);
      setSystemError("Failed to delete user.");
    }
  };

  return (
    <div className="admin-container">
      <h1>Admin Panel</h1>

      <div className="admin-card">
        <h3>{editingUser ? "Edit User" : "Create User"}</h3>

        {formError && <div className="warning-bubble">{formError}</div>}
        {systemError && <div className="warning-bubble">{systemError}</div>}

        <input
          placeholder="Full Name"
          value={form.name}
          onChange={(e) => {
            setForm({ ...form, name: e.target.value });
            setFormError("");
          }}
        />

        <input
          placeholder="Username"
          value={form.username}
          onChange={(e) => {
            setForm({ ...form, username: e.target.value });
            setFormError("");
          }}
        />

        <div className="password-field">
          <input
            type={showPassword ? "text" : "password"}
            placeholder={
              editingUser
                ? "New Password (leave blank to keep old password)"
                : "Password"
            }
            value={form.password}
            onChange={(e) => {
              setForm({ ...form, password: e.target.value });
              setFormError("");
            }}
          />

          <button
            type="button"
            className="eye-btn"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        <div className="password-field">
          <input
            type={showConfirmPassword ? "text" : "password"}
            placeholder={editingUser ? "Confirm New Password" : "Confirm Password"}
            value={form.confirmPassword}
            onChange={(e) => {
              setForm({ ...form, confirmPassword: e.target.value });
              setFormError("");
            }}
          />

          <button
            type="button"
            className="eye-btn"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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

        {editingUser && (
          <>
            <input
              type="password"
              placeholder="Enter admin password to confirm edit"
              value={adminPassword}
              onChange={(e) => {
                setAdminPassword(e.target.value);
                setAdminPasswordError("");
              }}
            />

            {adminPasswordError && (
              <div className="warning-bubble">{adminPasswordError}</div>
            )}
          </>
        )}

        {editingUser ? (
          <div className="admin-actions">
            <button className="admin-btn" onClick={updateUser}>
              Save Changes
            </button>
            <button className="cancel-btn" onClick={resetForm}>
              Cancel Edit
            </button>
          </div>
        ) : (
          <button className="admin-btn" onClick={createUser}>
            Create User
          </button>
        )}
      </div>

      {pendingDeleteId && (
        <div className="admin-card">
          <h3>Confirm Delete</h3>

          <p>Enter admin password to delete this user.</p>

          <input
            type="password"
            placeholder="Admin password"
            value={deleteAdminPassword}
            onChange={(e) => {
              setDeleteAdminPassword(e.target.value);
              setDeletePasswordError("");
            }}
          />

          {deletePasswordError && (
            <div className="warning-bubble">{deletePasswordError}</div>
          )}

          <div className="admin-actions">
            <button className="delete-btn" onClick={confirmDeleteUser}>
              Confirm Delete
            </button>
            <button className="cancel-btn" onClick={resetDeleteConfirmation}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="admin-card">
        <h3>User List</h3>

        <div className="user-list">
          {users.map((u) => (
            <div key={u.id} className="user-item">
              <span>
                <strong>{u.name || u.username}</strong> — {u.role}
                <br />
                <small>
                  Username: {u.username}
                  <br />
                  Sex: {u.sex || "N/A"} • Age: {u.age || "N/A"} • Position:{" "}
                  {u.position || "N/A"}
                </small>
              </span>

              <div className="user-actions">
                <button className="edit-btn" onClick={() => startEdit(u)}>
                  Edit
                </button>
                <button className="delete-btn" onClick={() => askDeleteUser(u.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AdminPage;