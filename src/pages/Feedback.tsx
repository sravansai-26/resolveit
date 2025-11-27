import { useState } from 'react';
import { Send } from 'lucide-react';
import axios from 'axios';

interface FeedbackData {
  type: string;
  subject: string;
  message: string;
}

// ----------------------------------------------------------------------
// ✅ CRITICAL FIX: Base URL for Deployed API
// This constant pulls the live Render URL from the Vercel environment variable.
// ----------------------------------------------------------------------
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
      const token = localStorage.getItem('token');
      
      // ✅ FIX APPLIED HERE: Use the explicit API_BASE_URL
      const res = await axios.post(
        `${API_BASE_URL}/api/feedback`, // CHANGED FROM 'http://localhost:5000/api/feedback'
        feedback,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        }
      );

      if (res.status === 201 || res.status === 200) {
        setSubmitStatus('Thank you for your feedback!');
        setFeedback({ type: '', subject: '', message: '' });
      } else {
        setError('Failed to submit feedback. Please try again.');
      }
    } catch (err: any) {
      console.error('Feedback submit error:', err);
      setError(err.response?.data?.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
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
              onChange={(e) => setFeedback({ ...feedback, type: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
              disabled={loading}
              title="Select the type of feedback"
            >
              <option value="">Select type</option>
              <option value="suggestion">Suggestion</option>
              <option value="bug">Bug Report</option>
              <option value="complaint">Complaint</option>
              <option value="other">Other</option>
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
              onChange={(e) => setFeedback({ ...feedback, subject: e.target.value })}
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
              onChange={(e) => setFeedback({ ...feedback, message: e.target.value })}
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
            className="mt-4 text-green-600 font-medium"
            role="alert"
          >
            {submitStatus}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div
            aria-live="assertive"
            className="mt-4 text-red-600 font-medium"
            role="alert"
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}