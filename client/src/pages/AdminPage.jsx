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
    setErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const resetDeleteConfirmation = () => {
    setPendingDeleteId(null);
    setDeleteAdminPassword("");
    setDeletePasswordError("");
    setSystemError("");
  };

  // =========================
  // VALIDATION
  // =========================
  const validateForm = () => {
    const newErrors = {};

    if (!form.name.trim()) {
      newErrors.name = "Full name is required";
    }

    if (!form.username.trim()) {
      newErrors.username = "Username is required";
    }

    if (!editingUser && !form.password) {
      newErrors.password = "Password is required";
    }

    if (
      (form.password || form.confirmPassword) &&
      form.password !== form.confirmPassword
    ) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!form.sex) {
      newErrors.sex = "Please select sex";
    }

    if (!form.age || Number(form.age) <= 0) {
      newErrors.age = "Invalid age";
    }

    if (!form.position.trim()) {
      newErrors.position = "Position is required";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    setFormError("");
  };

  const passwordRegex =
    /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;

  const isPasswordValid =
    form.password.length === 0
      ? true
      : passwordRegex.test(form.password);

  // =========================
  // CREATE USER
  // =========================
  const createUser = async () => {
    try {
      setFormError("");
      setSystemError("");

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

      resetForm();
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
  // START EDIT
  // =========================
  const startEdit = (user) => {
    setEditingUser(user);

    setPendingDeleteId(null);
    setDeleteAdminPassword("");
    setDeletePasswordError("");

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

    setErrors({});
    setAdminPassword("");
    setAdminPasswordError("");
    setFormError("");
    setSystemError("");
  };

  // =========================
  // UPDATE USER
  // =========================
  const updateUser = async () => {
    try {
      setFormError("");
      setSystemError("");
      setAdminPasswordError("");

      if (!validateForm()) return;

      if (!adminPassword) {
        setAdminPasswordError(
          "Enter your admin password to confirm changes."
        );
        return;
      }

      const currentAdmin = getCurrentAdminFromUsers();

      if (
        !currentAdmin ||
        adminPassword !== currentAdmin.password
      ) {
        setAdminPasswordError("Incorrect admin password.");
        return;
      }

      await window.api.updateUser({
        id: editingUser.id,
        name: form.name,
        username: form.username,
        password: form.password || editingUser.password,
        sex: form.sex,
        age: Number(form.age),
        position: form.position,
        role: form.role,
      });

      resetForm();
      fetchUsers();
    } catch (err) {
      console.error("UPDATE USER ERROR:", err);

      setModal({
        type: "alert",
        message: "Failed to update user",
      });
    }
  };

  // =========================
  // DELETE USER
  // =========================
  const askDeleteUser = (id) => {
    setPendingDeleteId(id);
    setDeleteAdminPassword("");
    setDeletePasswordError("");
    setEditingUser(null);
  };

  const confirmDeleteUser = async () => {
    try {
      if (!deleteAdminPassword) {
        setDeletePasswordError(
          "Enter admin password to confirm deletion."
        );
        return;
      }

      const currentAdmin = getCurrentAdminFromUsers();

      if (
        !currentAdmin ||
        deleteAdminPassword !== currentAdmin.password
      ) {
        setDeletePasswordError("Incorrect admin password.");
        return;
      }

      setModal({
        type: "confirm",
        message: "Delete this user?",
        onConfirm: async () => {
          try {
            await window.api.deleteUser(pendingDeleteId);

            resetDeleteConfirmation();
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
      console.error(err);
    }
  };

  return (
    <div className="admin-container">
      <h1>Admin Panel</h1>

      <div className="admin-card">
        <h3>{editingUser ? "Edit User" : "Create User"}</h3>

        {formError && (
          <div className="warning-bubble">
            {formError}
          </div>
        )}

        {systemError && (
          <div className="warning-bubble">
            {systemError}
          </div>
        )}

        {/* FULL NAME */}
        <div>
          <input
            name="name"
            placeholder="Full Name"
            value={form.name}
            onChange={handleChange}
          />

          {errors.name && (
            <small className="error-bubble">
              {errors.name}
            </small>
          )}
        </div>

        {/* USERNAME */}
        <div>
          <input
            name="username"
            placeholder="Username"
            value={form.username}
            onChange={handleChange}
          />

          {errors.username && (
            <small className="error-bubble">
              {errors.username}
            </small>
          )}
        </div>

        {/* PASSWORD */}
        <div className="password-field">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder={
              editingUser
                ? "New Password (leave blank to keep old password)"
                : "Password"
            }
            value={form.password}
            onChange={handleChange}
          />

          <button
            type="button"
            className="eye-btn"
            onClick={() =>
              setShowPassword(!showPassword)
            }
          >
            {showPassword ? "Hide" : "Show"}
          </button>

          {form.password.length > 0 && (
            <small
              style={{
                color: isPasswordValid ? "green" : "red",
              }}
            >
              {isPasswordValid
                ? "Strong password"
                : "Must be 8+ chars, include letters and numbers"}
            </small>
          )}

          {errors.password && (
            <small className="error-bubble">
              {errors.password}
            </small>
          )}
        </div>

        {/* CONFIRM PASSWORD */}
        <div className="password-field">
          <input
            name="confirmPassword"
            type={
              showConfirmPassword
                ? "text"
                : "password"
            }
            placeholder={
              editingUser
                ? "Confirm New Password"
                : "Confirm Password"
            }
            value={form.confirmPassword}
            onChange={handleChange}
          />

          <button
            type="button"
            className="eye-btn"
            onClick={() =>
              setShowConfirmPassword(
                !showConfirmPassword
              )
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

        {/* SEX */}
        <div>
          <select
            name="sex"
            value={form.sex}
            onChange={handleChange}
          >
            <option value="">Select Sex</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>

          {errors.sex && (
            <small className="error-bubble">
              {errors.sex}
            </small>
          )}
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

          {errors.age && (
            <small className="error-bubble">
              {errors.age}
            </small>
          )}
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
            <small className="error-bubble">
              {errors.position}
            </small>
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

        {/* ADMIN PASSWORD */}
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
              <div className="warning-bubble">
                {adminPasswordError}
              </div>
            )}
          </>
        )}

        {/* ACTIONS */}
        {editingUser ? (
          <div className="admin-actions">
            <button
              className="admin-btn"
              onClick={updateUser}
              disabled={!isPasswordValid}
            >
              Save Changes
            </button>

            <button
              className="cancel-btn"
              onClick={resetForm}
            >
              Cancel Edit
            </button>
          </div>
        ) : (
          <button
            className="admin-btn"
            onClick={createUser}
            disabled={!isPasswordValid}
          >
            Create User
          </button>
        )}
      </div>

      {/* DELETE CONFIRM */}
      {pendingDeleteId && (
        <div className="admin-card">
          <h3>Confirm Delete</h3>

          <p>
            Enter admin password to delete this
            user.
          </p>

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
            <div className="warning-bubble">
              {deletePasswordError}
            </div>
          )}

          <div className="admin-actions">
            <button
              className="delete-btn"
              onClick={confirmDeleteUser}
            >
              Confirm Delete
            </button>

            <button
              className="cancel-btn"
              onClick={resetDeleteConfirmation}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* USER LIST */}
      <div className="admin-card">
        <h3>User List</h3>

        <div className="user-list">
          {users.map((u) => (
            <div key={u.id} className="user-item">
              <span>
                <strong>
                  {u.name || u.username}
                </strong>{" "}
                — {u.role}
                <br />

                <small>
                  Username: {u.username}
                  <br />
                  Sex: {u.sex || "N/A"} • Age:{" "}
                  {u.age || "N/A"} • Position:{" "}
                  {u.position || "N/A"}
                </small>
              </span>

              <div className="user-actions">
                <button
                  className="edit-btn"
                  onClick={() => startEdit(u)}
                >
                  Edit
                </button>

                <button
                  className="delete-btn"
                  onClick={() =>
                    askDeleteUser(u.id)
                  }
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL */}
      {modal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <p>{modal.message}</p>

            {modal.type === "alert" && (
              <button
                onClick={() => setModal(null)}
              >
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

                <button
                  onClick={() => setModal(null)}
                >
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