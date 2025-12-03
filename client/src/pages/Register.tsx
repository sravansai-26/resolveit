// src/pages/Register.tsx

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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

            // ⚠️ FIX: Check for the response status before calling .json() to handle 
            // unexpected end of JSON for non-200 responses.
            if (!response.ok) {
                // If the response is not OK (e.g., 400, 409), try to parse the JSON error body
                let errorData;
                try {
                    errorData = await response.json();
                } catch (jsonError) {
                    // Handle case where body is not JSON (e.g. 500 server error returning plain text)
                    throw new Error(`Server error: Status ${response.status} (Non-JSON response).`);
                }

                if (errorData.errors?.length > 0) {
                    // Validation errors (e.g., from express-validator)
                    const message = errorData.errors.map((err: any) => err.msg).join('; ');
                    setFeedback(`Validation failed: ${message}`);
                } else {
                    // Business logic errors (e.g., email already registered)
                    setFeedback(errorData.message || 'Registration failed. Please try again.');
                }
                setIsError(true);
                return; // Stop execution here
            }

            // If response is OK (200/201)
            const responseData = await response.json();

            if (responseData.success) {
                const { token, user } = responseData.data;

                // Centralized login call (assuming user wants to be logged in automatically after registration)
                // Note: Always passing 'true' for rememberMe is fine here.
                login(token, user, true); 

                setFeedback('Account created successfully! Redirecting...');
                setIsError(false);
                
                // Redirect user after a small delay for the message to sink in
                setTimeout(() => {
                    navigate('/dashboard', { replace: true });
                }, 500);
                
            } else {
                 // Fallback error, though covered by response.ok check above
                setFeedback(responseData.message || 'Registration failed unexpectedly.');
                setIsError(true);
            }

        } catch (error) {
            if (error instanceof Error) {
                // Connection or severe parsing error
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
                        Join Resolveit and help improve your community
                    </p>
                </div>

                {/* Feedback Alert Section */}
                {feedback && (
                    <div className={`p-4 mb-4 text-sm rounded-lg ${isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`} role="alert">
                        {feedback}
                    </div>
                )}
                {/* End Feedback Alert Section */}

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