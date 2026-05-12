const API_URL = import.meta.env.VITE_API_URL;

export async function authFetch(endpoint, options = {}) {
  // ✅ Get token from main process, not localStorage
  const session = await window.api.getSession();
  const token = session?.token || null;

  let url = endpoint;
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
    await window.api.logout();
    window.location.reload();
  }

  return res;
}