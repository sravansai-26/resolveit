// src/components/RequireAuth.tsx
import React from 'react'; 
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; 

interface RequireAuthProps {
  children: React.ReactNode; 
}

/**
 * A wrapper component to protect routes. 
 * If the user is not authenticated, they are redirected to the login page.
 */
export function RequireAuth({ children }: RequireAuthProps): React.ReactElement | null {
  // Get the authentication state and loading status from the global context
  const { isAuthenticated, loading } = useAuth(); 
  const location = useLocation();

  // Show a loading screen while the authentication status is being checked (e.g., checking token validity on initial load)
  if (loading) {
    // You might want a more visually appealing spinner component here
    return <div>Loading user session...</div>; 
  }

  // If the user is not authenticated, redirect them to the login page, 
  // storing the current location so they can be redirected back after logging in.
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If the user is authenticated, render the protected children (the page content)
  return <>{children}</>;
}