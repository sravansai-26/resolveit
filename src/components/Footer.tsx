import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Mail, Phone } from 'lucide-react';
import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="bg-white shadow-md mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Logo />
            <p className="text-gray-600">
              Empowering communities to identify and resolve social issues together.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="text-gray-400 hover:text-blue-600"
                title="Facebook"
              >
                <Facebook size={24} />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter"
                className="text-gray-400 hover:text-blue-600"
                title="Twitter"
              >
                <Twitter size={24} />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="text-gray-400 hover:text-blue-600"
                title="Instagram"
              >
                <Instagram size={24} />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-600 hover:text-blue-600">Home</Link>
              </li>
              <li>
                <Link to="/about" className="text-gray-600 hover:text-blue-600">About Us</Link>
              </li>
              <li>
                <Link to="/upload" className="text-gray-600 hover:text-blue-600">Report Issue</Link>
              </li>
              <li>
                <Link to="/feedback" className="text-gray-600 hover:text-blue-600">Feedback</Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Categories</h3>
            <ul className="space-y-2">
              <li className="text-gray-600">Road Infrastructure</li>
              <li className="text-gray-600">Sanitation</li>
              <li className="text-gray-600">Public Safety</li>
              <li className="text-gray-600">Environmental</li>
              <li className="text-gray-600">Public Transport</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/terms" className="text-gray-600 hover:text-blue-600">Terms of Service</Link>
              </li>
              <li>
                <Link to="/privacy" className="text-gray-600 hover:text-blue-600">Privacy Policy</Link>
              </li>
            </ul>
            <h3 className="font-semibold text-gray-900 mb-4 mt-6">Contact Us</h3>
            <address className="not-italic space-y-2">
              <div className="flex items-center text-gray-600">
                <Mail size={18} className="mr-2" />
                contact@resolveit.com
              </div>
              <div className="flex items-center text-gray-600">
                <Phone size={18} className="mr-2" />
                +91 99082 05707
              </div>
            </address>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 text-center text-gray-600">
          <p>&copy; {new Date().getFullYear()} Resolveit. All rights reserved.</p>
          <p className="mt-2">Developed by <b>LYFSpot</b></p>
        </div>
      </div>
    </footer>
  );
}