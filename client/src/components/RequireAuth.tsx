// src/components/RequireAuth.tsx - FIXED VERSION

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface RequireAuthProps {
  children: React.ReactNode;
}

/**
 * Protects routes by ensuring the user is authenticated.
 * Shows loading spinner instead of returning null to prevent layout breaks.
 */
export function RequireAuth({ children }: RequireAuthProps): React.ReactElement {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  console.log("🔒 RequireAuth Check:", {
    loading,
    isAuthenticated,
    path: location.pathname
  });

  // --------------------------------------------------------
  // 1) While AuthContext is checking token → Show loading
  // --------------------------------------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <svg
            className="animate-spin h-12 w-12 mx-auto text-blue-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
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
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------
  // 2) If user is NOT authenticated → Redirect to login
  // --------------------------------------------------------
  if (!isAuthenticated) {
    console.log("⚠️ Not authenticated, redirecting to login");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // --------------------------------------------------------
  // 3) User is authenticated → render protected content
  // --------------------------------------------------------
  console.log("✅ Authenticated, rendering protected content");
  return <>{children}</>;
}