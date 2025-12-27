import React, { useState } from "react"; // Added React for type definitions
import { AlertTriangle, Send, Loader2 } from "lucide-react";

export default function ReportIssue() {
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  // FIX: Define the state to accept both null AND string
  const [error, setError] = useState<string | null>(null);

  // FIX: Define the type for the form event
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); 
    setLoading(true);
    setError(null);

    // e.currentTarget refers to the form itself
    const formData = new FormData(e.currentTarget);

    try {
      const response = await fetch("https://formspree.io/f/xjgbadlv", {
        method: "POST",
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        setSubmitted(true);
      } else {
        const data = await response.json();
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch (err) {
      // FIX: Ensure the error message is a string
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="bg-white shadow-md rounded-xl p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="text-red-500" />
          Report an Issue
        </h1>

        <p className="text-gray-600 mb-8">
          Report technical problems, inappropriate content, or issues in the
          web app or APK. This helps us improve ResolveIt.
        </p>

        {submitted ? (
          <div
            className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg font-medium"
            role="alert"
          >
            ✅ Thank you. Your report has been submitted successfully.
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                ❌ {error}
              </div>
            )}

            <input type="hidden" name="_subject" value="ResolveIt – Report Issue" />

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Your Email
              </label>
              <input
                id="email"
                type="email"
                name="email"
                required
                placeholder="you@example.com"
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="issueType" className="block text-sm font-medium text-gray-700 mb-1">
                Issue Type
              </label>
              <select
                id="issueType"
                name="issueType"
                required
                className="w-full border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select an issue</option>
                <option value="Technical Bug">Technical / Bug</option>
                <option value="Inappropriate Content">Inappropriate Content</option>
                <option value="APK Issue">APK / Mobile App Issue</option>
                <option value="Performance Issue">Performance Issue</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                Describe the Issue
              </label>
              <textarea
                id="message"
                name="message"
                required
                rows={5}
                placeholder="Please explain the issue clearly..."
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <input type="hidden" name="source" value="ResolveIt Web / APK" />

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Submit Report
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}