import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Logo } from './Logo';
// 🟢 NEW: Import the central AuthContext
import { useAuth } from '../context/AuthContext'; 

interface NavbarProps {
  toggleSidebar: () => void;
}

export function Navbar({ toggleSidebar }: NavbarProps) {
  const navigate = useNavigate();
  // 🟢 NEW: Use centralized state and logout function from useAuth()
  const { isAuthenticated, logout } = useAuth();

  // NOTE: The local useState and useEffect for isAuthenticated are now removed 
  // as the context provides the authoritative state.

  const handleLogout = () => {
    // 1. Call the centralized logout function (handles Firebase, tokens, storage, and server signal)
    logout(); 
    
    // 2. AuthContext should handle navigation, but adding a safe redirect here:
    navigate('/login'); 
  };

  return (
    <nav className="bg-white shadow-md fixed top-0 left-0 right-0 z-30" role="navigation" aria-label="Main Navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none"
              aria-label="Open sidebar menu"
              title="Open Sidebar"
            >
              <Menu size={24} />
            </button>
            <Link to="/" className="ml-4" title="Home" aria-current="page">
              <Logo />
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {!isAuthenticated ? (
              <>
                {/* Display Login/Register links when unauthenticated */}
                <Link
                  to="/login"
                  className="px-4 py-2 text-blue-600 hover:text-blue-800 font-medium"
                  title="Login"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  title="Register"
                >
                  Register
                </Link>
              </>
            ) : (
              <>
                {/* Display Auth links when authenticated */}
                <Link to="/upload" className="text-gray-700 hover:text-blue-600 font-medium" title="Upload Issue">
                  Upload
                </Link>
                <Link to="/profile" className="text-gray-700 hover:text-blue-600 font-medium" title="Profile">
                  Profile
                </Link>
                <button
                  onClick={handleLogout} // Calls the new, centralized logout handler
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium"
                  title="Logout"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}