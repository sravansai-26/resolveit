// RequireAuth.tsx
import React from 'react'; 
import { Navigate, useLocation } from 'react-router-dom';

function isAuthenticated(): boolean {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return !!token;
}

interface RequireAuthProps {
  children: React.ReactNode; // <--- CHANGE THIS LINE from React.ReactElement
}

export function RequireAuth({ children }: RequireAuthProps): React.ReactElement | null { // Return type might also need to be flexible
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}