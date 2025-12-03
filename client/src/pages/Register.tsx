// src/pages/Register.tsx

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// 🟢 NEW FIREBASE IMPORTS
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase'; // Import the configured Firebase auth instance and provider

// ======================================================================
// ✅ ARCHITECTURE FIX: Using VITE_API_URL (Option B) for consistency
// ======================================================================
const API_BASE_URL = import.meta.env.VITE_API_URL;

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

    // State for user feedback
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [isError, setIsError] = useState(false);

    const navigate = useNavigate();

    // Access centralized login function
    const { login } = useAuth();

    // Helper for navigation after successful auth (Manual or Google)
    const handleSuccessfulAuth = (token: string, user: any) => {
        // Automatically log in the user after successful registration/sign-up
        login(token, user, true); // Always remember Google users

        setFeedback('Account created successfully! Redirecting...');
        setIsError(false);

        setTimeout(() => {
            navigate('/dashboard', { replace: true });
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
    // 🟢 NEW: GOOGLE SIGN-UP HANDLER
    // ======================================================================
    const handleGoogleSignUp = async () => {
        setLoading(true);
        setFeedback(null);
        setIsError(false);

        try {
            // 1. Authenticate with Firebase (Popup is used for both Sign In/Up)
            const result = await signInWithPopup(auth, googleProvider);
            
            // 2. Get the Firebase ID Token
            const idToken = await result.user.getIdToken(); 
            
            setFeedback("Verifying Google token with server...");

            // 3. Send the ID Token to your custom server endpoint (/api/auth/google)
            // This endpoint handles the check: Sign Up new user OR Sign In existing user.
            const response = await fetch(`${API_BASE_URL}/api/auth/google`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ idToken }),
            });

            if (!response.ok) {
                // If server verification fails (e.g., user is banned or server issue)
                const errorData = await response.json().catch(() => ({ message: 'Server verification failed.' }));
                throw new Error(errorData.message || `Google sign-up verification failed (Status: ${response.status}).`);
            }

            // 4. Handle success: Server responded with your custom JWT
            const responseData = await response.json();
            const { token, user } = responseData.data;

            // Use the shared success handler
            handleSuccessfulAuth(token, user); 

        } catch (error) {
            let message = "An unknown error occurred during Google sign-up.";
            if (error instanceof Error) {
                message = error.message;
            } else if (error && typeof error === 'object' && 'code' in error) {
                 // Handle Firebase specific errors
                if (error.code === 'auth/popup-closed-by-user') {
                    message = "Sign-up cancelled by user.";
                } else if (error.code === 'auth/network-request-failed') {
                    message = "Network error. Please check your connection.";
                }
            }

            console.error("Google Sign-Up Error:", message, error);
            setFeedback(message);
            setIsError(true);
        } finally {
            setLoading(false);
        }
    };


    // ======================================================================
    // EXISTING: MANUAL SUBMIT HANDLER
    // ======================================================================
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFeedback(null);
        setIsError(false);

        if (formData.password !== formData.confirmPassword) {
            setFeedback('Passwords do not match!');
            setIsError(true);
            return;
        }

        if (!formData.agreeToTerms) {
            setFeedback('You must agree to the terms and conditions.');
            setIsError(true);
            return;
        }

        setLoading(true);

        try {
            // 🟢 CRITICAL FIX: Use the ABSOLUTE URL
            const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    email: formData.email,
                    password: formData.password,
                    phone: formData.phone,
                    address: formData.address,
                }),
            });

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (jsonError) {
                    throw new Error(`Server error: Status ${response.status} (Non-JSON response).`);
                }

                if (errorData.errors?.length > 0) {
                    const message = errorData.errors.map((err: any) => err.msg).join('; ');
                    setFeedback(`Validation failed: ${message}`);
                } else {
                    setFeedback(errorData.message || 'Registration failed. Please try again.');
                }
                setIsError(true);
                return;
            }

            const responseData = await response.json();

            if (responseData.success) {
                const { token, user } = responseData.data;
                // Use the shared success handler
                handleSuccessfulAuth(token, user); 
            } else {
                setFeedback(responseData.message || 'Registration failed unexpectedly.');
                setIsError(true);
            }

        } catch (error) {
            if (error instanceof Error) {
                setFeedback(`Connection Error: ${error.message}. Please check your API status.`);
            } else {
                setFeedback('An unknown error occurred during registration.');
            }
            setIsError(true);
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

                {/* Feedback Alert Section */}
                {feedback && (
                    <div className={`p-4 mb-4 text-sm rounded-lg ${isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`} role="alert">
                        {feedback}
                    </div>
                )}
                {/* End Feedback Alert Section */}
                
                {/* 🚀 NEW: GOOGLE SIGN-UP BUTTON */}
                <button
                    onClick={handleGoogleSignUp}
                    type="button"
                    className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 mb-6"
                    disabled={loading}
                >
                    <img src="/google-logo.svg" alt="Google" className="h-5 w-5" /> 

                    <span>Sign up with Google</span>
                </button>

                {/* Divider */}
                <div className="relative flex items-center mb-6">
                    <div className="flex-grow border-t border-gray-300"></div>
                    <span className="flex-shrink mx-4 text-gray-400 text-sm">Or register manually</span>
                    <div className="flex-grow border-t border-gray-300"></div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* First Name */}
                        <div>
                            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                                First Name
                            </label>
                            <input
                                type="text"
                                id="firstName"
                                name="firstName"
                                required
                                value={formData.firstName}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                placeholder="Enter your first name"
                            />
                        </div>

                        {/* Last Name */}
                        <div>
                            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                                Last Name
                            </label>
                            <input
                                type="text"
                                id="lastName"
                                name="lastName"
                                required
                                value={formData.lastName}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                placeholder="Enter your last name"
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                Email Address
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                placeholder="Enter your email"
                            />
                        </div>

                        {/* Phone */}
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                id="phone"
                                name="phone"
                                required
                                value={formData.phone}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                placeholder="Enter your phone number"
                            />
                        </div>

                        {/* Address */}
                        <div className="md:col-span-2">
                            <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                                Address
                            </label>
                            <input
                                type="text"
                                id="address"
                                name="address"
                                required
                                value={formData.address}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                placeholder="Enter your address"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                required
                                value={formData.password}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                placeholder="Create a password"
                                autoComplete="new-password"
                            />
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                required
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                placeholder="Confirm your password"
                                autoComplete="new-password"
                            />
                        </div>
                    </div>

                    {/* Terms & Conditions */}
                    <div className="flex items-start">
                        <div className="flex items-center h-5">
                            <input
                                type="checkbox"
                                id="agree-terms"
                                name="agreeToTerms"
                                required
                                checked={formData.agreeToTerms}
                                onChange={handleChange}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                        </div>
                        <label htmlFor="agree-terms" className="ml-2 text-sm text-gray-700">
                            I agree to the{' '}
                            <Link to="/terms" className="text-blue-600 hover:text-blue-800">
                                Terms and Conditions
                            </Link>{' '}
                            and{' '}
                            <Link to="/privacy" className="text-blue-600 hover:text-blue-800 ml-1">
                                Privacy Policy
                            </Link>
                        </label>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center gap-2 disabled:opacity-50"
                        aria-label="Create Account"
                        disabled={loading}
                    >
                        <UserPlus size={20} />
                        <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
                    </button>

                    <p className="text-center text-sm text-gray-600 mt-4">
                        Already have an account?{' '}
                        <Link to="/login" className="text-blue-600 font-medium hover:text-blue-800">
                            Log In
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}