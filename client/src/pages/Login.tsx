// src/pages/Login.tsx

import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogIn, Mail, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext'; 

// 🟢 NEW FIREBASE IMPORTS
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase'; // Import the configured Firebase auth instance and provider

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

    // Helper for navigation after successful login (Manual or Google)
    const handleSuccessfulAuth = (token: string, user: any, rememberMe: boolean) => {
        login(token, user, rememberMe);

        setFeedback("Login successful! Redirecting...");
        setIsError(false);

        const state = location.state as { from?: { pathname?: string } } | null;
        const from = state?.from?.pathname || "/dashboard";

        setTimeout(() => {
            navigate(from, { replace: true });
        }, 500);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value,
        });
        setFeedback(null); // Clear feedback on change
        setIsError(false);
    };

    // ======================================================================
    // 🟢 NEW: GOOGLE SIGN-IN HANDLER
    // ======================================================================
    const handleGoogleSignIn = async () => {
        setLoading(true);
        setFeedback(null);
        setIsError(false);

        try {
            // 1. Authenticate with Firebase
            const result = await signInWithPopup(auth, googleProvider);
            
            // 2. Get the Firebase ID Token
            const idToken = await result.user.getIdToken(); 
            
            setFeedback("Verifying Google token with server...");

            // 3. Send the ID Token to your custom server endpoint
            const response = await fetch(`${API_BASE_URL}/api/auth/google`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ idToken }),
            });

            if (!response.ok) {
                // If the server rejects the token (e.g., internal error, user banned)
                const errorData = await response.json().catch(() => ({ message: 'Server verification failed.' }));
                throw new Error(errorData.message || `Google sign-in verification failed (Status: ${response.status}).`);
            }

            // 4. Handle success: Server responded with your custom JWT
            const responseData = await response.json();
            const { token, user } = responseData.data;

            // Use the shared success handler
            handleSuccessfulAuth(token, user, true); // Always remember Google users

        } catch (error) {
            let message = "An unknown error occurred during Google sign-in.";
            if (error instanceof Error) {
                message = error.message;
            } else if (error && typeof error === 'object' && 'code' in error) {
                 // Handle specific Firebase errors (e.g., popup closed)
                if (error.code === 'auth/popup-closed-by-user') {
                    message = "Sign-in cancelled by user.";
                } else if (error.code === 'auth/network-request-failed') {
                    message = "Network error. Please try again.";
                }
            }

            console.error("Google Sign-In Error:", message, error);
            setFeedback(message);
            setIsError(true);
            setFormData(prev => ({ ...prev, password: "" })); // Clear password state just in case
        } finally {
            setLoading(false);
        }
    };

    // ======================================================================
    // EXISTING: MANUAL SUBMIT HANDLER
    // ======================================================================
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

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (jsonError) {
                    throw new Error(`Server error: Status ${response.status} (Non-JSON response).`);
                }

                setFeedback(errorData.message || "Login failed. Check your credentials.");
                setIsError(true);
                setFormData(prev => ({ ...prev, password: "" }));
                return;
            }

            const responseData = await response.json();

            if (responseData.success) {
                const { token, user } = responseData.data;
                // Use the shared success handler
                handleSuccessfulAuth(token, user, formData.rememberMe); 

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
                    <h1 className="text-3xl font-bold text-gray-900">Welcome Back to Resolveit</h1>
                    <p className="text-gray-600 mt-2">Sign in to your Resolveit account</p>
                </div>

                {/* Feedback Alert Section */}
                {feedback && (
                    <div className={`p-4 mb-4 text-sm rounded-lg ${isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`} role="alert">
                        {feedback}
                    </div>
                )}
                {/* End Feedback Alert Section */}

                {/* 🚀 NEW: GOOGLE SIGN-IN BUTTON */}
                <button
                    onClick={handleGoogleSignIn}
                    type="button"
                    className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 mb-6"
                    disabled={loading}
                >
                    {/* 

[Image of Google Logo]
 */}
                    <img src="/google-logo.svg" alt="Google" className="h-5 w-5" /> 
                    <span>Sign in with Google</span>
                </button>

                {/* Divider */}
                <div className="relative flex items-center mb-6">
                    <div className="flex-grow border-t border-gray-300"></div>
                    <span className="flex-shrink mx-4 text-gray-400 text-sm">Or continue with</span>
                    <div className="flex-grow border-t border-gray-300"></div>
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
                                name="email" 
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
                                name="password" 
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
                                name="rememberMe" 
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

                    {/* Submit Button (Manual) */}
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