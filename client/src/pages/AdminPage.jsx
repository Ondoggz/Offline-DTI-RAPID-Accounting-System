import { useEffect, useState } from "react";
import "./admin.css";

function AdminPage() {
  const [users, setUsers] = useState([]);
  const [showPasswords, setShowPasswords] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [modal, setModal] = useState(null);
  
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
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

const createUser = async () => {
  try {
    if (!validateForm()) return;

    const res = await window.api.addUser({
      id: Date.now().toString(),
      name: form.name,
      username: form.username,
      password: form.password,
      sex: form.sex,
      age: Number(form.age),
      position: form.position,
      role: form.role,
    });

    // ❗ CHECK RESPONSE
    if (!res?.success) {
      setModal({
        type: "alert",
        message: res?.message || "Failed to create user",
      });
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
    setModal({
      type: "alert",
      message: "Unexpected error while creating user",
    });
  }
};

  const deleteUser = async (id) => {
    try {
      setModal({
        type: "confirm",
        message: "Delete this user?",
        onConfirm: async () => {
          try {
            await window.api.deleteUser(id);
            fetchUsers();
          } catch (err) {
            console.error("DELETE USER ERROR:", err);
            setModal({
              type: "alert",
              message: "Failed to delete user",
            });
          }
        },
      });
    } catch (err) {
      console.error("DELETE USER ERROR:", err);
      setModal({
        type: "alert",
        message: "Failed to delete user",
      });
    }
  };

  const validateForm = () => {
  if (!form.name.trim()) {
    setModal({ type: "alert", message: "Full name is required" });
    return false;
  }

  if (!form.username.trim()) {
    setModal({ type: "alert", message: "Username is required" });
    return false;
  }

  if (!form.password) {
    setModal({ type: "alert", message: "Password is required" });
    return false;
  }

  if (form.password !== form.confirmPassword) {
    setModal({ type: "alert", message: "Passwords do not match" });
    return false;
  }

  if (!form.sex) {
    setModal({ type: "alert", message: "Please select sex" });
    return false;
  }

  if (!form.age || Number(form.age) <= 0) {
    setModal({ type: "alert", message: "Please enter valid age" });
    return false;
  }

  if (!form.position.trim()) {
    setModal({ type: "alert", message: "Position is required" });
    return false;
  }

  return true;
};

  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
  const isPasswordValid = passwordRegex.test(form.password);

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

        <div className="password-field">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={form.password}
            onChange={(e) =>
              setForm({ ...form, password: e.target.value })
            }
          />
          <button onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? "Hide" : "Show"}
          </button>
                    {form.password.length > 0 && (
          <small style={{ color: isPasswordValid ? "green" : "red" }}>
            {isPasswordValid
              ? "Strong password"
              : "Must be 8+ chars, include letters and numbers"}
          </small>
        )}
        </div>

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

        <button onClick={createUser} disabled={!isPasswordValid}>
          Create User
        </button>
      </div>

      {/* USER LIST */}
      <div className="admin-card">
        <h3>User List</h3>

        <button onClick={() => setShowPasswords(!showPasswords)}>
          {showPasswords ? "Hide Passwords" : "Show Passwords"}
        </button>

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
                  {showPasswords && (
                    <>
                      <br />
                      Password: {u.password}
                    </>
                  )}
                </small>
              </span>

              <button onClick={() => deleteUser(u.id)}>
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
                {modal && (
    <div className="modal-overlay">
      <div className="modal-box">
      <p>{modal.message}</p>

      {modal.type === "alert" && (
        <button onClick={() => setModal(null)} autoFocus>
          OK
        </button>
      )}

      {modal.type === "confirm" && (
        <div className="modal-actions">
          <button
            onClick={() => {
              modal.onConfirm?.();
              setModal(null);
            }}
            autoFocus
          >
            Yes
          </button>
          <button onClick={() => setModal(null)}>Cancel</button>
        </div>
      )}
    </div>
  </div>
)}
    </div>
  );
};
export default AdminPage;