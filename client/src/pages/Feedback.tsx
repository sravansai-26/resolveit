import { useState } from "react";
import { Send } from "lucide-react";

export function Feedback() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Send Feedback
      </h1>

      <div className="bg-white rounded-lg shadow-md p-6">
        {submitted ? (
          <div
            role="alert"
            aria-live="polite"
            className="p-4 bg-green-100 text-green-700 rounded-md font-medium"
          >
            ✅ Thank you! Your feedback has been sent successfully.
          </div>
        ) : (
          <form
            action="https://formspree.io/f/xjgbadlv"
            method="POST"
            className="space-y-6"
            onSubmit={() => {
              // ❌ Do NOT preventDefault
              // ✅ Allow native browser submit
              setSubmitted(true);
            }}
          >
            {/* Hidden metadata (VERY IMPORTANT) */}
            <input
              type="hidden"
              name="_subject"
              value="ResolveIt – User Feedback"
            />
            <input
              type="hidden"
              name="form_type"
              value="feedback"
            />

            {/* Feedback Type */}
            <div>
              <label
                htmlFor="type"
                className="block text-sm font-medium text-gray-700"
              >
                Feedback Type
              </label>
              <select
                id="type"
                name="type"
                required
                title="Select the type of feedback"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
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
              <label
                htmlFor="subject"
                className="block text-sm font-medium text-gray-700"
              >
                Subject
              </label>
              <input
                id="subject"
                name="subject"
                type="text"
                required
                placeholder="Enter the subject"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Message */}
            <div>
              <label
                htmlFor="message"
                className="block text-sm font-medium text-gray-700"
              >
                Message
              </label>
              <textarea
                id="message"
                name="message"
                rows={6}
                required
                placeholder="Write your feedback here..."
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Email (optional for feedback – correct choice) */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Your Email (optional)
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Send size={18} />
              Submit Feedback
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
