import { Users, Target, Shield } from 'lucide-react';

export function About() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">About Resolveit</h1>
        <p className="text-xl text-gray-600">
          Empowering communities to identify and resolve social issues together.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        <div className="text-center p-6">
          <Users className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Community Driven</h3>
          <p className="text-gray-600">
            Built by the community, for the community. Every voice matters in making our
            society better.
          </p>
        </div>
        <div className="text-center p-6">
          <Target className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Problem Solving</h3>
          <p className="text-gray-600">
            Efficiently identify and track issues that matter most to your neighborhood.
          </p>
        </div>
        <div className="text-center p-6">
          <Shield className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Transparency</h3>
          <p className="text-gray-600">
            Open communication between citizens and authorities for better resolution.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold mb-6">Our Mission</h2>
        <p className="text-gray-600 mb-6">
          Resolveit aims to bridge the gap between citizens and local authorities by
          providing a platform where community issues can be reported, tracked, and
          resolved efficiently. We believe that by working together, we can create
          positive change in our communities.
        </p>
        <div className="border-t pt-6">
          <h3 className="text-xl font-semibold mb-4">Get Involved</h3>
          <p className="text-gray-600">
            Join our growing community of active citizens making a difference. Report
            issues, engage with others, and be part of the solution.
          </p>
        </div>
      </div>
    </div>
  );
}