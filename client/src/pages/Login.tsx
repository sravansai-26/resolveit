// src/pages/Login.tsx
// FINAL, STABLE, OPTION-B VERSION — USES VITE_API_URL + CORRECT REDIRECT + FULL LOGGING

import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { LogIn, Mail, Lock } from "lucide-react";
import { useAuth } from "../context/AuthContext";

// 🔥 FIX: Import the hybrid helper instead of calling signInWithPopup directly
import { auth, signInWithGoogle } from "../firebase";
import api from "../lib/api";

export function Login() {
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        rememberMe: false,
    });

    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [isError, setIsError] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();

    const { login, isAuthenticated, loading: authLoading } = useAuth();

    // 🚀 ALWAYS redirect to /profile — stable & predictable
    const redirectPath = "/profile";

    // If user already logged in → auto redirect
    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            navigate(redirectPath, { replace: true });
        }
    }, [authLoading, isAuthenticated, navigate, redirectPath]);

    // ===========================================================
    // HANDLE INPUT CHANGE
    // ===========================================================
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;

        setFormData({
            ...formData,
            [name]: type === "checkbox" ? checked : value,
        });

        setFeedback(null);
        setIsError(false);
    };

    // ===========================================================
    // GOOGLE LOGIN
    // ===========================================================
    const handleGoogleSignIn = async () => {
        setLoading(true);
        setFeedback("Connecting to Google..."); // Clearer messaging
        setIsError(false);

        try {
            // 1. 🔥 FIX: Hybrid Handshake (Detects Web vs APK automatically)
            const result = await signInWithGoogle();
            const idToken = await result.user.getIdToken();

            // 2. Backend Verification
            setFeedback("Verifying account with ResolveIt...");
            
            const resp = await api.post('/auth/google', { idToken });
            
            // Ensure data exists before destructuring
            if (resp.data && resp.data.success) {
                const { token, user } = resp.data.data;

                // 3. Save to Local Context/Storage
                login(token, user, true); 

                setFeedback("Success! Welcome back.");
                
                // 4. Final Redirect
                navigate("/profile", { replace: true });
            } else {
                throw new Error(resp.data.message || "Backend verification failed");
            }

        } catch (error: any) {
            console.error("Google Auth Detailed Error:", error);
            let msg = "Google sign-in failed.";

            // Handle Firebase/Capacitor specific errors
            if (error?.code === "auth/popup-closed-by-user" || error?.message?.includes("popup-closed")) {
                msg = "Sign-in cancelled.";
            } else if (error?.code === "auth/network-request-failed") {
                msg = "Network error. Check your internet.";
            } else if (error?.code === "auth/internal-error") {
                msg = "Firebase configuration error.";
            }
            
            // Handle Axios/Backend errors
            if (error.response) {
                msg = error.response.data.message || "Server refused Google login.";
            } else if (error.request) {
                msg = "Server is taking too long to wake up. Please try again.";
            }

            setFeedback(msg);
            setIsError(true);
        } finally {
            setLoading(false);
        }
    };

    // ===========================================================
    // MANUAL LOGIN
    // ===========================================================
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setFeedback(null);
        setIsError(false);

        try {
            const resp = await api.post('/auth/login', {
                email: formData.email,
                password: formData.password,
            });

            const data = resp.data;

            if (!data || !data.success) {
                setIsError(true);
                setFeedback(data?.message || "Invalid credentials");
                return;
            }

            const { token, user } = data.data;

            login(token, user, formData.rememberMe);

            setFeedback("Login successful!");

            // Redirect immediately
            navigate("/profile", { replace: true });

        } catch (err: any) {
            setIsError(true);
            setFeedback(err?.response?.data?.message || "Network error. Try again.");
        } finally {
            setLoading(false);
        }
    };

    // ===========================================================
    // UI
    // ===========================================================
    return (
        <div className="max-w-md mx-auto mt-16">
            <div className="bg-white rounded-lg shadow-md p-8">

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">
                        Welcome Back to Resolveit
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Sign in to your Resolveit account
                    </p>
                </div>

                {feedback && (
                    <div
                        className={`p-4 mb-4 text-sm rounded-lg ${
                            isError
                                ? "bg-red-100 text-red-700"
                                : "bg-green-100 text-green-700"
                        }`}
                        role="alert"
                    >
                        {feedback}
                    </div>
                )}

                {/* GOOGLE BUTTON */}
                <button
                    onClick={handleGoogleSignIn}
                    type="button"
                    aria-label="Sign in with Google"
                    className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-lg shadow text-sm bg-white border hover:bg-gray-100 mb-6"
                    disabled={loading}
                >
                    <img src="/google-logo.svg" alt="Google logo" className="h-5 w-5" />
                    <span>{loading ? "Processing..." : "Sign in with Google"}</span>
                </button>

                <div className="relative flex items-center mb-6">
                    <div className="flex-grow border-t border-gray-300"></div>
                    <span className="mx-4 text-gray-400 text-sm">Or</span>
                    <div className="flex-grow border-t border-gray-300"></div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Email */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                            Email Address
                        </label>
                        <div className="relative mt-1">
                            <input
                                id="email"
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Enter your email"
                                aria-label="Email"
                                required
                                autoComplete="email"
                                className="pl-10 w-full rounded-lg border border-gray-300 p-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <Mail className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                            Password
                        </label>
                        <div className="relative mt-1">
                            <input
                                id="password"
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Enter your password"
                                aria-label="Password"
                                required
                                autoComplete="current-password"
                                className="pl-10 w-full rounded-lg border border-gray-300 p-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <Lock className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        </div>
                    </div>

                    {/* Remember Me */}
                    <div className="flex items-center justify-between">
                        <label className="flex items-center text-sm text-gray-700">
                            <input
                                type="checkbox"
                                id="rememberMe"
                                name="rememberMe"
                                checked={formData.rememberMe}
                                onChange={handleChange}
                                aria-label="Remember me"
                                className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            Remember me
                        </label>

                       {/* Find this section in your Login.tsx */}
<Link 
    to={loading ? "#" : "/forgot-password"} // Prevent navigation if loading
    className={`text-sm text-blue-600 hover:text-blue-800 ${loading ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`}
>
    Forgot password?
</Link>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        aria-label="Sign in"
                        className="w-full flex items-center justify-center bg-blue-600 text-white rounded-lg py-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        <LogIn size={20} className="mr-2" />
                        {loading ? "Signing in..." : "Sign In"}
                    </button>
                </form>

                <p className="text-center mt-6 text-sm text-gray-600">
                    Don’t have an account?{" "}
                    <Link to="/register" className="text-blue-600 font-medium hover:text-blue-800">
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    );
}