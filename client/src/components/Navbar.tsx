// src/components/Navbar.tsx
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

  // Default avatar if user has no profile picture
  const defaultAvatar =
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200";

  const avatar = user?.avatar
    ? `${import.meta.env.VITE_API_URL}/${user.avatar.replace(/^\/+/, "")}`
    : defaultAvatar;

  // Loading state prevents UI flicker
  if (loading) {
    return (
      <nav className="bg-white shadow-md fixed top-0 left-0 right-0 z-30">
        <div className="h-16 flex items-center justify-center">
          <span className="text-gray-500 text-sm">Checking session...</span>
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

          {/* Left Section */}
          <div className="flex items-center">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              aria-label="Open sidebar menu"
              title="Open Sidebar"
            >
              <Menu size={24} />
            </button>

            <Link to="/" className="ml-4" title="Home" aria-current="page">
              <Logo />
            </Link>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-4">

            {!isAuthenticated ? (
              <>
                {/* PUBLIC BUTTONS */}
                <Link
                  to="/login"
                  className="px-4 py-2 text-blue-600 hover:text-blue-800 font-medium"
                >
                  Login
                </Link>

                <Link
                  to="/register"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Register
                </Link>
              </>
            ) : (
              <>
                {/* =========================
                   LOGGED-IN ACTION BUTTONS
                   ========================= */}

                {/* UPLOAD (icon) */}
                <Link
                  to="/upload"
                  className="p-2 rounded-full hover:bg-blue-100 transition"
                  title="Upload Issue"
                >
                  <Upload size={22} className="text-gray-700" />
                </Link>

                {/* PROFILE (user avatar) */}
                <Link
                  to="/profile"
                  title="Profile"
                  className="flex items-center"
                >
                  <img
                    src={avatar}
                    alt="User avatar"
                    className="w-9 h-9 rounded-full object-cover border-2 border-transparent hover:border-blue-500 transition"
                  />
                </Link>

                {/* LOGOUT (icon) */}
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-full hover:bg-red-100 transition"
                  title="Logout"
                >
                  <LogOut size={22} className="text-red-600" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
