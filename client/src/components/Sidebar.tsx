import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { X, Home, Upload, User, Info, MessageSquare, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';
// 🟢 NEW: Import the central AuthContext
import { useAuth } from '../context/AuthContext'; 

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  // 🟢 NEW: Use centralized state and logic from useAuth()
  const { isAuthenticated, logout } = useAuth();
  
  // NOTE: We no longer need the local useEffect or the useState for isAuthenticated
  // as the data comes directly from AuthContext, which is the Single Source of Truth.

  // The simplified logout handler now uses the central context function
  const handleLogout = () => {
    // 1. Call the centralized logout function (handles Firebase, tokens, and storage)
    logout(); 
    
    // 2. Close the sidebar immediately
    onClose(); 
    
    // 3. The AuthContext should handle navigation, but as a robust fallback, 
    // we can ensure the user is redirected, though the AuthProvider should manage this.
    // If AuthProvider handles navigation, remove this line:
    navigate('/login'); 
    
    // ⚠️ IMPORTANT: We remove window.location.reload() as it's no longer necessary 
    // and defeats the purpose of React's state management.
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
            .filter((item) => !item.authRequired || isAuthenticated) // Filters based on context state
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
            onClick={handleLogout} // Calls the updated handler
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