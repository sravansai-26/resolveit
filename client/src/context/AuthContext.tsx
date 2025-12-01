// src/contexts/AuthContext.tsx

import React, { 
    createContext, 
    useContext, 
    useState, 
    useEffect, 
    ReactNode 
} from 'react';
import { User as ProfileUser } from './ProfileContext';

// ======================================================================
// 🚨 IMPORTANT FIX:
// Removed VITE_API_URL entirely.
// We now use *relative* API paths:
//      /api/auth/login
//      /api/auth/register
//      /api/users/profile
//
// Vercel rewrites handle the backend automatically.
// ======================================================================

// API base is empty -> relative path
const API_BASE_URL = "";  


// ==================== Type Definitions ====================

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

    // 🔑 Get token from local/session storage
    const getToken = (): string | null => {
        return localStorage.getItem('token') || sessionStorage.getItem('token');
    };

    // ❌ Clear auth data
    const clearAuthData = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        setUser(null);
        setIsAuthenticated(false);
    };

    // ✔ Called after login/registration
    const login = (token: string, userData: ProfileUser, rememberMe: boolean) => {
        const storage = rememberMe ? localStorage : sessionStorage;

        storage.setItem('token', token);
        storage.setItem('user', JSON.stringify(userData));

        setUser(userData);
        setIsAuthenticated(true);
        setError(null);
    };

    // ✔ Logout function
    const logout = () => {
        clearAuthData();
    };


    // 📡 Fetch user profile (token validation)
    const fetchUserProfile = async () => {
        const token = getToken();
        if (!token) return;

        try {
            const res = await fetch(`/api/users/profile`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });

            const json = await res.json();

            if (res.ok && json.success && json.data) {
                const userData: ProfileUser = json.data;
                const storage = localStorage.getItem('token') ? localStorage : sessionStorage;

                storage.setItem('user', JSON.stringify(userData));

                setUser(userData);
                setIsAuthenticated(true);
            } else {
                console.error('Failed to validate token:', json.message);
                clearAuthData();
            }
        } catch (err) {
            console.error('Network/profile fetch error:', err);
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

                if (parsedUser?._id) {
                    setUser(parsedUser);
                    setIsAuthenticated(true);
                }

                // Now validate token with backend
                fetchUserProfile();
            } catch (e) {
                console.warn('Invalid user JSON. Clearing.', e);
                clearAuthData();
            }
        } else {
            clearAuthData();
        }

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
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
