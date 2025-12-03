// src/pages/Login.tsx

import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogIn, Mail, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext'; // 🟢 Confirmed: using 'context'

// ======================================================================
// ✅ ARCHITECTURE FIX: Using VITE_API_URL (Option B) for consistency
// ======================================================================
const API_BASE_URL = import.meta.env.VITE_API_URL;

export function Login() {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        rememberMe: false,
    });

    // State for user feedback
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [isError, setIsError] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();

    // Access AuthContext login function
    const { login } = useAuth();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value,
        });
        setFeedback(null); // Clear feedback on change
        setIsError(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setFeedback(null);
        setIsError(false);

        try {
            // 🟢 CRITICAL FIX: Use the ABSOLUTE URL
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

            // If the response status is NOT ok (e.g., 401 Unauthorized, 400 Bad Request)
            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (jsonError) {
                    // This handles the "Unexpected end of JSON" error
                    throw new Error(`Server error: Status ${response.status} (Non-JSON response).`);
                }

                // Display server-side error message
                setFeedback(errorData.message || "Login failed. Check your credentials.");
                setIsError(true);
                setFormData(prev => ({ ...prev, password: "" }));
                return; // Stop execution
            }

            // If response is OK (200/201)
            const responseData = await response.json();

            if (responseData.success) {
                const { token, user } = responseData.data;

                // Centralized login call, using the 'rememberMe' state
                login(token, user, formData.rememberMe);

                setFeedback("Login successful! Redirecting...");
                setIsError(false);

                // Redirect to the page the user was trying to access, or /dashboard
                const state = location.state as { from?: { pathname?: string } } | null;
                const from = state?.from?.pathname || "/dashboard";

                setTimeout(() => {
                    navigate(from, { replace: true });
                }, 500);

            } else {
                setFeedback(responseData.message || "Login failed unexpectedly.");
                setIsError(true);
            }

        } catch (error) {
            if (error instanceof Error) {
                setFeedback(`Connection Error: ${error.message}. Please check your API status.`);
                console.error("Login network error:", error.message);
            } else {
                setFeedback("An unknown error occurred during login.");
            }
            setIsError(true);
            setFormData(prev => ({ ...prev, password: "" }));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-16">
            <div className="bg-white rounded-lg shadow-md p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
                    <p className="text-gray-600 mt-2">Sign in to your Resolveit account</p>
                </div>

                {/* Feedback Alert Section */}
                {feedback && (
                    <div className={`p-4 mb-4 text-sm rounded-lg ${isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`} role="alert">
                        {feedback}
                    </div>
                )}
                {/* End Feedback Alert Section */}

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
                                name="email" // Added name for consistent handleChange use
                                value={formData.email}
                                onChange={handleChange}
                                className="pl-10 w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                placeholder="Enter your email address"
                                required
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
                                name="password" // Added name for consistent handleChange use
                                value={formData.password}
                                onChange={handleChange}
                                className="pl-10 w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                placeholder="Enter your password"
                                required
                            />
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        </div>
                    </div>

                    {/* Remember Me */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="remember-me"
                                name="rememberMe" // Added name for consistent handleChange use
                                checked={formData.rememberMe}
                                onChange={handleChange}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                                Remember me
                            </label>
                        </div>

                        <Link
                            to="/forgot-password"
                            className="text-sm text-blue-600 hover:text-blue-800"
                        >
                            Forgot password?
                        </Link>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        disabled={loading}
                    >
                        <LogIn size={20} />
                        <span>{loading ? 'Signing In...' : 'Sign In'}</span>
                    </button>
                </form>

                {/* Sign Up Link */}
                <p className="mt-6 text-center text-sm text-gray-600">
                    Don&apos;t have an account?{' '}
                    <Link
                        to="/register"
                        className="font-medium text-blue-600 hover:text-blue-800"
                    >
                        Sign up now
                    </Link>
                </p>
            </div>
        </div>
    );
}