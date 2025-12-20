// src/components/Navbar.tsx - FULL CORRECTED VERSION
import { Link, useNavigate } from "react-router-dom";
import { Menu, Upload, LogOut } from "lucide-react";
import { Logo } from "./Logo";
import { useAuth } from "../context/AuthContext";
import { useProfile } from "../context/ProfileContext";

interface NavbarProps {
  toggleSidebar: () => void;
}

export function Navbar({ toggleSidebar }: NavbarProps) {
  const navigate = useNavigate();
  const { isAuthenticated, logout, loading } = useAuth();
  const { user } = useProfile();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  /**
   * 🛡️ AVATAR LOGIC:
   * 1. Check if user has an avatar.
   * 2. If it's a full URL (Google or Cloudinary), use it directly.
   * 3. Otherwise, use a clean fallback UI Avatar.
   */
  const defaultAvatar = `https://ui-avatars.com/api/?name=${user?.firstName || "User"}&background=0D8ABC&color=fff`;

  const avatar = user?.avatar ? user.avatar : defaultAvatar;

  if (loading) {
    return (
      <nav className="bg-white shadow-md fixed top-0 left-0 right-0 z-30">
        <div className="h-16 flex items-center justify-center">
          <div className="animate-pulse flex space-x-2">
            <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
            <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
            <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav
      className="bg-white shadow-md fixed top-0 left-0 right-0 z-30"
      role="navigation"
      aria-label="Main Navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Left Section - Logo & Sidebar Toggle */}
          <div className="flex items-center">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              aria-label="Open sidebar menu"
              title="Open Sidebar"
            >
              <Menu size={24} />
            </button>

            <Link to="/" className="ml-2 sm:ml-4" title="Home">
              <Logo />
            </Link>
          </div>

          {/* Right Section - Auth Actions */}
          <div className="flex items-center space-x-2 sm:space-x-4">

            {!isAuthenticated ? (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="px-3 py-2 text-sm sm:text-base text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  Login
                </Link>

                <Link
                  to="/register"
                  className="px-3 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-shadow shadow-md shadow-blue-100"
                >
                  Register
                </Link>
              </div>
            ) : (
              <div className="flex items-center space-x-3 sm:space-x-4">
                {/* UPLOAD */}
                <Link
                  to="/upload"
                  className="p-2 rounded-full hover:bg-blue-50 transition-colors group"
                  title="Upload Issue"
                >
                  <Upload size={22} className="text-gray-600 group-hover:text-blue-600" />
                </Link>

                {/* PROFILE */}
                <Link
                  to="/profile"
                  title="Your Profile"
                  className="flex items-center"
                >
                  <img
                    src={avatar}
                    alt="Profile"
                    className="w-9 h-9 rounded-full object-cover border-2 border-transparent hover:border-blue-500 transition-all shadow-sm"
                    /** * ⚡ CRITICAL FIX: If the image URL is broken (404), 
                     * immediately switch to the fallback avatar.
                     */
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = defaultAvatar;
                    }}
                  />
                </Link>

                {/* LOGOUT */}
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-full hover:bg-red-50 transition-colors group"
                  title="Logout"
                >
                  <LogOut size={22} className="text-gray-600 group-hover:text-red-600" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}