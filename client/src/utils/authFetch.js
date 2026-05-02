export async function authFetch(url, options = {}) {
  const token = localStorage.getItem("token");

  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (res.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("lastActivity");
    window.location.reload();
  }

  return res;
}

//for beans module
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