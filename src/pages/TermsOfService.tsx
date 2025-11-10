import React from 'react';
// No specific lucide-react icons needed for the main content of this page,
// but you can add them if you find relevant sections that would benefit.

export function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service for Resolveit</h1>
        <p className="text-xl text-gray-600">
          Please read these terms and conditions carefully before using our platform.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">1. Acceptance of Terms</h2>
        <p className="text-gray-700 mb-4">
          By accessing or using the Resolveit platform, you agree to be bound by these Terms of Service and all terms incorporated by reference. If you do not agree to all of these terms, do not use the Resolveit platform.
        </p>
        <p className="text-gray-700 mb-4">
          These Terms of Service apply to all users of the site, including without limitation users who are browsers, vendors, customers, merchants, and/or contributors of content.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">2. User Accounts</h2>
        <p className="text-gray-700 mb-4">
          When you create an account with us, you must provide us with information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
        </p>
        <p className="text-gray-700 mb-4">
          You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password, whether your password is with our Service or a third-party social media service.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">3. User Conduct</h2>
        <p className="text-gray-700 mb-4">
          You agree not to use the platform for any unlawful purpose or for any purpose prohibited by these Terms. You agree not to use the platform in any way that could damage, disable, overburden, or impair the platform or interfere with any other party's use and enjoyment of the platform.
        </p>
        <p className="text-gray-700 mb-4">
          Prohibited activities include, but are not limited to: posting false or misleading information, harassment, spamming, or violating any applicable laws or regulations.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">4. Intellectual Property</h2>
        <p className="text-gray-700 mb-4">
          The platform and its original content (excluding content provided by users), features, and functionality are and will remain the exclusive property of Resolveit and its licensors.
        </p>
        <p className="text-gray-700 mb-4">
          By submitting content to Resolveit, you grant Resolveit a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, publish, and distribute your content on and through the platform.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">5. Changes to Terms</h2>
        <p className="text-gray-700 mb-4">
          We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
        </p>
      </div>

      <div className="text-center text-gray-600 mt-12 text-sm">
        <p>Last updated: August 16, {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}