import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Mail, Lock } from 'lucide-react';
import { useProfile } from '../context/ProfileContext'; // Adjust path if needed

// ----------------------------------------------------------------------
// ✅ CRITICAL FIX: Base URL for Deployed API
// This constant pulls the live Render URL from the Vercel environment variable.
// ----------------------------------------------------------------------
const API_BASE_URL = import.meta.env.VITE_API_URL;

export function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });

  const navigate = useNavigate();
  const { setUser } = useProfile(); // Get setUser from context

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // ----------------------------------------------------------
      // ✅ FIX APPLIED HERE: Use the explicit base URL
      // Now the request goes to: https://resolveit-api.onrender.com/api/auth/login
      // ----------------------------------------------------------
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const responseData = await response.json(); // Get the full response data

      if (response.ok) {
        // --- FIX APPLIED HERE ---
        // Access token and user from responseData.data as per your backend structure
        if (formData.rememberMe) {
          localStorage.setItem("token", responseData.data.token);
          localStorage.setItem("user", JSON.stringify(responseData.data.user));
          sessionStorage.removeItem("token");
          sessionStorage.removeItem("user");
        } else {
          sessionStorage.setItem("token", responseData.data.token);
          sessionStorage.setItem("user", JSON.stringify(responseData.data.user));
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }

        setUser(responseData.data.user); // Update context state

        alert("Login successful!");
        navigate("/profile");
      } else {
        // Improved error handling for backend messages
        alert(responseData.message || "Login failed.");
        setFormData((prev) => ({ ...prev, password: "" })); // Clear password on error
        console.error("Login error:", responseData.message || responseData);
      }
    } catch (error) {
      if (error instanceof Error) {
        alert(`Connection Error: ${error.message}. Check if VITE_API_URL is correct.`);
        setFormData((prev) => ({ ...prev, password: "" })); // Clear password on error
        console.error("Login error:", error.message);
      } else {
        alert("Unexpected error during login.");
      }
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16">
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
          <p className="text-gray-600 mt-2">Sign in to your Resolveit account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <div className="mt-1 relative">
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="pl-10 w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter your email address"
                required
                title="Enter your email address"
              />
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="mt-1 relative">
              <input
                type="password"
                id="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="pl-10 w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter your password"
                required
                title="Enter your password"
              />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="remember-me"
                checked={formData.rememberMe}
                onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                title="Remember me"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                Remember me
              </label>
            </div>
            <Link to="/forgot-password" className="text-sm text-blue-600 hover:text-blue-800" title="Forgot password?">
              Forgot password?
            </Link>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full flex items-center justify-center space-x-2 py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            title="Sign In"
          >
            <LogIn size={20} />
            <span>Sign In</span>
          </button>
        </form>

        {/* Sign Up Link */}
        <p className="mt-6 text-center text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-medium text-blue-600 hover:text-blue-800" title="Sign up now">
            Sign up now
          </Link>
        </p>
      </div>
    </div>
  );
}