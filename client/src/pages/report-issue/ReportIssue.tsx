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
          Report technical problems, inappropriate content, web or APK issues.
          Your feedback helps us improve ResolveIt.
        </p>

        {submitted ? (
          <div className="text-green-600 font-medium">
            ✅ Thank you. Your report has been submitted successfully.
          </div>
        ) : (
          <form
            action="https://formspree.io/f/xjgbadlv"
            method="POST"
            onSubmit={() => setSubmitted(true)}
            className="space-y-6"
          >
            {/* Email (optional but recommended) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Email (optional)
              </label>
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Issue Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Issue Type
              </label>
              <select
                name="issueType"
                required
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select an issue</option>
                <option value="Technical Bug">Technical / Bug</option>
                <option value="Inappropriate Content">Inappropriate Content</option>
                <option value="APK Issue">APK / Mobile App Issue</option>
                <option value="Performance Issue">Performance / Performance</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Describe the Issue
              </label>
              <textarea
                name="message"
                required
                rows={5}
                placeholder="Please explain the issue clearly..."
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Hidden metadata (VERY useful) */}
            <input type="hidden" name="source" value="ResolveIt Web / APK" />

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
