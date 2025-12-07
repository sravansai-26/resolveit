import axios from "axios";

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
  withCredentials: true,
});

// Attach Authorization header from localStorage or sessionStorage
api.interceptors.request.use((config) => {
  try {
    const local = localStorage.getItem("token");
    const session = sessionStorage.getItem("token");
    const token = local || session;
    if (token) {
      if (!config.headers) config.headers = {} as any;
      (config.headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }
  } catch (e) {
    // ignore (e.g., SSR or restricted storage)
  }
  return config;
});

export default api;
