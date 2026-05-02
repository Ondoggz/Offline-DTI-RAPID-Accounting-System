import { useEffect, useState } from "react";
import { authFetch } from "../utils/authFetch";

function BeanManagement({ beans, setBeans }) {
  const [form, setForm] = useState({
    id: null,
    name: "",
    pricePerUnit: "",
    unit: "kg",
  });

  const [isEditing, setIsEditing] = useState(false);

  // 🔄 LOAD FROM BACKEND
  useEffect(() => {
    const fetchBeans = async () => {
      try {
        const res = await authFetch("/api/beans");
        const data = await res.json();

        const mapped = data.map((bean) => ({
          id: bean._id,
          name: bean.beanName,
          pricePerUnit: bean.pricePerUnit,
          unit: bean.unit,
          farmers: bean.farmers || [],
        }));

        setBeans(mapped);
      } catch (err) {
        console.error(err);
      }
    };

    fetchBeans();
  }, []);

  const resetForm = () => {
    setForm({
      id: null,
      name: "",
      pricePerUnit: "",
      unit: "kg",
    });
    setIsEditing(false);
  };

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // 🔥 CREATE / UPDATE
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim() || !form.pricePerUnit || !form.unit.trim()) {
      alert("Please fill in bean name, price per unit, and unit.");
      return;
    }

    const beanData = {
      beanName: form.name.trim(),
      pricePerUnit: Number(form.pricePerUnit),
      unit: form.unit.trim(),
    };

    try {
      if (isEditing) {
        await authFetch(`/api/beans/${form.id}`, {
          method: "PUT",
          body: JSON.stringify(beanData),
        });
      } else {
        await authFetch("/api/beans", {
          method: "POST",
          body: JSON.stringify(beanData),
        });
      }

      // refresh
      const res = await authFetch("/api/beans");
      const data = await res.json();

      setBeans(
        data.map((bean) => ({
          id: bean._id,
          name: bean.beanName,
          pricePerUnit: bean.pricePerUnit,
          unit: bean.unit,
          farmers: bean.farmers || [],
        }))
      );

      resetForm();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (bean) => {
    setForm({
      id: bean.id,
      name: bean.name,
      pricePerUnit: bean.pricePerUnit,
      unit: bean.unit,
    });
    setIsEditing(true);
  };

  // 🔥 DELETE
  const handleDelete = async (id) => {
    const confirmed = window.confirm("Are you sure?");
    if (!confirmed) return;

    try {
      await authFetch(`/api/beans/${id}`, {
        method: "DELETE",
      });

      setBeans((prev) => prev.filter((bean) => bean.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Bean Management</h2>
      {/* UI stays the same */}
    </div>
  );
}

export default BeanManagement;