import { NavLink, useNavigate } from 'react-router-dom';
import { X, Home, Upload, User, Info, MessageSquare, LogOut, Share2, Globe, Download } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();
  
  // 🔍 Identify Platform
  const isApp = Capacitor.isNativePlatform();

  const handleLogout = async () => {
    onClose();
    await logout();
    navigate("/login", { replace: true });
  };

  const handleShare = async () => {
    const webUrl = 'https://www.resolveit-community.me/';
    const gatewayUrl = 'https://resolveit-gateway-temp.vercel.app'; // Your download page

    if (isApp) {
      // 📱 APK LOGIC: Use Native Share Sheet
      try {
        await Share.share({
          title: 'ResolveIt Community',
          text: 'Join our community to report and resolve local issues!',
          url: gatewayUrl, // Share the download link
          dialogTitle: 'Share ResolveIt App',
        });
      } catch (err) {
        console.error('Share failed', err);
      }
    } else {
      // 🌐 WEB LOGIC: Professional Copy to Clipboard
      try {
        await navigator.clipboard.writeText(webUrl);
        alert('Website link copied to clipboard! Share it with your community.');
      } catch (err) {
        alert('Copy failed. Please copy the URL from your browser bar.');
      }
    }
  };

  const navItems = [
    { to: '/', icon: Home, label: 'Home', authRequired: false },
    { to: '/upload', icon: Upload, label: 'Report Issue', authRequired: true },
    { to: '/profile', icon: User, label: 'Profile', authRequired: true },
    { to: '/about', icon: Info, label: 'About Us', authRequired: false },
    { to: '/feedback', icon: MessageSquare, label: 'Feedback', authRequired: false },
  ];

  return (
    <div className={cn(
        'fixed top-0 left-0 h-full bg-white shadow-lg transition-transform duration-300 ease-in-out z-40 w-64 pt-16 flex flex-col',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
      
      <button type="button" title="Close sidebar" onClick={onClose} className="absolute top-4 right-4 p-2 rounded-lg text-gray-600 hover:bg-gray-100">
        <X size={24} />
      </button>

      <div className="p-6 flex-grow overflow-y-auto">
        <nav className="space-y-2">
          {navItems
            .filter((item) => !item.authRequired || isAuthenticated)
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) => cn(
                  'flex items-center space-x-3 p-3 rounded-lg transition-colors',
                  isActive ? 'bg-blue-100 text-blue-600' : 'text-gray-700 hover:bg-blue-50'
                )}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            ))}
        </nav>
      </div>

      {/* FOOTER ACTIONS SECTION: SWITCHES BASED ON PLATFORM */}
      <div className="p-4 border-t space-y-2 bg-gray-50">
        
        {isApp ? (
          /* APK ONLY BUTTONS */
          <>
            <a
              href="https://www.resolveit-community.me/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-3 p-3 rounded-lg text-gray-600 hover:bg-white hover:text-blue-600 transition-all text-sm"
            >
              <Globe size={18} />
              <span>Visit Web Portal</span>
            </a>

            <button
              onClick={handleShare}
              className="flex items-center space-x-3 p-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 w-full shadow-md shadow-blue-100 transition-all"
            >
              <Share2 size={18} />
              <span className="font-semibold">Share this App</span>
            </button>
          </>
        ) : (
          /* WEB ONLY BUTTONS */
          <>
            <button
              onClick={handleShare}
              className="flex items-center space-x-3 p-3 rounded-lg text-gray-600 hover:bg-white hover:text-blue-600 transition-all text-sm w-full"
            >
              <Share2 size={18} />
              <span>Share Website</span>
            </button>

            <a
              href="https://resolveit-gateway.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-3 p-3 rounded-lg bg-green-600 text-white hover:bg-green-700 w-full shadow-md shadow-green-100 transition-all"
            >
              <Download size={18} />
              <span className="font-semibold">Get ResolveIt (APK)</span>
            </a>
          </>
        )}

        {isAuthenticated && (
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 p-3 rounded-lg text-red-600 hover:bg-red-50 w-full transition-colors text-sm mt-2"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        )}
      </div>
    </div>
  );
}