export const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:8000";

export async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    credentials: "include",
    ...options,
    headers,
  });

  const payload = await response
    .json()
    .catch(() => ({ message: response.statusText || "Request failed" }));

  if (!response.ok) {
    throw new Error(
      payload.detail ||
      payload.error ||
      payload.message ||
      `API error ${response.status}`
    );
  }

  return payload;
}
