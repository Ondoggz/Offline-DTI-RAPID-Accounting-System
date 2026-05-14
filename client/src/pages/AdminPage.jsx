import { useEffect, useState } from "react";
import "./admin.css";

function AdminPage() {
  const [users, setUsers] = useState([]);
  const [showPasswords, setShowPasswords] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [modal, setModal] = useState(null);
  const [errors, setErrors] = useState({});

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

  // =========================
  // CREATE USER
  // =========================
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

      setErrors({});
      fetchUsers();
    } catch (err) {
      console.error("CREATE USER ERROR:", err);
      setModal({
        type: "alert",
        message: "Unexpected error while creating user",
      });
    }
  };

  // =========================
  // DELETE USER (KEEP MODAL)
  // =========================
  const deleteUser = (id) => {
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
  };

  // =========================
  // VALIDATION (INLINE ERRORS)
  // =========================
  const validateForm = () => {
    const newErrors = {};

    if (!form.name.trim()) newErrors.name = "Full name is required";
    if (!form.username.trim()) newErrors.username = "Username is required";
    if (!form.password) newErrors.password = "Password is required";

    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!form.sex) newErrors.sex = "Please select sex";
    if (!form.age || Number(form.age) <= 0) newErrors.age = "Invalid age";
    if (!form.position.trim()) newErrors.position = "Position is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
  const isPasswordValid = passwordRegex.test(form.password);

  // =========================
  // UI
  // =========================
  return (
    <div className="admin-container">
      <h1>Admin Panel</h1>

      {/* CREATE USER */}
      <div className="admin-card">
        <h3>Create User</h3>

        <div>
          <input
            name="name"
            placeholder="Full Name"
            value={form.name}
            onChange={handleChange}
          />
          {errors.name && <small className="error-bubble">{errors.name}</small>}
        </div>

        <div>
          <input
            name="username"
            placeholder="Username"
            value={form.username}
            onChange={handleChange}
          />
          {errors.username && (
            <small className="error-bubble">{errors.username}</small>
          )}
        </div>

        {/* PASSWORD */}
        <div className="password-field">
          <div>
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>

            {form.password.length > 0 && (
              <small
                style={{ color: isPasswordValid ? "green" : "red" }}
              >
                {isPasswordValid
                  ? "Strong password"
                  : "Must be 8+ chars, include letters and numbers"}
              </small>
            )}

            {errors.password && (
              <small className="error-bubble">{errors.password}</small>
            )}
          </div>
        </div>

        {/* CONFIRM PASSWORD */}
        <div className="password-field">
          <div>
            <input
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Password"
              value={form.confirmPassword}
              onChange={handleChange}
            />
            <button
              type="button"
              onClick={() =>
                setShowConfirmPassword(!showConfirmPassword)
              }
            >
              {showConfirmPassword ? "Hide" : "Show"}
            </button>

            {errors.confirmPassword && (
              <small className="error-bubble">
                {errors.confirmPassword}
              </small>
            )}
          </div>
        </div>

        {/* SEX */}
        <div>
          <select name="sex" value={form.sex} onChange={handleChange}>
            <option value="">Select Sex</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          {errors.sex && <small className="error-bubble">{errors.sex}</small>}
        </div>

        {/* AGE */}
        <div>
          <input
            name="age"
            type="number"
            placeholder="Age"
            value={form.age}
            onChange={handleChange}
          />
          {errors.age && <small className="error-bubble">{errors.age}</small>}
        </div>

        {/* POSITION */}
        <div>
          <input
            name="position"
            placeholder="Position"
            value={form.position}
            onChange={handleChange}
          />
          {errors.position && (
            <small className="error-bubble">{errors.position}</small>
          )}
        </div>

        {/* ROLE */}
        <select
          name="role"
          value={form.role}
          onChange={handleChange}
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>

        <button
          onClick={createUser}
          disabled={!isPasswordValid}
        >
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

      {/* MODAL (DELETE ONLY) */}
      {modal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <p>{modal.message}</p>

            {modal.type === "alert" && (
              <button onClick={() => setModal(null)}>
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
                >
                  Yes
                </button>

                <button onClick={() => setModal(null)}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPage;