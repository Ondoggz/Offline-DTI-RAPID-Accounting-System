const API_URL = import.meta.env.VITE_API_URL;

export async function authFetch(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    },
  });

  // Auto logout on unauthorized
  if (res.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("lastActivity");
    window.location.reload();
  }

  return res;
}

/* -------------------------
   BEANS MODULE
--------------------------*/

export const getBeans = async () => {
  const res = await authFetch("/api/beans");
  return res.json();
};

export const createBean = async (data) => {
  const res = await authFetch("/api/beans", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
};

export const updateBean = async (id, data) => {
  const res = await authFetch(`/api/beans/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return res.json();
};

export const deleteBean = async (id) => {
  const res = await authFetch(`/api/beans/${id}`, {
    method: "DELETE",
  });
  return res.json();
};