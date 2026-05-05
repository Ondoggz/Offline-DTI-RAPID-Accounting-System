const API_URL = import.meta.env.VITE_API_URL;

export async function authFetch(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  // ✅ Normalize endpoint
  let url = endpoint;

  // if endpoint is NOT full URL, attach base
  if (!url.startsWith("http")) {
    url = `${API_URL}${url.startsWith("/") ? "" : "/"}${url}`;
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: token ? `Bearer ${token}` : "",
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