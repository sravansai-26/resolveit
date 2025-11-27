// src/contexts/AuthContext.tsx

import React, { 
    createContext, 
    useContext, 
    useState, 
    useEffect, 
    ReactNode 
} from 'react';
import { User as ProfileUser } from './ProfileContext'; // Import User type from ProfileContext

// ----------------------------------------------------------------------
// ✅ CRITICAL FIX: Base URL for Deployed API
// Ensure this constant matches the API base URL used across your frontend.
// ----------------------------------------------------------------------
const API_BASE_URL = import.meta.env.VITE_API_URL; 

// ==================== Type Definitions ====================

// Define the structure of the data provided by the context
interface AuthContextType {
    user: ProfileUser | null;
    isAuthenticated: boolean;
    loading: boolean;
    error: string | null;
    login: (token: string, userData: ProfileUser, rememberMe: boolean) => void;
    logout: () => void;
    fetchUserProfile: () => Promise<void>;
}

// ==================== Context Setup ====================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ==================== Provider Component ====================

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<ProfileUser | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Helper to get token from storage
    const getToken = (): string | null => {
        return localStorage.getItem('token') || sessionStorage.getItem('token');
    };

    // Helper to clear all authentication data
    const clearAuthData = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        setUser(null);
        setIsAuthenticated(false);
    };

    // Function called after successful login/registration
    const login = (token: string, userData: ProfileUser, rememberMe: boolean) => {
        // Decide which storage to use
        const storage = rememberMe ? localStorage : sessionStorage;

        // 1. Store the token
        storage.setItem('token', token);
        
        // 2. Store the user data
        storage.setItem('user', JSON.stringify(userData));

        // 3. Update the global state
        setUser(userData);
        setIsAuthenticated(true);
        setError(null);
    };

    // Function to handle logout
    const logout = () => {
        clearAuthData();
        // Redirecting after logout should be handled in a component that calls this
        // e.g., navigate('/login', { replace: true })
    };

    // Function to re-fetch user data if only a token is present
    const fetchUserProfile = async () => {
        const token = getToken();
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/users/profile`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });

            const json = await res.json();

            if (res.ok && json.success && json.data) {
                // On success, update the state and persist data
                const userData: ProfileUser = json.data;
                const storage = localStorage.getItem('token') ? localStorage : sessionStorage;

                storage.setItem('user', JSON.stringify(userData));
                setUser(userData);
                setIsAuthenticated(true);
            } else {
                // If token is invalid or expired, clear everything
                console.error('Failed to validate token or fetch profile:', json.message);
                clearAuthData();
            }
        } catch (err) {
            console.error('Network or parsing error during profile fetch:', err);
            clearAuthData();
        }
    };


    // ==================== Initial Load Effect ====================

    useEffect(() => {
        const token = getToken();
        const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');

        if (token && storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                if (parsedUser && parsedUser._id) {
                    // Token and user data exist locally, set state immediately
                    setUser(parsedUser);
                    setIsAuthenticated(true);
                }
                
                // Immediately check if the token is valid (e.g., if the user refreshes the page)
                fetchUserProfile(); 
            } catch (e) {
                console.warn('Error parsing user data. Clearing session.', e);
                clearAuthData();
            }
        } else {
            // No token found, ensure state is clean
            clearAuthData();
        }

        // Must set loading to false after initial check, regardless of result
        setLoading(false); 
    }, []);

    // ==================== Context Return ====================

    const contextValue: AuthContextType = {
        user,
        isAuthenticated,
        loading,
        error,
        login,
        logout,
        fetchUserProfile,
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
}

// ==================== Hook for Using Context ====================

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}