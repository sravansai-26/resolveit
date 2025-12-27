import { useState } from "react";
import { AlertTriangle, Send } from "lucide-react";

export default function ReportIssue() {
  const [submitted, setSubmitted] = useState(false);

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
            className="text-green-600 font-medium"
            role="alert"
            aria-live="polite"
          >
            ✅ Thank you. Your report has been submitted successfully.
          </div>
        ) : (
          <form
            action="https://formspree.io/f/xjgbadlv"
            method="POST"
            className="space-y-6"
            onSubmit={() => {
              // IMPORTANT:
              // ❌ Do NOT preventDefault
              // ✅ Let the browser submit the form
              setSubmitted(true);
            }}
          >
            {/* Hidden subject (shows in email inbox clearly) */}
            <input
              type="hidden"
              name="_subject"
              value="ResolveIt – Report Issue"
            />

            {/* Email (REQUIRED for serious reports – industry standard) */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
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

            {/* Issue Type */}
            <div>
              <label
                htmlFor="issueType"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Issue Type
              </label>
              <select
                id="issueType"
                name="issueType"
                required
                title="Select the type of issue"
                className="w-full border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select an issue</option>
                <option value="Technical Bug">Technical / Bug</option>
                <option value="Inappropriate Content">
                  Inappropriate Content
                </option>
                <option value="APK Issue">APK / Mobile App Issue</option>
                <option value="Performance Issue">Performance Issue</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Message */}
            <div>
              <label
                htmlFor="message"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
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

            {/* Hidden metadata (VERY useful in emails) */}
            <input
              type="hidden"
              name="source"
              value="ResolveIt Web / APK"
            />

            {/* Submit */}
            <button
              type="submit"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <Send size={18} />
              Submit Report
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
