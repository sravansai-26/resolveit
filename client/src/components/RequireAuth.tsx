// src/components/RequireAuth.tsx

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface RequireAuthProps {
  children: React.ReactNode;
}

/**
 * Protects routes by ensuring the user is authenticated.
 * Prevents redirect loops, page flicker, and layout breaking.
 */
export function RequireAuth({ children }: RequireAuthProps): React.ReactElement | null {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // --------------------------------------------------------
  // 1) While AuthContext is checking token → Do not redirect
  //    Return null to avoid breaking AppLayout
  // --------------------------------------------------------
  if (loading) {
    return null;
  }

  // --------------------------------------------------------
  // 2) If user is NOT authenticated → Redirect to login
  //    Save the current route so we can return after login
  // --------------------------------------------------------
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // --------------------------------------------------------
  // 3) User is authenticated → render protected content
  // --------------------------------------------------------
  return <>{children}</>;
}
