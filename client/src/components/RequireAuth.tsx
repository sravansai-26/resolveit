// src/components/RequireAuth.tsx - COMPLETE FIXED VERSION

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface RequireAuthProps {
  children: React.ReactNode;
}

/**
 * Protects routes by ensuring the user is authenticated.
 * Shows loading spinner while checking auth state.
 * Redirects to login if not authenticated.
 */
export function RequireAuth({ children }: RequireAuthProps): React.ReactElement {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  console.log("🔒 RequireAuth Check:", {
    loading,
    isAuthenticated,
    hasUser: !!user,
    userEmail: user?.email || "none",
    path: location.pathname
  });

  // --------------------------------------------------------
  // 1) While AuthContext is checking token → Show loading
  // --------------------------------------------------------
  if (loading) {
    console.log("⏳ Auth loading, showing spinner...");
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <svg
            className="animate-spin h-12 w-12 mx-auto text-blue-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8z"
            />
          </svg>
          <p className="mt-4 text-gray-700 font-medium">Checking authentication...</p>
          <p className="mt-1 text-sm text-gray-500">Please wait a moment</p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------
  // 2) CRITICAL FIX: Check both isAuthenticated AND user
  //    Sometimes isAuthenticated can be true but user is still null
  // --------------------------------------------------------
  if (!isAuthenticated || !user) {
    console.log("⚠️ Not authenticated or no user data, redirecting to login");
    console.log("🔵 isAuthenticated:", isAuthenticated);
    console.log("🔵 user:", user ? "exists" : "null");
    
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // --------------------------------------------------------
  // 3) User is fully authenticated with data → render protected content
  // --------------------------------------------------------
  console.log("✅ Authenticated with user data, rendering protected content");
  console.log("👤 User:", user.email);
  
  return <>{children}</>;
}