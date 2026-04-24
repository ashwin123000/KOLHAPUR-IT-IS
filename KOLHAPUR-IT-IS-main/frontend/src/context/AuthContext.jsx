import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { API_BASE } from "../api/config";

const AuthContext = createContext(null);

const unwrapPayload = (payload) => payload?.data || payload;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    fetch(`${API_BASE}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("token");
          localStorage.removeItem("access_token");
          localStorage.removeItem("userId");
          localStorage.removeItem("role");
          setUser(null);
          return null;
        }
        if (!res.ok) {
          setUser(null);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data) {
          return;
        }
        const nextUser = unwrapPayload(data);
        setUser(nextUser);
        if (nextUser?.id) {
          localStorage.setItem("userId", nextUser.id);
        }
        if (nextUser?.role) {
          localStorage.setItem("role", nextUser.role);
        }
        if (nextUser?.name) {
          localStorage.setItem("full_name", nextUser.name);
        }
      })
      .catch((err) => {
        console.error("[AUTH] /me fetch failed:", err);
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = async (email, password) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const body = await res.json().catch(() => ({}));
    const data = unwrapPayload(body);

    if (!res.ok) {
      throw new Error(body.detail || body.error || data?.detail || "Login failed");
    }

    localStorage.setItem("token", data.access_token);
    localStorage.setItem("access_token", data.access_token);
    if (data.userId || data.user?.id) {
      localStorage.setItem("userId", data.user?.id || data.userId);
    }
    if (data.role) {
      localStorage.setItem("role", data.role);
    }
    if (data.user?.name) {
      localStorage.setItem("full_name", data.user.name);
    }

    if (data.user) {
      setUser(data.user);
    }

    return data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("userId");
    localStorage.removeItem("role");
    localStorage.removeItem("full_name");
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      setUser,
      loading,
      login,
      logout,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
