import { NavLink, useNavigate } from 'react-router-dom';
import { X, Home, Upload, User, Info, MessageSquare, LogOut, Share2, Globe } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const { isAuthenticated, logout, loading } = useAuth();

  const handleLogout = async () => {
    onClose();
    await logout();
    navigate("/login", { replace: true });
  };

  // Logic to share the app using native Android share sheet
  const handleShare = async () => {
    const shareData = {
      title: 'ResolveIt Community',
      text: 'Hey! Check out ResolveIt, a community platform to report and resolve local issues.',
      url: 'https://resolveit-community.vercel.app', // Link to your website/download page
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: Copy to clipboard if Share API isn't supported
        await navigator.clipboard.writeText(shareData.url);
        alert('App link copied to clipboard!');
      }
    } catch (err) {
      console.log('Error sharing:', err);
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
    <div
      className={cn(
        'fixed top-0 left-0 h-full bg-white shadow-lg transition-transform duration-300 ease-in-out z-40 w-64 pt-16 flex flex-col',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close sidebar"
        title="Close sidebar"
        className="absolute top-4 right-4 p-2 rounded-lg text-gray-600 hover:bg-gray-100"
      >
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
                className={({ isActive }) =>
                  cn(
                    'flex items-center space-x-3 p-3 rounded-lg transition-colors',
                    isActive ? 'bg-blue-100 text-blue-600' : 'text-gray-700 hover:bg-blue-50'
                  )
                }
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            ))}
        </nav>
      </div>

      {/* FOOTER ACTIONS SECTION */}
      <div className="p-4 border-t space-y-2 bg-gray-50">
        {/* Visit Website Link */}
        <a
          href="https://resolveit-community.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-3 p-3 rounded-lg text-gray-600 hover:bg-white hover:text-blue-600 transition-all text-sm"
        >
          <Globe size={18} />
          <span>Visit Website</span>
        </a>

        {/* Share App Button */}
        <button
          onClick={handleShare}
          className="flex items-center space-x-3 p-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 w-full transition-all shadow-md shadow-blue-100"
        >
          <Share2 size={18} />
          <span className="font-semibold">Share App</span>
        </button>

        {/* Logout Button */}
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