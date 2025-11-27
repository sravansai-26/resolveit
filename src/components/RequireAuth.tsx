// RequireAuth.tsx
import React from 'react'; 
import { Navigate, useLocation } from 'react-router-dom';

// ----------------------------------------------------------------------
// 🚨 CRITICAL FIX: Use the central useAuth hook
// We will define this hook in the next file (AuthContext.tsx) to ensure
// all components react instantly to login/logout state changes.
// ----------------------------------------------------------------------

// Placeholder for the hook we will create in AuthContext.tsx
// It's essential that this hook returns the current authentication status.
import { useAuth } from '../context/AuthContext'; 

interface RequireAuthProps {
  children: React.ReactNode; 
}

export function RequireAuth({ children }: RequireAuthProps): React.ReactElement | null {
  // Use the central state from context instead of checking storage directly
  const { isAuthenticated, loading } = useAuth(); 
  const location = useLocation();

  // Optionally: show a loading screen while authentication status is being determined
  if (loading) {
    return <div>Loading user session...</div>; 
  }

  // If the user is not authenticated, navigate to the login page
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If the user is authenticated, render the protected children
  return <>{children}</>;
}