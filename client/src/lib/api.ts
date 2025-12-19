import axios from "axios";

// Clean the VITE_API_URL to prevent double slashes
const rawBaseURL = import.meta.env.VITE_API_URL || "https://resolveit-api.onrender.com";
const cleanBaseURL = rawBaseURL.endsWith("/") ? rawBaseURL.slice(0, -1) : rawBaseURL;

const api = axios.create({
  baseURL: `${cleanBaseURL}/api`,
  withCredentials: true,
});

// Attach Authorization header from localStorage or sessionStorage
api.interceptors.request.use((config) => {
  try {
    const local = localStorage.getItem("token");
    const session = sessionStorage.getItem("token");
    const token = local || session;
    
    if (token) {
      // Modern Axios uses a 'headers' object that is always present, 
      // but we ensure it's treated as a standard object for the Bearer token.
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    // ignore (e.g., SSR or restricted storage)
    console.error("API Interceptor Error:", e);
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;