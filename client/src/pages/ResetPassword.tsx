import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Lock, CheckCircle, ArrowLeft, Eye, EyeOff } from "lucide-react";
import api from "../lib/api";

export function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setStatus({ type: 'error', text: "Passwords do not match." });
    }

    setLoading(true);
    setStatus(null);

    try {
      // Hits the second route we added to auth.js
      const resp = await api.post(`/auth/reset-password/${token}`, { password });
      
      if (resp.data.success) {
        setStatus({ type: 'success', text: "Password reset successful! Redirecting to login..." });
        setTimeout(() => navigate("/login"), 3000);
      } else {
        setStatus({ type: 'error', text: resp.data.message || "Invalid or expired link." });
      }
    } catch (err: any) {
      setStatus({ type: 'error', text: "Something went wrong. The link might be expired." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Set New Password</h1>
          <p className="text-gray-500 mt-2">Please enter your new secure password below.</p>
        </div>

        {status && (
          <div className={`p-4 mb-6 rounded-lg text-sm font-medium ${
            status.type === 'success' ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}>
            {status.text}
          </div>
        )}

        {status?.type !== 'success' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  className="w-full pl-11 pr-12 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <Lock className="absolute left-4 top-3.5 text-gray-400" size={18} />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm New Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <CheckCircle className="absolute left-4 top-3.5 text-gray-400" size={18} />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg disabled:opacity-50"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}

        <div className="mt-8 text-center">
          <Link to="/login" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-blue-600">
            <ArrowLeft size={16} className="mr-1" /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}