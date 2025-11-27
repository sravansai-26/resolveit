import React from 'react';
// No specific lucide-react icons needed for the main content of this page.

export function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy for Resolveit</h1>
        <p className="text-xl text-gray-600">
          Your privacy is important to us. This policy explains how we collect, use, and protect your information.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">1. Information We Collect</h2>
        <p className="text-gray-700 mb-4">
          We collect several different types of information for various purposes to provide and improve our Service to you.
        </p>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">1.1. Personal Data</h3>
        <p className="text-gray-700 mb-4">
          While using our Service, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify you ("Personal Data"). Personally identifiable information may include, but is not limited to:
        </p>
        <ul className="list-disc list-inside text-gray-700 mb-4 pl-4">
          <li>Email address</li>
          <li>First name and last name</li>
          <li>Phone number</li>
          <li>Location data (GPS coordinates when reporting issues)</li>
          <li>Usage Data</li>
        </ul>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">1.2. Usage Data</h3>
        <p className="text-gray-700 mb-4">
          We may also collect information how the Service is accessed and used ("Usage Data"). This Usage Data may include information such as your computer's Internet Protocol address (e.g. IP address), browser type, browser version, the pages of our Service that you visit, the time and date of your visit, the time spent on those pages, unique device identifiers and other diagnostic data.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">2. Use of Data</h2>
        <p className="text-gray-700 mb-4">
          Resolveit uses the collected data for various purposes:
        </p>
        <ul className="list-disc list-inside text-gray-700 mb-4 pl-4">
          <li>To provide and maintain the Service</li>
          <li>To notify you about changes to our Service</li>
          <li>To allow you to participate in interactive features of our Service when you choose to do so</li>
          <li>To provide customer support</li>
          <li>To gather analysis or valuable information so that we can improve the Service</li>
          <li>To monitor the usage of the Service</li>
          <li>To detect, prevent and address technical issues</li>
          <li>To send automated email notifications to government bodies regarding reported issues.</li>
        </ul>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">3. Disclosure of Data</h2>
        <p className="text-gray-700 mb-4">
          We may disclose your Personal Data in the good faith belief that such action is necessary to:
        </p>
        <ul className="list-disc list-inside text-gray-700 mb-4 pl-4">
          <li>To comply with a legal obligation</li>
          <li>To protect and defend the rights or property of Resolveit</li>
          <li>To prevent or investigate possible wrongdoing in connection with the Service</li>
          <li>To protect the personal safety of users of the Service or the public</li>
          <li>To protect against legal liability</li>
        </ul>
        <p className="text-gray-700 mb-4">
            Please note that reported issues (description, category, location, and any uploaded media) may be shared with relevant government authorities for the purpose of resolution. Your username (or anonymized identifier if chosen) may be associated with these reports.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">4. Security of Data</h2>
        <p className="text-gray-700 mb-4">
          The security of your data is important to us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">5. Changes to This Privacy Policy</h2>
        <p className="text-gray-700 mb-4">
          We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.
        </p>
        <p className="text-gray-700 mb-4">
          You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.
        </p>
      </div>

      <div className="text-center text-gray-600 mt-12 text-sm">
        <p>Last updated: August 16, {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}