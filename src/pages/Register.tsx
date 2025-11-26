import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { useProfile } from '../context/ProfileContext';

// ----------------------------------------------------------------------
// ✅ CRITICAL FIX: Base URL for Deployed API
// This constant pulls the live Render URL from the Vercel environment variable.
// This prevents the application from failing back to the relative path (localhost).
// ----------------------------------------------------------------------
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
    agreeToTerms: false
  });

  const navigate = useNavigate();
  const { setUser } = useProfile(); // get setUser from custom hook

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }

    if (!formData.agreeToTerms) {
      alert('You must agree to the terms and conditions.');
      return;
    }

    try {
      // ----------------------------------------------------------
      // ✅ FIX APPLIED HERE: Use the explicit base URL
      // Now the request goes to: https://resolveit-api.onrender.com/api/auth/register
      // ----------------------------------------------------------
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          address: formData.address
        })
      });

      const responseData = await response.json(); // Get the full response data

      if (response.ok) {
        // Access token and user from responseData.data as per your backend structure
        localStorage.setItem('token', responseData.data.token);
        localStorage.setItem('user', JSON.stringify(responseData.data.user));

        // Update React context
        setUser(responseData.data.user);

        alert('Account created successfully!');
        navigate('/profile'); // Redirect to profile or dashboard
      } else {
        // Improved error handling for validation errors from backend
        if (responseData.errors && responseData.errors.length > 0) {
          const errorMessages = responseData.errors.map((err: any) => err.msg).join('\n');
          alert(`Validation failed:\n${errorMessages}`);
        } else {
          // Fallback for general server errors not tied to validation
          alert(responseData.message || 'Registration failed. Please try again.');
        }
      }
    } catch (error) {
      // General network or unexpected errors
      if (error instanceof Error) {
        // This catches the 'Failed to fetch' network error
        alert(`Connection Error: ${error.message}. Check if VITE_API_URL is correct.`);
      } else {
        alert('Something went wrong!');
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-16 mb-16">
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create an Account</h1>
          <p className="text-gray-600 mt-2">Join Resolveit and help improve your community</p>
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
                onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                className="mt-1 block w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter your first name"
                aria-describedby="firstNameHelp"
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
                onChange={e => setFormData({ ...formData, lastName: e.target.value })}
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
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="mt-1 block w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter your email"
                aria-describedby="emailHelp"
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
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
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
                onChange={e => setFormData({ ...formData, address: e.target.value })}
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
                onChange={e => setFormData({ ...formData, password: e.target.value })}
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
                onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="mt-1 block w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                placeholder="Confirm your password"
                autoComplete="new-password"
              />
            </div>
          </div>

          {/* Terms & Conditions */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="agree-terms"
              name="agreeToTerms"
              required
              checked={formData.agreeToTerms}
              onChange={e => setFormData({ ...formData, agreeToTerms: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              aria-describedby="termsHelp"
            />
            <label htmlFor="agree-terms" className="ml-2 block text-sm text-gray-700">
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
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center gap-2"
            aria-label="Create Account"
          >
            <UserPlus size={20} />
            <span>Create Account</span>
          </button>
        </form>
      </div>
    </div>
  );
}