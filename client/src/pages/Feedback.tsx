// src/pages/Feedback.tsx

import { useState } from 'react';
import { Send } from 'lucide-react';
// ❌ REMOVED: import axios from 'axios';
// We are consolidating to the native Fetch API for consistency.

interface FeedbackData {
  type: string;
  subject: string;
  message: string;
}

// ======================================================================
// ✅ ARCHITECTURE FIX: Using VITE_API_URL (Option B)
// ======================================================================
const API_BASE_URL = import.meta.env.VITE_API_URL;

export function Feedback() {
  const [feedback, setFeedback] = useState<FeedbackData>({
    type: '',
    subject: '',
    message: ''
  });

  const [submitStatus, setSubmitStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Helper to get token from storage (consistent with AuthContext logic)
  const getToken = (): string | null => {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFeedback({
      ...feedback,
      [name]: value
    });
    setError(''); // Clear error on input change
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitStatus('');
    setError('');

    if (!feedback.type || !feedback.subject.trim() || !feedback.message.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const token = getToken(); 
      
      // 🟢 CRITICAL FIX: Switched to native Fetch API
      const res = await fetch(
        `${API_BASE_URL}/api/feedback`, 
        {
          method: 'POST',
          headers: {
            // Note: The backend should handle the case where the token is absent (for guest feedback)
            'Authorization': token ? `Bearer ${token}` : '', 
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(feedback)
        }
      );

      // Try to parse JSON response regardless of status, as the server might send a JSON error message
      const responseData = await res.json().catch(() => ({})); 

      if (res.ok) { // Check for status 200-299
        setSubmitStatus(responseData.message || 'Thank you for your feedback! It has been submitted successfully.');
        setFeedback({ type: '', subject: '', message: '' });
      } else {
        // Use the error message from the response body if available, or a generic status message
        setError(responseData.message || `Failed to submit feedback. Status: ${res.status}.`);
      }
    } catch (err) {
      console.error('Feedback submit error:', err);
      setError('A network error occurred. Please check your connection or try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Send Feedback</h1>
      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          
          {/* Feedback Type */}
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700">
              Feedback Type
            </label>
            <select
              id="type"
              name="type"
              value={feedback.type}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white"
              required
              disabled={loading}
              title="Select the type of feedback"
            >
              <option value="">Select type</option>
              <option value="Suggestion">Suggestion</option>
              <option value="Bug Report">Bug Report</option>
              <option value="Complaint">Complaint</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Subject */}
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
              Subject
            </label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={feedback.subject}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
              placeholder="Enter the subject of your feedback"
              title="Describe the subject of your feedback"
              disabled={loading}
            />
          </div>

          {/* Message */}
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700">
              Message
            </label>
            <textarea
              id="message"
              name="message"
              value={feedback.message}
              onChange={handleChange}
              rows={6}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
              placeholder="Write your feedback here..."
              title="Enter the details of your feedback"
              disabled={loading}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className={`w-full flex items-center justify-center space-x-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            title="Submit your feedback"
            disabled={loading}
          >
            <Send size={20} />
            <span>{loading ? 'Submitting...' : 'Submit Feedback'}</span>
          </button>
        </form>

        {/* Success message */}
        {submitStatus && (
          <div
            aria-live="polite"
            className="mt-4 p-3 bg-green-100 text-green-700 rounded-md font-medium"
            role="alert"
          >
            {submitStatus}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div
            aria-live="assertive"
            className="mt-4 p-3 bg-red-100 text-red-700 rounded-md font-medium"
            role="alert"
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}