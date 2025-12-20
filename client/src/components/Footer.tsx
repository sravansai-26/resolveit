import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Mail, Phone } from 'lucide-react';
import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="bg-white shadow-md mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* LYFSpot Brand Identity */}
          <div className="space-y-4">
            <Logo />
            <p className="text-gray-600">
              Empowering communities to identify and resolve social issues together.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://www.facebook.com/VuppulaSravanSai/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="text-gray-400 hover:text-blue-600 transition-colors"
                title="Visit LYFSpot on Facebook"
              >
                <Facebook size={24} />
              </a>
              <a
                href="https://twitter.com/vuppula_sai"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X (Twitter)"
                className="text-gray-400 hover:text-gray-900 transition-colors"
                title="Visit LYFSpot on X"
              >
                <Twitter size={24} />
              </a>
              <a
                href="https://instagram.com/lyfspot"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="text-gray-400 hover:text-pink-600 transition-colors"
                title="Visit LYFSpot on Instagram"
              >
                <Instagram size={24} />
              </a>
            </div>
          </div>

          {/* Navigation */}
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

          {/* Social Pillars */}
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

          {/* Support and Contact */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Legal</h3>
            <ul className="space-y-2 mb-6">
              <li>
                <Link to="/terms" className="text-gray-600 hover:text-blue-600">Terms of Service</Link>
              </li>
              <li>
                <Link to="/privacy" className="text-gray-600 hover:text-blue-600">Privacy Policy</Link>
              </li>
            </ul>
            <h3 className="font-semibold text-gray-900 mb-4">Contact</h3>
            <address className="not-italic space-y-2">
              <div className="flex items-center text-gray-600">
                <Mail size={18} className="mr-2" />
                <a href="mailto:contact@resolveit.com" className="hover:text-blue-600 transition-colors">contact@resolveit.com</a>
              </div>
              <div className="flex items-center text-gray-600">
                <Phone size={18} className="mr-2" />
                <a href="tel:+919908205707" className="hover:text-blue-600 transition-colors">+91 99082 05707</a>
              </div>
            </address>
          </div>
        </div>

        {/* Ownership Section */}
        <div className="border-t mt-8 pt-8 text-center text-gray-600">
          <p>&copy; {new Date().getFullYear()} ResolveIt. All rights reserved.</p>
          <p className="mt-2">
            Developed by{" "}
            <a 
              href="https://sailyfspot.blogspot.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-bold text-gray-900 hover:text-blue-600 transition-all"
              title="Visit the LYFSpot Startup Blog"
            >
              LYFSpot
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}