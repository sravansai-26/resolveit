// src/components/Sidebar.tsx

import { NavLink, useNavigate } from 'react-router-dom';
import { X, Home, Upload, User, Info, MessageSquare, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const { isAuthenticated, logout, loading } = useAuth();

  // 🔥 FIX: Proper async logout
  const handleLogout = async () => {
    onClose(); // Close sidebar immediately (instant UX)
    await logout(); // Wait for AuthContext cleanup
    navigate("/login", { replace: true }); // Safe redirect
  };

  const navItems = [
    { to: '/', icon: Home, label: 'Home', authRequired: false },
    { to: '/upload', icon: Upload, label: 'Report Issue', authRequired: true },
    { to: '/profile', icon: User, label: 'Profile', authRequired: true },
    { to: '/about', icon: Info, label: 'About Us', authRequired: false },
    { to: '/feedback', icon: MessageSquare, label: 'Feedback', authRequired: false },
  ];

  // 🟢 Prevent flashing wrong state while AuthContext is loading
  if (loading) {
    return (
      <div
        className={cn(
          "fixed top-0 left-0 h-full bg-white shadow-lg z-40 w-64 pt-16 flex items-center justify-center",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <span className="text-gray-500 text-sm">Checking session...</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'fixed top-0 left-0 h-full bg-white shadow-lg transition-transform duration-300 ease-in-out z-40 w-64 pt-16 flex flex-col justify-between',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-lg text-gray-600 hover:bg-gray-100"
        title="Close Sidebar"
      >
        <X size={24} />
      </button>

      <div className="p-6">
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
                    'hover:bg-blue-50',
                    isActive ? 'bg-blue-100 text-blue-600' : 'text-gray-700'
                  )
                }
                title={item.label}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            ))}
        </nav>
      </div>

      {isAuthenticated && (
        <div className="p-6 border-t">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 p-3 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-800 w-full"
            title="Logout"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}
