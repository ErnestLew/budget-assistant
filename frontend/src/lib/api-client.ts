import axios from "axios";

export const apiClient = axios.create({
  baseURL: "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

// Set the backend auth token (called after backend login)
export function setAuthToken(token: string | null) {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common.Authorization;
  }
}

// Shared refresh promise — concurrent 401s queue behind a single refresh
let refreshPromise: Promise<string | null> | null = null;

async function refreshSession(): Promise<string | null> {
  try {
    const res = await fetch("/api/auth/session");
    if (res.ok) {
      const session = await res.json();
      if (session?.backendToken) {
        setAuthToken(session.backendToken);
        return session.backendToken;
      }
    }
  } catch {
    // Session refresh failed
  }
  return null;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retried) {
      error.config._retried = true;

      if (!refreshPromise) {
        refreshPromise = refreshSession().finally(() => {
          refreshPromise = null;
        });
      }

      const newToken = await refreshPromise;
      if (newToken) {
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return apiClient.request(error.config);
      }
    }
    return Promise.reject(error);
  }
);
