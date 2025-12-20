import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, Send } from "lucide-react";
import api from "../lib/api";

// Make sure it is exported like this
export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const resp = await api.post('/auth/forgot-password', { email });
      if (resp.data.success) {
        setMessage({ type: 'success', text: "Reset link sent! Please check your email inbox." });
      } else {
        setMessage({ type: 'error', text: resp.data.message || "Something went wrong." });
      }
    } catch (err: any) {
      // Improved error logging for debugging the "Failed to connect" issue
      console.error("Connection Error:", err);
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.message || "Failed to connect. Ensure your API URL is correct." 
      });
    } finally {
      setLoading(false);
    }
  };

  // CRITICAL: Ensure there is a RETURN statement here returning JSX
  return (
    <div className="max-w-md mx-auto mt-16 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="text-blue-600" size={30} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Forgot Password?</h1>
          <p className="text-gray-500 mt-2">Enter your email and we'll send you a link to reset your password.</p>
        </div>

        {message && (
          <div className={`p-4 mb-6 rounded-lg text-sm font-medium ${
            message.type === 'success' ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
              <Mail className="absolute left-4 top-3.5 text-gray-400" size={18} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg disabled:opacity-50"
          >
            {loading ? "Sending..." : <><Send size={18} className="mr-2" /> Send Reset Link</>}
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link to="/login" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
            <ArrowLeft size={16} className="mr-1" /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}