import axios from "axios";
import { getSession } from "next-auth/react";

const baseURL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/$/, "") + "/api/v1";

const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: attach Bearer token from session
api.interceptors.request.use(
  async (config) => {
    try {
      if (typeof window !== "undefined") {
        const session = await getSession();
        if (session?.accessToken) {
          config.headers.Authorization = `Bearer ${session.accessToken}`;
        }
      }
    } catch {
      // Fallback silently if session is unavailable
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 (redirect to login on client side)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== "undefined" && error.response?.status === 401) {
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login?callbackUrl=" + encodeURIComponent(window.location.pathname);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
