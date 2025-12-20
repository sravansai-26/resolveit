import axios from "axios";

const rawBaseURL = import.meta.env.VITE_API_URL || "https://resolveit-api.onrender.com";
const cleanBaseURL = rawBaseURL.endsWith("/") ? rawBaseURL.slice(0, -1) : rawBaseURL;

const api = axios.create({
  baseURL: `${cleanBaseURL}/api`,
  withCredentials: true,
});

// 1. REQUEST INTERCEPTOR: Attach the token
api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    console.error("API Request Interceptor Error:", e);
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// 2. RESPONSE INTERCEPTOR: Handle expired tokens (Auto-Logout)
api.interceptors.response.use(
  (response) => response, // Return the response if successful
  (error) => {
    // If the server returns 401 (Unauthorized), the token is likely invalid or expired
    if (error.response && error.response.status === 401) {
      console.warn("🔴 Session expired or invalid token. Clearing storage...");
      
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");

      // Redirect to login page if we are in a browser environment
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;