// src/pages/Register.tsx
// FINAL, CORRECTED, ENDPOINT-SAFE, REDIRECT-SAFE VERSION

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import api from '../lib/api';

export function Register() {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        address: '',
        agreeToTerms: false,
    });

    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [isError, setIsError] = useState(false);

    const navigate = useNavigate();

    const { login, isAuthenticated, loading: authLoading } = useAuth();

    // 🔥 FIX: redirect to /profile, not /dashboard
    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            navigate("/profile", { replace: true });
        }
    }, [authLoading, isAuthenticated, navigate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value,
        });
        setFeedback(null);
        setIsError(false);
    };

    // GOOGLE SIGN-UP
    const handleGoogleSignUp = async () => {
        setLoading(true);
        setFeedback(null);
        setIsError(false);

        try {
            const result = await signInWithPopup(auth, googleProvider);
            const idToken = await result.user.getIdToken();

            setFeedback("Verifying Google token...");

            const resp = await api.post('/auth/google', { idToken });
            const data = resp.data;
            const { token, user } = data.data;

            login(token, user, true);

            setFeedback("Account created successfully!");

            // 🔥 FIX — redirect after signup
            navigate("/profile", { replace: true });

        } catch (error: any) {
            let message = "Google sign-up failed.";
            if (error?.code === "auth/popup-closed-by-user") message = "Popup closed.";
            if (error?.code === "auth/network-request-failed") message = "Network error.";

            console.error("Google Sign-Up Error:", error);

            setFeedback(message);
            setIsError(true);
        } finally {
            setLoading(false);
        }
    };

    // MANUAL SIGN-UP
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFeedback(null);
        setIsError(false);

        if (formData.password !== formData.confirmPassword) {
            setFeedback("Passwords do not match.");
            setIsError(true);
            return;
        }

        if (!formData.agreeToTerms) {
            setFeedback("You must agree to the terms and conditions.");
            setIsError(true);
            return;
        }

        setLoading(true);

        try {
            const resp = await api.post('/auth/register', {
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                password: formData.password,
                phone: formData.phone,
                address: formData.address,
            });

            const data = resp.data;

            if (!data || !data.success) {
                setIsError(true);
                setFeedback(
                    data?.errors
                        ? data.errors.map((err: any) => err.msg).join("; ")
                        : data?.message || "Registration failed."
                );
                return;
            }

            const { token, user } = data.data;

            login(token, user, true);

            setFeedback("Account created successfully!");

            // 🔥 FIX — redirect after register
            navigate("/profile", { replace: true });

        } catch (error: any) {
            setIsError(true);
            setFeedback("Network error. Try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto mt-16 mb-16">
            <div className="bg-white rounded-lg shadow-md p-8">

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Create an Account</h1>
                    <p className="text-gray-600 mt-2">
                        Join Resolveit and help improve our community
                    </p>
                </div>

                {feedback && (
                    <div
                        className={`p-4 mb-4 text-sm rounded-lg ${
                            isError ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                        }`}
                        role="alert"
                    >
                        {feedback}
                    </div>
                )}

                {/* GOOGLE SIGN-UP */}
                <button
                    onClick={handleGoogleSignUp}
                    type="button"
                    aria-label="Sign up with Google"
                    className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-lg shadow-sm border bg-white hover:bg-gray-50 mb-6"
                    disabled={loading}
                >
                    <img src="/google-logo.svg" alt="Google logo" className="h-5 w-5" />
                    <span>Sign up with Google</span>
                </button>

                <div className="relative flex items-center mb-6">
                    <div className="flex-grow border-t border-gray-300"></div>
                    <span className="mx-4 text-gray-400 text-sm">Or register manually</span>
                    <div className="flex-grow border-t border-gray-300"></div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* First Name */}
                        <div>
                            <label htmlFor="firstName" className="text-sm font-medium">
                                First Name
                            </label>
                            <input
                                id="firstName"
                                type="text"
                                name="firstName"
                                required
                                placeholder="Enter your first name"
                                aria-label="First name"
                                value={formData.firstName}
                                onChange={handleChange}
                                autoComplete="given-name"
                                className="mt-1 block w-full rounded-lg border-gray-300"
                            />
                        </div>

                        {/* Last Name */}
                        <div>
                            <label htmlFor="lastName" className="text-sm font-medium">
                                Last Name
                            </label>
                            <input
                                id="lastName"
                                type="text"
                                name="lastName"
                                required
                                placeholder="Enter your last name"
                                aria-label="Last name"
                                value={formData.lastName}
                                onChange={handleChange}
                                autoComplete="family-name"
                                className="mt-1 block w-full rounded-lg border-gray-300"
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="text-sm font-medium">
                                Email Address
                            </label>
                            <input
                                id="email"
                                type="email"
                                name="email"
                                required
                                placeholder="Enter your email"
                                aria-label="Email"
                                value={formData.email}
                                onChange={handleChange}
                                autoComplete="email"
                                className="mt-1 block w-full rounded-lg border-gray-300"
                            />
                        </div>

                        {/* Phone */}
                        <div>
                            <label htmlFor="phone" className="text-sm font-medium">
                                Phone Number
                            </label>
                            <input
                                id="phone"
                                type="tel"
                                name="phone"
                                required
                                placeholder="Enter your phone number"
                                aria-label="Phone number"
                                value={formData.phone}
                                onChange={handleChange}
                                autoComplete="tel"
                                className="mt-1 block w-full rounded-lg border-gray-300"
                            />
                        </div>

                        {/* Address */}
                        <div className="md:col-span-2">
                            <label htmlFor="address" className="text-sm font-medium">
                                Address
                            </label>
                            <input
                                id="address"
                                type="text"
                                name="address"
                                required
                                placeholder="Enter your address"
                                aria-label="Address"
                                value={formData.address}
                                onChange={handleChange}
                                autoComplete="street-address"
                                className="mt-1 block w-full rounded-lg border-gray-300"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="text-sm font-medium">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                name="password"
                                required
                                placeholder="Create a password"
                                aria-label="Password"
                                value={formData.password}
                                onChange={handleChange}
                                autoComplete="new-password"
                                className="mt-1 block w-full rounded-lg border-gray-300"
                            />
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label htmlFor="confirmPassword" className="text-sm font-medium">
                                Confirm Password
                            </label>
                            <input
                                id="confirmPassword"
                                type="password"
                                name="confirmPassword"
                                required
                                placeholder="Confirm your password"
                                aria-label="Confirm password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                autoComplete="new-password"
                                className="mt-1 block w-full rounded-lg border-gray-300"
                            />
                        </div>
                    </div>

                    {/* Terms */}
                    <div className="flex items-start">
                        <input
                            id="agree-terms"
                            type="checkbox"
                            name="agreeToTerms"
                            required
                            checked={formData.agreeToTerms}
                            onChange={handleChange}
                            aria-label="Agree to terms"
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />

                        <label htmlFor="agree-terms" className="ml-2 text-sm">
                            I agree to the{" "}
                            <Link to="/terms" className="text-blue-600 hover:text-blue-800">Terms</Link> and{" "}
                            <Link to="/privacy" className="text-blue-600 hover:text-blue-800">Privacy Policy</Link>
                        </label>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        aria-label="Create Account"
                        disabled={loading}
                        className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                    >
                        <UserPlus size={20} />
                        {loading ? "Creating Account..." : "Create Account"}
                    </button>

                    <p className="text-center mt-4 text-sm">
                        Already have an account?{" "}
                        <Link to="/login" className="text-blue-600">Log In</Link>
                    </p>

                </form>
            </div>
        </div>
    );
}
