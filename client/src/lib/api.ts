import axios from "axios";

// 🛡️ CRITICAL FIX: Hardcoding the URL for the APK to prevent "Failed to connect"
// Free Render instances need more time to wake up, so we set a 60s timeout.
const api = axios.create({
  baseURL: "https://resolveit-api.onrender.com/api",
  withCredentials: true,
  timeout: 60000, // 60 seconds (allows Render to wake up from sleep)
  headers: {
    "Content-Type": "application/json",
  },
});

// 1. REQUEST INTERCEPTOR: Attach the token
api.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      
      if (token) {
        // 🔥 FIX: Use config.headers.set for better compatibility with modern Axios versions
        // and to ensure it isn't stripped during cross-origin requests.
        if (config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      
      // Debug log for APK testing
      if (process.env.NODE_ENV === 'development') {
        console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
      }
    } catch (e) {
      console.error("API Request Interceptor Error:", e);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 2. RESPONSE INTERCEPTOR: Handle expired tokens (Auto-Logout)
api.interceptors.response.use(
  (response) => response, 
  (error) => {
    // Check if it's a timeout error (Render cold start)
    if (error.code === 'ECONNABORTED') {
      console.error("🔴 Connection timed out. Render server might be waking up.");
    }

    // If the server returns 401 (Unauthorized), the token is likely invalid or expired
    if (error.response && error.response.status === 401) {
      console.warn("🔴 Session expired or invalid token. Clearing storage...");
      
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");

      // Only redirect if not already on the login/forgot-password pages
      const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password'];
      
      // Safety check for 'window' availability (critical for some native environments)
      if (typeof window !== 'undefined') {
          const isPublicPath = publicPaths.some(path => window.location.pathname.startsWith(path));

          if (!isPublicPath) {
            // Using replace to prevent back-button loops
            window.location.replace('/login');
          }
      }
    }
    return Promise.reject(error);
  }
);

export default api;