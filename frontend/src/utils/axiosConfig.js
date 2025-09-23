import axios from "axios";
import { supabase } from "../lib/supabaseClient";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || "http://localhost:4200",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  maxRedirects: 5,
  timeout: 30000,
});

// Track concurrent session refreshes
let refreshTokenPromise = null;

// Function to refresh the session
const refreshSession = async () => {
  try {
    const {
      data: { session },
    } = await supabase.auth.refreshSession();
    if (session?.access_token) {
      return session;
    }
    throw new Error("Session refresh failed");
  } catch (error) {
    console.error("Session refresh failed:", error);
    throw error;
  }
};

// Request interceptor
axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      // Get current session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // If we have a valid session, use it
      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
        if (!config.headers["Content-Type"]?.includes("multipart/form-data")) {
          config.headers["Content-Type"] = "application/json";
        }
        return config;
      }

      // If no valid session, try to refresh (use existing refresh promise if one exists)
      if (!refreshTokenPromise) {
        refreshTokenPromise = refreshSession().finally(() => {
          refreshTokenPromise = null;
        });
      }

      const refreshedSession = await refreshTokenPromise;
      if (refreshedSession?.access_token) {
        config.headers.Authorization = `Bearer ${refreshedSession.access_token}`;
        if (!config.headers["Content-Type"]?.includes("multipart/form-data")) {
          config.headers["Content-Type"] = "application/json";
        }
        return config;
      }

      throw new Error("No valid session found");
    } catch (error) {
      console.error("Auth interceptor error:", error);
      // Only redirect if not on login page and it's a navigation request
      if (
        !window.location.pathname.includes("/login") &&
        !config.url.includes("/api/auth")
      ) {
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.code === "ERR_NETWORK") {
      console.error(
        "Network error - Make sure your backend server is running on port 4200"
      );
    }

    // Handle 401 Unauthorized errors
    if (error.response?.status === 401) {
      try {
        // Use existing refresh promise if one exists
        if (!refreshTokenPromise) {
          refreshTokenPromise = refreshSession().finally(() => {
            refreshTokenPromise = null;
          });
        }

        const session = await refreshTokenPromise;

        if (!session) {
          // If refresh fails and not on login page, redirect
          if (!window.location.pathname.includes("/login")) {
            window.location.href = "/login";
          }
          return Promise.reject(error);
        }

        // If refresh succeeds, retry the original request
        const originalRequest = error.config;
        originalRequest.headers.Authorization = `Bearer ${session.access_token}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        console.error("Session refresh failed:", refreshError);
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
